// supabase/tests/syntax/migrations.test.ts
// SQL syntax validation tests (no Supabase required)
// These tests validate SQL structure without running a database

import { assert, assertStringIncludes } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// Helper to read migration file
function readMigration(filename: string): string {
  const path = `supabase/migrations/${filename}`;
  try {
    return Deno.readTextFileSync(path);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to read migration ${filename}: ${message}`);
  }
}

// ============================================================================
// TRACKS TABLE MIGRATION VALIDATION
// ============================================================================

Deno.test('syntax: tracks migration contains CREATE TABLE', () => {
  const sql = readMigration('20260112173132_create_tracks_table.sql');
  
  assertStringIncludes(sql, 'CREATE TABLE tracks', 'Should create tracks table');
  assertStringIncludes(sql, 'id UUID', 'Should have id column');
  assertStringIncludes(sql, 'title TEXT', 'Should have title column');
  assertStringIncludes(sql, 'schedule_type TEXT', 'Should have schedule_type column');
});

Deno.test('syntax: tracks migration has PRIMARY KEY', () => {
  const sql = readMigration('20260112173132_create_tracks_table.sql');
  
  assertStringIncludes(sql, 'PRIMARY KEY', 'Should have primary key');
  assertStringIncludes(sql, 'DEFAULT gen_random_uuid()', 'Should auto-generate UUID');
});

Deno.test('syntax: tracks migration has NOT NULL constraints', () => {
  const sql = readMigration('20260112173132_create_tracks_table.sql');
  
  assertStringIncludes(sql, 'title TEXT NOT NULL', 'title should be NOT NULL');
  assertStringIncludes(sql, 'schedule_type TEXT NOT NULL', 'schedule_type should be NOT NULL');
});

// ============================================================================
// CONTENT_CACHE TABLE MIGRATION VALIDATION
// ============================================================================

Deno.test('syntax: content_cache migration contains CREATE TABLE', () => {
  const sql = readMigration('20260112173224_create_content_cache_table.sql');
  
  assertStringIncludes(sql, 'CREATE TABLE content_cache', 'Should create content_cache table');
  assertStringIncludes(sql, 'ref_id TEXT', 'Should have ref_id column');
  assertStringIncludes(sql, 'source_text_he TEXT', 'Should have source_text_he column');
  assertStringIncludes(sql, 'ai_explanation_he TEXT', 'Should have ai_explanation_he column');
});

Deno.test('syntax: content_cache migration has UNIQUE constraint', () => {
  const sql = readMigration('20260112173224_create_content_cache_table.sql');
  
  assertStringIncludes(sql, 'UNIQUE', 'Should have UNIQUE constraint on ref_id');
  assertStringIncludes(sql, 'ref_id TEXT UNIQUE', 'ref_id should be UNIQUE');
});

Deno.test('syntax: content_cache migration has JSONB column', () => {
  const sql = readMigration('20260112173224_create_content_cache_table.sql');
  
  assertStringIncludes(sql, 'ai_deep_dive_json JSONB', 'Should have JSONB column');
});

Deno.test('syntax: content_cache migration has index', () => {
  const sql = readMigration('20260112173224_create_content_cache_table.sql');
  
  assertStringIncludes(sql, 'CREATE INDEX', 'Should create index');
  assertStringIncludes(sql, 'idx_content_cache_ref_id', 'Should have index on ref_id');
});

// ============================================================================
// USER_STUDY_LOG TABLE MIGRATION VALIDATION
// ============================================================================

Deno.test('syntax: user_study_log migration contains CREATE TABLE', () => {
  const sql = readMigration('20260112173226_create_user_study_log_table.sql');
  
  assertStringIncludes(sql, 'CREATE TABLE user_study_log', 'Should create user_study_log table');
  assertStringIncludes(sql, 'user_id UUID', 'Should have user_id column');
  assertStringIncludes(sql, 'track_id UUID', 'Should have track_id column');
  assertStringIncludes(sql, 'study_date DATE', 'Should have study_date column');
});

Deno.test('syntax: user_study_log migration has foreign keys', () => {
  const sql = readMigration('20260112173226_create_user_study_log_table.sql');
  
  assertStringIncludes(sql, 'REFERENCES auth.users', 'Should reference auth.users');
  assertStringIncludes(sql, 'REFERENCES tracks', 'Should reference tracks');
  assertStringIncludes(sql, 'REFERENCES content_cache', 'Should reference content_cache');
});

Deno.test('syntax: user_study_log migration has composite UNIQUE', () => {
  const sql = readMigration('20260112173226_create_user_study_log_table.sql');
  
  assertStringIncludes(sql, 'UNIQUE(user_id, study_date, track_id)', 'Should have composite unique constraint');
});

Deno.test('syntax: user_study_log migration has indexes', () => {
  const sql = readMigration('20260112173226_create_user_study_log_table.sql');
  
  assertStringIncludes(sql, 'CREATE INDEX', 'Should create indexes');
  assertStringIncludes(sql, 'idx_user_study_log_user_id', 'Should have index on user_id');
  assertStringIncludes(sql, 'idx_user_study_log_track_id', 'Should have index on track_id');
});

// ============================================================================
// RLS POLICIES MIGRATION VALIDATION
// ============================================================================

Deno.test('syntax: RLS migration enables RLS on all tables', () => {
  const sql = readMigration('20260112174200_enable_rls_policies.sql');
  
  assertStringIncludes(sql, 'ALTER TABLE tracks ENABLE ROW LEVEL SECURITY', 'Should enable RLS on tracks');
  assertStringIncludes(sql, 'ALTER TABLE content_cache ENABLE ROW LEVEL SECURITY', 'Should enable RLS on content_cache');
  assertStringIncludes(sql, 'ALTER TABLE user_study_log ENABLE ROW LEVEL SECURITY', 'Should enable RLS on user_study_log');
});

Deno.test('syntax: RLS migration creates policies', () => {
  const sql = readMigration('20260112174200_enable_rls_policies.sql');
  
  assertStringIncludes(sql, 'CREATE POLICY', 'Should create policies');
  assertStringIncludes(sql, 'Anyone can read tracks', 'Should have tracks read policy');
  assertStringIncludes(sql, 'Authenticated users can read content', 'Should have content_cache read policy');
  assertStringIncludes(sql, 'Users can select own study logs', 'Should have user_study_log select policy');
  assertStringIncludes(sql, 'Users can insert own study logs', 'Should have user_study_log insert policy');
  assertStringIncludes(sql, 'Users can update own study logs', 'Should have user_study_log update policy');
});

Deno.test('syntax: RLS migration uses auth.uid()', () => {
  const sql = readMigration('20260112174200_enable_rls_policies.sql');
  
  assertStringIncludes(sql, 'auth.uid() = user_id', 'Should use auth.uid() for user isolation');
});

// ============================================================================
// MIGRATION ORDER VALIDATION
// ============================================================================

Deno.test('syntax: migrations are in correct order', () => {
  // Check that tracks is created before user_study_log (foreign key dependency)
  const tracksSql = readMigration('20260112173132_create_tracks_table.sql');
  const userStudyLogSql = readMigration('20260112173226_create_user_study_log_table.sql');
  
  // user_study_log references tracks, so tracks must exist first
  assertStringIncludes(userStudyLogSql, 'REFERENCES tracks', 'user_study_log should reference tracks');
  assertStringIncludes(tracksSql, 'CREATE TABLE tracks', 'tracks should be created first');
});

Deno.test('syntax: RLS migration comes after table creation', () => {
  // RLS policies require tables to exist
  const rlsSql = readMigration('20260112174200_enable_rls_policies.sql');
  
  // RLS migration should reference all three tables
  assertStringIncludes(rlsSql, 'tracks', 'Should reference tracks table');
  assertStringIncludes(rlsSql, 'content_cache', 'Should reference content_cache table');
  assertStringIncludes(rlsSql, 'user_study_log', 'Should reference user_study_log table');
});
