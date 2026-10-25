import { getDatabase } from '@/lib/database/database';
import type { Pace, ReviewIntensity, UserProgress } from '@shared/lib/path-generator';

/** The fields of a user_preferences document that the path depends on. */
export interface PreferencesForPath {
  current_content_index?: number | null;
  pace?: string | null;
  review_intensity?: string | null;
  path_start_date?: string | null;
  skip_friday?: boolean | null;
  yom_tov_dates?: string[] | null;
}

/**
 * Builds the progress object that the path generator works from out of the
 * user_preferences document.
 */
export function buildUserProgress(preferences: PreferencesForPath): UserProgress {
  return {
    currentContentIndex: preferences.current_content_index ?? 0,
    pace: (preferences.pace || 'two_mishna') as Pace,
    reviewIntensity: (preferences.review_intensity || 'none') as ReviewIntensity,
    startDate: preferences.path_start_date ? new Date(preferences.path_start_date) : new Date(),
    studyDays: {
      skipFriday: preferences.skip_friday ?? true,
      yomTovDates: new Set<string>(preferences.yom_tov_dates || []),
    },
  };
}

/**
 * Advances the user's position in the learning path to `newIndex`, recording
 * today as the last study date. The position-based model only moves forward,
 * so this no-ops if `newIndex` isn't actually ahead of the current position.
 */
export async function advanceStudyProgress(newIndex: number): Promise<boolean> {
  const db = await getDatabase();
  if (!db?.user_preferences) {
    console.error('[studyProgress] user_preferences collection not available');
    return false;
  }

  const userPrefs = await db.user_preferences.find().exec();
  if (userPrefs.length === 0) {
    console.warn('[studyProgress] No user_preferences found');
    return false;
  }

  const pref = userPrefs[0];
  const currentIndex = pref.current_content_index ?? 0;
  if (newIndex <= currentIndex) {
    return false;
  }

  await pref.patch({
    current_content_index: newIndex,
    last_study_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  });

  return true;
}
