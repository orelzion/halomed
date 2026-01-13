// supabase/tests/sync/tracks-sync.test.ts
// Tests for tracks sync rules validation
// Reference: sync.md Section 3

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
// TRACKS SYNC RULES TESTS (Task 7.5a)
// ============================================================================

Deno.test('tracks sync: required configuration keys are set', () => {
  checkRequiredConfig();
});

Deno.test('tracks sync: tracks bucket exists in sync rules', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'tracks',
    'Sync rules should contain tracks bucket'
  );
});

Deno.test('tracks sync: tracks bucket queries tracks table', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'from tracks',
    'tracks bucket should query tracks table'
  );
});

Deno.test('tracks sync: tracks bucket includes all required columns', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const requiredColumns = [
    'id',
    'title',
    'source_endpoint',
    'schedule_type',
  ];

  for (const col of requiredColumns) {
    assertStringIncludes(
      yaml.toLowerCase(),
      col.toLowerCase(),
      `tracks bucket should include column: ${col}`
    );
  }
});

Deno.test('tracks sync: tracks bucket has no user filtering (syncs all tracks)', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const tracksSection = extractBucketDefinition(yaml, 'tracks');
  
  // Should not have parameters (no user filtering)
  const hasParameters = tracksSection.toLowerCase().includes('parameters:') ||
                        tracksSection.toLowerCase().includes('parameter:');
  
  assertEquals(
    hasParameters,
    false,
    'tracks bucket should not have parameters (syncs all tracks to all users)'
  );
});

Deno.test('tracks sync: tracks bucket has no WHERE clause (syncs all rows)', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const tracksSection = extractBucketDefinition(yaml, 'tracks');
  
  // Should not have WHERE clause filtering
  const hasWhere = tracksSection.toUpperCase().includes('WHERE');
  
  assertEquals(
    hasWhere,
    false,
    'tracks bucket should not have WHERE clause (syncs all tracks, no filtering)'
  );
});

Deno.test('tracks sync: tracks bucket is read-only (no write operations)', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const tracksSection = extractBucketDefinition(yaml, 'tracks');
  
  // Should only have SELECT queries (read-only)
  const hasWriteOps = tracksSection.toLowerCase().includes('insert') ||
                      tracksSection.toLowerCase().includes('update') ||
                      tracksSection.toLowerCase().includes('delete');
  
  assertEquals(
    hasWriteOps,
    false,
    'tracks bucket should be read-only (no INSERT/UPDATE/DELETE operations)'
  );
});

Deno.test('tracks sync: tracks bucket does not include unauthorized columns', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const tracksSection = extractBucketDefinition(yaml, 'tracks');
  
  // Check SELECT clause specifically
  const selectMatch = tracksSection.match(/SELECT\s+([^FROM]+)/i);
  if (!selectMatch) {
    throw new Error('Could not find SELECT clause in tracks bucket');
  }
  
  const selectClause = selectMatch[1].toLowerCase();
  
  // Should not include sensitive columns
  const unauthorizedColumns = ['password', 'secret', 'api_key', 'private'];
  
  for (const col of unauthorizedColumns) {
    const columnPattern = new RegExp(`\\b${col}\\b`, 'i');
    assertEquals(
      columnPattern.test(selectClause),
      false,
      `tracks bucket SELECT should not include unauthorized column: ${col}`
    );
  }
});
