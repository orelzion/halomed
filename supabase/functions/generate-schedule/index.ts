// supabase/functions/generate-schedule/index.ts
// Edge Function to generate scheduled learning units for a user
// Reference: TDD Section 6, scheduling.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { validateAuth } from '../_shared/auth.ts';
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

    // Validate authentication (optional for MVP - can be made required later)
    // For now, we'll validate that the user_id exists
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
        }

        // Create or update user_study_log row (UPSERT to avoid duplicates)
        const { data: logEntry, error: logError } = await supabase
          .from('user_study_log')
          .upsert({
            user_id: body.user_id,
            track_id: body.track_id,
            study_date: studyDate,
            content_id: contentId,
            is_completed: false,
          }, {
            onConflict: 'user_id,study_date,track_id',
            ignoreDuplicates: false, // Update if exists
          })
          .select()
          .single();

        if (logError) {
          console.error('Error creating user_study_log:', logError);
          // Continue with other dates even if one fails
          continue;
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
