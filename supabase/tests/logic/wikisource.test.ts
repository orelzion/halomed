// supabase/tests/logic/wikisource.test.ts
// Tests for Wikisource API integration
// Reference: Task 14.1a, 14.2a, 14.3a

import { assertEquals, assertExists, assertRejects, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";

import {
  toHebrewLetter,
  getHebrewTractate,
  parseSefariaRef,
  buildWikisourcePageName,
  extractMishnaFromWikitext,
  parseWikitextToMarkdown,
  fetchMishnaChapter,
  fetchMishnaFromWikisource,
} from '../../functions/_shared/wikisource.ts';

// ============================================
// Task 14.3a: Tests for Sefaria ref mapping
// ============================================

Deno.test('toHebrewLetter: converts numbers 1-10 correctly', () => {
  assertEquals(toHebrewLetter(1), 'א');
  assertEquals(toHebrewLetter(2), 'ב');
  assertEquals(toHebrewLetter(3), 'ג');
  assertEquals(toHebrewLetter(9), 'ט');
  assertEquals(toHebrewLetter(10), 'י');
});

Deno.test('toHebrewLetter: converts numbers 11-30 correctly', () => {
  assertEquals(toHebrewLetter(11), 'יא');
  assertEquals(toHebrewLetter(15), 'טו');
  assertEquals(toHebrewLetter(16), 'טז');
  assertEquals(toHebrewLetter(20), 'כ');
  assertEquals(toHebrewLetter(24), 'כד');
  assertEquals(toHebrewLetter(30), 'ל');
});

Deno.test('toHebrewLetter: throws for out of range numbers', () => {
  try {
    toHebrewLetter(0);
    throw new Error('Should have thrown');
  } catch (e) {
    assertStringIncludes((e as Error).message, 'out of range');
  }
  
  try {
    toHebrewLetter(31);
    throw new Error('Should have thrown');
  } catch (e) {
    assertStringIncludes((e as Error).message, 'out of range');
  }
});

Deno.test('getHebrewTractate: maps common tractates correctly', () => {
  assertEquals(getHebrewTractate('Berakhot'), 'ברכות');
  assertEquals(getHebrewTractate('Shabbat'), 'שבת');
  assertEquals(getHebrewTractate('Pesachim'), 'פסחים');
  assertEquals(getHebrewTractate('Yoma'), 'יומא');
  assertEquals(getHebrewTractate('Avot'), 'אבות');
});

Deno.test('getHebrewTractate: handles tractates with spaces', () => {
  assertEquals(getHebrewTractate('Maaser Sheni'), 'מעשר שני');
  assertEquals(getHebrewTractate('Rosh Hashanah'), 'ראש השנה');
  assertEquals(getHebrewTractate('Moed Katan'), 'מועד קטן');
  assertEquals(getHebrewTractate('Bava Kamma'), 'בבא קמא');
  assertEquals(getHebrewTractate('Avodah Zarah'), 'עבודה זרה');
});

Deno.test('getHebrewTractate: handles underscored names', () => {
  assertEquals(getHebrewTractate('Maaser_Sheni'), 'מעשר שני');
  assertEquals(getHebrewTractate('Rosh_Hashanah'), 'ראש השנה');
});

Deno.test('getHebrewTractate: is case-insensitive', () => {
  assertEquals(getHebrewTractate('berakhot'), 'ברכות');
  assertEquals(getHebrewTractate('BERAKHOT'), 'ברכות');
  assertEquals(getHebrewTractate('BeRaKhOt'), 'ברכות');
});

Deno.test('getHebrewTractate: throws for unknown tractate', () => {
  try {
    getHebrewTractate('UnknownTractate');
    throw new Error('Should have thrown');
  } catch (e) {
    assertStringIncludes((e as Error).message, 'Unknown tractate');
  }
});

Deno.test('parseSefariaRef: parses standard format correctly', () => {
  const result = parseSefariaRef('Mishnah_Berakhot.1.1');
  assertEquals(result.tractateEnglish, 'Berakhot');
  assertEquals(result.tractateHebrew, 'ברכות');
  assertEquals(result.chapter, 1);
  assertEquals(result.mishnaNumber, 1);
});

Deno.test('parseSefariaRef: parses various tractates and chapters', () => {
  let result = parseSefariaRef('Mishnah_Shabbat.5.3');
  assertEquals(result.tractateEnglish, 'Shabbat');
  assertEquals(result.tractateHebrew, 'שבת');
  assertEquals(result.chapter, 5);
  assertEquals(result.mishnaNumber, 3);
  
  result = parseSefariaRef('Mishnah_Avot.2.4');
  assertEquals(result.tractateEnglish, 'Avot');
  assertEquals(result.tractateHebrew, 'אבות');
  assertEquals(result.chapter, 2);
  assertEquals(result.mishnaNumber, 4);
});

Deno.test('parseSefariaRef: handles double-digit chapters and mishnayot', () => {
  const result = parseSefariaRef('Mishnah_Kelim.15.12');
  assertEquals(result.tractateEnglish, 'Kelim');
  assertEquals(result.tractateHebrew, 'כלים');
  assertEquals(result.chapter, 15);
  assertEquals(result.mishnaNumber, 12);
});

Deno.test('parseSefariaRef: handles tractates with spaces (underscore format)', () => {
  const result = parseSefariaRef('Mishnah_Maaser_Sheni.3.2');
  assertEquals(result.tractateEnglish, 'Maaser Sheni');
  assertEquals(result.tractateHebrew, 'מעשר שני');
  assertEquals(result.chapter, 3);
  assertEquals(result.mishnaNumber, 2);
});

Deno.test('parseSefariaRef: throws for invalid format', () => {
  try {
    parseSefariaRef('InvalidFormat');
    throw new Error('Should have thrown');
  } catch (e) {
    assertStringIncludes((e as Error).message, 'Invalid ref format');
  }
  
  try {
    parseSefariaRef('Mishnah_Berakhot.1');
    throw new Error('Should have thrown');
  } catch (e) {
    assertStringIncludes((e as Error).message, 'Invalid ref format');
  }
});

Deno.test('buildWikisourcePageName: builds correct page names', () => {
  assertEquals(buildWikisourcePageName('ברכות', 1), 'משנה_ברכות_א_ניקוד');
  assertEquals(buildWikisourcePageName('שבת', 5), 'משנה_שבת_ה_ניקוד');
  assertEquals(buildWikisourcePageName('כלים', 15), 'משנה_כלים_טו_ניקוד');
  assertEquals(buildWikisourcePageName('שבת', 24), 'משנה_שבת_כד_ניקוד');
});

// ============================================
// Task 14.2a: Tests for wikitext parser
// ============================================

Deno.test('extractMishnaFromWikitext: extracts first mishna (section markers)', () => {
  const wikitext = `{{המשנה|א|א|ברכות}} <קטע התחלה=א/>מֵאֵימָתַי קוֹרִין אֶת שְׁמַע בְּעַרְבִית?
מִשָּׁעָה שֶׁהַכֹּהֲנִים נִכְנָסִים.<קטע סוף=א/>
{{המשנה|ב|א|ברכות}} <קטע התחלה=ב/>מֵאֵימָתַי קוֹרִין בְּשַׁחֲרִית?<קטע סוף=ב/>`;
  
  const result = extractMishnaFromWikitext(wikitext, 1);
  assertStringIncludes(result, 'מֵאֵימָתַי קוֹרִין אֶת שְׁמַע');
  assertStringIncludes(result, 'שֶׁהַכֹּהֲנִים');
  // Should NOT include the next mishna
  assertEquals(result.includes('בְּשַׁחֲרִית'), false);
});

Deno.test('extractMishnaFromWikitext: extracts middle mishna (section markers)', () => {
  const wikitext = `{{המשנה|א|א|ברכות}} <קטע התחלה=א/>First mishna text.<קטע סוף=א/>
{{המשנה|ב|א|ברכות}} <קטע התחלה=ב/>Second mishna text here.<קטע סוף=ב/>
{{המשנה|ג|א|ברכות}} <קטע התחלה=ג/>Third mishna text.<קטע סוף=ג/>`;
  
  const result = extractMishnaFromWikitext(wikitext, 2);
  assertStringIncludes(result, 'Second mishna text');
  assertEquals(result.includes('First mishna'), false);
  assertEquals(result.includes('Third mishna'), false);
});

Deno.test('extractMishnaFromWikitext: extracts using template format (fallback)', () => {
  // Without section markers, using template-based extraction
  const wikitext = `{{המשנה|א|א|ברכות}} First mishna.
{{המשנה|ב|א|ברכות}} Second mishna.
{{המשנה|ג|א|ברכות}} Last mishna text until the end.
<noinclude>Footer</noinclude>`;
  
  const result = extractMishnaFromWikitext(wikitext, 3);
  assertStringIncludes(result, 'Last mishna text until the end');
  assertEquals(result.includes('noinclude'), false);
});

Deno.test('extractMishnaFromWikitext: extracts using old bracket format', () => {
  const wikitext = `[(א)] First mishna.
[(ב)] Second mishna.
[(ג)] Last mishna text.`;
  
  const result = extractMishnaFromWikitext(wikitext, 2);
  assertStringIncludes(result, 'Second mishna');
  assertEquals(result.includes('First mishna'), false);
  assertEquals(result.includes('Last mishna'), false);
});

Deno.test('extractMishnaFromWikitext: throws for missing mishna', () => {
  const wikitext = `{{המשנה|א|א|ברכות}} <קטע התחלה=א/>First.<קטע סוף=א/>
{{המשנה|ב|א|ברכות}} <קטע התחלה=ב/>Second.<קטע סוף=ב/>`;
  
  try {
    extractMishnaFromWikitext(wikitext, 5);
    throw new Error('Should have thrown');
  } catch (e) {
    assertStringIncludes((e as Error).message, 'not found');
  }
});

Deno.test('parseWikitextToMarkdown: removes wiki links', () => {
  const input = 'Text with [[link]] and [[target|display text]] here.';
  const result = parseWikitextToMarkdown(input);
  assertEquals(result, 'Text with link and display text here.');
});

Deno.test('parseWikitextToMarkdown: removes templates', () => {
  const input = 'Text with {{template|param}} here.';
  const result = parseWikitextToMarkdown(input);
  assertEquals(result, 'Text with here.');
});

Deno.test('parseWikitextToMarkdown: removes HTML tags', () => {
  const input = 'Text <b>bold</b> and <span class="test">span</span> here.';
  const result = parseWikitextToMarkdown(input);
  assertEquals(result, 'Text bold and span here.');
});

Deno.test('parseWikitextToMarkdown: converts wiki formatting to markdown', () => {
  const input = "Text with '''bold''' and ''italic'' here.";
  const result = parseWikitextToMarkdown(input);
  assertEquals(result, 'Text with **bold** and *italic* here.');
});

Deno.test('parseWikitextToMarkdown: preserves paragraph breaks', () => {
  const input = 'First paragraph.\n\nSecond paragraph.';
  const result = parseWikitextToMarkdown(input);
  assertStringIncludes(result, 'First paragraph.');
  assertStringIncludes(result, 'Second paragraph.');
  // Should have paragraph break
  assertEquals(result.includes('\n\n') || result.includes('\n'), true);
});

Deno.test('parseWikitextToMarkdown: normalizes excessive whitespace', () => {
  const input = 'Text    with     too   many    spaces.';
  const result = parseWikitextToMarkdown(input);
  assertEquals(result, 'Text with too many spaces.');
});

Deno.test('parseWikitextToMarkdown: trims leading/trailing whitespace', () => {
  const input = '   \n  Text content here.  \n   ';
  const result = parseWikitextToMarkdown(input);
  assertEquals(result, 'Text content here.');
});

Deno.test('parseWikitextToMarkdown: preserves Hebrew text integrity', () => {
  const input = 'מֵאֵימָתַי קוֹרִין אֶת שְׁמַע בְּעַרְבִית?';
  const result = parseWikitextToMarkdown(input);
  assertEquals(result, 'מֵאֵימָתַי קוֹרִין אֶת שְׁמַע בְּעַרְבִית?');
});

// ============================================
// Task 14.1a: Tests for Wikisource API (integration)
// ============================================

Deno.test('fetchMishnaChapter: fetches Berakhot chapter 1 (integration)', async () => {
  // This is an integration test - requires network
  // Skip if running without network
  try {
    const wikitext = await fetchMishnaChapter('ברכות', 1, 1);
    assertExists(wikitext);
    assertEquals(typeof wikitext, 'string');
    assertEquals(wikitext.length > 100, true);
    // Should contain mishna markers (modern Wikisource format)
    assertStringIncludes(wikitext, '{{המשנה|א');
    // Should contain Hebrew text
    assertStringIncludes(wikitext, 'שְׁמַע');
  } catch (error) {
    // If network unavailable, skip gracefully
    if ((error as Error).message.includes('fetch')) {
      console.log('Skipping network test: fetchMishnaChapter');
      return;
    }
    throw error;
  }
});

Deno.test('fetchMishnaFromWikisource: fetches and parses Berakhot 1:1 (integration)', async () => {
  try {
    const markdown = await fetchMishnaFromWikisource('Mishnah_Berakhot.1.1', 1);
    assertExists(markdown);
    assertEquals(typeof markdown, 'string');
    assertEquals(markdown.length > 50, true);
    // Should contain the key text about reading Shema
    assertStringIncludes(markdown, 'שְׁמַע');
    // Should NOT contain wiki markup
    assertEquals(markdown.includes('[['), false);
    assertEquals(markdown.includes('{{'), false);
    // Should NOT contain the mishna marker
    assertEquals(markdown.includes('[(א)]'), false);
  } catch (error) {
    if ((error as Error).message.includes('fetch')) {
      console.log('Skipping network test: fetchMishnaFromWikisource');
      return;
    }
    throw error;
  }
});

Deno.test('fetchMishnaFromWikisource: fetches Berakhot 1:2 (integration)', async () => {
  try {
    const markdown = await fetchMishnaFromWikisource('Mishnah_Berakhot.1.2', 1);
    assertExists(markdown);
    assertEquals(typeof markdown, 'string');
    // Mishna 1:2 discusses reading Shema in the morning
    assertStringIncludes(markdown, 'שַׁחֲרִית');
  } catch (error) {
    if ((error as Error).message.includes('fetch')) {
      console.log('Skipping network test: fetchMishnaFromWikisource 1:2');
      return;
    }
    throw error;
  }
});

Deno.test('fetchMishnaFromWikisource: handles different tractate (integration)', async () => {
  try {
    const markdown = await fetchMishnaFromWikisource('Mishnah_Shabbat.1.1', 1);
    assertExists(markdown);
    assertEquals(typeof markdown, 'string');
    assertEquals(markdown.length > 20, true);
  } catch (error) {
    if ((error as Error).message.includes('fetch')) {
      console.log('Skipping network test: fetchMishnaFromWikisource Shabbat');
      return;
    }
    throw error;
  }
});
