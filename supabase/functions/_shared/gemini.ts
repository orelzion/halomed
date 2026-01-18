// supabase/functions/_shared/gemini.ts
// Gemini API integration with structured JSON outputs
// Reference: Gemini API migration plan, content-generation.md

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Model selection: gemini-3-flash-preview
// - Best quality with structured outputs
// - Pricing: Similar to gemini-2.5-flash ($0.075/$0.30 per 1M tokens)
// Reference: https://ai.google.dev/gemini-api/docs/structured-output
const GEMINI_MODEL = 'gemini-3-flash-preview';

export interface MishnahExplanation {
  summary: string;
  halakha: string;
  opinions: Array<{
    source: string;
    details: string;
  }>;
  expansions: Array<{
    topic: string;
    explanation: string;
    source?: string;
  }>;
}

export interface GeminiExplanationRequest {
  sourceText: string;
  commentaries?: Array<{ name: string; text: string }>;
}

/**
 * Generate JSON Schema for MishnahExplanation
 * This matches the user's example output format
 */
function getMishnahExplanationSchema(): any {
  return {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'תקציר המשנה בעברית מודרנית, תמציתי וברור',
      },
      halakha: {
        type: 'string',
        description: 'ההלכה המעשית במידה וישנה, בעברית מודרנית',
      },
      opinions: {
        type: 'array',
        description: 'רשימת הדעות השונות של החכמים',
        items: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'מקור הדעה (שם החכם והמקור)',
            },
            details: {
              type: 'string',
              description: 'פרטי הדעה בעברית מודרנית',
            },
          },
          required: ['source', 'details'],
        },
      },
      expansions: {
        type: 'array',
        description: 'הרחבות לנושאים שהקורא המודרני יצטרך הסבר נוסף',
        items: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'נושא ההרחבה',
            },
            explanation: {
              type: 'string',
              description: 'הסבר מפורט בעברית מודרנית',
            },
            source: {
              type: 'string',
              description: 'מקור ההרחבה (שם החכם, המשנה, הגמרא, או המקור הרלוונטי)',
            },
          },
          required: ['topic', 'explanation'],
        },
      },
    },
    required: ['summary', 'halakha', 'opinions', 'expansions'],
  };
}

/**
 * Generate Mishnah explanation using Gemini API with structured JSON output
 * Returns structured JSON matching the MishnahExplanation interface
 */
export async function generateMishnahExplanation(
  request: GeminiExplanationRequest,
  apiKey: string,
  retries: number = 3
): Promise<MishnahExplanation> {
  const { sourceText, commentaries = [] } = request;
  
  // Build prompt data matching user's example format
  // Note: Uses 'commentary' (singular) not 'commentaries' (plural)
  const promptData = {
    text: sourceText,
    commentary: commentaries.map(c => ({
      name: c.name,
      text: c.text,
    })),
  };
  
  // Build prompt matching user's example
  const prompt = `סכם בתמציתיות בעברית מודרנית, הרחב היכן שהקורא המודרני יצטרך הרחבה נוספת.
ציין את ההלכה במידה וישנה.
ציין תמיד את המקור לכל דעה בהרחבה.
בכל הרחבה (expansion), ציין תמיד את המקור (שם החכם, המשנה, הגמרא, או המקור הרלוונטי).

${JSON.stringify(promptData)}`;
  
  const jsonSchema = getMishnahExplanationSchema();
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
              responseJsonSchema: jsonSchema,
            },
          }),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Gemini API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error?.message || errorMsg;
        } catch (e) {
          // Use default error message
        }
        
        // Retry on rate limits or server errors
        if (response.status === 429 || response.status >= 500) {
          if (attempt < retries - 1) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Gemini API returned invalid response structure');
      }
      
      const content = data.candidates[0].content.parts[0].text;
      
      if (!content || content.length === 0) {
        throw new Error('Gemini API returned empty explanation');
      }
      
      // Parse JSON response (Gemini returns JSON string)
      const explanation = JSON.parse(content) as MishnahExplanation;
      
      // Validate structure
      if (!explanation.summary || !explanation.halakha || !Array.isArray(explanation.opinions) || !Array.isArray(explanation.expansions)) {
        throw new Error('Gemini API returned invalid explanation structure');
      }
      
      return explanation;
    } catch (error) {
      if (attempt === retries - 1) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate explanation: ${errorMsg}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  
  throw new Error('Failed to generate explanation after retries');
}

