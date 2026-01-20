'use client';

import { useEffect, useState } from 'react';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import { supabase } from '@/lib/supabase/client';
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

    // Fallback to Supabase if PowerSync returns empty
    const loadFromSupabase = async (): Promise<UserPreferencesRecord | null> => {
      console.log('[usePreferences] Falling back to Supabase for user_id:', user.id);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('[usePreferences] Supabase fallback error:', error);
        return null;
      }
      console.log('[usePreferences] Supabase fallback result:', data);
      return data as UserPreferencesRecord | null;
    };

    const loadPreferences = async () => {
      try {
        const db = getPowerSyncDatabase();
        if (!db) {
          console.log('[usePreferences] No PowerSync database, using Supabase');
          const supabasePrefs = await loadFromSupabase();
          if (isMounted) {
            setPreferences(supabasePrefs);
            setLoading(false);
          }
          return;
        }

        console.log('[usePreferences] Querying PowerSync for user_id:', user.id);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('PowerSync query timeout')), 5000);
        });
        
        const queryPromise = db.getAll(
          'SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1',
          [user.id]
        );
        
        const prefsResult = await Promise.race([queryPromise, timeoutPromise]);
        const prefs = normalizeRows<UserPreferencesRecord>(prefsResult);
        console.log('[usePreferences] PowerSync result:', prefs);

        // If PowerSync returns empty, try Supabase as fallback
        // This handles cases where PowerSync hasn't synced yet (e.g., after account linking)
        if (prefs.length === 0) {
          console.log('[usePreferences] PowerSync empty, trying Supabase fallback');
          const supabasePrefs = await loadFromSupabase();
          if (isMounted) {
            setPreferences(supabasePrefs);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setPreferences(prefs[0] || null);
          setLoading(false);
        }
      } catch (error) {
        console.error('[usePreferences] Error loading preferences:', error);
        // On error, try Supabase fallback
        try {
          const supabasePrefs = await loadFromSupabase();
          if (isMounted) {
            setPreferences(supabasePrefs);
            setLoading(false);
          }
        } catch {
          if (isMounted) {
            setPreferences(null);
            setLoading(false);
          }
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
