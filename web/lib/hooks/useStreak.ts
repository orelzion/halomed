'use client';

import { useEffect, useState } from 'react';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import type { Database } from '@/lib/powersync/schema';

type UserStudyLogRecord = Database['user_study_log'];

/**
 * Calculate streak for a track
 * Reference: supabase/tests/sync/streak-calculation.test.ts
 * Rules:
 * - Count consecutive completed units
 * - Only count if completed on scheduled day (completed_at matches study_date)
 * - Skip days without scheduled units
 * - Retroactive completions don't count
 */
async function calculateStreak(
  trackId: string,
  userId: string
): Promise<number> {
  const db = getPowerSyncDatabase();
  if (!db) {
    return 0;
  }

  // Get all study logs for this track, ordered by study_date DESC
  const result = await db.getAll(
    `SELECT * FROM user_study_log 
     WHERE track_id = ? AND user_id = ?
     ORDER BY study_date DESC`,
    [trackId, userId]
  );

  const logs = result as UserStudyLogRecord[];
  
  // Filter to only scheduled units (skip days without units)
  const scheduledLogs = logs.filter(log => log.study_date);
  let streak = 0;

  for (const log of scheduledLogs) {
    // Skip if not completed
    if (log.is_completed !== 1) {
      break;
    }

    // Check if completed on scheduled day
    if (log.completed_at) {
      const completedDate = new Date(log.completed_at).toISOString().split('T')[0];
      const studyDate = log.study_date;

      // Only count if completed on the scheduled day (not retroactive)
      if (completedDate === studyDate) {
        streak++;
      } else {
        // Retroactive completion - doesn't count, but doesn't break if streak is 0
        // If we've already counted some, this breaks the consecutive sequence
        if (streak > 0) {
          break;
        }
        continue;
      }
    } else {
      // No completed_at timestamp - can't verify, stop counting
      break;
    }
  }

  return streak;
}

export function useStreak(trackId: string | null) {
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackId) {
      setStreak(0);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadStreak = async () => {
      try {
        // Get current user from auth
        const { supabase } = await import('@/lib/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) {
            setStreak(0);
            setLoading(false);
          }
          return;
        }

        const streakCount = await calculateStreak(trackId, user.id);
        if (isMounted) {
          setStreak(streakCount);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error calculating streak:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStreak();

    // Watch for changes in user_study_log
    // Note: watch() with callbacks returns void, so we use a mounted flag for cleanup
    const db = getPowerSyncDatabase();
    if (!db) {
      return () => {
        isMounted = false;
      };
    }

    db.watch(
      'SELECT * FROM user_study_log WHERE track_id = ?',
      [trackId],
      {
        onResult: async () => {
          if (isMounted) {
            await loadStreak();
          }
        },
        onError: (error) => {
          if (isMounted) {
            console.error('Error watching study log:', error);
          }
        },
      }
    );

    return () => {
      isMounted = false;
    };
  }, [trackId]);

  return { streak, loading };
}

/**
 * Hook to get streaks for all tracks
 */
export function useStreaks() {
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadStreaks = async () => {
      try {
        // Get current user
        const { supabase } = await import('@/lib/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) {
            setStreaks({});
            setLoading(false);
          }
          return;
        }

        // Get all tracks
        const db = getPowerSyncDatabase();
        if (!db) {
          return;
        }

        const tracksResult = await db.getAll<{ id: string }>('SELECT id FROM tracks');
        const tracks = tracksResult;

        // Calculate streak for each track
        const streakMap: Record<string, number> = {};
        for (const track of tracks) {
          streakMap[track.id] = await calculateStreak(track.id, user.id);
        }

        if (isMounted) {
          setStreaks(streakMap);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading streaks:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStreaks();

    // Watch for changes
    // Note: watch() with callbacks returns void, so we use a mounted flag for cleanup
    const db = getPowerSyncDatabase();
    if (!db) {
      return () => {
        isMounted = false;
      };
    }

    db.watch(
      'SELECT * FROM user_study_log',
      [],
      {
        onResult: async () => {
          if (isMounted) {
            await loadStreaks();
          }
        },
        onError: (error) => {
          if (isMounted) {
            console.error('Error watching study logs:', error);
          }
        },
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  return { streaks, loading };
}
