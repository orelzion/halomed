'use client';

import { useEffect, useState } from 'react';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import type { Database } from '@/lib/powersync/schema';
import { useAuthContext } from '@/components/providers/AuthProvider';

type UserPreferencesRecord = Database['user_preferences'];

export function usePreferences() {
  const { user } = useAuthContext();
  const [preferences, setPreferences] = useState<UserPreferencesRecord | null>(null);
  const [loading, setLoading] = useState(true);

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

    const loadPreferences = async () => {
      try {
        const db = getPowerSyncDatabase();
        if (!db) {
          console.log('[usePreferences] No PowerSync database');
          return;
        }

        console.log('[usePreferences] Querying PowerSync for user_id:', user.id);
        const prefsResult = await db.getAll(
          'SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1',
          [user.id]
        );
        const prefs = normalizeRows<UserPreferencesRecord>(prefsResult);
        console.log('[usePreferences] PowerSync result:', prefs);

        if (isMounted) {
          setPreferences(prefs[0] || null);
          setLoading(false);
        }
      } catch (error) {
        console.error('[usePreferences] Error loading preferences:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPreferences();

    const db = getPowerSyncDatabase();
    if (!db) {
      return () => {
        isMounted = false;
      };
    }

    db.watch(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [user.id],
      {
        onResult: async () => {
          if (isMounted) {
            await loadPreferences();
          }
        },
        onError: (error) => {
          if (isMounted) {
            console.error('Error watching preferences:', error);
          }
        },
      }
    );

    return () => {
      isMounted = false;
    };
  }, [user]);

  return { preferences, loading };
}
