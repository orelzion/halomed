// supabase/functions/generate-path/index.ts
// Edge Function to trigger content generation for user's next 14 days
// Updated: Task 2.1 - Position-based implementation (no learning_path table)
// Reference: Plan Section "Implementation Phases", scheduling.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { isScheduledDay, addDays, formatDate } from '../_shared/calendar.ts';
import { 
  getContentRefForIndex, 
  getMishnayotIndicesForChapter,
  TOTAL_MISHNAYOT,
  TOTAL_CHAPTERS,
} from '../_shared/content-order.ts';

interface GeneratePathRequest {
  user_id: string;
  // Optional: pass preferences directly (saves roundtrip, enables offline-first flow)
  pace?: 'two_mishna' | 'one_chapter' | 'seder_per_year';
  review_intensity?: 'none' | 'light' | 'medium' | 'intensive';
}



interface GeneratePathResponse {
  success: boolean;
  message: string;
  content_generated: number;
  content_cached: number;
  content_errors: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = createCorsHeaders();

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body
    const body: GeneratePathRequest = await req.json();

    // Validate request
    if (!body.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Security: This function is deployed with --no-verify-jwt
    // Authentication is handled by the API route which validates the user's JWT
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine preferences: use provided values or fetch from database
    let pace: string;
    let review_intensity: string;

    if (body.pace && body.review_intensity) {
      // Preferences provided in request - save them to database first
      // This enables offline-first flow: client saves to RxDB, calls API with preferences,
      // API saves to Supabase and generates content in one call
      console.log(`[generate-path] Preferences provided in request, saving to database...`);
      
      const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: body.user_id,
          pace: body.pace,
          review_intensity: body.review_intensity,
          // Note: streak_count and other fields are managed separately
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('[generate-path] Error saving preferences:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save preferences', details: upsertError.message }),
          { status: 500, headers: corsHeaders }
        );
      }

      pace = body.pace;
      review_intensity = body.review_intensity;
      console.log(`[generate-path] Preferences saved: pace=${pace}, review_intensity=${review_intensity}`);
    } else {
      // Fetch preferences from database
      const { data: preferences, error: prefError } = await supabase
        .from('user_preferences')
        .select('pace, review_intensity, current_content_index, path_start_date')
        .eq('user_id', body.user_id)
        .single();

      if (prefError || !preferences) {
        return new Response(
          JSON.stringify({ error: 'User preferences not found. User must complete onboarding first.' }),
          { status: 404, headers: corsHeaders }
        );
      }

      pace = preferences.pace;
      review_intensity = preferences.review_intensity;
      console.log(`[generate-path] Using existing preferences: pace=${pace}, review_intensity=${review_intensity}, current_content_index=${preferences.current_content_index}`);
    }

    // Generate content for the next 14 days based on user's position and pace
    console.log(`[generate-path] Generating content for next 14 days for user ${body.user_id}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourteenDaysLater = new Date(today);
    fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);
    const todayStr = formatDate(today);
    const fourteenDaysLaterStr = formatDate(fourteenDaysLater);

    // Get current position from user_preferences
    const { data: currentPrefs } = await supabase
      .from('user_preferences')
      .select('current_content_index, path_start_date')
      .eq('user_id', body.user_id)
      .single();

    if (!currentPrefs) {
      return new Response(
        JSON.stringify({ error: 'User preferences not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Calculate content items for next 14 days using position-based logic
    const contentRefsForNext14Days: string[] = [];
    let scheduledDaysCount = 0;
    let contentIndex = currentPrefs.current_content_index || 0;
    let pathStartDate = currentPrefs.path_start_date ? new Date(currentPrefs.path_start_date) : today;
    
    // Generate content for each scheduled day in the 14-day window
    while (scheduledDaysCount < 14) {
      // Calculate the date for this scheduled day
      const studyDate = new Date(pathStartDate);
      studyDate.setDate(pathStartDate.getDate() + scheduledDaysCount);
      
      // Skip non-scheduled days (weekends, holidays based on user preferences)
      if (!(await isScheduledDay(studyDate, 'DAILY_WEEKDAYS_ONLY'))) {
        scheduledDaysCount++;
        continue;
      }
      
      // Stop if we've gone beyond the 14-day window
      if (studyDate > fourteenDaysLater) {
        break;
      }

      // Get content indices for this day based on pace
      let dayContentIndices: number[] = [];
      
      if (pace === 'one_chapter') {
        // Chapter-per-day: get all mishnayot in the current chapter
        if (contentIndex < TOTAL_CHAPTERS) {
          dayContentIndices = getMishnayotIndicesForChapter(contentIndex);
          contentIndex += 1; // Move to next chapter
        }
      } else if (pace === 'seder_per_year') {
        // Seder per year: calculate based on current position in the Mishnah
        if (contentIndex < TOTAL_MISHNAYOT) {
          // Calculate mishnayot per day for current chapter based on average
          const avgPerDay = Math.ceil(TOTAL_MISHNAYOT / 250); // ~18 mishnayot per day
          for (let i = 0; i < avgPerDay && contentIndex < TOTAL_MISHNAYOT; i++) {
            dayContentIndices.push(contentIndex);
            contentIndex++;
          }
        }
      } else if (pace === 'two_mishna') {
        // Two mishnayot per day
        if (contentIndex < TOTAL_MISHNAYOT) {
          dayContentIndices.push(contentIndex);
          contentIndex += 1;
          if (contentIndex < TOTAL_MISHNAYOT) {
            dayContentIndices.push(contentIndex);
            contentIndex += 1;
          }
        }
      } else {
        // Fallback: one mishna per day
        if (contentIndex < TOTAL_MISHNAYOT) {
          dayContentIndices.push(contentIndex);
          contentIndex += 1;
        }
      }

      // Convert indices to content refs
      for (const idx of dayContentIndices) {
        const contentRef = getContentRefForIndex(idx);
        contentRefsForNext14Days.push(contentRef);
      }

      scheduledDaysCount++;
    }

    // Remove duplicates and filter for unique content refs
    const uniqueContentRefs = Array.from(new Set(contentRefsForNext14Days));
    console.log(`[generate-path] Found ${uniqueContentRefs.length} unique content items for next 14 days`);

    // Generate content for unique refs
    let contentGenerated = 0;
    let contentSkipped = 0;
    let contentErrors = 0;

    for (const contentRef of uniqueContentRefs) {
      try {
        // Check if content exists in cache
        const { data: existingContent } = await supabase
          .from('content_cache')
          .select('id')
          .eq('ref_id', contentRef)
          .single();

        if (existingContent) {
          console.log(`[generate-path] Content already exists: ${contentRef}`);
          contentSkipped++;
          continue;
        }

        // Content doesn't exist - generate it
        console.log(`[generate-path] Generating content for: ${contentRef}`);
        const contentResponse = await fetch(`${supabaseUrl}/functions/v1/generate-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ ref_id: contentRef }),
        });

        if (contentResponse.ok) {
          const generated = await contentResponse.json();
          if (generated?.id) {
            console.log(`[generate-path] Successfully generated content: ${contentRef} (id: ${generated.id})`);
            contentGenerated++;
          } else {
            console.warn(`[generate-path] Content generation returned no ID for: ${contentRef}`);
            contentErrors++;
          }
        } else {
          const errorText = await contentResponse.text();
          console.warn(`[generate-path] Failed to generate content for ${contentRef}:`, errorText);
          contentErrors++;
        }
      } catch (error) {
        console.error(`[generate-path] Error generating content for ${contentRef}:`, error);
        contentErrors++;
      }
    }

    console.log(`[generate-path] Content generation complete: ${contentGenerated} generated, ${contentSkipped} cached, ${contentErrors} errors`);

    const responseMessage = `Content generation triggered for next 14 days: ${contentGenerated} generated, ${contentSkipped} cached, ${contentErrors} errors.`;

    return new Response(
      JSON.stringify({
        success: true,
        message: responseMessage,
        content_generated: contentGenerated,
        content_cached: contentSkipped,
        content_errors: contentErrors,
      } as GeneratePathResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating path:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
