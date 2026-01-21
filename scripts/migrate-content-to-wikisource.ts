#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Data Migration Script: Update existing content_cache entries with Wikisource text
 * 
 * This script:
 * 1. Fetches all existing content_cache entries
 * 2. For each entry, fetches the Mishna text from Wikisource
 * 3. Updates source_text_he with the structured Markdown format
 * 
 * Usage:
 *   deno run --allow-net --allow-env --allow-read scripts/migrate-content-to-wikisource.ts
 *   
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --limit=N    Only process first N entries
 *   --ref=REF    Process only a specific ref_id
 * 
 * Environment:
 *   SUPABASE_URL           - Supabase project URL
 *   SUPABASE_SERVICE_KEY   - Supabase service role key (for write access)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import Wikisource utilities
const WIKISOURCE_API = 'https://he.wikisource.org/w/api.php';

// Hebrew letter mapping for chapter numbers (1-30)
const HEBREW_NUMERALS: Record<number, string> = {
  1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה',
  6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט', 10: 'י',
  11: 'יא', 12: 'יב', 13: 'יג', 14: 'יד', 15: 'טו',
  16: 'טז', 17: 'יז', 18: 'יח', 19: 'יט', 20: 'כ',
  21: 'כא', 22: 'כב', 23: 'כג', 24: 'כד', 25: 'כה',
  26: 'כו', 27: 'כז', 28: 'כח', 29: 'כט', 30: 'ל',
};

// Tractate mapping (English -> Hebrew)
const TRACTATE_MAP: Record<string, string> = {
  'Berakhot': 'ברכות', 'Peah': 'פאה', 'Demai': 'דמאי', 'Kilayim': 'כלאים',
  'Sheviit': 'שביעית', 'Terumot': 'תרומות', 'Maasrot': 'מעשרות',
  'Maaser Sheni': 'מעשר שני', 'Challah': 'חלה', 'Orlah': 'ערלה', 'Bikkurim': 'ביכורים',
  'Shabbat': 'שבת', 'Eruvin': 'עירובין', 'Pesachim': 'פסחים', 'Shekalim': 'שקלים',
  'Yoma': 'יומא', 'Sukkah': 'סוכה', 'Beitzah': 'ביצה', 'Rosh Hashanah': 'ראש השנה',
  'Taanit': 'תענית', 'Megillah': 'מגילה', 'Moed Katan': 'מועד קטן', 'Chagigah': 'חגיגה',
  'Yevamot': 'יבמות', 'Ketubot': 'כתובות', 'Nedarim': 'נדרים', 'Nazir': 'נזיר',
  'Sotah': 'סוטה', 'Gittin': 'גיטין', 'Kiddushin': 'קידושין',
  'Bava Kamma': 'בבא קמא', 'Bava Metzia': 'בבא מציעא', 'Bava Batra': 'בבא בתרא',
  'Sanhedrin': 'סנהדרין', 'Makkot': 'מכות', 'Shevuot': 'שבועות', 'Eduyot': 'עדויות',
  'Avodah Zarah': 'עבודה זרה', 'Avot': 'אבות', 'Horayot': 'הוריות',
  'Zevachim': 'זבחים', 'Menachot': 'מנחות', 'Chullin': 'חולין', 'Bekhorot': 'בכורות',
  'Arakhin': 'ערכין', 'Temurah': 'תמורה', 'Keritot': 'כריתות', 'Meilah': 'מעילה',
  'Tamid': 'תמיד', 'Middot': 'מידות', 'Kinnim': 'קינים',
  'Kelim': 'כלים', 'Oholot': 'אהלות', 'Negaim': 'נגעים', 'Parah': 'פרה',
  'Tohorot': 'טהרות', 'Mikvaot': 'מקואות', 'Niddah': 'נדה', 'Machshirin': 'מכשירין',
  'Zavim': 'זבים', 'Tevul Yom': 'טבול יום', 'Yadayim': 'ידים', 'Uktzin': 'עוקצין',
};

function toHebrewLetter(num: number): string {
  if (num < 1 || num > 30) {
    throw new Error(`Chapter number ${num} out of range (1-30)`);
  }
  return HEBREW_NUMERALS[num];
}

