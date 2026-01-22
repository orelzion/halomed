// supabase/functions/generate-content/index.ts
// Edge Function to generate AI-powered content explanations
// Reference: TDD Section 7, content-generation.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { validateAuth } from '../_shared/auth.ts';
import { fetchText, fetchCommentaries, toSefariaRef, extractCommentatorName, fetchCommentaryText } from '../_shared/sefaria.ts';
import { fetchMishnaFromWikisource } from '../_shared/wikisource.ts';
import { generateMishnahExplanation } from '../_shared/gemini.ts';
import { isPlaceholderContent } from '../_shared/content-validation.ts';

interface ContentGenerationRequest {
  ref_id: string;  // e.g., "Mishnah_Berakhot.1.1"
}

interface ContentGenerationResponse {
  id: string;
  ref_id: string;
  source_text_he: string;
  ai_explanation_json: {
    summary: string;
    halakha: string;
    opinions: Array<{
      source: string;
      details: string;
    }>;
    expansions: Array<{
      topic: string;
      explanation: string;
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

    // Check if existing content is a placeholder (incomplete/failed generation)
    const isExistingPlaceholder = existingContent && !fetchError && 
      isPlaceholderContent(existingContent.ai_explanation_json);
    
    if (isExistingPlaceholder) {
      console.log(`[generate-content] Found placeholder content for ${ref_id}, will regenerate`);
      // Delete the placeholder content so we can regenerate
      const { error: deleteError } = await supabase
        .from('content_cache')
        .delete()
        .eq('id', existingContent.id);
      
      if (deleteError) {
        console.error(`[generate-content] Failed to delete placeholder content: ${deleteError.message}`);
      } else {
        console.log(`[generate-content] Deleted placeholder content for ${ref_id}`);
      }
      // Continue to regenerate content below
    }
    // If content exists, has he_ref, and is NOT a placeholder, return cached content
    else if (existingContent && !fetchError && existingContent.he_ref) {
      // Return cached content
      return new Response(
        JSON.stringify({
          id: existingContent.id,
          ref_id: existingContent.ref_id,
          source_text_he: existingContent.source_text_he,
          ai_explanation_json: existingContent.ai_explanation_json,
        } as ContentGenerationResponse),
        { status: 200, headers: corsHeaders }
      );
    }
    // If content exists but missing he_ref (and not placeholder), update it
    else if (existingContent && !fetchError && !existingContent.he_ref) {
      const sefariaRef = toSefariaRef(ref_id);
      try {
        const sefariaText = await fetchText(sefariaRef);
        const heRef = sefariaText.heRef || null;
        
        if (heRef) {
          // Update existing content with he_ref
          const { data: updatedContent, error: updateError } = await supabase
            .from('content_cache')
            .update({ he_ref: heRef })
            .eq('id', existingContent.id)
            .select()
            .single();
          
          if (!updateError && updatedContent) {
            return new Response(
              JSON.stringify({
                id: updatedContent.id,
                ref_id: updatedContent.ref_id,
                source_text_he: updatedContent.source_text_he,
                ai_explanation_json: updatedContent.ai_explanation_json,
              } as ContentGenerationResponse),
              { status: 200, headers: corsHeaders }
            );
          }
        }
      } catch (error) {
        console.warn('Failed to fetch he_ref for existing content:', error);
        // Fall through to return existing content without he_ref
      }
      
      // If update failed, return existing content anyway
      return new Response(
        JSON.stringify({
          id: existingContent.id,
          ref_id: existingContent.ref_id,
          source_text_he: existingContent.source_text_he,
          ai_explanation_json: existingContent.ai_explanation_json,
        } as ContentGenerationResponse),
        { status: 200, headers: corsHeaders }
      );
    }

    // Content doesn't exist - generate it
    // Convert ref_id to Sefaria format
    const sefariaRef = toSefariaRef(ref_id);

    // Fetch source text - try Wikisource first for structured text, fallback to Sefaria
    let sourceText: string;
    let heRef: string | null = null;
    let textSource: 'wikisource' | 'sefaria' = 'sefaria';
    
    // First, always fetch from Sefaria to get heRef (Hebrew reference for display)
    let sefariaText: { he: string; heRef?: string } | null = null;
    try {
      sefariaText = await fetchText(sefariaRef);
      heRef = sefariaText.heRef || null;
    } catch (error) {
      console.warn(`Failed to fetch heRef from Sefaria: ${error}`);
    }
    
    // Try Wikisource for structured Mishna text
    try {
      sourceText = await fetchMishnaFromWikisource(ref_id, 2);
      textSource = 'wikisource';
      console.log(`[generate-content] Fetched structured text from Wikisource for ${ref_id}`);
      
      if (!sourceText || sourceText.length === 0) {
        throw new Error('Wikisource returned empty text');
      }
    } catch (wikisourceError) {
      // Fallback to Sefaria if Wikisource fails
      console.warn(`[generate-content] Wikisource failed for ${ref_id}, falling back to Sefaria:`, wikisourceError);
      
      if (sefariaText && sefariaText.he) {
        sourceText = sefariaText.he;
        textSource = 'sefaria';
      } else {
        // Need to fetch from Sefaria
        try {
          const freshSefariaText = await fetchText(sefariaRef);
          sourceText = freshSefariaText.he;
          heRef = freshSefariaText.heRef || heRef;
          textSource = 'sefaria';
          
          if (!sourceText || sourceText.length === 0) {
            throw new Error('Sefaria API returned empty Hebrew text');
          }
        } catch (sefariaError) {
          const errorMsg = sefariaError instanceof Error ? sefariaError.message : String(sefariaError);
          return new Response(
            JSON.stringify({ error: `Failed to fetch text from both Wikisource and Sefaria: ${errorMsg}` }),
            { status: 500, headers: corsHeaders }
          );
        }
      }
    }
    
    console.log(`[generate-content] Using ${textSource} text for ${ref_id} (${sourceText.length} chars)`);

    // Fetch classical commentaries from Sefaria (Bartenura, Mishnat Eretz Israel, Rambam)
    // Use text from links response to avoid extra API calls
    let commentaries: Array<{ name: string; text: string }> = [];
    try {
      const commentaryLinks = await fetchCommentaries(sefariaRef);
      console.log(`Found ${commentaryLinks.length} commentary links for ${sefariaRef}`);
      
      // Group commentaries by commentator and combine all segments into one text
      const commentariesByAuthor: Record<string, string[]> = {};
      
      for (const link of commentaryLinks) {
        const commentatorName = extractCommentatorName(link.ref);
        
        // Use text from links response if available (avoids extra API call)
        let commentaryText = '';
        if (link.he && typeof link.he === 'string') {
          // Remove HTML tags and clean up the text
          commentaryText = link.he
            .replace(/<[^>]+>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace HTML entities
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        } else if (link.he && Array.isArray(link.he)) {
          // If array, join with space
          commentaryText = link.he
            .map((item: any) => String(item).replace(/<[^>]+>/g, '').trim())
            .filter((item: string) => item.length > 0)
            .join(' ');
        } else {
          // Fallback: fetch separately if not in links response
          try {
            commentaryText = await fetchCommentaryText(link.ref);
          } catch (error) {
            console.warn(`Failed to fetch commentary text for ${link.ref}:`, error);
            continue;
          }
        }
        
        if (commentaryText) {
          if (!commentariesByAuthor[commentatorName]) {
            commentariesByAuthor[commentatorName] = [];
          }
          commentariesByAuthor[commentatorName].push(commentaryText);
        }
      }
      
      // Combine all segments for each commentator into one text
      for (const [name, texts] of Object.entries(commentariesByAuthor)) {
        commentaries.push({
          name: name,
          text: texts.join(' '), // Combine all segments with space
        });
      }
      
      console.log(`Successfully processed ${commentaries.length} commentators for ${sefariaRef}`);
    } catch (error) {
      // Commentaries are optional, so we continue if this fails
      console.warn('Failed to fetch commentaries:', error);
    }

    // Generate AI explanation using Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    // Log for debugging (remove in production)
    if (!geminiApiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found in edge function environment');
      console.warn('Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.includes('API') || k.includes('KEY')).join(', '));
    } else {
      console.log('✅ GEMINI_API_KEY found, length:', geminiApiKey.length);
    }
    
    let aiExplanationJson = {
      summary: '',
      halakha: '',
      opinions: [] as Array<{ source: string; details: string }>,
      expansions: [] as Array<{ topic: string; explanation: string }>,
    };

    if (geminiApiKey) {
      try {
        // Generate structured JSON explanation
        const result = await generateMishnahExplanation(
          {
            sourceText,
            commentaries: commentaries.map((c: any) => ({
              name: c.name,
              text: c.text,
            })),
          },
          geminiApiKey
        );
        
        aiExplanationJson = result;
      } catch (error) {
        // If Gemini API fails, return error - DO NOT cache placeholder
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Gemini API error:', errorMsg);
        
        return new Response(
          JSON.stringify({ 
            error: 'AI content generation failed',
            details: errorMsg,
            ref_id: ref_id,
            retriable: true
          }),
          { status: 503, headers: corsHeaders }
        );
      }
    } else {
      // No API key - return error, DO NOT cache placeholder
      console.error('GEMINI_API_KEY not set, cannot generate content');
      return new Response(
        JSON.stringify({ 
          error: 'AI service not configured',
          details: 'GEMINI_API_KEY environment variable is not set',
          ref_id: ref_id,
          retriable: false
        }),
        { status: 503, headers: corsHeaders }
      );
    }

    // Store in content_cache
    const { data: newContent, error: insertError } = await supabase
      .from('content_cache')
      .insert({
        ref_id: ref_id,
        source_text_he: sourceText,
        ai_explanation_json: aiExplanationJson,
        he_ref: heRef,
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
        ai_explanation_json: newContent.ai_explanation_json,
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
