'use client';

import { useEffect, useState } from 'react';
import { getDatabase } from '@/lib/database/database';
import { useAuthContext } from '@/components/providers/AuthProvider';

export interface PathNode {
  id: string;
  user_id: string;
  node_index: number;
  node_type: string;
  content_ref: string | null;
  tractate: string | null;
  chapter: number | null;
  is_divider: number; // 0 or 1
  unlock_date: string;
  completed_at: string | null;
  review_of_node_id: string | null;
  created_at: string;
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

    const loadPath = async () => {
      try {
        const db = await getDatabase();
        if (!db) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        const today = new Date().toISOString().split('T')[0];

        // Get all path nodes for user
        const allNodesDocs = await db.learning_path
          .find({
            selector: {
              user_id: user.id,
            },
          })
          .exec();

        let allNodes = allNodesDocs.map((doc) => doc.toJSON());
        
        // Deduplicate nodes by node_index (in case of multiple path generations)
        const seenIndices = new Set<number>();
        allNodes = allNodes.filter(node => {
          if (seenIndices.has(node.node_index)) return false;
          seenIndices.add(node.node_index);
          return true;
        });
        
        // Sort nodes by unlock_date first, then by type (dividers last), then by node_index
        // This ensures reviews appear on the day they're scheduled, before dividers
        allNodes.sort((a, b) => {
          // First compare by unlock_date
          const dateCompare = a.unlock_date.localeCompare(b.unlock_date);
          if (dateCompare !== 0) return dateCompare;
          // Within same date, put dividers at the end
          const aIsDivider = a.is_divider === 1;
          const bIsDivider = b.is_divider === 1;
          if (aIsDivider !== bIsDivider) return aIsDivider ? 1 : -1;
          // Within same type, sort by node_index
          return a.node_index - b.node_index;
        });
        
        // Debug: Check for gaps in node_index
        if (allNodes.length > 0) {
          const indices = allNodes.map(n => n.node_index);
          const minIndex = Math.min(...indices);
          const maxIndex = Math.max(...indices);
          const expectedCount = maxIndex - minIndex + 1;
          if (allNodes.length < expectedCount) {
            console.warn(`[usePath] Missing nodes detected: have ${allNodes.length}, expected ${expectedCount} (indices ${minIndex}-${maxIndex})`);
          }
        }

        // Find current node (first unlocked, incomplete, non-divider node)
        let currentIdx: number | null = null;
        const nodesWithState: PathNode[] = allNodes.map((node, idx) => {
          const isUnlocked = node.unlock_date !== null && node.unlock_date <= today;
          const isCompleted = node.completed_at != null; // Use loose equality to handle both null and undefined
          const isDivider = node.is_divider === 1;
          // Current node must be unlocked, not completed, not a divider, and we haven't found one yet
          const isCurrent = isUnlocked && !isCompleted && !isDivider && currentIdx === null;

          if (isCurrent) {
            currentIdx = idx;
          }

          return {
            id: node.id,
            user_id: node.user_id,
            node_index: node.node_index,
            node_type: node.node_type,
            content_ref: node.content_ref ?? null,
            tractate: node.tractate ?? null,
            chapter: node.chapter ?? null,
            is_divider: node.is_divider,
            unlock_date: node.unlock_date,
            completed_at: node.completed_at ?? null,
            review_of_node_id: node.review_of_node_id ?? null,
            created_at: node.created_at,
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

    // Watch for changes
    const dbPromise = getDatabase();
    dbPromise.then((db) => {
      if (!db || !isMounted) return;

      const pathQuery = db.learning_path
        .find({
          selector: {
            user_id: user.id,
          },
        })
        .$;

      const subscription = pathQuery.subscribe(async () => {
        if (isMounted) {
          await loadPath();
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

  return { nodes, loading, currentNodeIndex };
}
