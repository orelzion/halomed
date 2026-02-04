// supabase/functions/schedule-review/index.ts
// Edge Function to track review completion dates in user_preferences
// Records when users complete review sessions for position-based review scheduling
// Reference: Plan Section "Position-Based Review Scheduling"

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

interface ScheduleReviewRequest {
  user_id: string;
  completion_date: string; // Date of the review completion (YYYY-MM-DD)
  review_items_completed?: number; // Number of items reviewed in this session
  track_id?: string; // Optional: track identifier for context
}

interface ScheduleReviewResponse {
  success: boolean;
  completion_tracked: boolean;
  message: string;
  total_completion_dates: number;
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
    const body: ScheduleReviewRequest = await req.json();

    // Validate request
    if (!body.user_id || !body.completion_date) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, completion_date' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate completion_date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.completion_date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid completion_date format. Expected: YYYY-MM-DD' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate that the date is not in the future
    const completionDate = new Date(body.completion_date + 'T00:00:00Z');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (completionDate > today) {
      return new Response(
        JSON.stringify({ error: 'Completion date cannot be in the future' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('review_completion_dates')
      .eq('user_id', body.user_id)
      .single();

    if (prefError || !preferences) {
      return new Response(
        JSON.stringify({ error: 'User preferences not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get existing completion dates array (default to empty array)
    const existingDates = preferences.review_completion_dates || [];

    // Check if this completion date is already tracked
    if (existingDates.includes(body.completion_date)) {
      return new Response(
        JSON.stringify({
          success: true,
          completion_tracked: false,
          message: 'Completion date already tracked',
          total_completion_dates: existingDates.length
        } as ScheduleReviewResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add new completion date to the array
    const updatedDates = [...existingDates, body.completion_date].sort();

    // Update user preferences with new completion date
    const { error: updateError } = await supabase
      .from('user_preferences')
      .update({
        review_completion_dates: updatedDates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', body.user_id);

    if (updateError) {
      console.error('Error updating review completion dates:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to track review completion',
          details: updateError.message 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Optional: Log review session details for analytics (if track_id provided)
    if (body.track_id && body.review_items_completed) {
      console.log(`Review session completed: user=${body.user_id}, date=${body.completion_date}, track=${body.track_id}, items=${body.review_items_completed}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        completion_tracked: true,
        message: `Review completion tracked for ${body.completion_date}`,
        total_completion_dates: updatedDates.length
      } as ScheduleReviewResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error tracking review completion:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
