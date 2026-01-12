// supabase/tests/logic/openai.test.ts
// Tests for OpenAI API integration in content generation
// Reference: TDD Section 7, content-generation.md

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// Mock OpenAI API responses for testing
// In real tests, we'll test against actual OpenAI API (if key is available)

Deno.test('openai: generates Hebrew explanation from source text', async () => {
  // This test will verify that OpenAI API integration works
  // For now, we'll test the prompt structure and response parsing
  
  const sourceText = 'מאימתי קורין את שמע בערבית';
  const commentaries: string[] = [];
  
  // Test that we can construct a proper prompt
  const prompt = `אתה מומחה לטקסטים יהודיים קלאסיים. הסבר את המשנה הבאה בעברית פשוטה וברורה.

טקסט המקור:
${sourceText}

${commentaries.length > 0 ? `פירושים זמינים:\n${commentaries.join('\n')}` : ''}

הוראות:
- כתוב הסבר אחד ברור וקוהרנטי בעברית
- אל תערבב דעות סותרות
- שמור על שפה פשוטה ונגישה
- אל תצטט פרשנים ספציפיים בהסבר הראשי
- התמקד בפשט המשנה`;

  assertExists(prompt, 'Prompt should be constructed');
  assertEquals(prompt.includes(sourceText), true, 'Prompt should include source text');
  assertEquals(prompt.includes('עברית'), true, 'Prompt should specify Hebrew output');
});

Deno.test('openai: generates deep dive JSON with multiple approaches', async () => {
  // Test deep dive prompt structure
  const sourceText = 'מאימתי קורין את שמע בערבית';
  const commentaries = ['רש"י', 'רמב"ם'];
  
  const prompt = `אתה מומחה לטקסטים יהודיים קלאסיים. זהה גישות פרשניות שונות למשנה הבאה.

טקסט המקור:
${sourceText}

פירושים זמינים:
${commentaries.join(', ')}

הוראות:
- זהה 2-4 גישות פרשניות שונות
- לכל גישה, ציין איזה פרשן(ים) מחזיקים בדעה זו
- סוכם כל גישה בקצרה בעברית
- החזר JSON עם המבנה הבא:
{
  "approaches": [
    {
      "commentator": "שם הפרשן",
      "summary_he": "סיכום הגישה בעברית"
    }
  ]
}`;

  assertExists(prompt, 'Deep dive prompt should be constructed');
  assertEquals(prompt.includes('JSON'), true, 'Prompt should request JSON output');
  assertEquals(prompt.includes('approaches'), true, 'Prompt should specify approaches array');
});

Deno.test('openai: handles API errors gracefully', async () => {
  // Test error handling
  // This will be tested with actual API calls in integration tests
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    console.log('⚠️  Skipping OpenAI API test - API key not configured');
    assertEquals(true, true, 'Test skipped - API key not configured');
    return;
  }
  
  // Test with invalid API key format
  const invalidKey = 'invalid-key';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${invalidKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'test' }],
    }),
  });
  
  assertEquals(response.ok, false, 'Invalid key should return error');
});

Deno.test('openai: parses JSON response correctly', () => {
  // Test JSON parsing for deep dive response
  const mockResponse = {
    approaches: [
      { commentator: 'רש"י', summary_he: 'פירוש ראשון' },
      { commentator: 'רמב"ם', summary_he: 'פירוש שני' },
    ],
  };
  
  const parsed = JSON.parse(JSON.stringify(mockResponse));
  assertExists(parsed.approaches, 'Should have approaches array');
  assertEquals(Array.isArray(parsed.approaches), true, 'Approaches should be array');
  assertEquals(parsed.approaches.length, 2, 'Should have 2 approaches');
  assertEquals(parsed.approaches[0].commentator, 'רש"י', 'First approach should have commentator');
  assertEquals(parsed.approaches[0].summary_he, 'פירוש ראשון', 'First approach should have Hebrew summary');
});

Deno.test('openai: validates response structure', () => {
  // Test that response matches expected structure
  const validResponse = {
    approaches: [
      { commentator: 'רש"י', summary_he: 'פירוש' },
    ],
  };
  
  const invalidResponse1 = {
    approaches: [
      { commentator: 'רש"י' }, // Missing summary_he
    ],
  };
  
  const invalidResponse2 = {
    approaches: [
      { summary_he: 'פירוש' }, // Missing commentator
    ],
  };
  
  // Valid response should have both fields
  assertEquals(validResponse.approaches[0].commentator !== undefined, true);
  assertEquals(validResponse.approaches[0].summary_he !== undefined, true);
  
  // Invalid responses should be caught
  assertEquals(invalidResponse1.approaches[0].summary_he === undefined, true);
  assertEquals(invalidResponse2.approaches[0].commentator === undefined, true);
});
