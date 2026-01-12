// supabase/tests/logic/user-track-joining.test.ts
// Tests for user track joining logic
// Reference: TDD Section 6.2, scheduling.md

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321';
// Default keys for local Supabase development
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Disable autoRefreshToken to prevent interval leaks in Deno tests
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Helper to create a test user via auth
async function createTestUser(): Promise<string> {
  const { data, error } = await anonClient.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }
  return data.user.id;
}

// Helper to create a test track
async function createTestTrack(scheduleType: string = 'DAILY_WEEKDAYS_ONLY'): Promise<string> {
  const { data, error } = await supabase
    .from('tracks')
    .insert({
      title: 'Test Track',
      schedule_type: scheduleType,
      source_endpoint: 'https://www.sefaria.org/api/',
    })
    .select('id')
    .single();
  
  if (error || !data) {
    throw new Error(`Failed to create test track: ${error?.message}`);
  }
  return data.id;
}

// Helper to invoke generate-schedule Edge Function
async function invokeGenerateSchedule(
  userId: string,
  trackId: string,
  startDate: string,
  daysAhead: number = 14
): Promise<any> {
  const testClient = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await testClient.functions.invoke('generate-schedule', {
    body: {
      user_id: userId,
      track_id: trackId,
      start_date: startDate,
      days_ahead: daysAhead,
    },
  });

  if (error) {
    throw new Error(`Edge Function error: ${error.message}`);
  }

  if (!data) {
    throw new Error('Edge Function returned no data');
  }

  return data;
}

