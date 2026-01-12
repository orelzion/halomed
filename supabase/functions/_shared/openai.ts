// supabase/functions/_shared/openai.ts
// OpenAI API integration for content generation
// Reference: TDD Section 7, content-generation.md

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const OPENAI_MODEL = 'gpt-4o-mini'; // Using mini for cost efficiency, can upgrade to gpt-4 if needed

export interface OpenAIExplanationRequest {
  sourceText: string;
  commentaries?: string[];
}

export interface OpenAIExplanationResponse {
  explanation: string;
}

export interface OpenAIDeepDiveRequest {
  sourceText: string;
  commentaries?: string[];
}

export interface OpenAIDeepDiveResponse {
  approaches: Array<{
    commentator: string;
    summary_he: string;
  }>;
}

/**
 * Generate a clear Hebrew explanation using OpenAI
 */
export async function generateExplanation(
  request: OpenAIExplanationRequest,
  apiKey: string,
  retries: number = 3
): Promise<string> {
  const { sourceText, commentaries = [] } = request;
  
  // Build prompt according to content-generation.md specifications
  const commentariesText = commentaries.length > 0
    ? `פירושים זמינים:\n${commentaries.join('\n')}\n\n`
    : '';
  
  const prompt = `אתה מומחה לטקסטים יהודיים קלאסיים. הסבר את המשנה הבאה בעברית פשוטה וברורה.

טקסט המקור:
${sourceText}

${commentariesText}הוראות:
- כתוב הסבר אחד ברור וקוהרנטי בעברית
- אל תערבב דעות סותרות
- שמור על שפה פשוטה ונגישה
- אל תצטט פרשנים ספציפיים בהסבר הראשי
- התמקד בפשט המשנה`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content: 'אתה מומחה לטקסטים יהודיים קלאסיים. אתה מסביר טקסטים בעברית פשוטה וברורה.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `OpenAI API error: ${response.status} ${response.statusText}`;
        
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
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('OpenAI API returned invalid response structure');
      }
      
      const explanation = data.choices[0].message.content.trim();
      
      if (!explanation || explanation.length === 0) {
        throw new Error('OpenAI API returned empty explanation');
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

/**
 * Generate deep dive (commentaries summary) using OpenAI
 */
export async function generateDeepDive(
  request: OpenAIDeepDiveRequest,
  apiKey: string,
  retries: number = 3
): Promise<OpenAIDeepDiveResponse> {
  const { sourceText, commentaries = [] } = request;
  
  // Build prompt according to content-generation.md specifications
  const commentariesText = commentaries.length > 0
    ? `פירושים זמינים:\n${commentaries.join(', ')}\n\n`
    : '';
  
  const prompt = `אתה מומחה לטקסטים יהודיים קלאסיים. זהה גישות פרשניות שונות למשנה הבאה.

טקסט המקור:
${sourceText}

${commentariesText}הוראות:
- זהה 2-4 גישות פרשניות שונות
- לכל גישה, ציין איזה פרשן(ים) מחזיקים בדעה זו
- סוכם כל גישה בקצרה בעברית
- החזר JSON בלבד עם המבנה הבא (ללא טקסט נוסף):
{
  "approaches": [
    {
      "commentator": "שם הפרשן",
      "summary_he": "סיכום הגישה בעברית"
    }
  ]
}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content: 'אתה מומחה לטקסטים יהודיים קלאסיים. אתה מחזיר תשובות ב-JSON בלבד.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500,
          response_format: { type: 'json_object' }, // Force JSON response
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `OpenAI API error: ${response.status} ${response.statusText}`;
        
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
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('OpenAI API returned invalid response structure');
      }
      
      const content = data.choices[0].message.content.trim();
      
      if (!content || content.length === 0) {
        throw new Error('OpenAI API returned empty response');
      }
      
      // Parse JSON response
      let parsed: OpenAIDeepDiveResponse;
      try {
        // Try to extract JSON if wrapped in markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : content;
        parsed = JSON.parse(jsonText);
      } catch (parseError) {
        throw new Error(`Failed to parse OpenAI JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // Validate response structure
      if (!parsed.approaches || !Array.isArray(parsed.approaches)) {
        throw new Error('OpenAI response missing approaches array');
      }
      
      // Validate each approach has required fields
      for (const approach of parsed.approaches) {
        if (!approach.commentator || typeof approach.commentator !== 'string') {
          throw new Error('Approach missing commentator field');
        }
        if (!approach.summary_he || typeof approach.summary_he !== 'string') {
          throw new Error('Approach missing summary_he field');
        }
      }
      
      return parsed;
    } catch (error) {
      if (attempt === retries - 1) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate deep dive: ${errorMsg}`);
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  
  throw new Error('Failed to generate deep dive after retries');
}
