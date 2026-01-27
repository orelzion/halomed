'use client';

import { useMemo } from 'react';
import { usePreferences } from './usePreferences';

/**
 * Get streak from user preferences
 * In the position-based model, streak is stored in user_preferences.streak_count
 * and updated when user completes content
 */
export function usePathStreak() {
  const { preferences, loading } = usePreferences();

  const streak = useMemo(() => {
    if (!preferences || loading) return 0;
    return preferences.streak_count ?? 0;
  }, [preferences, loading]);

  return { streak, loading };
}
