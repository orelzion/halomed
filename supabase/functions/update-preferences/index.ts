// supabase/functions/update-preferences/index.ts
// Edge Function to update user preferences (pace, review intensity) and regenerate learning path
// Preserves completed nodes when changing plan
// Reference: Task 13.1 - Study Plan Change feature

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { formatDate } from '../_shared/calendar.ts';
import { getContentIndexForRef } from '../_shared/content-order.ts';

type Pace = 'one_mishna' | 'two_mishna' | 'one_chapter';
type ReviewIntensity = 'none' | 'light' | 'medium' | 'intensive';

interface UpdatePreferencesRequest {
  user_id: string;
  pace: Pace;
  review_intensity: ReviewIntensity;
}

interface UpdatePreferencesResponse {
  success: boolean;
  message: string;
  preferences_updated: boolean;
  nodes_preserved: number;
  nodes_created: number;
}

const VALID_PACES: Pace[] = ['one_mishna', 'two_mishna', 'one_chapter'];
const VALID_REVIEW_INTENSITIES: ReviewIntensity[] = ['none', 'light', 'medium', 'intensive'];

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
    const body: UpdatePreferencesRequest = await req.json();

    // Validate required fields
    if (!body.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.pace) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: pace' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.review_intensity) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: review_intensity' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate pace value
    if (!VALID_PACES.includes(body.pace)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid pace value: ${body.pace}. Must be one of: ${VALID_PACES.join(', ')}` 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate review_intensity value
    if (!VALID_REVIEW_INTENSITIES.includes(body.review_intensity)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid review_intensity value: ${body.review_intensity}. Must be one of: ${VALID_REVIEW_INTENSITIES.join(', ')}` 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Security: This function is deployed with --no-verify-jwt
    // Authentication is handled by the API route which validates the user's JWT
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user preferences
    const { data: currentPrefs, error: prefError } = await supabase
      .from('user_preferences')
      .select('pace, review_intensity')
      .eq('user_id', body.user_id)
      .single();

    if (prefError || !currentPrefs) {
      return new Response(
        JSON.stringify({ error: 'User preferences not found. User must complete onboarding first.' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if anything is actually changing
    const paceChanged = currentPrefs.pace !== body.pace;
    const reviewChanged = currentPrefs.review_intensity !== body.review_intensity;

    if (!paceChanged && !reviewChanged) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No changes detected. Preferences remain the same.',
          preferences_updated: false,
          nodes_preserved: 0,
          nodes_created: 0
        } as UpdatePreferencesResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[update-preferences] Updating preferences for user ${body.user_id}:`);
    console.log(`  pace: ${currentPrefs.pace} -> ${body.pace}`);
    console.log(`  review_intensity: ${currentPrefs.review_intensity} -> ${body.review_intensity}`);

    // Update user preferences
    const { error: updateError } = await supabase
      .from('user_preferences')
      .update({
        pace: body.pace,
        review_intensity: body.review_intensity,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', body.user_id);

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update preferences',
          details: updateError.message 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`[update-preferences] Preferences updated successfully`);

    // Find the last completed learning node to determine where to resume
    const { data: lastCompletedNode, error: nodeError } = await supabase
      .from('learning_path')
      .select('id, node_index, content_ref, tractate, chapter')
      .eq('user_id', body.user_id)
      .not('completed_at', 'is', null)
      .not('content_ref', 'is', null) // Only learning nodes have content_ref
      .eq('is_divider', false)
      .order('node_index', { ascending: false })
      .limit(1)
      .single();

    let startFromContentIndex = 0;
    let startNodeIndex = 0;

    if (lastCompletedNode && lastCompletedNode.content_ref) {
      // Calculate the content index to resume from
      // We need to start from the NEXT content after the last completed one
      const lastContentIndex = getContentIndexForRef(lastCompletedNode.content_ref);
      if (lastContentIndex !== null) {
        startFromContentIndex = lastContentIndex + 1;
        startNodeIndex = lastCompletedNode.node_index + 1;
        console.log(`[update-preferences] Last completed: ${lastCompletedNode.content_ref} (index ${lastContentIndex})`);
        console.log(`[update-preferences] Will resume from content_index=${startFromContentIndex}, node_index=${startNodeIndex}`);
      }
    } else {
      console.log(`[update-preferences] No completed learning nodes found, will regenerate from beginning`);
    }

    // Fire-and-forget: Call generate-path with partial regeneration parameters
    // We don't wait for it to complete - the client will see updates via PowerSync
    console.log(`[update-preferences] Triggering generate-path in background (fire-and-forget)...`);
    
    // Use fetch without await to make it fire-and-forget
    fetch(`${supabaseUrl}/functions/v1/generate-path`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        user_id: body.user_id,
        preserve_completed: true,
        start_from_content_index: startFromContentIndex,
        start_node_index: startNodeIndex
      }),
    }).then(async (response) => {
      if (response.ok) {
        const result = await response.json();
        console.log(`[update-preferences] Background path regeneration completed:`, result);
      } else {
        const errorText = await response.text();
        console.error('[update-preferences] Background path regeneration failed:', errorText);
      }
    }).catch((error) => {
      console.error('[update-preferences] Background path regeneration error:', error);
    });

    // Return immediately - path will be regenerated in background
    return new Response(
      JSON.stringify({
        success: true,
        message: `Preferences updated successfully. Path regeneration started in background.`,
        preferences_updated: true,
        regenerating_path: true
      } as UpdatePreferencesResponse & { regenerating_path?: boolean }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating preferences:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
