// supabase/functions/_shared/wikisource.ts
// Hebrew Wikisource API integration for structured Mishna text
// Reference: Task 14.1, 14.2, 14.3

import { ALL_TRACTATES, TractateInfo } from './mishnah-structure.ts';

const WIKISOURCE_API = 'https://he.wikisource.org/w/api.php';

/**
 * Hebrew letter mapping for chapter numbers (1-30)
 */
const HEBREW_NUMERALS: Record<number, string> = {
  1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה',
  6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט', 10: 'י',
  11: 'יא', 12: 'יב', 13: 'יג', 14: 'יד', 15: 'טו',
  16: 'טז', 17: 'יז', 18: 'יח', 19: 'יט', 20: 'כ',
  21: 'כא', 22: 'כב', 23: 'כג', 24: 'כד', 25: 'כה',
  26: 'כו', 27: 'כז', 28: 'כח', 29: 'כט', 30: 'ל',
};

/**
 * Convert number to Hebrew letter(s)
 */
export function toHebrewLetter(num: number): string {
  if (num < 1 || num > 30) {
    throw new Error(`Chapter number ${num} out of range (1-30)`);
  }
  return HEBREW_NUMERALS[num];
}

/**
 * Get Hebrew tractate name from English name
 * Uses the existing MISHNAH_STRUCTURE mapping
 */
export function getHebrewTractate(englishName: string): string {
  const tractate = ALL_TRACTATES.find(t => 
    t.english.toLowerCase() === englishName.toLowerCase() ||
    t.english.replace(/ /g, '_').toLowerCase() === englishName.toLowerCase()
  );
  
  if (!tractate) {
    throw new Error(`Unknown tractate: ${englishName}`);
  }
  
  return tractate.hebrew;
}

/**
 * Parse a Sefaria reference to extract tractate, chapter, and mishna
 * Format: "Mishnah_Berakhot.1.1" or "Mishnah Berakhot.1.1"
 */
export interface ParsedRef {
  tractateEnglish: string;
  tractateHebrew: string;
  chapter: number;
  mishnaNumber: number;
}

export function parseSefariaRef(refId: string): ParsedRef {
  // Handle both underscore and space formats
  const normalized = refId.replace(/^Mishnah[_ ]/, '');
  
  // Split by dot to get tractate.chapter.mishna
  const parts = normalized.split('.');
  
  if (parts.length < 3) {
    throw new Error(`Invalid ref format: ${refId}. Expected "Mishnah_Tractate.Chapter.Mishna"`);
  }
  
  const tractateEnglish = parts[0].replace(/_/g, ' ');
  const chapter = parseInt(parts[1], 10);
  const mishnaNumber = parseInt(parts[2], 10);
  
  if (isNaN(chapter) || isNaN(mishnaNumber)) {
    throw new Error(`Invalid chapter or mishna number in ref: ${refId}`);
  }
  
  const tractateHebrew = getHebrewTractate(tractateEnglish);
  
  return {
    tractateEnglish,
    tractateHebrew,
    chapter,
    mishnaNumber,
  };
}

/**
 * Build Wikisource page name for a Mishna chapter
 * Format: "משנה_ברכות_א_ניקוד"
 */
export function buildWikisourcePageName(tractateHebrew: string, chapter: number): string {
  const hebrewChapter = toHebrewLetter(chapter);
  return `משנה_${tractateHebrew}_${hebrewChapter}_ניקוד`;
}

/**
 * Fetch a Mishna chapter's wikitext from Hebrew Wikisource
 */
export async function fetchMishnaChapter(
  tractateHebrew: string,
  chapter: number,
  retries: number = 3
): Promise<string> {
  const pageName = buildWikisourcePageName(tractateHebrew, chapter);
  const url = `${WIKISOURCE_API}?action=parse&page=${encodeURIComponent(pageName)}&prop=wikitext&format=json`;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait and retry
          const waitTime = 1000 * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(`Wikisource API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Wikisource API error: ${data.error.info || data.error.code}`);
      }
      
      const wikitext = data.parse?.wikitext?.['*'];
      if (!wikitext) {
        throw new Error(`No wikitext found for page: ${pageName}`);
      }
      
      return wikitext;
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }
      
      // Exponential backoff
      const waitTime = 1000 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error(`Failed to fetch wikitext after ${retries} attempts`);
}

/**
 * Extract a specific mishna from chapter wikitext
 * Wikisource uses multiple formats:
 * - Template: {{המשנה|א|א|ברכות}} 
 * - Section markers: <קטע התחלה=א/> ... <קטע סוף=א/>
 * - Or older format: [(א)], [(ב)], etc.
 */
