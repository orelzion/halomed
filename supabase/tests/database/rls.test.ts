// supabase/tests/database/rls.test.ts
// Tests for Row Level Security (RLS) policies

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321';
// Default keys for local Supabase development
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Helper to create Supabase client with test configuration
// Disables autoRefreshToken to prevent interval leaks in Deno tests
function createTestClient(key: string) {
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

// ============================================================================
// TRACKS TABLE RLS TESTS
// ============================================================================

Deno.test('RLS: tracks table is readable by anonymous users', async () => {
  // Use anon key (not service role) to test RLS
  const supabase = createTestClient(supabaseAnonKey);
  
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .limit(1);
  
  assertEquals(error, null, 'Anonymous users should be able to read tracks');
  assertExists(data, 'Should return data array (even if empty)');
});

Deno.test('RLS: tracks table is readable by authenticated users', async () => {
  const supabase = createTestClient(supabaseAnonKey);
  
  // Sign in anonymously to get authenticated user
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
  assertEquals(authError, null, 'Should be able to sign in anonymously');
  assertExists(authData.user, 'Should have user after anonymous sign in');
  
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .limit(1);
  
  assertEquals(error, null, 'Authenticated users should be able to read tracks');
  assertExists(data, 'Should return data array');
});

Deno.test('RLS: tracks table is not writable by anonymous users', async () => {
  const supabase = createTestClient(supabaseAnonKey);
  
  const { error } = await supabase
    .from('tracks')
    .insert({
      title: 'Test Track',
      schedule_type: 'DAILY_WEEKDAYS_ONLY',
    });
  
  assertExists(error, 'Anonymous users should not be able to insert into tracks');
});

Deno.test('RLS: tracks table is not writable by authenticated users', async () => {
  const supabase = createTestClient(supabaseAnonKey);
  
  // Sign in anonymously
  await supabase.auth.signInAnonymously();
  
  const { error } = await supabase
    .from('tracks')
    .insert({
      title: 'Test Track',
      schedule_type: 'DAILY_WEEKDAYS_ONLY',
    });
  
  assertExists(error, 'Authenticated users should not be able to insert into tracks');
});

// ============================================================================
// CONTENT_CACHE TABLE RLS TESTS
// ============================================================================

Deno.test('RLS: content_cache is not readable by anonymous users', async () => {
  const supabase = createTestClient(supabaseAnonKey);
  
  const { data, error } = await supabase
    .from('content_cache')
    .select('*')
    .limit(1);
  
  // When RLS blocks access, Supabase returns empty data (not an error)
  // This is the expected behavior - anonymous users get empty results
  assertEquals(error, null, 'Query should succeed but return empty');
  assertEquals(data?.length ?? 0, 0, 'Anonymous users should get empty results (blocked by RLS)');
});

Deno.test('RLS: content_cache is readable by authenticated users', async () => {
  const supabase = createTestClient(supabaseAnonKey);
  
  // Sign in anonymously
  const { error: authError } = await supabase.auth.signInAnonymously();
  assertEquals(authError, null, 'Should be able to sign in anonymously');
  
  const { data, error } = await supabase
    .from('content_cache')
    .select('*')
    .limit(1);
  
  assertEquals(error, null, 'Authenticated users should be able to read content_cache');
  assertExists(data, 'Should return data array (even if empty)');
});

Deno.test('RLS: content_cache is not writable by authenticated users', async () => {
  const supabase = createTestClient(supabaseAnonKey);
  
  // Sign in anonymously
  await supabase.auth.signInAnonymously();
  
  const { error } = await supabase
    .from('content_cache')
    .insert({
      ref_id: 'test_ref_' + Date.now(),
      source_text_he: 'Test',
      ai_explanation_he: 'Test',
    });
  
  assertExists(error, 'Authenticated users should not be able to insert into content_cache');
});

// ============================================================================
// USER_STUDY_LOG TABLE RLS TESTS
// ============================================================================

Deno.test('RLS: user_study_log is not readable by anonymous users', async () => {
  const supabase = createTestClient(supabaseAnonKey);
  
  const { data, error } = await supabase
    .from('user_study_log')
    .select('*');
  
  // Should return empty array (not error) due to RLS filtering
  assertEquals(data?.length, 0, 'Anonymous users should see no study logs');
  assertEquals(error, null, 'Query should succeed but return empty');
});

Deno.test('RLS: authenticated user can only see own study logs', async () => {
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  // Create test track
  const { data: track } = await supabaseService
    .from('tracks')
    .insert({ title: 'Test Track', schedule_type: 'DAILY_WEEKDAYS_ONLY' })
    .select()
    .single();
  
  // Sign in as user 1
  const { data: authData1 } = await supabaseAnon.auth.signInAnonymously();
  const userId1 = authData1.user?.id;
  assertExists(userId1, 'Should have user ID');
  
  // Sign in as user 2
  const supabaseAnon2 = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData2 } = await supabaseAnon2.auth.signInAnonymously();
  const userId2 = authData2.user?.id;
  assertExists(userId2, 'Should have user ID');
  
  // Create study logs for both users using service role
  await supabaseService.from('user_study_log').insert({
    user_id: userId1,
    track_id: track.id,
    study_date: '2024-01-15',
  });
  
  await supabaseService.from('user_study_log').insert({
    user_id: userId2,
    track_id: track.id,
    study_date: '2024-01-15',
  });
  
  // User 1 should only see their own logs
  const { data: user1Logs, error: error1 } = await supabaseAnon
    .from('user_study_log')
    .select('*');
  
  assertEquals(error1, null, 'User 1 query should succeed');
  assertExists(user1Logs, 'Should return data');
  user1Logs?.forEach(log => {
    assertEquals(log.user_id, userId1, 'User 1 should only see their own logs');
  });
  
  // User 2 should only see their own logs
  const { data: user2Logs, error: error2 } = await supabaseAnon2
    .from('user_study_log')
    .select('*');
  
  assertEquals(error2, null, 'User 2 query should succeed');
  assertExists(user2Logs, 'Should return data');
  user2Logs?.forEach(log => {
    assertEquals(log.user_id, userId2, 'User 2 should only see their own logs');
  });
  
  // Cleanup
  await supabaseService.from('user_study_log').delete().eq('user_id', userId1);
  await supabaseService.from('user_study_log').delete().eq('user_id', userId2);
  await supabaseService.from('tracks').delete().eq('id', track.id);
});

