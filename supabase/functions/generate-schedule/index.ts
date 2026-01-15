// supabase/functions/generate-schedule/index.ts
// Edge Function to generate scheduled learning units for a user
// Reference: TDD Section 6, scheduling.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

    // Get user's current position in track
    // For new users joining: content starts from beginning (index 0)
    // For existing users: continue from where they left off (total scheduled units)
    const { count: totalScheduledCount } = await supabase
      .from('user_study_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', body.user_id)
      .eq('track_id', body.track_id);

    // Content index is based on total scheduled units (not just completed)
    // This ensures sequential content assignment from user's join point
    const currentContentIndex = totalScheduledCount ?? 0;

    // Parse start date
    const startDate = parseDate(body.start_date);
    if (isNaN(startDate.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid start_date format. Use YYYY-MM-DD' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate schedule
    const scheduledUnits: ScheduledUnit[] = [];
    let contentIndex = currentContentIndex;

    for (let i = 0; i < body.days_ahead; i++) {
      const date = addDays(startDate, i);
      const studyDate = formatDate(date);

      // Check if this date is allowed by schedule type (async to check holidays)
      if (await isScheduledDay(date, track.schedule_type)) {
        // Get content reference for this index
        const contentRef = getContentRefForIndex(contentIndex);

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
              console.warn('generate-content failed:', errorText);
            }
          } catch (error) {
            console.warn('generate-content request error:', error);
          }
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
          // Entry already exists - skip unless content is missing
          // This preserves completion status and avoids unnecessary updates
          if (existingLog.content_id === null && contentId !== null) {
            // Only update if we have content to assign and entry is missing it
            const { data, error } = await supabase
              .from('user_study_log')
              .update({ content_id: contentId })
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
            // Entry exists with content (or no content available) - use existing entry
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
