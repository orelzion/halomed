'use client';

import { useEffect, useState } from 'react';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import { useAuthContext } from '@/components/providers/AuthProvider';

/**
 * Calculate streak from learning_path (only learning nodes, not review/quiz)
 * Rules:
 * - Count consecutive completed learning nodes
 * - Only count if completed on scheduled day (completed_at date matches unlock_date)
 * - Skip days without scheduled nodes
 * - Retroactive completions don't count
 */
export function usePathStreak() {
  const { user } = useAuthContext();
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStreak(0);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const calculateStreak = async () => {
      try {
        const db = getPowerSyncDatabase();
        if (!db) {
          return;
        }

        // Get all learning nodes (not review/quiz) ordered by unlock_date DESC
        const result = await db.getAll(
          `SELECT * FROM learning_path 
           WHERE user_id = ? 
             AND node_type = 'learning'
             AND is_divider = 0
           ORDER BY unlock_date DESC`,
          [user.id]
        );

        const nodes = Array.isArray(result) 
          ? result 
          : result.rows 
            ? Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i))
            : [];

        let streakCount = 0;
        const today = new Date().toISOString().split('T')[0];

        for (const node of nodes) {
          // Skip if not completed
          if (!node.completed_at) {
            break;
          }

          // Check if completed on scheduled day (unlock_date)
          const completedDate = new Date(node.completed_at).toISOString().split('T')[0];
          const unlockDate = node.unlock_date;

          // Only count if completed on the scheduled day (not retroactive)
          if (completedDate === unlockDate) {
            streakCount++;
          } else {
            // Retroactive completion - breaks streak if we've already counted
            if (streakCount > 0) {
              break;
            }
            continue;
          }
        }

        if (isMounted) {
          setStreak(streakCount);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error calculating path streak:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    calculateStreak();

    const db = getPowerSyncDatabase();
    if (!db) {
      return () => {
        isMounted = false;
      };
    }

    db.watch(
      `SELECT * FROM learning_path 
       WHERE user_id = ? AND node_type = 'learning' AND is_divider = 0
       ORDER BY unlock_date DESC`,
      [user.id],
      {
        onResult: async () => {
          if (isMounted) {
            await calculateStreak();
          }
        },
        onError: (error) => {
          if (isMounted) {
            console.error('Error watching path:', error);
          }
        },
      }
    );

    return () => {
      isMounted = false;
    };
  }, [user]);

  return { streak, loading };
}
