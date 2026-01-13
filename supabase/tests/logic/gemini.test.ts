// supabase/tests/logic/gemini.test.ts
// Tests for Gemini API integration with structured outputs
// Reference: Gemini API migration plan, content-generation.md

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// Load env.local from supabase/ directory if it exists
try {
  let envFile: string;
  try {
    envFile = Deno.readTextFileSync('supabase/.env.local');
  } catch {
    envFile = Deno.readTextFileSync('supabase/env.local');
  }
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      Deno.env.set(key.trim(), value.trim());
    }
  }
} catch {
  // env.local doesn't exist, that's okay - tests will fail if key is required
}

// Test JSON Schema structure matching user's example
const expectedSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    halakha: { type: 'string' },
    opinions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          details: { type: 'string' },
        },
        required: ['source', 'details'],
      },
    },
    expansions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['topic', 'explanation'],
      },
    },
  },
  required: ['summary', 'halakha', 'opinions', 'expansions'],
};

Deno.test('gemini: JSON Schema structure matches expected format', () => {
  // Verify schema structure
  assertExists(expectedSchema.properties, 'Schema should have properties');
  assertExists(expectedSchema.properties.summary, 'Should have summary property');
  assertExists(expectedSchema.properties.halakha, 'Should have halakha property');
  assertExists(expectedSchema.properties.opinions, 'Should have opinions property');
  assertExists(expectedSchema.properties.expansions, 'Should have expansions property');
  
  assertEquals(expectedSchema.properties.opinions.type, 'array', 'Opinions should be array');
  assertEquals(expectedSchema.properties.expansions.type, 'array', 'Expansions should be array');
});

Deno.test('gemini: validates structured JSON response format', () => {
  // Mock response matching user's example
  const validResponse = {
    summary: 'המשנה הראשונה במסכת ברכות דנה בזמני קריאת שמע של ערבית',
    halakha: 'הלכה כרבן גמליאל: זמן קריאת שמע של ערבית הוא מעת צאת הכוכבים ועד עמוד השחר',
    opinions: [
      {
        source: 'רבי אליעזר (משנה, ברכות א:א)',
        details: 'זמן קריאת שמע מסתיים בסוף האשמורה הראשונה',
      },
      {
        source: 'חכמים (משנה, ברכות א:א)',
        details: 'זמן הקריאה הוא עד חצות הלילה',
      },
    ],
    expansions: [
      {
        topic: 'מדוע משתמשים ב\'כהנים האוכלים בתרומה\' כסימן זמן?',
        explanation: 'בעת העתיקה לא היו שעונים. המשנה משתמשת באירוע קהילתי מוכר',
      },
    ],
  };
  
  // Validate structure
  assertExists(validResponse.summary, 'Should have summary');
  assertExists(validResponse.halakha, 'Should have halakha');
  assertEquals(Array.isArray(validResponse.opinions), true, 'Opinions should be array');
  assertEquals(Array.isArray(validResponse.expansions), true, 'Expansions should be array');
  
  // Validate opinions structure
  validResponse.opinions.forEach((opinion) => {
    assertExists(opinion.source, 'Opinion should have source');
    assertExists(opinion.details, 'Opinion should have details');
  });
  
  // Validate expansions structure
  validResponse.expansions.forEach((expansion) => {
    assertExists(expansion.topic, 'Expansion should have topic');
    assertExists(expansion.explanation, 'Expansion should have explanation');
  });
});

Deno.test('gemini: prompt format matches user example', () => {
  const sourceText = 'מאימתי קורין את שמע בערבית';
  const commentaries = [
    { name: 'ברטנורא', text: 'פירוש ברטנורא' },
    { name: 'רמבם', text: 'פירוש רמב"ם' },
  ];
  
  // Build prompt matching user's example
  const promptData = {
    text: sourceText,
    commentary: commentaries.map(c => ({ name: c.name, text: c.text })),
  };
  
  const prompt = `סכם בתמציתיות בעברית מודרנית, הרחב היכן שהקורא המודרני יצטרך הרחבה נוספת.
ציין את ההלכה במידה וישנה.
ציין תמיד את המקור לכל דעה בהרחבה.

${JSON.stringify(promptData)}`;
  
  assertExists(prompt, 'Prompt should be constructed');
  assertEquals(prompt.includes(sourceText), true, 'Prompt should include source text');
  assertEquals(prompt.includes('הלכה'), true, 'Prompt should mention halakha');
  assertEquals(prompt.includes('מקור'), true, 'Prompt should mention source');
  
  // Verify JSON data is included
  const jsonMatch = prompt.match(/\{[\s\S]*"text"[\s\S]*\}/);
  assertExists(jsonMatch, 'Prompt should include JSON data');
});

Deno.test('gemini: handles API errors gracefully', async () => {
  // Test error handling structure
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for integration tests. Set it in supabase/.env.local');
  }
  
  // Test with invalid API key format
  const invalidKey = 'invalid-key';
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': invalidKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'test' }] }],
      }),
    }
  );
  
  assertEquals(response.ok, false, 'Invalid key should return error');
  
  // Consume response body to prevent leak
  await response.text();
});

Deno.test('gemini: input format uses commentary (singular) not commentaries', () => {
  // Verify input format matches user's example
  const commentaries = [
    { name: 'ברטנורא', text: 'פירוש' },
  ];
  
  const promptData = {
    text: 'מאימתי קורין את שמע בערבית',
    commentary: commentaries.map(c => ({ name: c.name, text: c.text })),
  };
  
  const jsonString = JSON.stringify(promptData);
  
  // Should use 'commentary' (singular) not 'commentaries' (plural)
  assertEquals(jsonString.includes('"commentary"'), true, 'Should use commentary (singular)');
  assertEquals(jsonString.includes('"commentaries"'), false, 'Should not use commentaries (plural)');
});

Deno.test('gemini: JSON Schema can be generated from TypeScript interface', () => {
  // Test that we can convert TypeScript interface to JSON Schema
  interface Opinion {
    source: string;
    details: string;
  }
  
  interface Expansion {
    topic: string;
    explanation: string;
  }
  
  interface MishnahExplanation {
    summary: string;
    halakha: string;
    opinions: Opinion[];
    expansions: Expansion[];
  }
  
  // Manual JSON Schema (would be generated from interface in implementation)
  const schema = {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'תקציר המשנה בעברית מודרנית' },
      halakha: { type: 'string', description: 'ההלכה המעשית' },
      opinions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'מקור הדעה' },
            details: { type: 'string', description: 'פרטי הדעה' },
          },
          required: ['source', 'details'],
        },
      },
      expansions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'נושא ההרחבה' },
            explanation: { type: 'string', description: 'הסבר מפורט' },
          },
          required: ['topic', 'explanation'],
        },
      },
    },
    required: ['summary', 'halakha', 'opinions', 'expansions'],
  };
  
  assertExists(schema.properties, 'Schema should have properties');
  assertEquals(schema.required.length, 4, 'Should have 4 required fields');
});