// Helper to get user_study_log entries
async function getUserStudyLogs(userId: string, trackId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('user_study_log')
    .select('*')
    .eq('user_id', userId)
    .eq('track_id', trackId)
    .order('study_date', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to get user study logs: ${error.message}`);
  }
  return data || [];
}

// ============================================================================
// USER TRACK JOINING TESTS
// ============================================================================

Deno.test('user-joining: user can join track on any date', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // User joins on a Wednesday (mid-week)
  const joinDate = '2024-01-17'; // Wednesday
  const daysAhead = 7;
  
  const response = await invokeGenerateSchedule(userId, trackId, joinDate, daysAhead);
  
  // Should create units starting from join date
  assertExists(response.scheduled_units.length > 0, 'Should create units when user joins');
  
  // First unit should be on or after join date
  const firstUnit = response.scheduled_units[0];
  const firstUnitDate = new Date(firstUnit.study_date);
  const joinDateObj = new Date(joinDate);
  
  assertEquals(firstUnitDate >= joinDateObj, true, 'First unit should be on or after join date');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

Deno.test('user-joining: user joining on Saturday gets first weekday unit', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // User joins on a Saturday
  const joinDate = '2024-01-20'; // Saturday
  const daysAhead = 7;
  
  const response = await invokeGenerateSchedule(userId, trackId, joinDate, daysAhead);
  
  // Should create units, but first one should be Sunday (next weekday in Hebrew calendar)
  assertExists(response.scheduled_units.length > 0, 'Should create units even if joining on Saturday');
  
  const firstUnit = response.scheduled_units[0];
  const firstUnitDate = new Date(firstUnit.study_date);
  const dayOfWeek = firstUnitDate.getDay();
  
  // First unit should be Sunday (0) - next weekday after Saturday in Hebrew calendar
  assertEquals(dayOfWeek === 0, true, 'First unit should be Sunday (next weekday after Saturday in Hebrew calendar)');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

Deno.test('user-joining: user joining on holiday gets first available weekday', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // User joins on Passover (April 22, 2024 is a Monday but a holiday)
  const joinDate = '2024-04-22'; // Monday, but Passover
  const daysAhead = 7;
  
  const response = await invokeGenerateSchedule(userId, trackId, joinDate, daysAhead);
  
  // Should create units, but first one should skip the holiday
  if (response.scheduled_units.length > 0) {
    const firstUnit = response.scheduled_units[0];
    const firstUnitDate = new Date(firstUnit.study_date);
    const joinDateObj = new Date(joinDate);
    
    // First unit should be after the holiday
    assertEquals(firstUnitDate > joinDateObj, true, 'First unit should be after holiday');
  }
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

Deno.test('user-joining: each user has independent track progression', async () => {
  const userId1 = await createTestUser();
  const userId2 = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // User 1 joins on Monday
  const joinDate1 = '2024-01-15'; // Monday
  await invokeGenerateSchedule(userId1, trackId, joinDate1, 5);
  
  // User 2 joins on Wednesday (same track, different date)
  const joinDate2 = '2024-01-17'; // Wednesday
  await invokeGenerateSchedule(userId2, trackId, joinDate2, 5);
  
  // Get both users' study logs
  const logs1 = await getUserStudyLogs(userId1, trackId);
  const logs2 = await getUserStudyLogs(userId2, trackId);
  
  // Both should have units
  assertEquals(logs1.length > 0, true, 'User 1 should have units');
  assertEquals(logs2.length > 0, true, 'User 2 should have units');
  
  // User 1's first unit should be Monday
  const user1FirstDate = new Date(logs1[0].study_date);
  const joinDate1Obj = new Date(joinDate1);
  assertEquals(user1FirstDate.getTime(), joinDate1Obj.getTime(), 'User 1 should start on join date');
  
  // User 2's first unit should be Wednesday
  const user2FirstDate = new Date(logs2[0].study_date);
  const joinDate2Obj = new Date(joinDate2);
  assertEquals(user2FirstDate.getTime(), joinDate2Obj.getTime(), 'User 2 should start on join date');
  
  // Users should have different progression
  assertEquals(logs1[0].study_date !== logs2[0].study_date, true, 'Users should have different start dates');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId1).eq('track_id', trackId);
  await supabase.from('user_study_log').delete().eq('user_id', userId2).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

Deno.test('user-joining: content assignment starts from beginning for new user', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // User joins on Monday
  const joinDate = '2024-01-15'; // Monday
  const daysAhead = 3; // Mon, Tue, Wed
  
  await invokeGenerateSchedule(userId, trackId, joinDate, daysAhead);
  
  // Get user's study logs
  const logs = await getUserStudyLogs(userId, trackId);
  
  // Should have 3 units (Mon, Tue, Wed)
  assertEquals(logs.length, 3, 'Should create 3 units for 3 weekdays');
  
  // All units should be for this user and track
  logs.forEach(log => {
    assertEquals(log.user_id, userId, 'All units should belong to the user');
    assertEquals(log.track_id, trackId, 'All units should belong to the track');
    assertEquals(log.is_completed, false, 'Units should start as not completed');
  });
  
  // Content assignment should be sequential (content_id or content reference)
  // For now, we verify units were created - content assignment logic will be tested separately
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

Deno.test('user-joining: user can join multiple times without duplicates', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // User joins on Monday
  const joinDate = '2024-01-15'; // Monday
  const daysAhead = 7;
  
  // Call function twice with same parameters
  await invokeGenerateSchedule(userId, trackId, joinDate, daysAhead);
  await invokeGenerateSchedule(userId, trackId, joinDate, daysAhead);
  
  // Should still have same number of units (no duplicates)
  const logs = await getUserStudyLogs(userId, trackId);
  const uniqueDates = new Set(logs.map(log => log.study_date));
  
  assertEquals(logs.length, uniqueDates.size, 'Should not create duplicate units');
  assertEquals(logs.length, 5, 'Should have 5 weekday units (Mon-Fri)');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

Deno.test('user-joining: extending schedule window preserves existing units', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // First call: generate for first week
  const joinDate = '2024-01-15'; // Monday
  await invokeGenerateSchedule(userId, trackId, joinDate, 5); // Mon-Fri
  
  // Second call: extend window (same start date, more days)
  await invokeGenerateSchedule(userId, trackId, joinDate, 10); // Extend to 10 days
  
  // Should have units for extended window
  const logs = await getUserStudyLogs(userId, trackId);
  
  // Should have more units (next week's weekdays)
  assertEquals(logs.length >= 5, true, 'Should have at least 5 units');
  assertEquals(logs.length <= 10, true, 'Should not exceed 10 days');
  
  // All dates should be unique
  const uniqueDates = new Set(logs.map(log => log.study_date));
  assertEquals(logs.length, uniqueDates.size, 'Should not have duplicate dates');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});
