// supabase/functions/_shared/openai.ts
// OpenAI API integration for content generation
// Reference: TDD Section 7, content-generation.md

const OPENAI_API_BASE = 'https://api.openai.com/v1';
// Model selection: gpt-4o-mini vs gpt-5-mini
// - gpt-4o-mini: $0.075/$0.30 per 1M tokens (input/output) - Best for cost optimization
// - gpt-5-mini: $0.125/$1.00 per 1M tokens (input/output) - Better capabilities, higher cost
// For our use case (structured Hebrew text generation, cost-sensitive, simple text generation):
// gpt-4o-mini is optimal - 2x cheaper input, 3.3x cheaper output, sufficient quality
// Reference: https://platform.openai.com/docs/pricing
// Note: System/user message roles are correct for Chat Completions API
// (Developer role is only for reasoning models like o1/o3 in Responses API)
const OPENAI_MODEL = 'gpt-4o-mini';

export interface OpenAIExplanationRequest {
  sourceText: string;
  commentaries?: Array<{ name: string; text: string }>;
}

export interface OpenAIExplanationResponse {
  explanation: string;
}

export interface OpenAIDeepDiveRequest {
  sourceText: string;
  commentaries?: Array<{ name: string; text: string }>;
}

// Deep dive is now Markdown text, not JSON
export interface OpenAIDeepDiveResponse {
  deepDiveMarkdown: string;
}

/**
 * Generate both explanation and deep dive in one call
 * Returns both parts parsed from the Markdown response
 */
export async function generateExplanationAndDeepDive(
  request: OpenAIExplanationRequest,
  apiKey: string,
  retries: number = 3
): Promise<{ explanation: string; deepDive: string }> {
  const { sourceText, commentaries = [] } = request;
  
  // Build optimized JSON structure for OpenAI
  const promptData = {
    text: sourceText,
    commentaries: commentaries.map(c => ({
      name: c.name,
      text: c.text,
    })),
  };
  
  // Convert to JSON string for the prompt
  const promptJson = JSON.stringify(promptData, null, 2);
  
  const prompt = `אתה HaLomeid. כתוב פירוש קצר וברור בעברית מודרנית למשנה על בסיס החומר הנתון בלבד.

הנתונים הבאים בפורמט JSON:
${promptJson}

חוקים:
- הפלט חייב להיות Markdown.
- תמיד להחזיר שני חלקים:
  1) "### פירוש בהיר (עברית מודרנית)" — פירוש אחד עקבי, קצר, רציף.
  2) "### הרחבה: סיכום הדעות והניואנסים של הפרשנים" — 3–6 נושאים עם נקודות.
- להשתמש בשמות החכמים שמופיעים במשנה (תנא קמא/רבי אליעזר/רבי יהושע וכו').
- לא להוסיף מקורות/עובדות שלא נמסרו בקלט.
- לא לצטט קטעים ארוכים מילה במילה; לפרפרז.`;

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
              content: 'אתה HaLomeid. אתה כותב פירושים בעברית מודרנית למשנה.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 800, // Optimized: actual usage ~500 tokens, set higher for safety margin
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
      
      const fullResponse = data.choices[0].message.content.trim();
      
      if (!fullResponse || fullResponse.length === 0) {
        throw new Error('OpenAI API returned empty explanation');
      }
      
      // Extract explanation (first part before "### הרחבה")
      const explanationMatch = fullResponse.match(/^### פירוש בהיר[^\n]*\n(.*?)(?=\n### הרחבה|$)/s);
      const explanation = explanationMatch ? explanationMatch[1].trim() : fullResponse;
      
      // Extract deep dive (section after "### הרחבה")
      const deepDiveMatch = fullResponse.match(/### הרחבה[^\n]*\n(.*?)$/s);
      const deepDive = deepDiveMatch ? deepDiveMatch[1].trim() : '';
      
      return { explanation, deepDive };
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

// Note: generateDeepDive function removed - we now use generateExplanationAndDeepDive
// which generates both parts in a single optimized API call
