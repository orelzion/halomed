// supabase/tests/sync/content-cache-sync.test.ts
// Tests for content_cache sync rules validation
// Reference: TDD Section 8.2, sync.md Section 3

import { assertEquals, assertExists, assertStringIncludes } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

const SYNC_RULES_FILE = 'powersync/powersync.yaml';

// Required configuration keys that must exist
const REQUIRED_CONFIG_KEYS = [
  'POWERSYNC_DEV_INSTANCE_ID',
  'POWERSYNC_DEV_API_KEY',
  'SUPABASE_DEV_URL',
  'SUPABASE_DEV_ANON_KEY',
];

/**
 * Check if required environment variables are set
 */
function checkRequiredConfig(): void {
  const missing: string[] = [];
  for (const key of REQUIRED_CONFIG_KEYS) {
    if (!Deno.env.get(key)) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required configuration keys: ${missing.join(', ')}. ` +
      `Set these in .env file before running tests.`
    );
  }
}

/**
 * Check if file exists (returns false if not, doesn't throw)
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract bucket definition from YAML
 */
function extractBucketDefinition(yaml: string, bucketName: string): string {
  const lines = yaml.split('\n');
  let inBucket = false;
  let bucketLines: string[] = [];
  let indentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Find bucket start
    if (trimmed.startsWith(`${bucketName}:`)) {
      inBucket = true;
      indentLevel = line.length - line.trimStart().length;
      bucketLines.push(line);
      continue;
    }
    
    if (inBucket) {
      // Check if we've moved to next top-level item
      const currentIndent = line.length - line.trimStart().length;
      if (trimmed && currentIndent <= indentLevel && !line.startsWith(' ')) {
        break;
      }
      bucketLines.push(line);
    }
  }
  
  return bucketLines.join('\n');
}

// ============================================================================
// CONTENT_CACHE SYNC RULES TESTS (Task 7.4a)
// ============================================================================

Deno.test('content_cache sync: required configuration keys are set', () => {
  checkRequiredConfig();
});

Deno.test('content_cache sync: content bucket exists in sync rules', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'content',
    'Sync rules should contain content bucket for content_cache'
  );
});

Deno.test('content_cache sync: content bucket queries content_cache table', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'from content_cache',
    'content bucket should query content_cache table'
  );
});

Deno.test('content_cache sync: content bucket includes all required columns', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const requiredColumns = [
    'id',
    'ref_id',
    'source_text_he',
    'ai_explanation_json',
    'created_at',
  ];

  for (const col of requiredColumns) {
    assertStringIncludes(
      yaml.toLowerCase(),
      col.toLowerCase(),
      `content bucket should include column: ${col}`
    );
  }
});

Deno.test('content_cache sync: content bucket filters by user_study_log references', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const contentSection = extractBucketDefinition(yaml, 'content');
  
  // Should reference user_study_log for filtering
  assertStringIncludes(
    contentSection.toLowerCase(),
    'user_study_log',
    'content bucket should reference user_study_log for filtering'
  );
});

Deno.test('content_cache sync: content bucket is read-only (no write operations)', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const contentSection = extractBucketDefinition(yaml, 'content');
  
  // Should only have SELECT queries (read-only)
  const hasWriteOps = contentSection.toLowerCase().includes('insert') ||
                      contentSection.toLowerCase().includes('update') ||
                      contentSection.toLowerCase().includes('delete');
  
  assertEquals(
    hasWriteOps,
    false,
    'content bucket should be read-only (no INSERT/UPDATE/DELETE operations)'
  );
});

Deno.test('content_cache sync: content bucket uses JOIN or subquery for filtering', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const contentSection = extractBucketDefinition(yaml, 'content');
  
  // Should use JOIN or IN subquery to filter by user_study_log
  const hasJoin = contentSection.toLowerCase().includes('join') ||
                  contentSection.toLowerCase().includes('in (') ||
                  contentSection.toLowerCase().includes('in(');
  
  assertEquals(
    hasJoin,
    true,
    'content bucket should use JOIN or IN subquery to filter by user_study_log references'
  );
});

Deno.test('content_cache sync: content bucket does not include unauthorized columns', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const contentSection = extractBucketDefinition(yaml, 'content');
  
  // Check SELECT clause specifically
  const selectMatch = contentSection.match(/SELECT\s+([^FROM]+)/i);
  if (!selectMatch) {
    throw new Error('Could not find SELECT clause in content bucket');
  }
  
  const selectClause = selectMatch[1].toLowerCase();
  
  // Should not include sensitive columns
  const unauthorizedColumns = ['password', 'secret', 'api_key'];
  
  for (const col of unauthorizedColumns) {
    const columnPattern = new RegExp(`\\b${col}\\b`, 'i');
    assertEquals(
      columnPattern.test(selectClause),
      false,
      `content bucket SELECT should not include unauthorized column: ${col}`
    );
  }
});