Deno.test('RLS: authenticated user can insert own study logs', async () => {
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  // Create test track
  const { data: track } = await supabaseService
    .from('tracks')
    .insert({ title: 'Test Track', schedule_type: 'DAILY_WEEKDAYS_ONLY' })
    .select()
    .single();
  
  // Sign in as user
  const { data: authData } = await supabaseAnon.auth.signInAnonymously();
  const userId = authData.user?.id;
  assertExists(userId, 'Should have user ID');
  
  // User should be able to insert their own study log
  const { data, error } = await supabaseAnon
    .from('user_study_log')
    .insert({
      user_id: userId,
      track_id: track.id,
      study_date: '2024-01-15',
    })
    .select()
    .single();
  
  assertEquals(error, null, 'User should be able to insert own study log');
  assertExists(data, 'Insert should return data');
  assertEquals(data.user_id, userId, 'Inserted log should belong to user');
  
  // Cleanup
  await supabaseService.from('user_study_log').delete().eq('id', data.id);
  await supabaseService.from('tracks').delete().eq('id', track.id);
});

Deno.test('RLS: authenticated user cannot insert study logs for other users', async () => {
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  // Create test track
  const { data: track } = await supabaseService
    .from('tracks')
    .insert({ title: 'Test Track', schedule_type: 'DAILY_WEEKDAYS_ONLY' })
    .select()
    .single();
  
  // Sign in as user 1
  await supabaseAnon.auth.signInAnonymously();
  
  // Create another user ID
  const otherUserId = '00000000-0000-0000-0000-000000000999';
  
  // User 1 should not be able to insert logs for other user
  const { error } = await supabaseAnon
    .from('user_study_log')
    .insert({
      user_id: otherUserId, // Different user ID
      track_id: track.id,
      study_date: '2024-01-15',
    });
  
  assertExists(error, 'User should not be able to insert logs for other users');
  
  // Cleanup
  await supabaseService.from('tracks').delete().eq('id', track.id);
});

