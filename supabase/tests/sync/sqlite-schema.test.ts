// supabase/tests/sync/sqlite-schema.test.ts
// Tests for SQLite schema definitions (PowerSync client-side schemas)
// These tests validate that SQLite schemas match PostgreSQL structure

import { assertEquals, assertExists, assertStringIncludes } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// Expected SQLite schema paths (will be created by Sync Agent)
const SCHEMA_DIR = 'powersync/schemas';
const USER_STUDY_LOG_SCHEMA = `${SCHEMA_DIR}/user_study_log.sql`;
const CONTENT_CACHE_SCHEMA = `${SCHEMA_DIR}/content_cache.sql`;
const TRACKS_SCHEMA = `${SCHEMA_DIR}/tracks.sql`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse SQL CREATE TABLE statement and extract column definitions
 */
function parseTableSchema(sql: string): {
  tableName: string;
  columns: Map<string, { type: string; nullable: boolean; default?: string }>;
  constraints: string[];
  indexes: string[];
} {
  const columns = new Map<string, { type: string; nullable: boolean; default?: string }>();
  const constraints: string[] = [];
  const indexes: string[] = [];

  // Extract table name
  const tableMatch = sql.match(/CREATE TABLE\s+(\w+)\s*\(/i);
  const tableName = tableMatch ? tableMatch[1] : '';

  // Extract column definitions
  // Match patterns like:
  // - col_name TYPE
  // - col_name TYPE NOT NULL
  // - col_name TYPE UNIQUE NOT NULL
  // - col_name TYPE PRIMARY KEY NOT NULL
  // - col_name TYPE NOT NULL DEFAULT value
  const columnRegex = /(\w+)\s+(\w+(?:\([^)]+\))?)\s*(?:UNIQUE\s+)?(?:PRIMARY\s+KEY\s+)?(NOT\s+NULL)?\s*(?:UNIQUE\s+)?(?:PRIMARY\s+KEY\s+)?(DEFAULT\s+[^,)]+)?/gi;
  let match;
  while ((match = columnRegex.exec(sql)) !== null) {
    const [, colName, colType, notNull, defaultValue] = match;
    // Skip if this is a constraint line (UNIQUE(...) or PRIMARY KEY)
    if (colName === 'UNIQUE' || colName === 'PRIMARY' || colName === 'KEY') {
      continue;
    }
    // PRIMARY KEY implies NOT NULL in SQLite
    const hasPrimaryKey = sql.includes(`${colName} PRIMARY KEY`);
    const isNotNull = notNull !== undefined || hasPrimaryKey;
    columns.set(colName, {
      type: colType.toUpperCase(),
      nullable: !isNotNull,
      default: defaultValue ? defaultValue.replace(/^DEFAULT\s+/i, '').trim() : undefined,
    });
  }

  // Extract UNIQUE constraints
  const uniqueRegex = /UNIQUE\s*\(([^)]+)\)/gi;
  while ((match = uniqueRegex.exec(sql)) !== null) {
    constraints.push(`UNIQUE(${match[1]})`);
  }

  // Extract indexes
  const indexRegex = /CREATE INDEX\s+(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)/gi;
  while ((match = indexRegex.exec(sql)) !== null) {
    indexes.push(`${match[1]} ON ${match[2]}(${match[3]})`);
  }

  return { tableName, columns, constraints, indexes };
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

// ============================================================================
// USER_STUDY_LOG SQLITE SCHEMA TESTS (Task 7.6a)
// ============================================================================

Deno.test('sync: user_study_log SQLite schema file exists', async () => {
  const exists = await fileExists(USER_STUDY_LOG_SCHEMA);
  assertEquals(exists, true, `Schema file should exist at ${USER_STUDY_LOG_SCHEMA}`);
});

