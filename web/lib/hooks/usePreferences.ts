'use client';

import { useEffect, useState } from 'react';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import type { Database } from '@/lib/powersync/schema';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { usePowerSync } from '@/components/providers/PowerSyncProvider';

type UserPreferencesRecord = Database['user_preferences'];

export function usePreferences() {
  const { user } = useAuthContext();
  const { hasSynced } = usePowerSync();
  const [preferences, setPreferences] = useState<UserPreferencesRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Wait for PowerSync to complete first sync before querying
    if (!hasSynced) {
      console.log('[usePreferences] Waiting for PowerSync first sync...');
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
          if (isMounted) {
            setLoading(false);
          }
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
          setPreferences(null);
          setLoading(false);
        }
      }
    };

    loadPreferences();

    // Set up watch for reactive updates
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
        onResult: (results) => {
          if (isMounted) {
            const prefs = normalizeRows<UserPreferencesRecord>(results);
            console.log('[usePreferences] Watch update:', prefs);
            setPreferences(prefs[0] || null);
          }
        },
        onError: (error) => {
          if (isMounted) {
            console.error('[usePreferences] Watch error:', error);
          }
        },
      }
    );

    return () => {
      isMounted = false;
    };
  }, [user, hasSynced]);

  return { preferences, loading };
}
