// supabase/functions/ensure-content/index.ts
// Edge Function to ensure content is generated for the next 14 days of learning path nodes
// Reference: Content generation for offline use

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { formatDate, addDays } from '../_shared/calendar.ts';
import { isScheduledDay } from '../_shared/calendar.ts';
import { 
  getContentRefForIndex, 
  getMishnayotIndicesForChapter,
  TOTAL_MISHNAYOT,
  TOTAL_CHAPTERS,
} from '../_shared/content-order.ts';

interface EnsureContentRequest {
  user_id: string;
}

interface EnsureContentResponse {
  success: boolean;
  content_checked: number;
  content_generated: number;
  content_cached: number;
  content_errors: number;
  message: string;
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
    const body: EnsureContentRequest = await req.json();

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

    // Calculate date range (today to 14 days ahead)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourteenDaysLater = new Date(today);
    fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);
    const todayStr = formatDate(today);
    const fourteenDaysLaterStr = formatDate(fourteenDaysLater);

    // Get user preferences and current position (Phase 1: position-based implementation)
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('pace, review_intensity, current_content_index, path_start_date')
      .eq('user_id', body.user_id)
      .single();

    if (prefsError || !preferences) {
      return new Response(
        JSON.stringify({ 
          error: 'User preferences not found',
          details: prefsError?.message 
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Calculate content refs for next 14 days using position-based logic
    const contentRefsForNext14Days: string[] = [];
    let scheduledDaysCount = 0;
    let contentIndex = preferences.current_content_index || 0;
    let pathStartDate = preferences.path_start_date ? new Date(preferences.path_start_date) : today;
    const pace = preferences.pace || 'two_mishna';
    
    // Generate content for each scheduled day in the 14-day window
    while (scheduledDaysCount < 14) {
      // Calculate the date for this scheduled day
      const studyDate = new Date(pathStartDate);
      studyDate.setDate(pathStartDate.getDate() + scheduledDaysCount);
      
      // Skip non-scheduled days (weekends)
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

    if (uniqueContentRefs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          content_checked: 0,
          content_generated: 0,
          content_cached: 0,
          content_errors: 0,
          message: 'No content scheduled for the next 14 days'
        } as EnsureContentResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ensure-content] Checking ${uniqueContentRefs.length} unique content items for user ${body.user_id}`);

    // Check which content already exists and generate missing ones
    let contentGenerated = 0;
    let contentCached = 0;
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
          contentCached++;
          continue;
        }

        // Content doesn't exist - generate it
        console.log(`[ensure-content] Generating content for: ${contentRef}`);
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
            console.log(`[ensure-content] Successfully generated content: ${contentRef} (id: ${generated.id})`);
            contentGenerated++;
          } else {
            console.warn(`[ensure-content] Content generation returned no ID for: ${contentRef}`);
            contentErrors++;
          }
        } else {
          const errorText = await contentResponse.text();
          console.warn(`[ensure-content] Failed to generate content for ${contentRef}:`, errorText);
          contentErrors++;
        }
      } catch (error) {
        console.error(`[ensure-content] Error generating content for ${contentRef}:`, error);
        contentErrors++;
      }
    }

    console.log(`[ensure-content] Summary: ${contentGenerated} generated, ${contentCached} cached, ${contentErrors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        content_checked: uniqueContentRefs.length,
        content_generated: contentGenerated,
        content_cached: contentCached,
        content_errors: contentErrors,
        message: `Checked ${uniqueContentRefs.length} content items: ${contentGenerated} generated, ${contentCached} already cached, ${contentErrors} errors`
      } as EnsureContentResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error ensuring content:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
