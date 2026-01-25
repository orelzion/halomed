'use client';

import { useEffect, useState } from 'react';
import { getDatabase } from '@/lib/database/database';
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
        const db = await getDatabase();
        if (!db) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // Get all learning nodes (not review/quiz) ordered by unlock_date DESC
        const nodes = await db.learning_path
          .find({
            selector: {
              user_id: user.id,
              node_type: 'learning',
              is_divider: 0,
            },
          })
          .sort({ unlock_date: 'desc' })
          .exec();

        let streakCount = 0;
        const today = new Date().toISOString().split('T')[0];

        for (const nodeDoc of nodes) {
          const node = nodeDoc.toJSON();

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

    // Watch for changes
    const dbPromise = getDatabase();
    dbPromise.then((db) => {
      if (!db || !isMounted) return;

      const pathQuery = db.learning_path
        .find({
          selector: {
            user_id: user.id,
            node_type: 'learning',
            is_divider: 0,
          },
        })
        .$;

      const subscription = pathQuery.subscribe(async () => {
        if (isMounted) {
          await calculateStreak();
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

  return { streak, loading };
}
