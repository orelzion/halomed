// supabase/functions/ensure-content/index.ts
// Edge Function to ensure content is generated for the next 14 days of learning path nodes
// Reference: Content generation for offline use

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { formatDate } from '../_shared/calendar.ts';

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

    // Get all learning nodes (not quiz/review/divider) within next 14 days
    const { data: learningNodes, error: nodesError } = await supabase
      .from('learning_path')
      .select('content_ref')
      .eq('user_id', body.user_id)
      .eq('node_type', 'learning')
      .eq('is_divider', false)
      .not('content_ref', 'is', null)
      .gte('unlock_date', todayStr)
      .lte('unlock_date', fourteenDaysLaterStr);

    if (nodesError) {
      console.error('Error fetching learning nodes:', nodesError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch learning nodes',
          details: nodesError.message 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!learningNodes || learningNodes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          content_checked: 0,
          content_generated: 0,
          content_cached: 0,
          content_errors: 0,
          message: 'No learning nodes found in the next 14 days'
        } as EnsureContentResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract unique content_ref values
    const uniqueContentRefs = Array.from(new Set(
      learningNodes
        .map(node => node.content_ref)
        .filter((ref): ref is string => ref !== null)
    ));

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
