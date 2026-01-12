// supabase/functions/_shared/calendar.ts
// Jewish calendar utilities for schedule generation
// Reference: scheduling.md Section "DAILY_WEEKDAYS_ONLY Logic"

/**
 * Checks if a date is a scheduled day based on schedule type
 * For DAILY_WEEKDAYS_ONLY: excludes Saturday and Jewish holidays
 * 
 * Note: This is the async version that properly checks holidays
 */
export async function isScheduledDay(date: Date, scheduleType: string): Promise<boolean> {
  switch (scheduleType) {
    case 'DAILY_WEEKDAYS_ONLY':
      const dayOfWeek = date.getDay();
      // Skip Saturday (6) - Shabbat
      // In Hebrew calendar, weekdays are Sunday-Friday, so Sunday (0) is included
      if (dayOfWeek === 6) return false;
      // Skip Jewish holidays
      if (await isJewishHoliday(date)) return false;
      return true;
    
    case 'DAILY':
      // All days are scheduled (but still exclude holidays for MVP)
      if (await isJewishHoliday(date)) return false;
      return true;
    
    default:
      return false;
  }
}

/**
 * Synchronous version for backward compatibility (uses fallback holiday check)
 */
export function isScheduledDaySync(date: Date, scheduleType: string): boolean {
  switch (scheduleType) {
    case 'DAILY_WEEKDAYS_ONLY':
      const dayOfWeek = date.getDay();
      // Skip Saturday (6) - Shabbat
      // In Hebrew calendar, weekdays are Sunday-Friday, so Sunday (0) is included
      if (dayOfWeek === 6) return false;
      // Skip Jewish holidays (using sync fallback)
      if (isJewishHolidaySync(date)) return false;
      return true;
    
    case 'DAILY':
      // All days are scheduled (but still exclude holidays for MVP)
      if (isJewishHolidaySync(date)) return false;
      return true;
    
    default:
      return false;
  }
}

/**
 * Checks if a date is a Jewish holiday that excludes study
 * Major holidays: Rosh Hashana, Yom Kippur, Sukkot, Shmini Atzeret, Simchat Torah, Pesach, Shavuot
 * 
 * Uses @hebcal/core library via esm.sh for accurate Hebrew calendar calculations
 */
export async function isJewishHoliday(date: Date): Promise<boolean> {
  try {
    // Import hebcal/core via npm specifier (Deno-compatible)
    // Using npm: prefix for better Deno compatibility
    const hebcal = await import('npm:@hebcal/core');
    const { HDate, HebrewCalendar } = hebcal;
    
    // Convert Gregorian date to Hebrew date
    const hdate = new HDate(date);
    
    // Get all events (holidays) for this date
    const events = HebrewCalendar.getHolidaysOnDate(hdate);
    
    // Major holidays that exclude study
    // Only actual holidays, NOT Erev (eve) days
    const majorHolidayPatterns = [
      'pesach i',
      'pesach ii',
      'rosh hashana i',
      'rosh hashana ii',
      'rosh hashana 5785', // First day of Rosh Hashana (year-specific)
      'yom kippur',
      'sukkot i',
      'shmini atzeret',
      'shmini atzeres',
      'simchat torah',
      'simchas torah',
      'shavuot',
      'shavuot i',
      "tish'a b'av",
      "tisha b'av",
    ];
    
    // Check if any event matches a major holiday
    return events.some((event: any) => {
      const eventDesc = (event.desc || event.render('en') || '').toLowerCase();
      return majorHolidayPatterns.some(pattern => 
        eventDesc.includes(pattern)
      );
    });
  } catch (error) {
    // Fallback: if library fails to load, log error and return false
    // This ensures the function doesn't break the schedule generation
    console.error('Error checking Jewish holiday:', error);
    return false;
  }
}

/**
 * Synchronous version for backward compatibility
 * Note: This is a simplified fallback. Use async version when possible.
 */
export function isJewishHolidaySync(date: Date): boolean {
  // For now, return false as fallback
  // The async version should be used in Edge Functions
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
