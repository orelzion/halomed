import { getDatabase } from '@/lib/database/database';

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
