'use client';

import { useEffect, useState } from 'react';
import { getDatabase } from '@/lib/database/database';
import { useAuthContext } from '@/components/providers/AuthProvider';

/**
 * Calculate streak for a track
 * Reference: TDD Section 8.4
 * Rules:
 * - Count consecutive completed units
 * - Only count if completed on scheduled day (completed_at matches study_date)
 * - Skip days without scheduled units
 * - Retroactive completions don't count
 */
async function calculateStreak(trackId: string, userId: string): Promise<number> {
  const db = await getDatabase();
  if (!db) {
    return 0;
  }

  // Get all study logs for this track, ordered by study_date DESC
  const logs = await db.user_study_log
    .find({
      selector: {
        track_id: trackId,
        user_id: userId,
      },
    })
    .sort({ study_date: 'desc' })
    .exec();

  let streak = 0;

  for (const logDoc of logs) {
    const log = logDoc.toJSON();

    // Skip if not completed (handle both number 1 and boolean true from Supabase)
    const isCompleted = log.is_completed === 1 || (log.is_completed as unknown) === true;
    if (!isCompleted) {
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
  const { user } = useAuthContext();

  useEffect(() => {
    if (!trackId || !user) {
      setStreak(0);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadStreak = async () => {
      try {
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
    const dbPromise = getDatabase();
    dbPromise.then((db) => {
      if (!db || !isMounted) return;

      const studyLogQuery = db.user_study_log
        .find({
          selector: {
            track_id: trackId,
            user_id: user.id,
          },
        })
        .$;

      const subscription = studyLogQuery.subscribe(async () => {
        if (isMounted) {
          await loadStreak();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    });

    return () => {
      isMounted = false;
    };
  }, [trackId, user]);

  return { streak, loading };
}

/**
 * Hook to get streaks for all tracks
 */
export function useStreaks() {
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuthContext();

  useEffect(() => {
    if (!user) {
      setStreaks({});
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadStreaks = async () => {
      try {
        const db = await getDatabase();
        if (!db) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // Get all tracks
        const tracks = await db.tracks.find().exec();

        // Calculate streak for each track
        const streakMap: Record<string, number> = {};
        for (const trackDoc of tracks) {
          const track = trackDoc.toJSON();
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
    const dbPromise = getDatabase();
    dbPromise.then((db) => {
      if (!db || !isMounted) return;

      const studyLogQuery = db.user_study_log.find().$;
      const subscription = studyLogQuery.subscribe(async () => {
        if (isMounted) {
          await loadStreaks();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  return { streaks, loading };
}
