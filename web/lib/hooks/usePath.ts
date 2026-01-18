'use client';

import { useEffect, useState } from 'react';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import type { Database } from '@/lib/powersync/schema';
import { useAuthContext } from '@/components/providers/AuthProvider';

type LearningPathRecord = Database['learning_path'];

export interface PathNode extends LearningPathRecord {
  isCurrent: boolean;
  isLocked: boolean;
}

export function usePath() {
  const { user } = useAuthContext();
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentNodeIndex, setCurrentNodeIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const normalizeRows = <T,>(result: any): T[] => {
      if (Array.isArray(result)) {
        return result as T[];
      }
      if (!result) {
        return [];
      }
      if (Array.isArray(result.rows)) {
        return result.rows as T[];
      }
      if (Array.isArray(result.rows?._array)) {
        return result.rows._array as T[];
      }
      if (typeof result.rows?.item === 'function' && typeof result.rows?.length === 'number') {
        return Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i)) as T[];
      }
      return [];
    };

    const loadPath = async () => {
      try {
        const db = getPowerSyncDatabase();
        if (!db) {
          return;
        }

        const today = new Date().toISOString().split('T')[0];

        // Get all path nodes for user, ordered by unlock_date (chronological order)
        const pathResult = await db.getAll(
          `SELECT * FROM learning_path 
           WHERE user_id = ? 
           ORDER BY unlock_date ASC, node_index ASC`,
          [user.id]
        );
        const allNodes = normalizeRows<LearningPathRecord>(pathResult);
        console.log('[usePath] PowerSync result:', { count: allNodes.length, user_id: user.id });

        // Find current node (first unlocked, incomplete node)
        let currentIdx: number | null = null;
        const nodesWithState: PathNode[] = allNodes.map((node, idx) => {
          const isUnlocked = node.unlock_date <= today;
          const isCompleted = node.completed_at !== null;
          const isCurrent = isUnlocked && !isCompleted && currentIdx === null;
          
          if (isCurrent) {
            currentIdx = idx;
          }

          return {
            ...node,
            isCurrent,
            isLocked: !isUnlocked,
          };
        });

        if (isMounted) {
          setNodes(nodesWithState);
          setCurrentNodeIndex(currentIdx);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading path:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPath();

    const db = getPowerSyncDatabase();
    if (!db) {
      return () => {
        isMounted = false;
      };
    }

    db.watch(
      'SELECT * FROM learning_path WHERE user_id = ? ORDER BY unlock_date ASC, node_index ASC',
      [user.id],
      {
        onResult: async () => {
          if (isMounted) {
            await loadPath();
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

  return { nodes, loading, currentNodeIndex };
}
