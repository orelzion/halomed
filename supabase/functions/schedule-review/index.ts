// supabase/functions/schedule-review/index.ts
// Edge Function to schedule review nodes when a learning node is completed
// Implements spaced repetition based on user's review_intensity setting
// Reference: Plan Section "Spaced Repetition Schedule"

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { isScheduledDay, addDays, formatDate } from '../_shared/calendar.ts';

interface ScheduleReviewRequest {
  user_id: string;
  completed_node_id: string; // The learning node that was just completed
}

interface ScheduleReviewResponse {
  success: boolean;
  review_nodes_created: number;
  message: string;
}

// Review intervals based on intensity
const REVIEW_INTERVALS: Record<string, number[]> = {
  'none': [],
  'light': [7, 30],
  'medium': [3, 7, 30],
  'intensive': [1, 3, 7, 14, 30],
};

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
    if (!body.user_id || !body.completed_node_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, completed_node_id' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user preferences to determine review intervals
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('review_intensity')
      .eq('user_id', body.user_id)
      .single();

    if (prefError || !preferences) {
      return new Response(
        JSON.stringify({ error: 'User preferences not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    const { review_intensity } = preferences;
    const intervals = REVIEW_INTERVALS[review_intensity] || [];

    // If no reviews (intensity = 'none'), return early
    if (intervals.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          review_nodes_created: 0,
          message: 'No review nodes scheduled (review intensity: none)'
        } as ScheduleReviewResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the completed learning node
    const { data: completedNode, error: nodeError } = await supabase
      .from('learning_path')
      .select('id, node_index, content_ref, tractate, chapter, unlock_date')
      .eq('id', body.completed_node_id)
      .eq('user_id', body.user_id)
      .eq('node_type', 'learning')
      .single();

    if (nodeError || !completedNode) {
      return new Response(
        JSON.stringify({ error: 'Completed learning node not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get the highest node_index to insert review nodes after existing nodes
    const { data: maxNode, error: maxError } = await supabase
      .from('learning_path')
      .select('node_index')
      .eq('user_id', body.user_id)
      .order('node_index', { ascending: false })
      .limit(1)
      .single();

    let nextNodeIndex = completedNode.node_index + 1;
    if (maxNode && maxNode.node_index >= nextNodeIndex) {
      nextNodeIndex = maxNode.node_index + 1;
    }

    // Get completion date (use unlock_date as base, or current date)
    const completionDate = parseDate(completedNode.unlock_date);
    const reviewNodes = [];

    // Create review nodes for each interval
    for (const interval of intervals) {
      const reviewDate = addDays(completionDate, interval);
      
      // Find next scheduled weekday for review date
      let reviewScheduledDate = new Date(reviewDate);
      let daysOffset = 0;
      while (!(await isScheduledDay(reviewScheduledDate, 'DAILY_WEEKDAYS_ONLY'))) {
        daysOffset++;
        reviewScheduledDate = addDays(reviewDate, daysOffset);
      }

      reviewNodes.push({
        user_id: body.user_id,
        node_index: nextNodeIndex++,
        node_type: 'review',
        content_ref: completedNode.content_ref,
        tractate: completedNode.tractate,
        chapter: completedNode.chapter,
        is_divider: false,
        unlock_date: formatDate(reviewScheduledDate),
        review_of_node_id: completedNode.id,
      });
    }

    // Insert review nodes
    if (reviewNodes.length > 0) {
      const { error: insertError } = await supabase
        .from('learning_path')
        .insert(reviewNodes);

      if (insertError) {
        console.error('Error inserting review nodes:', insertError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create review nodes',
            details: insertError.message 
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        review_nodes_created: reviewNodes.length,
        message: `Scheduled ${reviewNodes.length} review nodes`
      } as ScheduleReviewResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scheduling reviews:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// Helper function to parse date
function parseDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00Z');
}
