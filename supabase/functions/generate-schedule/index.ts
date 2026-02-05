// supabase/functions/generate-schedule/index.ts
// Edge Function to generate scheduled learning units for a user
// DEPRECATED: This function uses the old tracks/user_study_log model
// The current implementation uses client-side path computation via path-generator.ts
// This function is kept for reference and will fail if tracks table doesn't exist
// Reference: TDD Section 6, scheduling.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { isScheduledDay, addDays, formatDate, parseDate } from '../_shared/calendar.ts';
import { getContentRefForIndex } from '../_shared/content-order.ts';

interface GenerateScheduleRequest {
  user_id: string;
  track_id: string;
  start_date: string;      // ISO date (YYYY-MM-DD)
  days_ahead: number;      // Fixed: 14 for MVP
}

interface ScheduledUnit {
  id: string;
  study_date: string;
  content_id: string | null;
  is_completed: boolean;
}

interface GenerateScheduleResponse {
  scheduled_units: ScheduledUnit[];
}

Deno.serve(async (req: Request) => {
  // DEPRECATED: Return error immediately - tracks table was removed
  // The current implementation uses client-side path computation
  return new Response(
    JSON.stringify({ 
      error: 'DEPRECATED: generate-schedule is no longer supported. Path is computed client-side.',
      deprecated: true,
      message: 'This Edge Function used the old tracks/user_study_log model which has been removed.'
    }),
    { status: 410, headers: { 'Content-Type': 'application/json' } }
  );

  // Original code preserved below for reference...
  // Handle CORS preflight
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = createCorsHeaders();

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body
    const body: GenerateScheduleRequest = await req.json();

    // Validate request
    if (!body.user_id || !body.track_id || !body.start_date || !body.days_ahead) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, track_id, start_date, days_ahead' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Security: This function is deployed with --no-verify-jwt
    // Authentication is handled by the API route (web/app/api/generate-schedule/route.ts)
    // which validates the user's JWT before calling this function.
    // The user_id in the request body is trusted because it comes from an authenticated API route.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get track information
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, schedule_type, title')
      .eq('id', body.track_id)
      .single();

    if (trackError || !track) {
      return new Response(
        JSON.stringify({ error: 'Track not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify user exists by checking if they have any study logs or by querying auth
    // For MVP, we'll skip explicit user validation and let the database foreign key handle it
    // If user doesn't exist, the foreign key constraint will catch it

    // Parse start date
    const startDate = parseDate(body.start_date);
    if (isNaN(startDate.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid start_date format. Use YYYY-MM-DD' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user's track start date to calculate content index for the requested date
    // We need to find what content index corresponds to the start_date
    const { data: trackWithStart } = await supabase
      .from('tracks')
      .select('start_date')
      .eq('id', body.track_id)
      .single();

    const trackStartDate = trackWithStart?.start_date 
      ? parseDate(trackWithStart.start_date)
      : null;

    // Calculate content index for the start_date
    // Count how many scheduled days occurred before the start_date
    let contentIndexForStartDate = 0;
    
    if (trackStartDate && !isNaN(trackStartDate.getTime())) {
      // Count scheduled days from track start to (but not including) start_date
      let currentDate = new Date(trackStartDate);
      const targetDate = new Date(startDate);
      
      while (currentDate < targetDate) {
        if (await isScheduledDay(currentDate, track.schedule_type)) {
          contentIndexForStartDate++;
        }
        currentDate = addDays(currentDate, 1);
      }
    } else {
      // If no track start date, count existing scheduled units before start_date
      const { count: unitsBeforeStart } = await supabase
        .from('user_study_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', body.user_id)
        .eq('track_id', body.track_id)
        .lt('study_date', body.start_date);
      
      contentIndexForStartDate = unitsBeforeStart ?? 0;
    }

    // Generate schedule
    const scheduledUnits: ScheduledUnit[] = [];
    let contentIndex = contentIndexForStartDate;

    for (let i = 0; i < body.days_ahead; i++) {
      const date = addDays(startDate, i);
      const studyDate = formatDate(date);

      // Check if this date is allowed by schedule type (async to check holidays)
      const isScheduled = await isScheduledDay(date, track.schedule_type);
      if (!isScheduled) {
        // Debug: Log why date is excluded
        const dayOfWeek = date.getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`Skipping ${studyDate} (${dayNames[dayOfWeek]}) - not a scheduled day for schedule_type: ${track.schedule_type}`);
      }
      if (isScheduled) {
        // Calculate content index for this specific date
        // This ensures that each date gets the correct content, regardless of when generation is triggered
        let dateContentIndex: number;
        
        if (trackStartDate && !isNaN(trackStartDate.getTime())) {
          // Count scheduled days from track start to this date
          let countDate = new Date(trackStartDate);
          let countIndex = 0;
          while (countDate < date) {
            if (await isScheduledDay(countDate, track.schedule_type)) {
              countIndex++;
            }
            countDate = addDays(countDate, 1);
          }
          dateContentIndex = countIndex;
        } else {
          // Fallback: count existing scheduled units before this date
          const { count: unitsBefore } = await supabase
            .from('user_study_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', body.user_id)
            .eq('track_id', body.track_id)
            .lt('study_date', studyDate);
          dateContentIndex = unitsBefore ?? 0;
        }

        // Get content reference for this index (pass schedule_type for chapter-per-day support)
        const contentRef = getContentRefForIndex(dateContentIndex, track.schedule_type);

        // Check if content exists in cache, if not, we'll create a placeholder
        // For MVP, we'll create the user_study_log row without content_id
        // Content generation will be handled separately
        const { data: existingContent } = await supabase
          .from('content_cache')
          .select('id')
          .eq('ref_id', contentRef)
          .single();

        let contentId: string | null = null;
        if (existingContent) {
          contentId = existingContent.id;
        } else {
          try {
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
              contentId = generated?.id ?? null;
            } else {
              const errorText = await contentResponse.text();
              let errorData: any = {};
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { error: errorText };
              }
              
              // If content doesn't exist (404 or similar), log and skip this date
              // This can happen if the content reference is invalid (e.g., mishnah doesn't exist)
              if (contentResponse.status === 404 || contentResponse.status === 500) {
                console.warn(`Content generation failed for ${contentRef} (${studyDate}):`, errorData.error || errorText);
                // Skip this date - don't create a user_study_log entry
                continue;
              } else {
                console.warn('generate-content failed:', errorText);
              }
            }
          } catch (error) {
            console.warn('generate-content request error:', error);
            // Skip this date if content generation fails
            continue;
          }
        }
        
        // If we still don't have contentId after trying to generate, skip this date
        if (!contentId) {
          console.warn(`No content available for ${contentRef} (${studyDate}), skipping date`);
          continue;
        }

        // Check if log entry already exists
        const { data: existingLog } = await supabase
          .from('user_study_log')
          .select('id, content_id, is_completed, completed_at')
          .eq('user_id', body.user_id)
          .eq('track_id', body.track_id)
          .eq('study_date', studyDate)
          .maybeSingle();

        let logEntry;
        
        if (existingLog) {
          // Entry already exists - check if content is missing and regenerate if needed
          let needsContentUpdate = false;
          let finalContentId = existingLog.content_id;
          
          // Check if content_id is null or points to missing content
          if (existingLog.content_id === null) {
            // No content assigned - use the generated contentId
            needsContentUpdate = true;
            finalContentId = contentId;
          } else {
            // Content_id exists - verify the content actually exists in cache
            const { data: contentCheck } = await supabase
              .from('content_cache')
              .select('id')
              .eq('id', existingLog.content_id)
              .single();
            
            if (!contentCheck) {
              // Content was deleted - regenerate it
              console.log(`Content missing for ref_id: ${contentRef}, regenerating...`);
              finalContentId = contentId;
              needsContentUpdate = true;
            }
          }
          
          if (needsContentUpdate && finalContentId !== null) {
            // Update with new content_id
            const { data, error } = await supabase
              .from('user_study_log')
              .update({ content_id: finalContentId })
              .eq('id', existingLog.id)
              .select()
              .single();
            
            if (error) {
              console.error('Error updating user_study_log content:', error);
              // Continue with other dates even if one fails
              continue;
            }
            logEntry = data;
          } else {
            // Entry exists with valid content - use existing entry
            logEntry = existingLog;
          }
        } else {
          // New entry - create with is_completed: false
          const { data, error } = await supabase
            .from('user_study_log')
            .insert({
              user_id: body.user_id,
              track_id: body.track_id,
              study_date: studyDate,
              content_id: contentId,
              is_completed: false,
            })
            .select()
            .single();
          
          if (error) {
            console.error('Error creating user_study_log:', error);
            // Continue with other dates even if one fails
            continue;
          }
          logEntry = data;
        }

        if (logEntry) {
          scheduledUnits.push({
            id: logEntry.id,
            study_date: studyDate,
            content_id: logEntry.content_id,
            is_completed: logEntry.is_completed,
          });
        }

        contentIndex++;
      }
    }

    const response: GenerateScheduleResponse = {
      scheduled_units: scheduledUnits,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-schedule:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
