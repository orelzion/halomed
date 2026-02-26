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
  mishna_modern: string;
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
      mishna_modern: {
        type: 'string',
        description: 'המשנה כתובה מחדש בעברית מודרנית. מבוסס אך ורק על הפרשנים שמצורפים כאן. מחולקת לפסקאות ברורות עם שורה ריקה בין כל פסקה (\n\n). הסגנון ברור, זורם וקל לקריאה.',
      },
      halakha: {
        type: 'string',
        description: 'ההלכה המעשית במידה וישנה, בעברית מודרנית',
      },
      opinions: {
        type: 'array',
        description: 'רשימת הדעות השונות של החכמים — מולא רק אם יש מחלוקת בין החכמים השונים במשנה (שיטות שונות). אם אין מחלוקת, יש להחזיר מערך ריק [].',
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
        description: 'הרחבות לנושאים שהקורא המודרני יצטרך הסבר נוסף, או שיש בהן ענין',
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
              description: 'מקור ההרחבה (פרשן מהפרשנים המצורפים)',
            },
          },
          required: ['topic', 'explanation'],
        },
      },
    },
    required: ['mishna_modern', 'halakha', 'opinions', 'expansions'],
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
  
  // Build prompt
  const prompt = `כתוב את המשנה הבאה מחדש בעברית מודרנית כאילו נכתבה על ידי רב בישראל המודרנית.
הכתיבה תתבסס אך ורק על הפרשנים המצורפים — לא על מקורות אחרים.
חלק את הטקסט לפסקאות ברורות (סיים כל פסקה בשורה ריקה) כדי שיהיה קל לקריאה.
הסגנון יהיה ברור, זורם וידידותי לקורא המודרני שרוצה להבין את המשנה בקלות.
הכתיבה צריכה להיות בסגנון המשנה, לא בסגנון שיעור.

ציין את ההלכה המעשית במידה וישנה. לפי המקורות שמצורפים כאן בלבד.
ציין דעות שונות (opinions) רק אם קיימת מחלוקת ממשית בין החכמים במשנה (שיטות שונות). אם אין מחלוקת — החזר מערך ריק.
בכל הרחבה (expansion), ציין תמיד את המקור. ההרחבות מבוססות על המפרשים שמצורפים כאן, רמב״ם, רע״ב ומשנת ארץ ישראל.

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
      if (!explanation.mishna_modern || !explanation.halakha || !Array.isArray(explanation.opinions) || !Array.isArray(explanation.expansions)) {
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
  question_type: 'halacha' | 'sevara';
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
      question_type: {
        type: 'string',
        enum: ['halacha', 'sevara'],
        description: 'סוג השאלה: halacha (הלכה למעשה) או sevara (סברא/ביאור)',
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
    required: ['question_text', 'question_type', 'options', 'correct_answer', 'explanation'],
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
 * Determine how many quiz questions to generate per Mishna
 * Fixed at 2: 1 halacha (scenario) + 1 sevara (concept)
 */
export function determineQuestionCount(_sourceText: string): number {
  return 2;
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
        question_type: {
          type: 'string',
          enum: ['halacha', 'sevara'],
          description: 'סוג השאלה: halacha (הלכה למעשה) או sevara (סברא/ביאור)',
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
      required: ['question', 'question_type', 'options', 'correct_answer_index', 'explanation'],
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
  
  // Extract halakha separately for the prompt
  const halakhaText = explanation?.halakha || 'אין הלכה מעשית מיוחדת למשנה זו.';
  
  // Format explanation text for the prompt (excluding halakha since it's passed separately)
  let explanationText = '';
  if (!explanation) {
    explanationText = 'לא קיים הסבר למשנה זו.';
  } else if (typeof explanation === 'string') {
    explanationText = explanation;
  } else {
    // Build explanation from structured format (excluding halakha)
    const parts: string[] = [];
    if (explanation.mishna_modern) parts.push(explanation.mishna_modern);
    if (explanation.opinions && Array.isArray(explanation.opinions) && explanation.opinions.length > 0) {
      parts.push('דעות:\n' + explanation.opinions.map(o => `${o.source}: ${o.details}`).join('\n'));
    }
    if (explanation.expansions && Array.isArray(explanation.expansions) && explanation.expansions.length > 0) {
      parts.push(explanation.expansions.map(e => `${e.topic}: ${e.explanation}`).join('\n'));
    }
    explanationText = parts.length > 0 ? parts.join('\n\n') : 'לא קיים הסבר מפורט למשנה זו.';
  }
  
  const prompt = `Role: You are a Talmid Chacham and a pedagogical expert in creating educational content for an app that teaches Mishnah.
Task: For the given Mishnah text, generate a high-quality quiz package in modern Hebrew. The quiz must focus on practical application (Halacha L'Maaseh) and deep conceptual understanding (Sevara).

Guidelines for "Scenario Questions" (Halacha L'Maaseh):
- The Character: Use modern names (Danny, Yossi, Shira, etc.)
- The Setting: Place the character in a relatable, modern-day situation (e.g., at a wedding, on a bus, at the office, waking up late)
- The Conflict: Create a "borderline" case based on the Mishnah's ruling
- The Tone: Engaging, realistic, and clear
- The Distractors: Incorrect answers should reflect common misconceptions or minority opinions mentioned in the Mishnah

Guidelines for "Concept Questions" (Sevara/Be'ur):
- Focus on the "Why" (the logic) or the structure of the dispute
- Ask about the reason for a specific decree (e.g., "Siyag LaTorah")

Mishna: ${sourceText}
Halacha: ${halakhaText}

Generate ${questionCount} quiz questions with a balance of halacha and sevara types. Each question must include:
- question_type: "halacha" for practical application scenarios or "sevara" for conceptual/logic questions
- question: The question text in Hebrew
- options: 4 answer options in Hebrew
- correct_answer_index: The index of the correct answer (0-3)
- explanation: Brief explanation of why the correct answer is right

IMPORTANT: You must include exactly 1 halacha question and exactly 1 sevara question.
Return as a JSON array.`;

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
        question_type: 'halacha' | 'sevara';
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
            q.correct_answer_index < 0 || q.correct_answer_index > 3 ||
            (q.question_type !== 'halacha' && q.question_type !== 'sevara')) {
          throw new Error(`Invalid quiz question structure at index ${index}`);
        }
        
        return {
          question_text: q.question,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer_index,
          explanation: q.explanation || '',
        };
      });

      // Ensure minimum 1 of each type
      const halachaCount = questions.filter(q => q.question_type === 'halacha').length;
      const sevaraCount = questions.filter(q => q.question_type === 'sevara').length;
      
      if (halachaCount === 0 || sevaraCount === 0) {
        console.log(`[generateQuizQuestions] Gemini returned ${halachaCount} halacha and ${sevaraCount} sevara questions. Redistributing...`);
        
        // Redistribute types if Gemini didn't provide both
        for (let i = 0; i < questions.length; i++) {
          if (halachaCount === 0) {
            questions[i].question_type = 'halacha';
          } else if (sevaraCount === 0) {
            questions[i].question_type = 'sevara';
          }
        }
        
        // Ensure at least one of each by modifying the first two
        if (questions.length >= 2) {
          questions[0].question_type = 'halacha';
          questions[1].question_type = 'sevara';
        }
      }

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
