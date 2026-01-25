'use client';

import { useEffect, useState } from 'react';
import { getDatabase } from '@/lib/database/database';
import { useAuthContext } from '@/components/providers/AuthProvider';

export function usePreferences() {
  const { user } = useAuthContext();
  const [preferences, setPreferences] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadPreferences = async () => {
      try {
        const db = await getDatabase();
        if (!db) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        const prefsDocs = await db.user_preferences
          .find({
            selector: {
              user_id: user.id,
            },
          })
          .limit(1)
          .exec();

        const prefs = prefsDocs.length > 0 ? prefsDocs[0].toJSON() : null;

        if (isMounted) {
          setPreferences(prefs);
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

    // Watch for changes
    const dbPromise = getDatabase();
    dbPromise.then((db) => {
      if (!db || !isMounted) return;

      const prefsQuery = db.user_preferences
        .find({
          selector: {
            user_id: user.id,
          },
        })
        .$;

      const subscription = prefsQuery.subscribe(async () => {
        if (isMounted) {
          await loadPreferences();
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

  return { preferences, loading };
}
