// supabase/tests/sync/streak-calculation.test.ts
// Tests for client-side streak calculation algorithm
// Reference: PRD Section 8, TDD Section 8.4, sync.md Section 7

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
// STREAK CALCULATION ALGORITHM
// ============================================================================

/**
 * Calculate streak for a track based on user_study_log data
 * 
 * Rules (from TDD Section 8.4):
 * - Streaks are calculated per track
 * - A streak represents consecutive scheduled units that were completed
 * - Days without scheduled units: don't break, don't increment
 * - Retroactive completion (completed_at date differs from study_date) does NOT affect streak
 * - Only forward-in-time completions on the day of the scheduled unit contribute to streak
 * 
 * @param studyLogs Array of study log entries ordered by study_date DESC
 * @returns Streak count
 */
function calculateStreak(studyLogs: Array<{
  study_date: string;
  is_completed: boolean;
  completed_at: string | null;
}>): number {
  let streak = 0;
  
  for (const log of studyLogs) {
    // Skip days without scheduled units (shouldn't happen in practice, but handle gracefully)
    if (!log) continue;
    
    // If not completed, streak ends
    if (!log.is_completed) {
      break;
    }
    
    // If completed but no completed_at timestamp, skip (doesn't count, doesn't break)
    if (!log.completed_at) {
      continue;
    }
    
    // Check if completed on the scheduled day (not retroactive)
    if (wasCompletedOnDay(log)) {
      // Valid completion on scheduled day - count it
      streak++;
    } else {
      // Retroactive completion - doesn't count
      // According to TDD: "does not affect the streak" - so we continue checking
      // But if we've already counted some, this breaks the consecutive sequence
      if (streak > 0) {
        // We've counted valid completions, retroactive breaks the streak
        break;
      }
      // If no streak yet, continue to check previous days
      continue;
    }
  }
  
  return streak;
}

/**
 * Check if completion occurred on the scheduled day
 */
function wasCompletedOnDay(log: {
  study_date: string;
  completed_at: string | null;
}): boolean {
  if (!log.completed_at) {
    return false;
  }
  
  // Compare dates (ignore time)
  const completedDate = new Date(log.completed_at).toISOString().split('T')[0];
  const studyDate = log.study_date; // Already in YYYY-MM-DD format
  
  return completedDate === studyDate;
}

// ============================================================================
// TESTS (Task 7.12a)
// ============================================================================

Deno.test('streak: required configuration keys are set', () => {
  checkRequiredConfig();
});

Deno.test('streak: consecutive completions count correctly', () => {
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-17T10:00:00Z' },
    { study_date: '2024-01-16', is_completed: true, completed_at: '2024-01-16T10:00:00Z' },
    { study_date: '2024-01-15', is_completed: true, completed_at: '2024-01-15T10:00:00Z' },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 3, 'Should count 3 consecutive completions');
});

Deno.test('streak: missing completion breaks streak', () => {
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-17T10:00:00Z' },
    { study_date: '2024-01-16', is_completed: false, completed_at: null },
    { study_date: '2024-01-15', is_completed: true, completed_at: '2024-01-15T10:00:00Z' },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 1, 'Should only count most recent completion, streak broken at missing day');
});

Deno.test('streak: retroactive completion does not count', () => {
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-17T10:00:00Z' },
    // Completed on Jan 18 (retroactive - completed_at date differs from study_date)
    { study_date: '2024-01-16', is_completed: true, completed_at: '2024-01-18T10:00:00Z' },
    { study_date: '2024-01-15', is_completed: true, completed_at: '2024-01-15T10:00:00Z' },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 1, 'Jan 16 does not count (retroactive), only Jan 17 counts');
});

Deno.test('streak: days without scheduled units are skipped', () => {
  // If there's no row for a day, it's not a scheduled day (weekend/holiday)
  // Gap doesn't break streak
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-17T10:00:00Z' },
    // No entry for Jan 16 (weekend or holiday - not a scheduled day)
    { study_date: '2024-01-15', is_completed: true, completed_at: '2024-01-15T10:00:00Z' },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 2, 'Gap (Jan 16) does not break streak - both days count');
});

Deno.test('streak: streak is calculated per track', () => {
  // This test verifies the algorithm works correctly
  // Actual per-track filtering would be done in the query, not in the algorithm
  const track1Logs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-17T10:00:00Z' },
    { study_date: '2024-01-16', is_completed: true, completed_at: '2024-01-16T10:00:00Z' },
  ];
  
  const track2Logs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-17T10:00:00Z' },
    { study_date: '2024-01-16', is_completed: false, completed_at: null },
  ];
  
  const streak1 = calculateStreak(track1Logs);
  const streak2 = calculateStreak(track2Logs);
  
  assertEquals(streak1, 2, 'Track 1 should have streak of 2');
  assertEquals(streak2, 1, 'Track 2 should have streak of 1');
  assertEquals(streak1 !== streak2, true, 'Different tracks can have different streaks');
});

Deno.test('streak: empty array returns zero streak', () => {
  const studyLogs: Array<{
    study_date: string;
    is_completed: boolean;
    completed_at: string | null;
  }> = [];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 0, 'Empty array should return 0 streak');
});

Deno.test('streak: all incomplete returns zero streak', () => {
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: false, completed_at: null },
    { study_date: '2024-01-16', is_completed: false, completed_at: null },
    { study_date: '2024-01-15', is_completed: false, completed_at: null },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 0, 'All incomplete should return 0 streak');
});

Deno.test('streak: completion without completed_at does not count', () => {
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: null },
    { study_date: '2024-01-16', is_completed: true, completed_at: '2024-01-16T10:00:00Z' },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 1, 'Completion without completed_at should not count');
});

Deno.test('streak: handles timezone correctly (same day in different timezones)', () => {
  // Study date: 2024-01-17
  // Completed at: 2024-01-17 23:30 UTC (could be next day in some timezones)
  // But we compare dates only (YYYY-MM-DD), so it should match
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-17T23:30:00Z' },
    { study_date: '2024-01-16', is_completed: true, completed_at: '2024-01-16T10:00:00Z' },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 2, 'Should match dates correctly regardless of time');
});

Deno.test('streak: handles edge case - completion exactly at midnight', () => {
  // Completed at midnight (start of next day) should not count for previous day
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-18T00:00:00Z' },
    { study_date: '2024-01-16', is_completed: true, completed_at: '2024-01-16T10:00:00Z' },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 1, 'Completion at midnight (next day) should not count for previous day');
});
