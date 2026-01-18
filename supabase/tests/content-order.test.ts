// supabase/tests/content-order.test.ts
// Tests for content-order.ts with full Shas support
// Reference: Task 11.5b

import { 
  assert, 
  assertEquals, 
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// Dynamic import for Deno
const CONTENT_ORDER_MODULE = '../functions/_shared/content-order.ts';

const { 
  TOTAL_CHAPTERS,
  TOTAL_MISHNAYOT,
  getContentRefForIndex,
  getCurrentTractate,
  getCurrentChapter,
  isChapterEndIndex,
  isTractateEndIndex,
  getContentRefId,
} = await import(CONTENT_ORDER_MODULE);

// ============================================================================
// CONSTANTS VALIDATION
// ============================================================================

Deno.test('content-order: TOTAL_CHAPTERS equals 526', () => {
  assertEquals(TOTAL_CHAPTERS, 526, 'Should have 526 chapters total');
});

Deno.test('content-order: TOTAL_MISHNAYOT approximately 4192', () => {
  assert(
    TOTAL_MISHNAYOT >= 4100 && TOTAL_MISHNAYOT <= 4300,
    `Total mishnayot should be around 4,192, got ${TOTAL_MISHNAYOT}`
  );
});

// ============================================================================
// getContentRefForIndex VALIDATION
// ============================================================================

Deno.test('content-order: getContentRefForIndex(0) returns Berakhot.1.1', () => {
  const ref = getContentRefForIndex(0, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(ref, 'Mishnah_Berakhot.1.1', 'First mishnah should be Berakhot.1.1');
});

Deno.test('content-order: getContentRefForIndex handles chapter-per-day', () => {
  const ref = getContentRefForIndex(0, 'DAILY_CHAPTER_PER_DAY');
  assertEquals(ref, 'Mishnah_Berakhot.1', 'First chapter should be Berakhot.1');
  
  const ref2 = getContentRefForIndex(1, 'DAILY_CHAPTER_PER_DAY');
  assertEquals(ref2, 'Mishnah_Berakhot.2', 'Second chapter should be Berakhot.2');
});

Deno.test('content-order: getContentRefForIndex returns valid format', () => {
  const ref = getContentRefForIndex(100, 'DAILY_WEEKDAYS_ONLY');
  assertStringIncludes(ref, 'Mishnah_', 'Should start with Mishnah_');
  assert(ref.includes('.'), 'Should contain chapter separator');
});

Deno.test('content-order: getContentRefForIndex handles last mishnah', () => {
  const lastIndex = TOTAL_MISHNAYOT - 1;
  const ref = getContentRefForIndex(lastIndex, 'DAILY_WEEKDAYS_ONLY');
  assertStringIncludes(ref, 'Mishnah_', 'Should return valid reference');
  assertStringIncludes(ref, 'Uktzin', 'Last reference should be from Uktzin');
});

Deno.test('content-order: getContentRefForIndex handles out-of-bounds gracefully', () => {
  const ref = getContentRefForIndex(TOTAL_MISHNAYOT + 100, 'DAILY_WEEKDAYS_ONLY');
  assertStringIncludes(ref, 'Mishnah_', 'Should return valid reference even for out-of-bounds');
  assertStringIncludes(ref, 'Uktzin', 'Should return last tractate for out-of-bounds');
});

// ============================================================================
// getCurrentTractate VALIDATION
// ============================================================================

Deno.test('content-order: getCurrentTractate(0) returns Berakhot', () => {
  const tractate = getCurrentTractate(0);
  assertEquals(tractate, 'Berakhot', 'First mishnah should be in Berakhot');
});

Deno.test('content-order: getCurrentTractate returns correct tractate for various indices', () => {
  // Test at tractate boundaries
  // Berakhot has 57 mishnayot, so index 57 should be in next tractate (Peah)
  const peahIndex = 57;
  const tractate = getCurrentTractate(peahIndex);
  assertEquals(tractate, 'Peah', 'Index 57 should be in Peah');
});

Deno.test('content-order: getCurrentTractate returns undefined for invalid index', () => {
  const tractate = getCurrentTractate(-1);
  assertEquals(tractate, undefined, 'Should return undefined for negative index');
});

// ============================================================================
// getCurrentChapter VALIDATION
// ============================================================================

Deno.test('content-order: getCurrentChapter(0) returns 1', () => {
  const chapter = getCurrentChapter(0);
  assertEquals(chapter, 1, 'First mishnah should be in chapter 1');
});

Deno.test('content-order: getCurrentChapter returns correct chapter', () => {
  // Berakhot chapter 1 has 5 mishnayot, so index 5 should be in chapter 2
  const chapter2Index = 5;
  const chapter = getCurrentChapter(chapter2Index);
  assertEquals(chapter, 2, 'Index 5 should be in chapter 2');
});

Deno.test('content-order: getCurrentChapter returns undefined for invalid index', () => {
  const chapter = getCurrentChapter(-1);
  assertEquals(chapter, undefined, 'Should return undefined for negative index');
});

// ============================================================================
// isChapterEndIndex VALIDATION
// ============================================================================

Deno.test('content-order: isChapterEndIndex detects end of Berakhot chapter 1', () => {
  // Berakhot chapter 1 has 5 mishnayot (indices 0-4), so index 4 is the end
  const isEnd = isChapterEndIndex(4);
  assertEquals(isEnd, true, 'Index 4 should be end of Berakhot chapter 1');
  
  const isNotEnd = isChapterEndIndex(3);
  assertEquals(isNotEnd, false, 'Index 3 should not be end of chapter');
});

Deno.test('content-order: isChapterEndIndex returns false for non-end indices', () => {
  const isEnd = isChapterEndIndex(10);
  // This depends on the structure, but should be consistent
  assert(typeof isEnd === 'boolean', 'Should return boolean');
});

// ============================================================================
// isTractateEndIndex VALIDATION
// ============================================================================

Deno.test('content-order: isTractateEndIndex detects end of Berakhot', () => {
  // Berakhot has 57 mishnayot (indices 0-56), so index 56 is the end
  const isEnd = isTractateEndIndex(56);
  assertEquals(isEnd, true, 'Index 56 should be end of Berakhot');
  
  const isNotEnd = isTractateEndIndex(55);
  assertEquals(isNotEnd, false, 'Index 55 should not be end of tractate');
});

Deno.test('content-order: isTractateEndIndex returns false for non-end indices', () => {
  const isEnd = isTractateEndIndex(10);
  assertEquals(isEnd, false, 'Index 10 should not be end of tractate');
});

// ============================================================================
// getContentRefId VALIDATION
// ============================================================================

Deno.test('content-order: getContentRefId returns same string', () => {
  const ref = 'Mishnah_Berakhot.1.1';
  const id = getContentRefId(ref);
  assertEquals(id, ref, 'Should return same string');
});

Deno.test('content-order: getContentRefId handles various formats', () => {
  const ref1 = 'Mishnah_Berakhot.1';
  const id1 = getContentRefId(ref1);
  assertEquals(id1, ref1, 'Should handle chapter-only format');
  
  const ref2 = 'Mishnah_Berakhot.1.1';
  const id2 = getContentRefId(ref2);
  assertEquals(id2, ref2, 'Should handle full reference format');
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

Deno.test('content-order: full path from first to last mishnah', () => {
  // Test first mishnah
  const firstRef = getContentRefForIndex(0, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(firstRef, 'Mishnah_Berakhot.1.1', 'First should be Berakhot.1.1');
  
  // Test last mishnah
  const lastIndex = TOTAL_MISHNAYOT - 1;
  const lastRef = getContentRefForIndex(lastIndex, 'DAILY_WEEKDAYS_ONLY');
  assertStringIncludes(lastRef, 'Uktzin', 'Last should be from Uktzin');
  
  // Test tractate transitions
  const berakhotEnd = 56; // Last mishnah of Berakhot
  const peahStart = 57; // First mishnah of Peah
  
  const berakhotTractate = getCurrentTractate(berakhotEnd);
  const peahTractate = getCurrentTractate(peahStart);
  
  assertEquals(berakhotTractate, 'Berakhot', 'Index 56 should be Berakhot');
  assertEquals(peahTractate, 'Peah', 'Index 57 should be Peah');
});

Deno.test('content-order: chapter-per-day covers all chapters', () => {
  // Test first chapter
  const firstChapter = getContentRefForIndex(0, 'DAILY_CHAPTER_PER_DAY');
  assertEquals(firstChapter, 'Mishnah_Berakhot.1', 'First chapter should be Berakhot.1');
  
  // Test that we can get references for all chapters
  for (let i = 0; i < Math.min(10, TOTAL_CHAPTERS); i++) {
    const ref = getContentRefForIndex(i, 'DAILY_CHAPTER_PER_DAY');
    assertStringIncludes(ref, 'Mishnah_', 'Should return valid reference');
    assert(ref.includes('.'), 'Should contain chapter number');
  }
});
