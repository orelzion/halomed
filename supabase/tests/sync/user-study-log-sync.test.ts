// supabase/tests/sync/user-study-log-sync.test.ts
// Tests for user_study_log sync rules validation
// Reference: TDD Section 8.1, sync.md Section 3

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
// USER_STUDY_LOG SYNC RULES TESTS (Task 7.3a)
// ============================================================================

Deno.test('user_study_log sync: required configuration keys are set', () => {
  checkRequiredConfig();
});

Deno.test('user_study_log sync: user_data bucket exists in sync rules', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'user_data',
    'Sync rules should contain user_data bucket for user_study_log'
  );
});

Deno.test('user_study_log sync: user_data bucket has parameters', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const userDataSection = extractBucketDefinition(yaml, 'user_data');
  
  assertStringIncludes(
    userDataSection.toLowerCase(),
    'parameters',
    'user_data bucket should have parameters section for user scoping'
  );
});

Deno.test('user_study_log sync: user_data bucket has user_id parameter', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'user_id',
    'user_data bucket should have user_id parameter'
  );
});

Deno.test('user_study_log sync: user_data bucket queries user_study_log table', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'from user_study_log',
    'user_data bucket should query user_study_log table'
  );
});

Deno.test('user_study_log sync: user_data bucket includes user isolation filter', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const userDataSection = extractBucketDefinition(yaml, 'user_data');
  
  // Should filter by user_id = bucket.user_id (or similar pattern)
  assertStringIncludes(
    userDataSection.toLowerCase(),
    'bucket.user_id',
    'user_data bucket should filter by bucket.user_id for user isolation'
  );
});

Deno.test('user_study_log sync: user_data bucket includes all required columns', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const requiredColumns = [
    'id',
    'user_id',
    'track_id',
    'study_date',
    'content_id',
    'is_completed',
    'completed_at',
  ];

  for (const col of requiredColumns) {
    assertStringIncludes(
      yaml.toLowerCase(),
      col.toLowerCase(),
      `user_data bucket should include column: ${col}`
    );
  }
});

Deno.test('user_study_log sync: user_data bucket does not include unauthorized columns', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const userDataSection = extractBucketDefinition(yaml, 'user_data');
  
  // Check SELECT clause specifically (not comments or other parts)
  const selectMatch = userDataSection.match(/SELECT\s+([^FROM]+)/i);
  if (!selectMatch) {
    throw new Error('Could not find SELECT clause in user_data bucket');
  }
  
  const selectClause = selectMatch[1].toLowerCase();
  
  // Should not include sensitive or unnecessary columns in SELECT
  const unauthorizedColumns = ['password', 'secret'];
  
  for (const col of unauthorizedColumns) {
    // Check if column appears as a selected column (not in comments or parameter names)
    const columnPattern = new RegExp(`\\b${col}\\b`, 'i');
    assertEquals(
      columnPattern.test(selectClause),
      false,
      `user_data bucket SELECT should not include unauthorized column: ${col}`
    );
  }
});

Deno.test('user_study_log sync: user_data bucket SQL uses proper WHERE clause', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const userDataSection = extractBucketDefinition(yaml, 'user_data');
  
  assertStringIncludes(
    userDataSection.toUpperCase(),
    'WHERE',
    'user_data bucket SQL should include WHERE clause for filtering'
  );
});

Deno.test('user_study_log sync: validates user isolation prevents cross-user data access', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const userDataSection = extractBucketDefinition(yaml, 'user_data');
  
  // Should have user_id filter to prevent user A from seeing user B's data
  const hasUserFilter = userDataSection.toLowerCase().includes('user_id') &&
                        (userDataSection.toLowerCase().includes('bucket.user_id') ||
                         userDataSection.toLowerCase().includes('bucket_user_id') ||
                         userDataSection.toLowerCase().includes('= bucket'));
  
  assertEquals(
    hasUserFilter,
    true,
    'user_data bucket must filter by user_id to ensure user isolation'
  );
});
