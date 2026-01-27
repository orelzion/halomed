// supabase/functions/generate-quiz/index.ts
// Edge Function to generate quiz questions for a content reference
// Reference: Plan Section "Phase 5: Quiz System", content-generation.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { generateQuizQuestions } from '../_shared/gemini.ts';

interface GenerateQuizRequest {
  content_ref: string; // e.g., "Mishnah_Berakhot.1.1"
}

interface GenerateQuizResponse {
  success: boolean;
  quiz_question_ids: string[];
  questions_generated: number;
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
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body
    const body: GenerateQuizRequest = await req.json();
    const { content_ref } = body;

    if (!content_ref) {
      return new Response(
        JSON.stringify({ error: 'Missing content_ref' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if quiz questions already exist for this content_ref
    const { data: existingQuizzes, error: quizError } = await supabase
      .from('quiz_questions')
      .select('id, question_index')
      .eq('content_ref', content_ref)
      .order('question_index', { ascending: true });

    if (existingQuizzes && existingQuizzes.length > 0 && !quizError) {
      return new Response(
        JSON.stringify({
          success: true,
          quiz_question_ids: existingQuizzes.map(q => q.id),
          questions_generated: existingQuizzes.length,
          message: `Quiz questions already exist (${existingQuizzes.length} questions)`
        } as GenerateQuizResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get content from content_cache
    const { data: content, error: contentError } = await supabase
      .from('content_cache')
      .select('ref_id, source_text_he, ai_explanation_json')
      .eq('ref_id', content_ref)
      .single();

    if (contentError || !content) {
      return new Response(
        JSON.stringify({ error: 'Content not found. Generate content first.' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Parse explanation JSON
    let explanation: any;
    try {
      explanation = typeof content.ai_explanation_json === 'string' 
        ? JSON.parse(content.ai_explanation_json)
        : content.ai_explanation_json;
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid explanation JSON in content cache' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Generate multiple quiz questions (1-8) using AI
    let quizQuestions;
    try {
      quizQuestions = await generateQuizQuestions(
        content.source_text_he,
        explanation,
        geminiApiKey
      );
    } catch (error) {
      console.error('Error generating quiz questions:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate quiz questions',
          details: error instanceof Error ? error.message : String(error)
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Store all quiz questions in database with question_index
    const questionsToInsert = quizQuestions.map((q, index) => ({
      content_ref: content_ref,
      question_index: index,
      question_text: q.question_text,
      options: q.options, // JSONB array
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }));

    // Use upsert with ignoreDuplicates to handle race conditions
    // If another request already inserted questions for this content_ref, we skip duplicates
    const { data: newQuizzes, error: insertError } = await supabase
      .from('quiz_questions')
      .upsert(questionsToInsert, { 
        onConflict: 'content_ref,question_index',
        ignoreDuplicates: true 
      })
      .select('id');

    if (insertError) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store quiz questions',
          details: insertError?.message || 'Unknown error'
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // If all were duplicates, fetch existing ones
    if (!newQuizzes || newQuizzes.length === 0) {
      const { data: existingQuizzes } = await supabase
        .from('quiz_questions')
        .select('id')
        .eq('content_ref', content_ref);
      
      return new Response(
        JSON.stringify({
          success: true,
          quiz_question_ids: existingQuizzes?.map(q => q.id) || [],
          questions_generated: existingQuizzes?.length || 0,
          message: `Quiz questions already exist (race condition handled)`
        } as GenerateQuizResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        quiz_question_ids: newQuizzes.map(q => q.id),
        questions_generated: newQuizzes.length,
        message: `Generated ${newQuizzes.length} quiz questions successfully`
      } as GenerateQuizResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('generate-quiz error:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: corsHeaders }
    );
  }
});
