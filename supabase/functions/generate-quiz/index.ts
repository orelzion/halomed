// supabase/functions/generate-quiz/index.ts
// Edge Function to generate quiz questions for a content reference
// Reference: Plan Section "Phase 5: Quiz System", content-generation.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { generateQuizQuestion } from '../_shared/gemini.ts';

interface GenerateQuizRequest {
  content_ref: string; // e.g., "Mishnah_Berakhot.1.1"
}

interface GenerateQuizResponse {
  success: boolean;
  quiz_question_id: string | null;
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

    // Check if quiz question already exists
    const { data: existingQuiz, error: quizError } = await supabase
      .from('quiz_questions')
      .select('id')
      .eq('content_ref', content_ref)
      .limit(1)
      .maybeSingle();

    if (existingQuiz && !quizError) {
      return new Response(
        JSON.stringify({
          success: true,
          quiz_question_id: existingQuiz.id,
          message: 'Quiz question already exists'
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

    // Generate quiz question using AI
    let quizQuestion;
    try {
      quizQuestion = await generateQuizQuestion(
        content.source_text_he,
        content.ai_explanation_json,
        geminiApiKey
      );
    } catch (error) {
      console.error('Error generating quiz question:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate quiz question',
          details: error instanceof Error ? error.message : String(error)
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Store quiz question in database
    const { data: newQuiz, error: insertError } = await supabase
      .from('quiz_questions')
      .insert({
        content_ref: content_ref,
        question_text: quizQuestion.question_text,
        options: quizQuestion.options, // JSONB array
        correct_answer: quizQuestion.correct_answer,
        explanation: quizQuestion.explanation,
      })
      .select()
      .single();

    if (insertError || !newQuiz) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store quiz question',
          details: insertError?.message || 'Unknown error'
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        quiz_question_id: newQuiz.id,
        message: 'Quiz question generated successfully'
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
