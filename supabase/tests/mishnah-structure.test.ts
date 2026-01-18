// supabase/tests/mishnah-structure.test.ts
// Tests for complete Mishnah structure data
// Reference: Task 11.5a

import { 
  assert, 
  assertEquals, 
  assertExists,
  assertNotEquals,
} from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// Import the structure (need to adjust path based on Deno module resolution)
// For Deno, we'll need to use import map or direct path
const MISHNAH_STRUCTURE_MODULE = '../functions/_shared/mishnah-structure.ts';

// Dynamic import for Deno
const { 
  MISHNAH_STRUCTURE,
  ALL_TRACTATES,
  getTotalMishnayot,
  getTotalChapters,
  getTractateByName,
  getTractateByHebrew,
  getTractateAtIndex,
  getTractateAndChapterForMishnahIndex,
  isChapterEnd,
  isTractateEnd,
  getContentRefForGlobalIndex,
} = await import(MISHNAH_STRUCTURE_MODULE);

// ============================================================================
// BASIC STRUCTURE VALIDATION
// ============================================================================

Deno.test('mishnah-structure: has 6 sedarim (orders)', () => {
  assertEquals(MISHNAH_STRUCTURE.length, 6, 'Should have 6 sedarim');
});

Deno.test('mishnah-structure: has 63 tractates total', () => {
  assertEquals(ALL_TRACTATES.length, 63, 'Should have exactly 63 tractates');
});

Deno.test('mishnah-structure: total chapters equals 526', () => {
  const totalChapters = getTotalChapters();
  assertEquals(totalChapters, 526, 'Should have 526 chapters total');
});

Deno.test('mishnah-structure: total mishnayot approximately 4192', () => {
  const totalMishnayot = getTotalMishnayot();
  // Allow some variance (4,192 is approximate)
  assert(
    totalMishnayot >= 4100 && totalMishnayot <= 4300,
    `Total mishnayot should be around 4,192, got ${totalMishnayot}`
  );
});

// ============================================================================
// SEDER STRUCTURE VALIDATION
// ============================================================================

Deno.test('mishnah-structure: Zeraim has 11 tractates', () => {
  const zeraim = MISHNAH_STRUCTURE.find(s => s.english === 'Zeraim');
  assertExists(zeraim, 'Zeraim seder should exist');
  assertEquals(zeraim.tractates.length, 11, 'Zeraim should have 11 tractates');
});

Deno.test('mishnah-structure: Moed has 12 tractates', () => {
  const moed = MISHNAH_STRUCTURE.find(s => s.english === 'Moed');
  assertExists(moed, 'Moed seder should exist');
  assertEquals(moed.tractates.length, 12, 'Moed should have 12 tractates');
});

Deno.test('mishnah-structure: Nashim has 7 tractates', () => {
  const nashim = MISHNAH_STRUCTURE.find(s => s.english === 'Nashim');
  assertExists(nashim, 'Nashim seder should exist');
  assertEquals(nashim.tractates.length, 7, 'Nashim should have 7 tractates');
});

Deno.test('mishnah-structure: Nezikin has 10 tractates', () => {
  const nezikin = MISHNAH_STRUCTURE.find(s => s.english === 'Nezikin');
  assertExists(nezikin, 'Nezikin seder should exist');
  assertEquals(nezikin.tractates.length, 10, 'Nezikin should have 10 tractates');
});

Deno.test('mishnah-structure: Kodashim has 11 tractates', () => {
  const kodashim = MISHNAH_STRUCTURE.find(s => s.english === 'Kodashim');
  assertExists(kodashim, 'Kodashim seder should exist');
  assertEquals(kodashim.tractates.length, 11, 'Kodashim should have 11 tractates');
});

Deno.test('mishnah-structure: Tohorot has 12 tractates', () => {
  const tohorot = MISHNAH_STRUCTURE.find(s => s.english === 'Tohorot');
  assertExists(tohorot, 'Tohorot seder should exist');
  assertEquals(tohorot.tractates.length, 12, 'Tohorot should have 12 tractates');
});

// ============================================================================
// TRACTATE VALIDATION
// ============================================================================

Deno.test('mishnah-structure: Berakhot is first tractate', () => {
  const first = ALL_TRACTATES[0];
  assertExists(first, 'First tractate should exist');
  assertEquals(first.english, 'Berakhot', 'First tractate should be Berakhot');
  assertEquals(first.hebrew, 'ברכות', 'Berakhot Hebrew name should be ברכות');
  assertEquals(first.chapters, 9, 'Berakhot should have 9 chapters');
  assertEquals(first.totalMishnayot, 57, 'Berakhot should have 57 mishnayot');
});

Deno.test('mishnah-structure: Uktzin is last tractate', () => {
  const last = ALL_TRACTATES[ALL_TRACTATES.length - 1];
  assertExists(last, 'Last tractate should exist');
  assertEquals(last.english, 'Uktzin', 'Last tractate should be Uktzin');
  assertEquals(last.hebrew, 'עוקצין', 'Uktzin Hebrew name should be עוקצין');
});

Deno.test('mishnah-structure: all tractates have English and Hebrew names', () => {
  for (const tractate of ALL_TRACTATES) {
    assert(tractate.english.length > 0, `Tractate should have English name: ${tractate.english}`);
    assert(tractate.hebrew.length > 0, `Tractate should have Hebrew name: ${tractate.english}`);
    assert(tractate.chapters > 0, `Tractate should have chapters > 0: ${tractate.english}`);
    assert(tractate.totalMishnayot > 0, `Tractate should have mishnayot > 0: ${tractate.english}`);
  }
});

