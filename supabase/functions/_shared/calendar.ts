// supabase/functions/_shared/calendar.ts
// Jewish calendar utilities for schedule generation
// Reference: scheduling.md Section "DAILY_WEEKDAYS_ONLY Logic"

/**
 * Checks if a date is a scheduled day based on schedule type
 * For DAILY_WEEKDAYS_ONLY: excludes Saturday and Jewish holidays
 */
export function isScheduledDay(date: Date, scheduleType: string): boolean {
  switch (scheduleType) {
    case 'DAILY_WEEKDAYS_ONLY':
      const dayOfWeek = date.getDay();
      // Skip Saturday (6)
      if (dayOfWeek === 6) return false;
      // Skip Jewish holidays
      if (isJewishHoliday(date)) return false;
      return true;
    
    case 'DAILY':
      // All days are scheduled (but still exclude holidays for MVP)
      if (isJewishHoliday(date)) return false;
      return true;
    
    default:
      return false;
  }
}

/**
 * Checks if a date is a Jewish holiday that excludes study
 * Major holidays: Rosh Hashana, Yom Kippur, Sukkot, Shmini Atzeret, Simchat Torah, Pesach, Shavuot
 * 
 * Note: For MVP, using a simplified implementation
 * For production, consider using @hebcal/core library
 */
export function isJewishHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getDate();
  
  // Get Hebrew calendar date (simplified calculation)
  // For MVP, we'll use a lookup table for major holidays
  // This is a simplified version - for production, use a proper Hebrew calendar library
  
  // Major holidays to exclude (using Gregorian dates for MVP)
  // Note: These dates change each year, so this is a simplified approach
  // For production, use @hebcal/core or similar library
  
  // For now, return false (no holidays detected)
  // TODO: Integrate @hebcal/core for accurate holiday detection
  // This will be implemented when we add the library dependency
  
  return false;
}

/**
 * Adds days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Formats a date as ISO string (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses an ISO date string (YYYY-MM-DD) to Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00Z');
}
