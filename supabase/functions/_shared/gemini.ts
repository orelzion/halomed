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
