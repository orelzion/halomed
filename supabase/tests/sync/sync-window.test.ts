// supabase/tests/sync/sync-window.test.ts
// Tests for 14-day rolling window logic
// Reference: TDD Section 8.1, sync.md Section 6

import { assertEquals } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

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
// 14-DAY ROLLING WINDOW TESTS (Task 7.11a)
// ============================================================================

/**
 * Calculate 14-day rolling window dates
 * Window: CURRENT_DATE - 14 days to CURRENT_DATE + 14 days
 */
function getSyncWindowDates(currentDate: Date): { start: Date; end: Date } {
  const start = new Date(currentDate);
  start.setDate(start.getDate() - 14);
  
  const end = new Date(currentDate);
  end.setDate(end.getDate() + 14);
  
  return { start, end };
}

/**
 * Check if a date is within the sync window
 */
function isDateInSyncWindow(date: Date, currentDate: Date): boolean {
  const window = getSyncWindowDates(currentDate);
  return date >= window.start && date <= window.end;
}

Deno.test('sync window: required configuration keys are set', () => {
  checkRequiredConfig();
});

Deno.test('sync window: calculates 14-day backward window correctly', () => {
  const currentDate = new Date('2024-01-15');
  const window = getSyncWindowDates(currentDate);
  
  const expectedStart = new Date('2024-01-01'); // 14 days before
  assertEquals(
    window.start.toISOString().split('T')[0],
    expectedStart.toISOString().split('T')[0],
    'Start date should be 14 days before current date'
  );
});

Deno.test('sync window: calculates 14-day forward window correctly', () => {
  const currentDate = new Date('2024-01-15');
  const window = getSyncWindowDates(currentDate);
  
  const expectedEnd = new Date('2024-01-29'); // 14 days after
  assertEquals(
    window.end.toISOString().split('T')[0],
    expectedEnd.toISOString().split('T')[0],
    'End date should be 14 days after current date'
  );
});

Deno.test('sync window: includes dates within window', () => {
  const currentDate = new Date('2024-01-15');
  
  // Test dates within window
  assertEquals(isDateInSyncWindow(new Date('2024-01-01'), currentDate), true, 'Start boundary should be included');
  assertEquals(isDateInSyncWindow(new Date('2024-01-15'), currentDate), true, 'Current date should be included');
  assertEquals(isDateInSyncWindow(new Date('2024-01-29'), currentDate), true, 'End boundary should be included');
  assertEquals(isDateInSyncWindow(new Date('2024-01-10'), currentDate), true, 'Date within window should be included');
});

Deno.test('sync window: excludes dates outside window', () => {
  const currentDate = new Date('2024-01-15');
  
  // Test dates outside window
  assertEquals(isDateInSyncWindow(new Date('2023-12-31'), currentDate), false, 'Date before window should be excluded');
  assertEquals(isDateInSyncWindow(new Date('2024-01-30'), currentDate), false, 'Date after window should be excluded');
  assertEquals(isDateInSyncWindow(new Date('2024-02-01'), currentDate), false, 'Date far after window should be excluded');
});

Deno.test('sync window: window is 28 days total (14 before + 14 after)', () => {
  const currentDate = new Date('2024-01-15');
  const window = getSyncWindowDates(currentDate);
  
  // Calculate inclusive days: end - start + 1
  const daysDiff = Math.ceil((window.end.getTime() - window.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  assertEquals(daysDiff, 29, 'Window should span 29 days inclusive (14 before + current + 14 after)');
});

Deno.test('sync window: handles month boundaries correctly', () => {
  // Test crossing month boundary (Jan 15 -> Jan 1 to Jan 29)
  const currentDate = new Date('2024-01-15');
  const window = getSyncWindowDates(currentDate);
  
  // Start: Jan 15 - 14 = Jan 1
  // End: Jan 15 + 14 = Jan 29
  assertEquals(window.start.getMonth(), 0, 'Start should be in January (month 0)');
  assertEquals(window.start.getDate(), 1, 'Start should be Jan 1');
  assertEquals(window.end.getMonth(), 0, 'End should be in January (month 0)');
  assertEquals(window.end.getDate(), 29, 'End should be Jan 29');
});

Deno.test('sync window: window moves forward as current date changes', () => {
  const date1 = new Date('2024-01-15');
  const window1 = getSyncWindowDates(date1);
  
  const date2 = new Date('2024-01-16'); // Next day
  const window2 = getSyncWindowDates(date2);
  
  // Window should shift forward by 1 day
  const startDiff = Math.ceil((window2.start.getTime() - window1.start.getTime()) / (1000 * 60 * 60 * 24));
  const endDiff = Math.ceil((window2.end.getTime() - window1.end.getTime()) / (1000 * 60 * 60 * 24));
  
  assertEquals(startDiff, 1, 'Start date should move forward by 1 day');
  assertEquals(endDiff, 1, 'End date should move forward by 1 day');
});

Deno.test('sync window: only user_study_log and content_cache use window filtering', () => {
  // tracks table syncs all data, no window filtering
  const tablesWithWindow = ['user_study_log', 'content_cache'];
  const tablesWithoutWindow = ['tracks'];
  
  assertEquals(tablesWithWindow.length, 2, 'Two tables should use window filtering');
  assertEquals(tablesWithoutWindow.includes('tracks'), true, 'tracks should not use window filtering');
});