function getHebrewTractate(englishName: string): string {
  // Try direct match
  if (TRACTATE_MAP[englishName]) {
    return TRACTATE_MAP[englishName];
  }
  // Try with spaces replaced by underscores
  const normalized = englishName.replace(/_/g, ' ');
  if (TRACTATE_MAP[normalized]) {
    return TRACTATE_MAP[normalized];
  }
  // Try case-insensitive
  for (const [key, value] of Object.entries(TRACTATE_MAP)) {
    if (key.toLowerCase() === englishName.toLowerCase() || 
        key.toLowerCase() === normalized.toLowerCase()) {
      return value;
    }
  }
  throw new Error(`Unknown tractate: ${englishName}`);
}

interface ParsedRef {
  tractateEnglish: string;
  tractateHebrew: string;
  chapter: number;
  mishnaNumber: number;
}

function parseSefariaRef(refId: string): ParsedRef {
  const normalized = refId.replace(/^Mishnah[_ ]/, '');
  const parts = normalized.split('.');
  
  if (parts.length < 3) {
    throw new Error(`Invalid ref format: ${refId}`);
  }
  
  const tractateEnglish = parts[0].replace(/_/g, ' ');
  const chapter = parseInt(parts[1], 10);
  const mishnaNumber = parseInt(parts[2], 10);
  
  if (isNaN(chapter) || isNaN(mishnaNumber)) {
    throw new Error(`Invalid chapter or mishna number in ref: ${refId}`);
  }
  
  const tractateHebrew = getHebrewTractate(tractateEnglish);
  
  return { tractateEnglish, tractateHebrew, chapter, mishnaNumber };
}

