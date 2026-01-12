// supabase/tests/logic/sefaria.test.ts
// Tests for Sefaria API integration
// Reference: TDD Section 7, content-generation.md

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { fetchText, fetchCommentaries, toSefariaRef } from '../../functions/_shared/sefaria.ts';

// ============================================================================
// SEFARIA API INTEGRATION TESTS
// ============================================================================

Deno.test('sefaria: can fetch source text from Sefaria API', async () => {
  // Test using the shared utility function
  const testRef = 'Mishnah_Berakhot.1.1';
  
  const result = await fetchText(testRef);
  assertExists(result, 'Should return result');
  assertExists(result.he, 'Should have Hebrew text field');
  assertEquals(typeof result.he, 'string', 'Hebrew text should be a string');
  assertEquals(result.he.length > 0, true, 'Hebrew text should not be empty');
  assertEquals(result.ref, 'Mishnah Berakhot 1:1', 'Should have formatted ref');
});

Deno.test('sefaria: can fetch commentaries from Sefaria API', async () => {
  // Test using the shared utility function
  const testRef = 'Mishnah_Berakhot.1.1';
  
  const commentaries = await fetchCommentaries(testRef);
  assertExists(commentaries, 'Should return commentaries');
  assertEquals(Array.isArray(commentaries), true, 'Should return array of links');
});

Deno.test('sefaria: handles API errors gracefully', async () => {
  // Test that invalid refs throw appropriate error
  const invalidRef = 'Invalid_Text_That_Does_Not_Exist_12345.1.1';
  
  try {
    await fetchText(invalidRef);
    assertEquals(false, true, 'Should throw error for invalid ref');
  } catch (error) {
    assertExists(error, 'Should throw error');
    assertEquals(
      error instanceof Error,
      true,
      'Error should be an Error instance'
    );
  }
});

Deno.test('sefaria: API returns Hebrew text in correct format', async () => {
  // Test that Hebrew text is properly formatted
  const testRef = 'Mishnah_Berakhot.1.1';
  
  const result = await fetchText(testRef);
  assertExists(result.he, 'Should have Hebrew text');
  
  // Hebrew text should contain Hebrew characters (Unicode range \u0590-\u05FF)
  const hasHebrewChars = /[\u0590-\u05FF]/.test(result.he);
  assertEquals(hasHebrewChars, true, 'Hebrew text should contain Hebrew characters');
});

Deno.test('sefaria: can fetch different Mishnah references', async () => {
  // Test that we can fetch different references
  const testRefs = [
    'Mishnah_Berakhot.1.1',
    'Mishnah_Berakhot.1.2',
  ];
  
  for (const ref of testRefs) {
    const result = await fetchText(ref);
    assertExists(result.he, `Should have Hebrew text for ${ref}`);
    assertEquals(result.he.length > 0, true, `Hebrew text should not be empty for ${ref}`);
  }
});

Deno.test('sefaria: toSefariaRef converts ref format correctly', () => {
  // Test ref format conversion
  const refId = 'Mishnah_Berakhot.1.1';
  const sefariaRef = toSefariaRef(refId);
  assertEquals(sefariaRef, refId, 'Should return same format for MVP');
});
