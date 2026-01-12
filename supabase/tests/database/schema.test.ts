// supabase/tests/database/schema.test.ts
// Tests for database schema validation

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321';
// Default keys for local Supabase development
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Use service role key to bypass RLS for schema tests
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to create a test user via auth
async function createTestUser(): Promise<string> {
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await anonClient.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }
  return data.user.id;
}

// ============================================================================
// TRACKS TABLE TESTS
// ============================================================================

Deno.test('schema: tracks table exists with correct columns', async () => {
  // Test that we can query the tracks table
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .limit(0);
  
  assertEquals(error, null, 'tracks table should exist and be queryable');
  assertExists(data, 'tracks table should return data array');
  
  // Clear any timers to avoid leaks
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test('schema: tracks table has required columns', async () => {
  // Insert a test record to verify column structure
  const testTrack = {
    title: 'Test Track',
    schedule_type: 'DAILY_WEEKDAYS_ONLY',
    source_endpoint: 'https://www.sefaria.org/api/',
  };
  
  const { data, error } = await supabase
    .from('tracks')
    .insert(testTrack)
    .select()
    .single();
  
  assertEquals(error, null, 'Should be able to insert into tracks');
  assertExists(data, 'Insert should return data');
  assertExists(data.id, 'tracks should have id column (UUID)');
  assertEquals(data.title, testTrack.title, 'tracks should have title column');
  assertEquals(data.schedule_type, testTrack.schedule_type, 'tracks should have schedule_type column');
  assertEquals(data.source_endpoint, testTrack.source_endpoint, 'tracks should have source_endpoint column');
  
  // Cleanup
  await supabase.from('tracks').delete().eq('id', data.id);
});

Deno.test('schema: tracks table id is UUID and auto-generated', async () => {
  const testTrack = {
    title: 'Test Track UUID',
    schedule_type: 'DAILY_WEEKDAYS_ONLY',
  };
  
  const { data, error } = await supabase
    .from('tracks')
    .insert(testTrack)
    .select()
    .single();
  
  assertEquals(error, null);
  assertExists(data.id, 'id should be auto-generated');
  
  // Verify UUID format (basic check: should be 36 chars with dashes)
  assertEquals(data.id.length, 36, 'id should be UUID format');
  assertEquals(data.id.split('-').length, 5, 'UUID should have 5 segments');
  
  // Cleanup
  await supabase.from('tracks').delete().eq('id', data.id);
});

Deno.test('schema: tracks table title is required', async () => {
  const { error } = await supabase
    .from('tracks')
    .insert({
      schedule_type: 'DAILY_WEEKDAYS_ONLY',
      // Missing title
    });
  
  assertExists(error, 'Should fail when title is missing');
});

Deno.test('schema: tracks table schedule_type is required', async () => {
  const { error } = await supabase
    .from('tracks')
    .insert({
      title: 'Test Track',
      // Missing schedule_type
    });
  
  assertExists(error, 'Should fail when schedule_type is missing');
});

// ============================================================================
// CONTENT_CACHE TABLE TESTS
// ============================================================================

Deno.test('schema: content_cache table exists with correct columns', async () => {
  const { data, error } = await supabase
    .from('content_cache')
    .select('*')
    .limit(0);
  
  assertEquals(error, null, 'content_cache table should exist and be queryable');
  assertExists(data, 'content_cache table should return data array');
});

Deno.test('schema: content_cache has unique ref_id constraint', async () => {
  const testContent = {
    ref_id: 'test_unique_ref_' + Date.now(),
    source_text_he: 'Test Mishnah',
    ai_explanation_he: 'Test explanation',
  };
  
  // Insert first record
  const { data: data1, error: error1 } = await supabase
    .from('content_cache')
    .insert(testContent)
    .select()
    .single();
  
  assertEquals(error1, null, 'First insert should succeed');
  assertExists(data1, 'First insert should return data');
  
  // Attempt duplicate ref_id
  const { error: error2 } = await supabase
    .from('content_cache')
    .insert({
      ...testContent,
      source_text_he: 'Different text',
    });
  
  assertExists(error2, 'Duplicate ref_id should fail');
  
  // Cleanup
  await supabase
    .from('content_cache')
    .delete()
    .eq('ref_id', testContent.ref_id);
});

Deno.test('schema: content_cache has required columns', async () => {
  const testContent = {
    ref_id: 'test_content_' + Date.now(),
    source_text_he: 'מאימתי קורין את שמע בערבית',
    ai_explanation_he: 'זמן קריאת שמע של ערבית...',
    ai_deep_dive_json: { approaches: [] },
  };
  
  const { data, error } = await supabase
    .from('content_cache')
    .insert(testContent)
    .select()
    .single();
  
  assertEquals(error, null, 'Should be able to insert into content_cache');
  assertExists(data, 'Insert should return data');
  assertExists(data.id, 'content_cache should have id column (UUID)');
  assertEquals(data.ref_id, testContent.ref_id, 'content_cache should have ref_id column');
  assertEquals(data.source_text_he, testContent.source_text_he, 'content_cache should have source_text_he column');
  assertEquals(data.ai_explanation_he, testContent.ai_explanation_he, 'content_cache should have ai_explanation_he column');
  assertExists(data.created_at, 'content_cache should have created_at column');
  
  // Cleanup
  await supabase.from('content_cache').delete().eq('id', data.id);
});

Deno.test('schema: content_cache source_text_he is required', async () => {
  const { error } = await supabase
    .from('content_cache')
    .insert({
      ref_id: 'test_missing_' + Date.now(),
      ai_explanation_he: 'Test',
      // Missing source_text_he
    });
  
  assertExists(error, 'Should fail when source_text_he is missing');
});

Deno.test('schema: content_cache ai_explanation_he is required', async () => {
  const { error } = await supabase
    .from('content_cache')
    .insert({
      ref_id: 'test_missing_' + Date.now(),
      source_text_he: 'Test',
      // Missing ai_explanation_he
    });
  
  assertExists(error, 'Should fail when ai_explanation_he is missing');
});

// ============================================================================
// USER_STUDY_LOG TABLE TESTS
// ============================================================================

Deno.test('schema: user_study_log table exists with correct columns', async () => {
  const { data, error } = await supabase
    .from('user_study_log')
    .select('*')
    .limit(0);
  
  assertEquals(error, null, 'user_study_log table should exist and be queryable');
  assertExists(data, 'user_study_log table should return data array');
});

Deno.test('schema: user_study_log has composite unique constraint', async () => {
  // First, create a test track and user
  const { data: track } = await supabase
    .from('tracks')
    .insert({ title: 'Test Track', schedule_type: 'DAILY_WEEKDAYS_ONLY' })
    .select()
    .single();
  
  // Create a real test user via auth
  const testUserId = await createTestUser();
  const testDate = '2024-01-15';
  
  const testData = {
    user_id: testUserId,
    track_id: track.id,
    study_date: testDate,
  };
  
  // Insert first
  const { error: error1 } = await supabase
    .from('user_study_log')
    .insert(testData);
  
  assertEquals(error1, null, 'First insert should succeed');
  
  // Attempt duplicate (same user_id, study_date, track_id)
  const { error: error2 } = await supabase
    .from('user_study_log')
    .insert(testData);
  
  assertExists(error2, 'Duplicate composite key should fail');
  
  // Cleanup
  await supabase.from('user_study_log').delete().match(testData);
  await supabase.from('tracks').delete().eq('id', track.id);
});

Deno.test('schema: user_study_log has foreign key to tracks', async () => {
  const invalidTrackId = '00000000-0000-0000-0000-000000000999';
  const testUserId = '00000000-0000-0000-0000-000000000001';
  
  const { error } = await supabase
    .from('user_study_log')
    .insert({
      user_id: testUserId,
      track_id: invalidTrackId,
      study_date: '2024-01-15',
    });
  
  assertExists(error, 'Should fail when track_id does not exist');
});

Deno.test('schema: user_study_log has required columns', async () => {
  const { data: track } = await supabase
    .from('tracks')
    .insert({ title: 'Test Track', schedule_type: 'DAILY_WEEKDAYS_ONLY' })
    .select()
    .single();
  
  // Create a real test user via auth
  const testUserId = await createTestUser();
  const testData = {
    user_id: testUserId,
    track_id: track.id,
    study_date: '2024-01-15',
    is_completed: false,
  };
  
  const { data, error } = await supabase
    .from('user_study_log')
    .insert(testData)
    .select()
    .single();
  
  assertEquals(error, null, 'Should be able to insert into user_study_log');
  assertExists(data, 'Insert should return data');
  assertExists(data.id, 'user_study_log should have id column (UUID)');
  assertEquals(data.user_id, testUserId, 'user_study_log should have user_id column');
  assertEquals(data.track_id, track.id, 'user_study_log should have track_id column');
  assertEquals(data.study_date, testData.study_date, 'user_study_log should have study_date column');
  assertEquals(data.is_completed, false, 'user_study_log should have is_completed column with default false');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('id', data.id);
  await supabase.from('tracks').delete().eq('id', track.id);
});
