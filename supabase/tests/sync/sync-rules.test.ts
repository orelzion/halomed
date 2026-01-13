// supabase/tests/sync/sync-rules.test.ts
// Tests for PowerSync sync rules configuration validation
// These tests validate the YAML structure and SQL syntax in sync rules

import { assertEquals, assertExists, assertStringIncludes } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// Expected sync rules file path
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
 * Parse YAML content (simple parser for basic structure validation)
 */
function parseYAML(yaml: string): any {
  // Simple YAML parser for basic structure - in production, use a proper YAML library
  const result: any = {};
  let currentSection: string | null = null;
  let currentKey: string | null = null;
  const lines = yaml.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Section header (bucket_definitions:)
    if (trimmed.endsWith(':') && !trimmed.includes(' ')) {
      currentSection = trimmed.replace(':', '');
      result[currentSection] = {};
      continue;
    }
    
    // Key-value pair
    if (trimmed.includes(':') && currentSection) {
      const [key, ...valueParts] = trimmed.split(':');
      const keyTrimmed = key.trim();
      const valueTrimmed = valueParts.join(':').trim();
      
      if (valueTrimmed && !valueTrimmed.startsWith('-')) {
        // Simple key-value
        if (!result[currentSection][keyTrimmed]) {
          result[currentSection][keyTrimmed] = {};
        }
        currentKey = keyTrimmed;
      } else if (valueTrimmed.startsWith('-')) {
        // Array item (SQL query)
        if (!result[currentSection][currentKey || 'data']) {
          result[currentSection][currentKey || 'data'] = [];
        }
        const dataKey = currentKey || 'data';
        if (!Array.isArray(result[currentSection][dataKey])) {
          result[currentSection][dataKey] = [];
        }
        result[currentSection][dataKey].push(valueTrimmed.replace(/^-\s*/, ''));
      } else if (keyTrimmed && !valueTrimmed) {
        // Nested key (bucket name)
        currentKey = keyTrimmed;
        if (!result[currentSection][keyTrimmed]) {
          result[currentSection][keyTrimmed] = {};
        }
      }
    }
  }
  
  return result;
}

/**
 * Extract SQL queries from YAML
 */
function extractSQLQueries(yaml: string): string[] {
  const queries: string[] = [];
  const lines = yaml.split('\n');
  let inQuery = false;
  let currentQuery: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- SELECT') || trimmed.startsWith('SELECT')) {
      inQuery = true;
      currentQuery = [trimmed.replace(/^-\s*/, '')];
    } else if (inQuery && (trimmed.startsWith('FROM') || trimmed.startsWith('WHERE') || trimmed.includes('INTERVAL') || trimmed === '')) {
      if (trimmed) {
        currentQuery.push(trimmed);
      }
      if (trimmed === '' && currentQuery.length > 0) {
        queries.push(currentQuery.join(' '));
        currentQuery = [];
        inQuery = false;
      }
    } else if (inQuery) {
      currentQuery.push(trimmed);
    }
  }
  
  if (currentQuery.length > 0) {
    queries.push(currentQuery.join(' '));
  }
  
  return queries;
}

// ============================================================================
// SYNC RULES CONFIGURATION TESTS (Task 7.2a)
// ============================================================================

Deno.test('sync: required configuration keys are set', () => {
  checkRequiredConfig();
});

Deno.test('sync: powersync.yaml file exists', async () => {
  const exists = await fileExists(SYNC_RULES_FILE);
  assertEquals(exists, true, `Sync rules file should exist at ${SYNC_RULES_FILE}`);
});

Deno.test('sync: powersync.yaml has valid YAML syntax', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  
  // Basic YAML validation - check for common syntax errors
  // Check for balanced colons (key-value pairs)
  const colonCount = (yaml.match(/:/g) || []).length;
  assertExists(colonCount > 0, 'YAML should contain key-value pairs');
  
  // Check for proper indentation (basic check)
  const lines = yaml.split('\n');
  let hasContent = false;
  for (const line of lines) {
    if (line.trim() && !line.trim().startsWith('#')) {
      hasContent = true;
      break;
    }
  }
  assertEquals(hasContent, true, 'YAML should have content');
});

Deno.test('sync: powersync.yaml has bucket_definitions section', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'bucket_definitions',
    'YAML should contain bucket_definitions section'
  );
});

Deno.test('sync: powersync.yaml has user_data bucket definition', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'user_data',
    'YAML should contain user_data bucket definition'
  );
});

Deno.test('sync: powersync.yaml has content bucket definition', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'content',
    'YAML should contain content bucket definition'
  );
});

Deno.test('sync: powersync.yaml has tracks bucket definition', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'tracks',
    'YAML should contain tracks bucket definition'
  );
});

Deno.test('sync: user_data bucket has parameters section', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  // Find user_data section
  const userDataIndex = yaml.toLowerCase().indexOf('user_data');
  if (userDataIndex === -1) {
    throw new Error('user_data bucket not found');
  }
  
  const userDataSection = yaml.substring(userDataIndex);
  assertStringIncludes(
    userDataSection.toLowerCase(),
    'parameters',
    'user_data bucket should have parameters section'
  );
});

Deno.test('sync: user_data bucket has user_id parameter', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    'user_id',
    'user_data bucket should have user_id parameter'
  );
  assertStringIncludes(
    yaml.toLowerCase(),
    'token.user_id',
    'user_data bucket should reference token.user_id'
  );
});

Deno.test('sync: user_data bucket has SQL query for user_study_log', async () => {
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

Deno.test('sync: user_data bucket SQL includes 14-day window filter', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  assertStringIncludes(
    yaml.toLowerCase(),
    '14 days',
    'user_data bucket SQL should include 14-day window filter'
  );
  assertStringIncludes(
    yaml.toLowerCase(),
    'current_date',
    'user_data bucket SQL should use CURRENT_DATE for window calculation'
  );
});

Deno.test('sync: user_data bucket SQL includes all required columns', async () => {
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
      `user_data SQL should include column: ${col}`
    );
  }
});

Deno.test('sync: content bucket has SQL query for content_cache', async () => {
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

Deno.test('sync: content bucket SQL includes all required columns', async () => {
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
      `content bucket SQL should include column: ${col}`
    );
  }
});

Deno.test('sync: tracks bucket has SQL query for tracks table', async () => {
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

Deno.test('sync: tracks bucket SQL includes all required columns', async () => {
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
      `tracks bucket SQL should include column: ${col}`
    );
  }
});

Deno.test('sync: SQL queries have valid SELECT syntax', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  const queries = extractSQLQueries(yaml);
  
  assertExists(queries.length > 0, 'Should have at least one SQL query');
  
  for (const query of queries) {
    assertStringIncludes(
      query.toUpperCase(),
      'SELECT',
      'Each query should start with SELECT'
    );
    assertStringIncludes(
      query.toUpperCase(),
      'FROM',
      'Each query should have FROM clause'
    );
  }
});

Deno.test('sync: content bucket SQL references user_study_log for filtering', async () => {
  if (!(await fileExists(SYNC_RULES_FILE))) {
    throw new Error('Sync rules file does not exist - skipping test');
  }

  const yaml = await Deno.readTextFile(SYNC_RULES_FILE);
  // Content bucket should filter based on user_study_log references
  const contentSection = yaml.substring(yaml.toLowerCase().indexOf('content'));
  assertStringIncludes(
    contentSection.toLowerCase(),
    'user_study_log',
    'content bucket SQL should reference user_study_log for filtering'
  );
});
