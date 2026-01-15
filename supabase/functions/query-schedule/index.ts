// supabase/functions/query-schedule/index.ts
// Edge Function to query user's schedule for a track (all scheduled units, not just 14-day window)
// Reference: tasks.md Section 9, Task 9.3

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

interface QueryScheduleRequest {
  track_id: string;
  user_id: string;
}

interface ScheduledUnit {
  id: string;
  study_date: string;
  content_id: string | null;
  is_completed: boolean;
  completed_at: string | null;
  content_ref_id: string | null;
  content_he_ref: string | null;
}

interface QueryScheduleResponse {
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Security: This function is deployed with --no-verify-jwt
    // Authentication is handled by the API route (web/app/api/query-schedule/route.ts)
    // which validates the user's JWT before calling this function.
    // The user_id in the request body is trusted because it comes from an authenticated API route.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: QueryScheduleRequest = await req.json();

    // Validate request
    if (!body.track_id || !body.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: track_id, user_id' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify track exists
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, title')
      .eq('id', body.track_id)
      .single();

    if (trackError || !track) {
      return new Response(
        JSON.stringify({ error: 'Track not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Query all scheduled units for this user and track (not limited to 14-day window)
    // First get the study logs
    const { data: studyLogs, error: logsError } = await supabase
      .from('user_study_log')
      .select('id, study_date, content_id, is_completed, completed_at')
      .eq('user_id', body.user_id)
      .eq('track_id', body.track_id)
      .order('study_date', { ascending: true });

    if (logsError) {
      console.error('Error querying user_study_log:', logsError);
      return new Response(
        JSON.stringify({ error: 'Failed to query schedule' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Get content ref_ids and he_refs for all content_ids
    const contentIds = (studyLogs || [])
      .map((log: any) => log.content_id)
      .filter((id: string | null): id is string => id !== null);
    
    let contentRefMap: Record<string, string> = {};
    let contentHeRefMap: Record<string, string> = {};
    if (contentIds.length > 0) {
      const { data: contentCache, error: contentError } = await supabase
        .from('content_cache')
        .select('id, ref_id, he_ref')
        .in('id', contentIds);
      
      if (!contentError && contentCache) {
        contentRefMap = contentCache.reduce((acc: Record<string, string>, item: any) => {
          acc[item.id] = item.ref_id;
          return acc;
        }, {});
        contentHeRefMap = contentCache.reduce((acc: Record<string, string>, item: any) => {
          // Include he_ref even if it's null/empty for debugging, but only add non-empty values
          if (item.he_ref && item.he_ref.trim()) {
            acc[item.id] = item.he_ref;
          } else {
            // Log when he_ref is missing for debugging
            console.log(`Missing he_ref for content_id: ${item.id}, ref_id: ${item.ref_id}`);
          }
          return acc;
        }, {});
      }
    }

    // Transform results to match response interface
    const scheduledUnits: ScheduledUnit[] = (studyLogs || []).map((log: any) => ({
      id: log.id,
      study_date: log.study_date,
      content_id: log.content_id,
      is_completed: log.is_completed,
      completed_at: log.completed_at,
      content_ref_id: log.content_id ? (contentRefMap[log.content_id] || null) : null,
      content_he_ref: log.content_id ? (contentHeRefMap[log.content_id] || null) : null,
    }));

    const response: QueryScheduleResponse = {
      scheduled_units: scheduledUnits,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in query-schedule:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
