/**
 * Sync Yom Tov dates from backend API
 * Called on app load to ensure we have up-to-date holiday dates
 */

import type { RxDatabase } from 'rxdb';
import type { DatabaseCollections } from '../database/schemas';

const YEARS_AHEAD = 2; // Calculate Yom Tov dates for 2 years ahead

/**
 * Check if we need to refresh Yom Tov dates
 */
function needsRefresh(currentUntil: string | undefined): boolean {
  if (!currentUntil) return true;
  
  const untilDate = new Date(currentUntil);
  const today = new Date();
  
  // Refresh if we're within 30 days of the end date
  const daysUntilEnd = (untilDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilEnd < 30;
}

/**
 * Fetch Yom Tov dates from the backend API
 */
async function fetchYomTovDates(
  startDate: string,
  endDate: string,
  israelMode: boolean
): Promise<string[]> {
  const response = await fetch('/api/calculate-yom-tov', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate,
      endDate,
      israelMode,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Yom Tov dates: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.yomTovDates || [];
}

/**
 * Sync Yom Tov dates for a user
 * Fetches from backend and stores in user preferences
 */
export async function syncYomTovDates(
  db: RxDatabase<DatabaseCollections>,
  userId: string
): Promise<void> {
  try {
    // Get current preferences
    const prefsDoc = await db.user_preferences
      .findOne({ selector: { user_id: userId } })
      .exec();
    
    if (!prefsDoc) {
      console.log('[YomTov Sync] No preferences found, skipping');
      return;
    }
    
    const currentUntil = prefsDoc.yom_tov_dates_until;
    
    // Check if we need to refresh
    if (!needsRefresh(currentUntil)) {
      console.log('[YomTov Sync] Dates are up to date, skipping');
      return;
    }
    
    console.log('[YomTov Sync] Fetching Yom Tov dates...');
    
    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Include recent past
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + YEARS_AHEAD);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Fetch from backend
    const israelMode = prefsDoc.israel_mode ?? true; // Default to Israel
    const yomTovDates = await fetchYomTovDates(startDateStr, endDateStr, israelMode);
    
    console.log(`[YomTov Sync] Fetched ${yomTovDates.length} Yom Tov dates`);
    
    // Update preferences
    await prefsDoc.patch({
      yom_tov_dates: yomTovDates,
      yom_tov_dates_until: endDateStr,
      updated_at: new Date().toISOString(),
    });
    
    console.log('[YomTov Sync] Preferences updated');
  } catch (error) {
    console.error('[YomTov Sync] Error:', error);
    // Don't throw - Yom Tov sync failure shouldn't break the app
  }
}