Deno.test('sync: user_study_log SQLite schema has correct table name', async () => {
  if (!(await fileExists(USER_STUDY_LOG_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(USER_STUDY_LOG_SCHEMA);
  const schema = parseTableSchema(sql);
  
  assertEquals(schema.tableName, 'user_study_log', 'Table name should be user_study_log');
});

Deno.test('sync: user_study_log SQLite schema has all required columns', async () => {
  if (!(await fileExists(USER_STUDY_LOG_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(USER_STUDY_LOG_SCHEMA);
  const schema = parseTableSchema(sql);

  // Required columns from PostgreSQL schema (TDD Section 4.3)
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
    assertExists(
      schema.columns.get(col),
      `Column ${col} should exist in SQLite schema`
    );
  }
});

Deno.test('sync: user_study_log SQLite schema has correct data type mappings', async () => {
  if (!(await fileExists(USER_STUDY_LOG_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(USER_STUDY_LOG_SCHEMA);
  const schema = parseTableSchema(sql);

  // PostgreSQL UUID → SQLite TEXT
  assertEquals(schema.columns.get('id')?.type, 'TEXT', 'id should be TEXT (UUID→TEXT)');
  assertEquals(schema.columns.get('user_id')?.type, 'TEXT', 'user_id should be TEXT (UUID→TEXT)');
  assertEquals(schema.columns.get('track_id')?.type, 'TEXT', 'track_id should be TEXT (UUID→TEXT)');
  assertEquals(schema.columns.get('content_id')?.type, 'TEXT', 'content_id should be TEXT (UUID→TEXT)');

  // PostgreSQL DATE → SQLite TEXT
  assertEquals(schema.columns.get('study_date')?.type, 'TEXT', 'study_date should be TEXT (DATE→TEXT)');

  // PostgreSQL BOOLEAN → SQLite INTEGER
  assertEquals(schema.columns.get('is_completed')?.type, 'INTEGER', 'is_completed should be INTEGER (BOOLEAN→INTEGER)');

  // PostgreSQL TIMESTAMPTZ → SQLite TEXT
  assertEquals(schema.columns.get('completed_at')?.type, 'TEXT', 'completed_at should be TEXT (TIMESTAMPTZ→TEXT)');
});

Deno.test('sync: user_study_log SQLite schema has NOT NULL constraints', async () => {
  if (!(await fileExists(USER_STUDY_LOG_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(USER_STUDY_LOG_SCHEMA);
  const schema = parseTableSchema(sql);

  // Columns that should be NOT NULL (matching PostgreSQL)
  const notNullColumns = ['id', 'user_id', 'track_id', 'study_date', 'is_completed'];

  for (const col of notNullColumns) {
    const column = schema.columns.get(col);
    assertExists(column, `Column ${col} should exist`);
    assertEquals(
      column.nullable,
      false,
      `Column ${col} should be NOT NULL`
    );
  }

  // Optional columns (can be NULL)
  const nullableColumns = ['content_id', 'completed_at'];
  for (const col of nullableColumns) {
    const column = schema.columns.get(col);
    if (column) {
      // These can be nullable
      assertEquals(
        column.nullable,
        true,
        `Column ${col} can be nullable`
      );
    }
  }
});

Deno.test('sync: user_study_log SQLite schema has UNIQUE constraint', async () => {
  if (!(await fileExists(USER_STUDY_LOG_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(USER_STUDY_LOG_SCHEMA);
  const schema = parseTableSchema(sql);

  // Should have UNIQUE constraint on (user_id, study_date, track_id)
  const hasUniqueConstraint = schema.constraints.some(
    (c) => c.includes('user_id') && c.includes('study_date') && c.includes('track_id')
  );

  assertEquals(
    hasUniqueConstraint,
    true,
    'Should have UNIQUE constraint on (user_id, study_date, track_id)'
  );
});

Deno.test('sync: user_study_log SQLite schema has required indexes', async () => {
  if (!(await fileExists(USER_STUDY_LOG_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(USER_STUDY_LOG_SCHEMA);
  const schema = parseTableSchema(sql);

  // Required indexes (from sync.md Section 4)
  const requiredIndexes = [
    'idx_study_log_user_date ON user_study_log(user_id, study_date)',
    'idx_study_log_track ON user_study_log(track_id)',
  ];

  for (const requiredIndex of requiredIndexes) {
    const hasIndex = schema.indexes.some((idx) => idx.includes(requiredIndex.split(' ON ')[0]));
    assertEquals(
      hasIndex,
      true,
      `Should have index: ${requiredIndex}`
    );
  }
});

Deno.test('sync: user_study_log SQLite schema has correct default value for is_completed', async () => {
  if (!(await fileExists(USER_STUDY_LOG_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(USER_STUDY_LOG_SCHEMA);
  const schema = parseTableSchema(sql);

  const isCompletedCol = schema.columns.get('is_completed');
  assertExists(isCompletedCol, 'is_completed column should exist');
  
  // Should have DEFAULT 0 (false in SQLite INTEGER)
  assertStringIncludes(
    sql.toLowerCase(),
    'is_completed',
    'is_completed should be in schema'
  );
  // Check for default value (can be 0 or FALSE)
  const hasDefault = isCompletedCol.default !== undefined || sql.toLowerCase().includes('default 0');
  assertEquals(hasDefault, true, 'is_completed should have DEFAULT 0');
});

// ============================================================================
// CONTENT_CACHE SQLITE SCHEMA TESTS (Task 7.7a)
// ============================================================================

Deno.test('sync: content_cache SQLite schema file exists', async () => {
  const exists = await fileExists(CONTENT_CACHE_SCHEMA);
  assertEquals(exists, true, `Schema file should exist at ${CONTENT_CACHE_SCHEMA}`);
});

Deno.test('sync: content_cache SQLite schema has correct table name', async () => {
  if (!(await fileExists(CONTENT_CACHE_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(CONTENT_CACHE_SCHEMA);
  const schema = parseTableSchema(sql);
  
  assertEquals(schema.tableName, 'content_cache', 'Table name should be content_cache');
});

Deno.test('sync: content_cache SQLite schema has all required columns', async () => {
  if (!(await fileExists(CONTENT_CACHE_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(CONTENT_CACHE_SCHEMA);
  const schema = parseTableSchema(sql);

  // Required columns from PostgreSQL schema (TDD Section 4.2)
  const requiredColumns = [
    'id',
    'ref_id',
    'source_text_he',
    'ai_explanation_json',
    'created_at',
  ];

  for (const col of requiredColumns) {
    assertExists(
      schema.columns.get(col),
      `Column ${col} should exist in SQLite schema`
    );
  }
});

Deno.test('sync: content_cache SQLite schema has correct data type mappings', async () => {
  if (!(await fileExists(CONTENT_CACHE_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(CONTENT_CACHE_SCHEMA);
  const schema = parseTableSchema(sql);

  // PostgreSQL UUID → SQLite TEXT
  assertEquals(schema.columns.get('id')?.type, 'TEXT', 'id should be TEXT (UUID→TEXT)');

  // PostgreSQL TEXT → SQLite TEXT
  assertEquals(schema.columns.get('ref_id')?.type, 'TEXT', 'ref_id should be TEXT');
  assertEquals(schema.columns.get('source_text_he')?.type, 'TEXT', 'source_text_he should be TEXT');

  // PostgreSQL JSONB → SQLite TEXT (stored as JSON string)
  assertEquals(schema.columns.get('ai_explanation_json')?.type, 'TEXT', 'ai_explanation_json should be TEXT (JSONB→TEXT)');

  // PostgreSQL TIMESTAMPTZ → SQLite TEXT
  assertEquals(schema.columns.get('created_at')?.type, 'TEXT', 'created_at should be TEXT (TIMESTAMPTZ→TEXT)');
});

Deno.test('sync: content_cache SQLite schema has UNIQUE constraint on ref_id', async () => {
  if (!(await fileExists(CONTENT_CACHE_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(CONTENT_CACHE_SCHEMA);
  const schema = parseTableSchema(sql);

  // Should have UNIQUE constraint on ref_id
  const hasUniqueConstraint = schema.constraints.some(
    (c) => c.includes('ref_id')
  ) || sql.toLowerCase().includes('ref_id') && sql.toLowerCase().includes('unique');

  assertEquals(
    hasUniqueConstraint,
    true,
    'Should have UNIQUE constraint on ref_id'
  );
});

Deno.test('sync: content_cache SQLite schema has NOT NULL constraints', async () => {
  if (!(await fileExists(CONTENT_CACHE_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(CONTENT_CACHE_SCHEMA);
  const schema = parseTableSchema(sql);

  // Columns that should be NOT NULL (matching PostgreSQL)
  const notNullColumns = ['id', 'ref_id', 'source_text_he', 'ai_explanation_json'];

  for (const col of notNullColumns) {
    const column = schema.columns.get(col);
    assertExists(column, `Column ${col} should exist`);
    assertEquals(
      column.nullable,
      false,
      `Column ${col} should be NOT NULL`
    );
  }
});

// ============================================================================
// TRACKS SQLITE SCHEMA TESTS (Task 7.8a)
// ============================================================================

Deno.test('sync: tracks SQLite schema file exists', async () => {
  const exists = await fileExists(TRACKS_SCHEMA);
  assertEquals(exists, true, `Schema file should exist at ${TRACKS_SCHEMA}`);
});

Deno.test('sync: tracks SQLite schema has correct table name', async () => {
  if (!(await fileExists(TRACKS_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(TRACKS_SCHEMA);
  const schema = parseTableSchema(sql);
  
  assertEquals(schema.tableName, 'tracks', 'Table name should be tracks');
});

Deno.test('sync: tracks SQLite schema has all required columns', async () => {
  if (!(await fileExists(TRACKS_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(TRACKS_SCHEMA);
  const schema = parseTableSchema(sql);

  // Required columns from PostgreSQL schema (TDD Section 4.1)
  const requiredColumns = [
    'id',
    'title',
    'source_endpoint',
    'schedule_type',
  ];

  for (const col of requiredColumns) {
    assertExists(
      schema.columns.get(col),
      `Column ${col} should exist in SQLite schema`
    );
  }
});

Deno.test('sync: tracks SQLite schema has correct data type mappings', async () => {
  if (!(await fileExists(TRACKS_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(TRACKS_SCHEMA);
  const schema = parseTableSchema(sql);

  // PostgreSQL UUID → SQLite TEXT
  assertEquals(schema.columns.get('id')?.type, 'TEXT', 'id should be TEXT (UUID→TEXT)');

  // PostgreSQL TEXT → SQLite TEXT
  assertEquals(schema.columns.get('title')?.type, 'TEXT', 'title should be TEXT');
  assertEquals(schema.columns.get('source_endpoint')?.type, 'TEXT', 'source_endpoint should be TEXT');
  assertEquals(schema.columns.get('schedule_type')?.type, 'TEXT', 'schedule_type should be TEXT');
});

Deno.test('sync: tracks SQLite schema has NOT NULL constraints', async () => {
  if (!(await fileExists(TRACKS_SCHEMA))) {
    throw new Error('Schema file does not exist - skipping test');
  }

  const sql = await Deno.readTextFile(TRACKS_SCHEMA);
  const schema = parseTableSchema(sql);

  // Columns that should be NOT NULL (matching PostgreSQL)
  const notNullColumns = ['id', 'title', 'schedule_type'];

  for (const col of notNullColumns) {
    const column = schema.columns.get(col);
    assertExists(column, `Column ${col} should exist`);
    assertEquals(
      column.nullable,
      false,
      `Column ${col} should be NOT NULL`
    );
  }

  // source_endpoint can be nullable (has DEFAULT in PostgreSQL)
  const sourceEndpointCol = schema.columns.get('source_endpoint');
  if (sourceEndpointCol) {
    // Can be nullable or have default
    const hasDefaultOrNullable = sourceEndpointCol.nullable || sourceEndpointCol.default !== undefined;
    assertEquals(
      hasDefaultOrNullable,
      true,
      'source_endpoint can be nullable or have default'
    );
  }
});
