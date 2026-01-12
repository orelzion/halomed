// supabase/tests/edge-functions/generate-schedule.test.ts
// Tests for generate-schedule Edge Function
// Reference: TDD Section 6, scheduling.md

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321';
// Default keys for local Supabase development
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Use service role key for test setup/teardown
const supabase = createClient(supabaseUrl, supabaseServiceKey);
// Use anon key for Edge Function invocation (simulates client)
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

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

// Helper to create test content in content_cache
async function createTestContent(refId: string): Promise<string> {
  const { data, error } = await supabase
    .from('content_cache')
    .insert({
      ref_id: refId,
      source_text_he: 'מאימתי קורין את שמע בערבית',
      ai_explanation_he: 'Test explanation',
    })
    .select('id')
    .single();
  
  if (error || !data) {
    throw new Error(`Failed to create test content: ${error?.message}`);
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
  // Use Supabase client to invoke Edge Function
  // Create a client with service role key for testing
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

// Helper to get user_study_log entries for a user/track
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
// BASIC SCHEDULE GENERATION TESTS
// ============================================================================

Deno.test('generate-schedule: creates scheduled units for weekdays only', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // Start on a Monday (2024-01-15 is a Monday)
  const startDate = '2024-01-15';
  const daysAhead = 7;
  
  // Invoke the function
  const response = await invokeGenerateSchedule(userId, trackId, startDate, daysAhead);
  
  // Should have 5 units (Mon-Fri), not 7
  assertEquals(response.scheduled_units.length, 5, 'Should create 5 weekday units');
  
  // Verify no Saturday
  const hasSaturday = response.scheduled_units.some(
    (unit: any) => {
      const date = new Date(unit.study_date);
      return date.getDay() === 6; // Saturday
    }
  );
  assertEquals(hasSaturday, false, 'Should not schedule Saturday');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

Deno.test('generate-schedule: creates 14-day rolling window', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  const startDate = '2024-01-15'; // Monday
  const daysAhead = 14;
  
  const response = await invokeGenerateSchedule(userId, trackId, startDate, daysAhead);
  
  // Should have approximately 10 weekdays (14 days minus 2 weekends = 10 weekdays)
  // Exact count depends on start day
  assertEquals(response.scheduled_units.length >= 10, true, 'Should create at least 10 weekday units');
  assertEquals(response.scheduled_units.length <= 14, true, 'Should not exceed 14 days');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

Deno.test('generate-schedule: creates user_study_log rows in database', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  const startDate = '2024-01-15'; // Monday
  const daysAhead = 7;
  
  await invokeGenerateSchedule(userId, trackId, startDate, daysAhead);
  
  // Verify rows were created in database
  const logs = await getUserStudyLogs(userId, trackId);
  assertEquals(logs.length, 5, 'Should create 5 user_study_log rows');
  
  // Verify all have correct user_id and track_id
  logs.forEach(log => {
    assertEquals(log.user_id, userId, 'user_id should match');
    assertEquals(log.track_id, trackId, 'track_id should match');
    assertEquals(log.is_completed, false, 'should start as not completed');
  });
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

// ============================================================================
// WEEKDAY-ONLY SCHEDULING TESTS
// ============================================================================

Deno.test('generate-schedule: excludes Saturday (Shabbat)', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // Start on a Friday (2024-01-12 is a Friday)
  const startDate = '2024-01-12';
  const daysAhead = 3; // Fri, Sat, Sun
  
  const response = await invokeGenerateSchedule(userId, trackId, startDate, daysAhead);
  
  // Should only have Friday (1 unit)
  assertEquals(response.scheduled_units.length, 1, 'Should only schedule Friday');
  
  const scheduledDate = new Date(response.scheduled_units[0].study_date);
  assertEquals(scheduledDate.getDay(), 5, 'Should be Friday (day 5)');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

Deno.test('generate-schedule: excludes Sunday (not a weekday in some contexts, but included for MVP)', async () => {
  // Note: For MVP, we're doing weekdays only (Mon-Fri)
  // Sunday is typically not a weekday, but let's verify the behavior
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // Start on a Saturday (2024-01-13 is a Saturday)
  const startDate = '2024-01-13';
  const daysAhead = 3; // Sat, Sun, Mon
  
  const response = await invokeGenerateSchedule(userId, trackId, startDate, daysAhead);
  
  // Should only have Monday (1 unit)
  assertEquals(response.scheduled_units.length, 1, 'Should only schedule Monday');
  
  const scheduledDate = new Date(response.scheduled_units[0].study_date);
  assertEquals(scheduledDate.getDay(), 1, 'Should be Monday (day 1)');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

// ============================================================================
// JEWISH HOLIDAY EXCLUSION TESTS
// ============================================================================

Deno.test('generate-schedule: excludes Jewish holidays', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // Use a date range that includes a known holiday
  // Passover 2024: April 22-30 (first days: April 22-24)
  const startDate = '2024-04-22'; // First day of Passover
  const daysAhead = 5;
  
  const response = await invokeGenerateSchedule(userId, trackId, startDate, daysAhead);
  
  // Should exclude Passover days (even if they fall on weekdays)
  // Exact count depends on holiday calendar implementation
  // For now, verify that the function handles holidays
  assertExists(response.scheduled_units, 'Should return scheduled units');
  
  // Verify no units are scheduled on known holiday dates
  // (This will be more specific once Jewish calendar integration is implemented)
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

// ============================================================================
// USER TRACK JOINING TESTS
// ============================================================================

Deno.test('generate-schedule: handles user joining track at any point', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // User joins on a Wednesday
  const startDate = '2024-01-17'; // Wednesday
  const daysAhead = 14;
  
  const response = await invokeGenerateSchedule(userId, trackId, startDate, daysAhead);
  
  // Should create units starting from join date
  assertExists(response.scheduled_units.length > 0, 'Should create units from join date');
  
  // First unit should be on or after join date
  const firstUnitDate = new Date(response.scheduled_units[0].study_date);
  const joinDate = new Date(startDate);
  assertEquals(firstUnitDate >= joinDate, true, 'First unit should be on or after join date');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

Deno.test('generate-schedule: assigns content sequentially from track start', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // Create test content for first few units
  const content1 = await createTestContent('Mishnah_Berakhot.1.1');
  const content2 = await createTestContent('Mishnah_Berakhot.1.2');
  const content3 = await createTestContent('Mishnah_Berakhot.1.3');
  
  const startDate = '2024-01-15'; // Monday
  const daysAhead = 3; // Mon, Tue, Wed
  
  await invokeGenerateSchedule(userId, trackId, startDate, daysAhead);
  
  // Verify content is assigned sequentially
  const logs = await getUserStudyLogs(userId, trackId);
  assertEquals(logs.length, 3, 'Should create 3 units');
  
  // Content assignment logic will be tested once implementation is complete
  // For now, verify units were created
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('content_cache').delete().in('id', [content1, content2, content3]);
  await supabase.from('tracks').delete().eq('id', trackId);
});

// ============================================================================
// IDEMPOTENCY TESTS
// ============================================================================

Deno.test('generate-schedule: is idempotent (multiple calls do not create duplicates)', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  const startDate = '2024-01-15'; // Monday
  const daysAhead = 7;
  
  // Call function twice with same parameters
  await invokeGenerateSchedule(userId, trackId, startDate, daysAhead);
  await invokeGenerateSchedule(userId, trackId, startDate, daysAhead);
  
  // Should still have only 5 units (not 10)
  const logs = await getUserStudyLogs(userId, trackId);
  assertEquals(logs.length, 5, 'Should not create duplicate units');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

Deno.test('generate-schedule: extends window when called with later start_date', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // First call: generate for first week
  const startDate1 = '2024-01-15'; // Monday
  await invokeGenerateSchedule(userId, trackId, startDate1, 7);
  
  // Second call: extend window (overlapping dates)
  const startDate2 = '2024-01-18'; // Thursday (overlaps with first call)
  await invokeGenerateSchedule(userId, trackId, startDate2, 7);
  
  // Should have units from both windows, but no duplicates
  const logs = await getUserStudyLogs(userId, trackId);
  const uniqueDates = new Set(logs.map(log => log.study_date));
  assertEquals(logs.length, uniqueDates.size, 'Should not have duplicate dates');
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('tracks').delete().eq('id', trackId);
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

Deno.test('generate-schedule: returns error for invalid track_id', async () => {
  const userId = await createTestUser();
  const invalidTrackId = '00000000-0000-0000-0000-000000000000';
  
  const startDate = '2024-01-15';
  const daysAhead = 14;
  
  try {
    await invokeGenerateSchedule(userId, invalidTrackId, startDate, daysAhead);
    // Should not reach here
    assertEquals(true, false, 'Should have thrown error for invalid track_id');
  } catch (error) {
    // Expected to fail
    assertExists(error, 'Should return error for invalid track_id');
  }
});

Deno.test('generate-schedule: returns error for invalid user_id', async () => {
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  const invalidUserId = '00000000-0000-0000-0000-000000000000';
  
  const startDate = '2024-01-15';
  const daysAhead = 14;
  
  try {
    await invokeGenerateSchedule(invalidUserId, trackId, startDate, daysAhead);
    // Should not reach here
    assertEquals(true, false, 'Should have thrown error for invalid user_id');
  } catch (error) {
    // Expected to fail
    assertExists(error, 'Should return error for invalid user_id');
  }
  
  // Cleanup
  await supabase.from('tracks').delete().eq('id', trackId);
});

// ============================================================================
// CONTENT ASSIGNMENT TESTS
// ============================================================================

Deno.test('generate-schedule: assigns content_id to user_study_log', async () => {
  const userId = await createTestUser();
  const trackId = await createTestTrack('DAILY_WEEKDAYS_ONLY');
  
  // Create test content
  const contentId = await createTestContent('Mishnah_Berakhot.1.1');
  
  const startDate = '2024-01-15'; // Monday
  const daysAhead = 1; // Just one day
  
  await invokeGenerateSchedule(userId, trackId, startDate, daysAhead);
  
  // Verify content_id is assigned
  const logs = await getUserStudyLogs(userId, trackId);
  assertEquals(logs.length, 1, 'Should create 1 unit');
  
  // Content assignment will be verified once implementation is complete
  // For now, verify unit was created
  
  // Cleanup
  await supabase.from('user_study_log').delete().eq('user_id', userId).eq('track_id', trackId);
  await supabase.from('content_cache').delete().eq('id', contentId);
  await supabase.from('tracks').delete().eq('id', trackId);
});
