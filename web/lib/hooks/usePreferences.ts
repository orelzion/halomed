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

  // Timeout to prevent infinite loading if PowerSync sync takes too long
  useEffect(() => {
    if (!user || hasSynced) return;
    
    const timeout = setTimeout(() => {
      console.log('[usePreferences] PowerSync sync timeout, proceeding with empty preferences');
      setLoading(false);
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeout);
  }, [user, hasSynced]);

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
        
        // Add timeout to prevent hanging if PowerSync query stalls
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('PowerSync query timeout')), 10000);
        });
        
        const prefsResult = await Promise.race([
          db.getAll('SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1', [user.id]),
          timeoutPromise
        ]);
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

    const db = getPowerSyncDatabase();
    if (!db) {
      return () => {
        isMounted = false;
      };
    }

    // Set up watch for reactive updates
    let abortController: AbortController | null = null;
    try {
      abortController = new AbortController();
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
        },
        { signal: abortController.signal }
      );
    } catch (watchError) {
      console.error('[usePreferences] Failed to set up watch:', watchError);
    }

    return () => {
      isMounted = false;
      abortController?.abort();
    };
  }, [user, hasSynced]);

  return { preferences, loading };
}
