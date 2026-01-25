'use client';

import { useState } from 'react';
import { getDatabase } from '@/lib/database/database';

export function useCompletion() {
  const [isToggling, setIsToggling] = useState(false);

  const toggleCompletion = async (logId: string, currentState: boolean) => {
    setIsToggling(true);
    try {
      const newState = !currentState;
      const now = new Date().toISOString();

      const db = await getDatabase();
      if (!db) {
        throw new Error('RxDB database not available');
      }

      // Find the document
      const doc = await db.user_study_log.findOne(logId).exec();
      if (!doc) {
        throw new Error('Study log not found');
      }

      // Update locally - RxDB will automatically sync via replication
      await doc.update({
        $set: {
          is_completed: newState ? 1 : 0,
          completed_at: newState ? now : null,
          updated_at: now,
        },
      });

      console.log('[Completion] Local update complete, RxDB will sync automatically');
    } catch (error) {
      console.error('Error toggling completion:', error);
      throw error;
    } finally {
      setIsToggling(false);
    }
  };

  return { toggleCompletion, isToggling };
}