export interface QuizQuestion {
  question_text: string;
  options: string[]; // Array of 4 options
  correct_answer: number; // Index of correct answer (0-based)
  explanation: string;
}

/**
 * Generate JSON Schema for QuizQuestion
 */
function getQuizQuestionSchema(): any {
  return {
    type: 'object',
    properties: {
      question_text: {
        type: 'string',
        description: 'שאלת חידון בעברית על המשנה',
      },
      options: {
        type: 'array',
        description: '4 אפשרויות תשובה בעברית',
        items: {
          type: 'string',
        },
        minItems: 4,
        maxItems: 4,
      },
      correct_answer: {
        type: 'integer',
        description: 'אינדקס התשובה הנכונה (0-3)',
        minimum: 0,
        maximum: 3,
      },
      explanation: {
        type: 'string',
        description: 'הסבר על התשובה הנכונה בעברית',
      },
    },
    required: ['question_text', 'options', 'correct_answer', 'explanation'],
  };
}

/**
 * Generate a single quiz question using Gemini API with structured JSON output
 * @param questionNumber - The question number (1-based) for context in multi-question quizzes
 * @param totalQuestions - Total number of questions in this quiz
 */
export async function generateQuizQuestion(
  sourceText: string,
  explanation: MishnahExplanation,
  apiKey: string,
  retries: number = 3,
  questionNumber?: number,
  totalQuestions?: number
): Promise<QuizQuestion> {
  const questionContext = questionNumber && totalQuestions 
    ? `שאלה ${questionNumber} מתוך ${totalQuestions} בחידון על המשנה. `
    : '';
  
  const prompt = `${questionContext}צור שאלת חידון בעברית על המשנה הבאה.

טקסט המשנה:
${sourceText}

הסבר המשנה:
${JSON.stringify(explanation, null, 2)}

צור שאלת חידון עם 4 אפשרויות תשובה. השאלה צריכה לבדוק הבנה של המשנה.
${questionNumber && totalQuestions && questionNumber > 1 
  ? 'נסה ליצור שאלה שונה מהשאלות הקודמות, המתמקדת בהיבט אחר של המשנה. '
  : ''
}התשובה הנכונה צריכה להיות אחת מ-4 האפשרויות.
כלול הסבר קצר על התשובה הנכונה.`;

  const jsonSchema = getQuizQuestionSchema();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7, // Slightly higher for creative questions
              responseMimeType: 'application/json',
              responseJsonSchema: jsonSchema,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Gemini API error: ${response.status} ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error?.message || errorMsg;
        } catch (e) {
          // Use default error message
        }

        if (response.status === 429 || response.status >= 500) {
          if (attempt < retries - 1) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }

        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Gemini API returned invalid response structure');
      }

      const content = data.candidates[0].content.parts[0].text;

      if (!content || content.length === 0) {
        throw new Error('Gemini API returned empty quiz question');
      }

      const quizQuestion = JSON.parse(content) as QuizQuestion;

      // Validate structure
      if (!quizQuestion.question_text || !Array.isArray(quizQuestion.options) || 
          quizQuestion.options.length !== 4 || 
          quizQuestion.correct_answer < 0 || quizQuestion.correct_answer > 3) {
        throw new Error('Gemini API returned invalid quiz question structure');
      }

      return quizQuestion;
    } catch (error) {
      if (attempt === retries - 1) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate quiz question: ${errorMsg}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  throw new Error('Failed to generate quiz question after retries');
}

/**
 * Determine how many quiz questions to generate based on Mishna size
 * Small Mishnayot: 1 question
 * Medium: 3-5 questions  
 * Large: 6-8 questions
 * Max: 8 questions
 */
export function determineQuestionCount(sourceText: string): number {
  // Estimate based on text length (Hebrew characters)
  const textLength = sourceText.length;
  
  // Very short (< 100 chars): 1 question
  if (textLength < 100) return 1;
  
  // Short (100-200 chars): 2-3 questions
  if (textLength < 200) return 2 + Math.floor(Math.random() * 2); // 2 or 3
  
  // Medium (200-400 chars): 4-6 questions
  if (textLength < 400) return 4 + Math.floor(Math.random() * 3); // 4, 5, or 6
  
  // Large (400+ chars): 6-8 questions
  return 6 + Math.floor(Math.random() * 3); // 6, 7, or 8
}

/**
 * Generate JSON Schema for array of quiz questions
 */
