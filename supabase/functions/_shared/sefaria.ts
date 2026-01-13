// supabase/functions/_shared/sefaria.ts
// Sefaria API integration utility
// Reference: TDD Section 7, content-generation.md

const SEFARIA_API_BASE = Deno.env.get('SEFARIA_API_URL') ?? 'https://www.sefaria.org/api/';

export interface SefariaTextResponse {
  ref: string;
  heRef: string;
  he: string; // Hebrew text
  text?: string; // English translation (optional)
  versions?: Array<{
    language: string;
    versionTitle: string;
    versionTitleInHebrew: string;
  }>;
}

export interface SefariaLink {
  ref: string;
  type: string;
  anchorRef: string;
  category: string;
  he?: string; // Hebrew text (available in links response)
  text?: string; // English text (optional)
}

/**
 * Fetch text from Sefaria API with retry logic
 * @param ref - Reference in format "Mishnah_Berakhot.1.1"
 * @param retries - Number of retry attempts (default: 3)
 * @returns Sefaria text response
 */
export async function fetchText(
  ref: string,
  retries: number = 3
): Promise<SefariaTextResponse> {
  const url = `${SEFARIA_API_BASE}texts/${encodeURIComponent(ref)}?context=0`;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        // Check for rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * (attempt + 1);
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        throw new Error(`Sefaria API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check for error in response (Sefaria sometimes returns 200 with error field)
      if (data.error) {
        throw new Error(`Sefaria API error: ${data.error}`);
      }
      
      if (!data.he) {
        throw new Error(`Sefaria API response missing Hebrew text for ref: ${ref}`);
      }
      
      return data as SefariaTextResponse;
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }
      
      // Exponential backoff: wait 1s, 2s, 4s...
      const waitTime = 1000 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error(`Failed to fetch text after ${retries} attempts`);
}

/**
 * Fetch commentary links from Sefaria API
 * Filters for Bartenura and Mishnat Eretz Israel (Tiferet Yisrael)
 * @param ref - Reference in format "Mishnah_Berakhot.1.1"
 * @param retries - Number of retry attempts (default: 3)
 * @returns Array of commentary links
 */
export async function fetchCommentaries(
  ref: string,
  retries: number = 3
): Promise<SefariaLink[]> {
  const url = `${SEFARIA_API_BASE}links/${encodeURIComponent(ref)}`;
  
  // Filter for these specific commentators: Bartenura, Mishnat Eretz Yisrael, and Rambam
  const allowedCommentators = ['bartenura', 'mishnat eretz yisrael', 'rambam'];
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        // Check for rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * (attempt + 1);
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        throw new Error(`Sefaria API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Links endpoint returns array
      if (!Array.isArray(data)) {
        return [];
      }
      
      // Filter for commentary type and specific commentators
      const commentaries = data.filter((link: SefariaLink) => {
        if (link.type !== 'commentary') {
          return false;
        }
        
        const refLower = (link.ref || '').toLowerCase();
        return allowedCommentators.some(commentator => 
          refLower.includes(commentator.toLowerCase())
        );
      });
      
      return commentaries as SefariaLink[];
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }
      
      // Exponential backoff
      const waitTime = 1000 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error(`Failed to fetch commentaries after ${retries} attempts`);
}

/**
 * Extract commentator name from Sefaria commentary reference
 * @param ref - Commentary reference (e.g., "Rambam on Mishnah Berakhot 1:1:1")
 * @returns Commentator name (e.g., "Rambam")
 */
export function extractCommentatorName(ref: string): string {
  // Extract commentator name from patterns like:
  // "Rambam on Mishnah Berakhot 1:1:1" -> "Rambam"
  // "Tosafot Yom Tov on Mishnah Berakhot 1:1:1" -> "Tosafot Yom Tov"
  const match = ref.match(/^([^on]+?)\s+on\s+/i);
  if (match) {
    return match[1].trim();
  }
  return ref;
}

/**
 * Fetch commentary text from Sefaria API
 * @param commentaryRef - Commentary reference (e.g., "Bartenura on Mishnah Berakhot 1:1:1")
 * @param retries - Number of retry attempts (default: 3)
 * @returns Commentary text in Hebrew
 */
export async function fetchCommentaryText(
  commentaryRef: string,
  retries: number = 3
): Promise<string> {
  const url = `${SEFARIA_API_BASE}texts/${encodeURIComponent(commentaryRef)}?context=0`;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        // Check for rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * (attempt + 1);
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        throw new Error(`Sefaria API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check for error in response
      if (data.error) {
        throw new Error(`Sefaria API error: ${data.error}`);
      }
      
      if (!data.he) {
        throw new Error(`Sefaria API response missing Hebrew text for commentary: ${commentaryRef}`);
      }
      
      // Return Hebrew text (could be string or array, handle both)
      if (typeof data.he === 'string') {
        return data.he;
      } else if (Array.isArray(data.he)) {
        // If array, join with newlines
        return data.he.join('\n');
      }
      
      throw new Error(`Unexpected Hebrew text format for commentary: ${commentaryRef}`);
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }
      
      // Exponential backoff
      const waitTime = 1000 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error(`Failed to fetch commentary text after ${retries} attempts`);
}

/**
 * Convert content reference to Sefaria API format
 * Handles conversion from internal ref format to Sefaria format
 * @param refId - Internal reference (e.g., "Mishnah_Berakhot.1.1")
 * @returns Sefaria API reference format
 */
export function toSefariaRef(refId: string): string {
  // For MVP, refId is already in Sefaria format
  // Future: may need conversion logic here
  return refId;
}