export function extractMishnaFromWikitext(wikitext: string, mishnaNumber: number): string {
  const hebrewLetter = toHebrewLetter(mishnaNumber);
  const nextHebrewLetter = mishnaNumber < 30 ? toHebrewLetter(mishnaNumber + 1) : null;
  
  // Try modern Wikisource format first: <קטע התחלה=X/> ... <קטע סוף=X/>
  const sectionStartPattern = new RegExp(`<קטע התחלה=${hebrewLetter}/>`, 'u');
  const sectionEndPattern = new RegExp(`<קטע סוף=${hebrewLetter}/>`, 'u');
  
  const sectionStartMatch = wikitext.match(sectionStartPattern);
  const sectionEndMatch = wikitext.match(sectionEndPattern);
  
  if (sectionStartMatch && sectionStartMatch.index !== undefined &&
      sectionEndMatch && sectionEndMatch.index !== undefined) {
    // Extract between section markers
    const startPos = sectionStartMatch.index + sectionStartMatch[0].length;
    const endPos = sectionEndMatch.index;
    return wikitext.substring(startPos, endPos);
  }
  
  // Try template-based format: {{המשנה|X|chapter|tractate}}
  const templatePattern = new RegExp(`\\{\\{המשנה\\|${hebrewLetter}\\|[^}]+\\}\\}`, 'u');
  const nextTemplatePattern = nextHebrewLetter
    ? new RegExp(`\\{\\{המשנה\\|${nextHebrewLetter}\\|[^}]+\\}\\}`, 'u')
    : null;
  
  const templateMatch = wikitext.match(templatePattern);
  if (templateMatch && templateMatch.index !== undefined) {
    const startPos = templateMatch.index + templateMatch[0].length;
    
    // Find end position
    let endPos: number;
    if (nextTemplatePattern) {
      const nextMatch = wikitext.substring(startPos).match(nextTemplatePattern);
      if (nextMatch && nextMatch.index !== undefined) {
        endPos = startPos + nextMatch.index;
      } else {
        // Look for end-of-content markers
        const noincludeMatch = wikitext.substring(startPos).match(/<noinclude>/);
        if (noincludeMatch && noincludeMatch.index !== undefined) {
          endPos = startPos + noincludeMatch.index;
        } else {
          endPos = wikitext.length;
        }
      }
    } else {
      // Last mishna - find noinclude or end
      const noincludeMatch = wikitext.substring(startPos).match(/<noinclude>/);
      if (noincludeMatch && noincludeMatch.index !== undefined) {
        endPos = startPos + noincludeMatch.index;
      } else {
        endPos = wikitext.length;
      }
    }
    
    return wikitext.substring(startPos, endPos);
  }
  
  // Fallback: try older format [(א)]
  const oldStartPattern = new RegExp(`\\[\\(${hebrewLetter}\\)\\]`, 'u');
  const oldEndPattern = nextHebrewLetter 
    ? new RegExp(`\\[\\(${nextHebrewLetter}\\)\\]`, 'u')
    : null;
  
  const oldStartMatch = wikitext.match(oldStartPattern);
  if (oldStartMatch && oldStartMatch.index !== undefined) {
    const startPos = oldStartMatch.index + oldStartMatch[0].length;
    
    let endPos: number;
    if (oldEndPattern) {
      const endMatch = wikitext.substring(startPos).match(oldEndPattern);
      if (endMatch && endMatch.index !== undefined) {
        endPos = startPos + endMatch.index;
      } else {
        endPos = wikitext.length;
      }
    } else {
      endPos = wikitext.length;
    }
    
    return wikitext.substring(startPos, endPos);
  }
  
  throw new Error(`Mishna ${mishnaNumber} (${hebrewLetter}) not found in chapter`);
}

/**
 * Clean wikitext and convert to Markdown
 * Removes wiki markup while preserving structure
 */
export function parseWikitextToMarkdown(rawWikitext: string): string {
  let text = rawWikitext;
  
  // Remove section markers <קטע התחלה=X/> and <קטע סוף=X/>
  text = text.replace(/<קטע [^>]+\/?>/g, '');
  
  // Remove wiki links [[text|display]] -> display, [[text]] -> text
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
  
  // Remove templates {{...}} including nested ones like {{מקור|...}}
  text = text.replace(/\{\{[^{}]*\}\}/g, '');
  // Second pass for any remaining templates
  text = text.replace(/\{\{[^{}]*\}\}/g, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Remove ref tags and their content
  text = text.replace(/<ref[^>]*>.*?<\/ref>/gs, '');
  text = text.replace(/<ref[^>]*\/>/g, '');
  
  // Convert wiki bold '''text''' to markdown **text**
  text = text.replace(/'''([^']+)'''/g, '**$1**');
  
  // Convert wiki italic ''text'' to markdown *text*
  text = text.replace(/''([^']+)''/g, '*$1*');
  
  // Handle wiki indentation (colons at start of line)
  // Multiple colons indicate deeper indentation - convert to paragraph structure
  // Remove leading colons but preserve the line breaks
  text = text.replace(/^:+/gm, '');
  
  // Normalize line breaks - preserve paragraph structure
  // Multiple newlines become paragraph breaks
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Clean up extra whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/^ +/gm, '');
  text = text.replace(/ +$/gm, '');
  
  // Remove empty lines at the start
  text = text.replace(/^\n+/, '');
  
  // Trim overall
  text = text.trim();
  
  return text;
}

/**
 * Main function: Fetch and parse a specific Mishna from Wikisource
 * Returns Markdown-formatted text
 */
export async function fetchMishnaFromWikisource(
  refId: string,
  retries: number = 3
): Promise<string> {
  // Parse the reference
  const { tractateHebrew, chapter, mishnaNumber } = parseSefariaRef(refId);
  
  // Fetch the chapter wikitext
  const wikitext = await fetchMishnaChapter(tractateHebrew, chapter, retries);
  
  // Extract the specific mishna
  const rawMishna = extractMishnaFromWikitext(wikitext, mishnaNumber);
  
  // Convert to Markdown
  const markdown = parseWikitextToMarkdown(rawMishna);
  
  return markdown;
}

/**
 * Fallback-aware fetch: tries Wikisource first, falls back to provided text
 */
export async function fetchMishnaWithFallback(
  refId: string,
  fallbackText: string,
  retries: number = 2
): Promise<{ text: string; source: 'wikisource' | 'fallback' }> {
  try {
    const text = await fetchMishnaFromWikisource(refId, retries);
    return { text, source: 'wikisource' };
  } catch (error) {
    console.warn(`Wikisource fetch failed for ${refId}, using fallback:`, error);
    return { text: fallbackText, source: 'fallback' };
  }
}