Deno.test('RLS: authenticated user can update own study logs', async () => {
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  // Create test track
  const { data: track } = await supabaseService
    .from('tracks')
    .insert({ title: 'Test Track', schedule_type: 'DAILY_WEEKDAYS_ONLY' })
    .select()
    .single();
  
  // Sign in as user
  const { data: authData } = await supabaseAnon.auth.signInAnonymously();
  const userId = authData.user?.id;
  assertExists(userId, 'Should have user ID');
  
  // Create study log using service role
  const { data: studyLog } = await supabaseService
    .from('user_study_log')
    .insert({
      user_id: userId,
      track_id: track.id,
      study_date: '2024-01-15',
      is_completed: false,
    })
    .select()
    .single();
  
  // User should be able to update their own study log
  const { data: updated, error } = await supabaseAnon
    .from('user_study_log')
    .update({ is_completed: true })
    .eq('id', studyLog.id)
    .select()
    .single();
  
  assertEquals(error, null, 'User should be able to update own study log');
  assertExists(updated, 'Update should return data');
  assertEquals(updated.is_completed, true, 'is_completed should be updated');
  
  // Cleanup
  await supabaseService.from('user_study_log').delete().eq('id', studyLog.id);
  await supabaseService.from('tracks').delete().eq('id', track.id);
});

Deno.test('RLS: authenticated user cannot update other users study logs', async () => {
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  // Create test track
  const { data: track } = await supabaseService
    .from('tracks')
    .insert({ title: 'Test Track', schedule_type: 'DAILY_WEEKDAYS_ONLY' })
    .select()
    .single();
  
  // Create another user via auth
  const anonClient2 = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData2 } = await anonClient2.auth.signInAnonymously();
  const otherUserId = authData2.user?.id;
  
  if (!otherUserId) {
    throw new Error('Failed to create second test user');
  }
  
  // Create study log for other user using service role
  const { data: otherUserLog } = await supabaseService
    .from('user_study_log')
    .insert({
      user_id: otherUserId,
      track_id: track.id,
      study_date: '2024-01-15',
      is_completed: false,
    })
    .select()
    .single();
  
  if (!otherUserLog) {
    throw new Error('Failed to create study log for other user');
  }
  
  // Sign in as different user (first user)
  const { data: authData1 } = await supabaseAnon.auth.signInAnonymously();
  const firstUserId = authData1.user?.id;
  if (!firstUserId) {
    throw new Error('Failed to create first test user');
  }
  
  // User should not be able to update other user's study log
  // When RLS blocks, Supabase returns success but with 0 rows updated
  const { data: updatedData, error, count } = await supabaseAnon
    .from('user_study_log')
    .update({ is_completed: true })
    .eq('id', otherUserLog.id)
    .select();
  
  // RLS should block the update - either error or 0 rows updated
  if (error) {
    // Some Supabase versions return an error
    assertExists(error, 'User should not be able to update other users study logs');
  } else {
    // Other versions return success but with 0 rows (blocked by RLS)
    assertEquals(updatedData?.length ?? 0, 0, 'Update should be blocked by RLS (0 rows updated)');
  }
  
  // Cleanup
  await supabaseService.from('user_study_log').delete().eq('id', otherUserLog.id);
  await supabaseService.from('tracks').delete().eq('id', track.id);
});
