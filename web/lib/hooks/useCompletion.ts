'use client';

import { useState } from 'react';
import { getPowerSyncDatabase } from '@/lib/powersync/database';

export function useCompletion() {
  const [isToggling, setIsToggling] = useState(false);

  const toggleCompletion = async (logId: string, currentState: boolean) => {
    setIsToggling(true);
    try {
      const newState = !currentState;
      const now = new Date().toISOString();

      const db = getPowerSyncDatabase();
      if (!db) {
        throw new Error('PowerSync database not available');
      }

      // Update local PowerSync database
      // PowerSync will automatically detect this change and call uploadData()
      await db.execute(
        `UPDATE user_study_log 
         SET is_completed = ?, completed_at = ?
         WHERE id = ?`,
        [newState ? 1 : 0, newState ? now : null, logId]
      );

      console.log('[Completion] Local update complete, PowerSync will sync automatically');
    } catch (error) {
      console.error('Error toggling completion:', error);
      throw error;
    } finally {
      setIsToggling(false);
    }
  };

  return { toggleCompletion, isToggling };
}