function getQuizQuestionsArraySchema(maxQuestions: number): any {
  return {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'שאלת חידון בעברית על המשנה',
        },
        options: {
          type: 'array',
          description: '4 אפשרויות תשובה בעברית',
          items: {
            type: 'string',
          },
          minItems: 4,
          maxItems: 4,
        },
        correct_answer_index: {
          type: 'integer',
          description: 'אינדקס התשובה הנכונה (0-3)',
          minimum: 0,
          maximum: 3,
        },
        explanation: {
          type: 'string',
          description: 'הסבר על התשובה הנכונה בעברית',
        },
      },
      required: ['question', 'options', 'correct_answer_index', 'explanation'],
    },
    minItems: 1,
    maxItems: maxQuestions,
  };
}

/**
 * Generate multiple quiz questions (1-8) for a Mishna in a single API call
 */
export async function generateQuizQuestions(
  sourceText: string,
  explanation: MishnahExplanation,
  apiKey: string,
  retries: number = 3
): Promise<QuizQuestion[]> {
  const questionCount = determineQuestionCount(sourceText);
  
  console.log(`[generateQuizQuestions] Generating ${questionCount} questions for Mishna (${sourceText.length} chars)`);
  
  // Format explanation text for the prompt
  let explanationText = '';
  if (!explanation) {
    explanationText = 'לא קיים הסבר למשנה זו.';
  } else if (typeof explanation === 'string') {
    explanationText = explanation;
  } else {
    // Build explanation from structured format
    const parts: string[] = [];
    if (explanation.summary) parts.push(explanation.summary);
    if (explanation.halakha) parts.push(`הלכה\n${explanation.halakha}`);
    if (explanation.opinions && Array.isArray(explanation.opinions) && explanation.opinions.length > 0) {
      parts.push('דעות:\n' + explanation.opinions.map(o => `${o.source}: ${o.details}`).join('\n'));
    }
    if (explanation.expansions && Array.isArray(explanation.expansions) && explanation.expansions.length > 0) {
      parts.push(explanation.expansions.map(e => `${e.topic}: ${e.explanation}`).join('\n'));
    }
    explanationText = parts.length > 0 ? parts.join('\n\n') : 'לא קיים הסבר מפורט למשנה זו.';
  }
  
  const prompt = `create a quiz for an app about learning Mishna, here's the Mishna text and simple explanation:
${sourceText}
${explanationText}

Generate ${questionCount} quiz questions covering different aspects of the Mishna. Each question should have 4 answer options in Hebrew. Return as a JSON array.`;

  const jsonSchema = getQuizQuestionsArraySchema(questionCount);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json',
              responseJsonSchema: jsonSchema,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Gemini API error: ${response.status} ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error?.message || errorMsg;
        } catch (e) {
          // Use default error message
        }

        if (response.status === 429 || response.status >= 500) {
          if (attempt < retries - 1) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }

        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Gemini API returned invalid response structure');
      }

      const content = data.candidates[0].content.parts[0].text;

      if (!content || content.length === 0) {
        throw new Error('Gemini API returned empty quiz questions');
      }

      let rawQuestions: Array<{
        question: string;
        options: string[];
        correct_answer_index: number;
        explanation: string;
      }>;
      
      try {
        rawQuestions = JSON.parse(content);
      } catch (parseError) {
        console.error('[generateQuizQuestions] JSON parse error:', parseError);
        console.error('[generateQuizQuestions] Content received:', content.substring(0, 500));
        throw new Error(`Failed to parse quiz questions JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Validate and convert to our format
      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        throw new Error('Gemini API returned invalid quiz questions structure - expected array');
      }

      // Convert to our internal format
      const questions: QuizQuestion[] = rawQuestions.map((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 ||
            q.correct_answer_index < 0 || q.correct_answer_index > 3) {
          throw new Error(`Invalid quiz question structure at index ${index}`);
        }
        
        return {
          question_text: q.question,
          options: q.options,
          correct_answer: q.correct_answer_index,
          explanation: q.explanation || '',
        };
      });

      // Limit to max question count
      const finalQuestions = questions.slice(0, questionCount);
      
      console.log(`[generateQuizQuestions] Successfully generated ${finalQuestions.length} questions`);
      return finalQuestions;
      
    } catch (error) {
      if (attempt === retries - 1) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate quiz questions: ${errorMsg}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  throw new Error('Failed to generate quiz questions after retries');
}
