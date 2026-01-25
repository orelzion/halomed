/**
 * Date Window Utilities
 * Calculates 14-day rolling window for sync filtering
 * Reference: Migration Plan Phase 3, Task 3.1, TDD Section 8.1
 */

export interface DateWindow {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

/**
 * Get 14-day rolling window (±14 days from current date)
 * Returns dates in YYYY-MM-DD format (ISO date string, date only)
 */
export function getDateWindow(): DateWindow {
  const today = new Date();
  
  // Get today's date in local timezone (YYYY-MM-DD)
  const todayStr = today.toISOString().split('T')[0];
  
  // Calculate start date (14 days ago)
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 14);
  const startStr = startDate.toISOString().split('T')[0];
  
  // Calculate end date (14 days ahead)
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 14);
  const endStr = endDate.toISOString().split('T')[0];
  
  return {
    start: startStr,
    end: endStr,
  };
}

/**
 * Check if a date string (YYYY-MM-DD) is within the window
 */
export function isDateInWindow(date: string, window: DateWindow): boolean {
  return date >= window.start && date <= window.end;
}