Deno.test('mishnah-structure: Berakhot has exact per-chapter mishnayot', () => {
  const berakhot = getTractateByName('Berakhot');
  assertExists(berakhot, 'Berakhot should exist');
  assertExists(berakhot.mishnayotPerChapter, 'Berakhot should have per-chapter data');
  
  // Verify chapter counts
  assertEquals(berakhot.mishnayotPerChapter[1], 5, 'Chapter 1 should have 5 mishnayot');
  assertEquals(berakhot.mishnayotPerChapter[2], 8, 'Chapter 2 should have 8 mishnayot');
  assertEquals(berakhot.mishnayotPerChapter[9], 5, 'Chapter 9 should have 5 mishnayot');
});

// ============================================================================
// HELPER FUNCTION VALIDATION
// ============================================================================

Deno.test('mishnah-structure: getTractateByName finds Berakhot', () => {
  const berakhot = getTractateByName('Berakhot');
  assertExists(berakhot, 'Should find Berakhot');
  assertEquals(berakhot.english, 'Berakhot');
  assertEquals(berakhot.hebrew, 'ברכות');
});

Deno.test('mishnah-structure: getTractateByHebrew finds ברכות', () => {
  const berakhot = getTractateByHebrew('ברכות');
  assertExists(berakhot, 'Should find ברכות');
  assertEquals(berakhot.english, 'Berakhot');
});

Deno.test('mishnah-structure: getTractateAtIndex(0) returns Berakhot', () => {
  const first = getTractateAtIndex(0);
  assertExists(first, 'Should get first tractate');
  assertEquals(first.english, 'Berakhot');
});

Deno.test('mishnah-structure: getTractateAtIndex(62) returns Uktzin', () => {
  const last = getTractateAtIndex(62);
  assertExists(last, 'Should get last tractate');
  assertEquals(last.english, 'Uktzin');
});

Deno.test('mishnah-structure: getTractateAtIndex(-1) returns undefined', () => {
  const result = getTractateAtIndex(-1);
  assertEquals(result, undefined, 'Should return undefined for negative index');
});

Deno.test('mishnah-structure: getTractateAtIndex(100) returns undefined', () => {
  const result = getTractateAtIndex(100);
  assertEquals(result, undefined, 'Should return undefined for out-of-bounds index');
});

// ============================================================================
// MISHNAH INDEX VALIDATION
// ============================================================================

Deno.test('mishnah-structure: getTractateAndChapterForMishnahIndex(0) returns Berakhot.1.1', () => {
  const info = getTractateAndChapterForMishnahIndex(0);
  assertExists(info, 'Should get info for index 0');
  assertEquals(info.tractate.english, 'Berakhot');
  assertEquals(info.chapter, 1);
  assertEquals(info.mishnah, 1);
});

Deno.test('mishnah-structure: isChapterEnd works for Berakhot chapter 1', () => {
  // Berakhot chapter 1 has 5 mishnayot, so index 4 (0-based) is the end
  const isEnd = isChapterEnd(4);
  assertEquals(isEnd, true, 'Index 4 should be end of Berakhot chapter 1');
  
  const isNotEnd = isChapterEnd(3);
  assertEquals(isNotEnd, false, 'Index 3 should not be end of chapter');
});

Deno.test('mishnah-structure: isTractateEnd works for last mishnah of Berakhot', () => {
  // Berakhot has 57 mishnayot, so index 56 (0-based) is the end
  const isEnd = isTractateEnd(56);
  assertEquals(isEnd, true, 'Index 56 should be end of Berakhot');
  
  const isNotEnd = isTractateEnd(55);
  assertEquals(isNotEnd, false, 'Index 55 should not be end of tractate');
});

Deno.test('mishnah-structure: getContentRefForGlobalIndex(0) returns correct format', () => {
  const ref = getContentRefForGlobalIndex(0);
  assertEquals(ref, 'Mishnah_Berakhot.1.1', 'Should return Berakhot.1.1 for index 0');
});

Deno.test('mishnah-structure: getContentRefForGlobalIndex handles last mishnah', () => {
  const totalMishnayot = getTotalMishnayot();
  const lastIndex = totalMishnayot - 1;
  const ref = getContentRefForGlobalIndex(lastIndex);
  assert(ref.startsWith('Mishnah_'), 'Should return valid Mishnah reference');
  assert(ref.includes('Uktzin'), 'Last reference should be from Uktzin');
});

// ============================================================================
// ORDER VALIDATION
// ============================================================================

Deno.test('mishnah-structure: tractates are in correct order', () => {
  // Check first few tractates
  assertEquals(ALL_TRACTATES[0].english, 'Berakhot', 'First should be Berakhot');
  assertEquals(ALL_TRACTATES[1].english, 'Peah', 'Second should be Peah');
  assertEquals(ALL_TRACTATES[2].english, 'Demai', 'Third should be Demai');
  
  // Check last few tractates
  const lastIndex = ALL_TRACTATES.length - 1;
  assertEquals(ALL_TRACTATES[lastIndex - 2].english, 'Yadayim', 'Second to last should be Yadayim');
  assertEquals(ALL_TRACTATES[lastIndex - 1].english, 'Uktzin', 'Last should be Uktzin');
});

Deno.test('mishnah-structure: no duplicate tractate names', () => {
  const englishNames = ALL_TRACTATES.map(t => t.english);
  const hebrewNames = ALL_TRACTATES.map(t => t.hebrew);
  
  const uniqueEnglish = new Set(englishNames);
  const uniqueHebrew = new Set(hebrewNames);
  
  assertEquals(uniqueEnglish.size, 63, 'Should have 63 unique English names');
  assertEquals(uniqueHebrew.size, 63, 'Should have 63 unique Hebrew names');
});