async function fetchMishnaChapter(tractateHebrew: string, chapter: number): Promise<string> {
  const hebrewChapter = toHebrewLetter(chapter);
  const pageName = `משנה_${tractateHebrew}_${hebrewChapter}_ניקוד`;
  const url = `${WIKISOURCE_API}?action=parse&page=${encodeURIComponent(pageName)}&prop=wikitext&format=json`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Wikisource API error: ${response.status}`);
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
}

function extractMishnaFromWikitext(wikitext: string, mishnaNumber: number): string {
  const hebrewLetter = toHebrewLetter(mishnaNumber);
  const nextHebrewLetter = mishnaNumber < 30 ? toHebrewLetter(mishnaNumber + 1) : null;
  
  // Try section markers first
  const sectionStartPattern = new RegExp(`<קטע התחלה=${hebrewLetter}/>`, 'u');
  const sectionEndPattern = new RegExp(`<קטע סוף=${hebrewLetter}/>`, 'u');
  
  const sectionStartMatch = wikitext.match(sectionStartPattern);
  const sectionEndMatch = wikitext.match(sectionEndPattern);
  
  if (sectionStartMatch && sectionStartMatch.index !== undefined &&
      sectionEndMatch && sectionEndMatch.index !== undefined) {
    const startPos = sectionStartMatch.index + sectionStartMatch[0].length;
    const endPos = sectionEndMatch.index;
    return wikitext.substring(startPos, endPos);
  }
  
  // Try template format
  const templatePattern = new RegExp(`\\{\\{המשנה\\|${hebrewLetter}\\|[^}]+\\}\\}`, 'u');
  const nextTemplatePattern = nextHebrewLetter
    ? new RegExp(`\\{\\{המשנה\\|${nextHebrewLetter}\\|[^}]+\\}\\}`, 'u')
    : null;
  
  const templateMatch = wikitext.match(templatePattern);
  if (templateMatch && templateMatch.index !== undefined) {
    const startPos = templateMatch.index + templateMatch[0].length;
    let endPos: number;
    
    if (nextTemplatePattern) {
      const nextMatch = wikitext.substring(startPos).match(nextTemplatePattern);
      if (nextMatch && nextMatch.index !== undefined) {
        endPos = startPos + nextMatch.index;
      } else {
        const noincludeMatch = wikitext.substring(startPos).match(/<noinclude>/);
        endPos = noincludeMatch?.index !== undefined ? startPos + noincludeMatch.index : wikitext.length;
      }
    } else {
      const noincludeMatch = wikitext.substring(startPos).match(/<noinclude>/);
      endPos = noincludeMatch?.index !== undefined ? startPos + noincludeMatch.index : wikitext.length;
    }
    
    return wikitext.substring(startPos, endPos);
  }
  
  throw new Error(`Mishna ${mishnaNumber} (${hebrewLetter}) not found in chapter`);
}

function parseWikitextToMarkdown(rawWikitext: string): string {
  let text = rawWikitext;
  
  text = text.replace(/<קטע [^>]+\/?>/g, '');
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
  text = text.replace(/\{\{[^{}]*\}\}/g, '');
  text = text.replace(/\{\{[^{}]*\}\}/g, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/<ref[^>]*>.*?<\/ref>/gs, '');
  text = text.replace(/<ref[^>]*\/>/g, '');
  text = text.replace(/'''([^']+)'''/g, '**$1**');
  text = text.replace(/''([^']+)''/g, '*$1*');
  text = text.replace(/^:+/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/^ +/gm, '');
  text = text.replace(/ +$/gm, '');
  text = text.replace(/^\n+/, '');
  text = text.trim();
  
  return text;
}

async function fetchMishnaFromWikisource(refId: string): Promise<string> {
  const { tractateHebrew, chapter, mishnaNumber } = parseSefariaRef(refId);
  const wikitext = await fetchMishnaChapter(tractateHebrew, chapter);
  const rawMishna = extractMishnaFromWikitext(wikitext, mishnaNumber);
  return parseWikitextToMarkdown(rawMishna);
}

// Main migration logic
async function main() {
  const args = Deno.args;
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  const refArg = args.find(a => a.startsWith('--ref='));
  const specificRef = refArg ? refArg.split('=')[1] : undefined;
  
  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    console.log('\nUsage:');
    console.log('  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... deno run --allow-net --allow-env --allow-read scripts/migrate-content-to-wikisource.ts');
    console.log('\nOptions:');
    console.log('  --dry-run    Show what would be updated without making changes');
    console.log('  --limit=N    Only process first N entries');
    console.log('  --ref=REF    Process only a specific ref_id');
    Deno.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('=== Wikisource Migration Script ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  if (limit) console.log(`Limit: ${limit} entries`);
  if (specificRef) console.log(`Specific ref: ${specificRef}`);
  console.log('');
  
  // Fetch existing content
  let query = supabase.from('content_cache').select('id, ref_id, source_text_he');
  
  if (specificRef) {
    query = query.eq('ref_id', specificRef);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data: entries, error: fetchError } = await query;
  
  if (fetchError) {
    console.error('Error fetching content:', fetchError);
    Deno.exit(1);
  }
  
  if (!entries || entries.length === 0) {
    console.log('No entries found to migrate.');
    Deno.exit(0);
  }
  
  console.log(`Found ${entries.length} entries to process\n`);
  
  // Track results
  const results = {
    success: 0,
    skipped: 0,
    failed: 0,
    failedRefs: [] as string[],
  };
  
  // Process each entry
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const progress = `[${i + 1}/${entries.length}]`;
    
    // Check if already has structured text (contains newlines)
    if (entry.source_text_he && entry.source_text_he.includes('\n')) {
      console.log(`${progress} ${entry.ref_id}: SKIPPED (already structured)`);
      results.skipped++;
      continue;
    }
    
    try {
      // Fetch from Wikisource
      const newText = await fetchMishnaFromWikisource(entry.ref_id);
      
      if (dryRun) {
        console.log(`${progress} ${entry.ref_id}: WOULD UPDATE`);
        console.log(`    Old length: ${entry.source_text_he?.length || 0} chars`);
        console.log(`    New length: ${newText.length} chars`);
        console.log(`    Preview: ${newText.substring(0, 80)}...`);
      } else {
        // Update in database
        const { error: updateError } = await supabase
          .from('content_cache')
          .update({ source_text_he: newText })
          .eq('id', entry.id);
        
        if (updateError) {
          throw updateError;
        }
        
        console.log(`${progress} ${entry.ref_id}: UPDATED (${newText.length} chars)`);
      }
      
      results.success++;
      
      // Rate limiting - wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`${progress} ${entry.ref_id}: FAILED - ${(error as Error).message}`);
      results.failed++;
      results.failedRefs.push(entry.ref_id);
    }
  }
  
  // Summary
  console.log('\n=== Migration Summary ===');
  console.log(`Total processed: ${entries.length}`);
  console.log(`Success: ${results.success}`);
  console.log(`Skipped (already structured): ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.failedRefs.length > 0) {
    console.log('\nFailed refs:');
    results.failedRefs.forEach(ref => console.log(`  - ${ref}`));
  }
  
  if (dryRun) {
    console.log('\n(This was a dry run - no changes were made)');
  }
}

main();
