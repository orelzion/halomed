// supabase/functions/generate-content/index.ts
// Edge Function to generate AI-powered content explanations
// Reference: TDD Section 7, content-generation.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { validateAuth } from '../_shared/auth.ts';
import { fetchText, fetchCommentaries, toSefariaRef } from '../_shared/sefaria.ts';

interface ContentGenerationRequest {
  ref_id: string;  // e.g., "Mishnah_Berakhot.1.1"
}

interface ContentGenerationResponse {
  id: string;
  ref_id: string;
  source_text_he: string;
  ai_explanation_he: string;
  ai_deep_dive_json: {
    approaches: Array<{
      commentator: string;
      summary_he: string;
    }>;
  };
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
    const body: ContentGenerationRequest = await req.json();
    const { ref_id } = body;

    if (!ref_id) {
      return new Response(
        JSON.stringify({ error: 'Missing ref_id' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if content already exists in cache
    const { data: existingContent, error: fetchError } = await supabase
      .from('content_cache')
      .select('*')
      .eq('ref_id', ref_id)
      .single();

    if (existingContent && !fetchError) {
      // Return cached content
      return new Response(
        JSON.stringify({
          id: existingContent.id,
          ref_id: existingContent.ref_id,
          source_text_he: existingContent.source_text_he,
          ai_explanation_he: existingContent.ai_explanation_he,
          ai_deep_dive_json: existingContent.ai_deep_dive_json,
        } as ContentGenerationResponse),
        { status: 200, headers: corsHeaders }
      );
    }

    // Content doesn't exist - generate it
    // Convert ref_id to Sefaria format
    const sefariaRef = toSefariaRef(ref_id);

    // Fetch source text from Sefaria
    let sourceText: string;
    try {
      const sefariaText = await fetchText(sefariaRef);
      sourceText = sefariaText.he;
      
      if (!sourceText || sourceText.length === 0) {
        throw new Error('Sefaria API returned empty Hebrew text');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({ error: `Failed to fetch text from Sefaria: ${errorMsg}` }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch commentaries (optional - for future AI generation)
    let commentaries: any[] = [];
    try {
      commentaries = await fetchCommentaries(sefariaRef);
    } catch (error) {
      // Commentaries are optional, so we continue even if this fails
      console.warn('Failed to fetch commentaries:', error);
    }

    // Generate AI explanation
    // For MVP, we'll create a placeholder explanation
    // TODO: Integrate OpenAI API for actual AI generation
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    let aiExplanation = '';
    let aiDeepDive = {
      approaches: [] as Array<{ commentator: string; summary_he: string }>,
    };

    if (openaiApiKey) {
      // TODO: Implement actual OpenAI API call
      // For now, use placeholder
      aiExplanation = `הסבר אוטומטי יופעל כאן. טקסט המקור: ${sourceText.substring(0, 50)}...`;
      aiDeepDive = {
        approaches: [
          { commentator: 'רש"י', summary_he: 'פירוש ראשון' },
        ],
      };
    } else {
      // No API key - use placeholder
      aiExplanation = `הסבר אוטומטי יופעל כאן. טקסט המקור: ${sourceText.substring(0, 50)}...`;
      aiDeepDive = {
        approaches: [
          { commentator: 'רש"י', summary_he: 'פירוש ראשון' },
        ],
      };
    }

    // Store in content_cache
    const { data: newContent, error: insertError } = await supabase
      .from('content_cache')
      .insert({
        ref_id: ref_id,
        source_text_he: sourceText,
        ai_explanation_he: aiExplanation,
        ai_deep_dive_json: aiDeepDive,
      })
      .select()
      .single();

    if (insertError || !newContent) {
      return new Response(
        JSON.stringify({ error: `Failed to cache content: ${insertError?.message || 'Unknown error'}` }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Return generated content
    return new Response(
      JSON.stringify({
        id: newContent.id,
        ref_id: newContent.ref_id,
        source_text_he: newContent.source_text_he,
        ai_explanation_he: newContent.ai_explanation_he,
        ai_deep_dive_json: newContent.ai_deep_dive_json,
      } as ContentGenerationResponse),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('generate-content error:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: corsHeaders }
    );
  }
});
