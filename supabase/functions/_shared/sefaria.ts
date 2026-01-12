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
 * @param ref - Reference in format "Mishnah_Berakhot.1.1"
 * @param retries - Number of retry attempts (default: 3)
 * @returns Array of commentary links
 */
export async function fetchCommentaries(
  ref: string,
  retries: number = 3
): Promise<SefariaLink[]> {
  const url = `${SEFARIA_API_BASE}links/${encodeURIComponent(ref)}`;
  
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
      
      return data as SefariaLink[];
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
