// Utility functions for date formatting with Hebrew calendar support
import { HDate, HebrewCalendar } from '@hebcal/core';

/**
 * Formats a date in both Hebrew and Gregorian formats
 * Format: "שישי, כ״ז טבת / 16.01.2026"
 */
export function formatDateDual(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00Z');
  const hdate = new HDate(date);
  
  // Get Hebrew date components
  const hebrewDay = hdate.getDay();
  const hebrewDayNumber = hdate.getDate();
  const hebrewMonthNum = hdate.getMonth();
  const hebrewYear = hdate.getFullYear();
  
  // Get Hebrew month name in Hebrew
  // @hebcal/core returns English names, so we need to map them
  const hebrewMonthNames: Record<string, string> = {
    'Nisan': 'ניסן',
    'Iyyar': 'אייר',
    'Sivan': 'סיון',
    'Tammuz': 'תמוז',
    'Av': 'אב',
    'Elul': 'אלול',
    'Tishrei': 'תשרי',
    'Cheshvan': 'חשון',
    'Kislev': 'כסלו',
    'Tevet': 'טבת',
    'Shevat': 'שבט',
    'Shvat': 'שבט',
    "Sh'vat": 'שבט', // @hebcal/core returns "Sh'vat" with apostrophe
    'Adar': 'אדר',
    'Adar I': 'אדר א׳',
    'Adar II': 'אדר ב׳',
  };
  
  const monthNameEn = HDate.getMonthName(hebrewMonthNum, hebrewYear);
  const hebrewMonth = hebrewMonthNames[monthNameEn] || monthNameEn;
  
  // Format Hebrew day name
  const hebrewDayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const hebrewDayName = hebrewDayNames[hebrewDay];
  
  // Format Hebrew date: "שישי, כ״ז טבת" (no year)
  const hebrewDateStr = `${hebrewDayName}, ${formatHebrewNumber(hebrewDayNumber)} ${hebrewMonth}`;
  
  // Format Gregorian date: DD.MM.YYYY
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const gregorianDateStr = `${day}.${month}.${year}`;
  
  return `${hebrewDateStr} / ${gregorianDateStr}`;
}

/**
 * Formats a number in Hebrew numerals (with gershayim)
 */
function formatHebrewNumber(num: number): string {
  const hebrewNumerals: Record<number, string> = {
    1: 'א׳', 2: 'ב׳', 3: 'ג׳', 4: 'ד׳', 5: 'ה׳',
    6: 'ו׳', 7: 'ז׳', 8: 'ח׳', 9: 'ט׳', 10: 'י׳',
    11: 'י״א', 12: 'י״ב', 13: 'י״ג', 14: 'י״ד', 15: 'ט״ו',
    16: 'ט״ז', 17: 'י״ז', 18: 'י״ח', 19: 'י״ט', 20: 'כ׳',
    21: 'כ״א', 22: 'כ״ב', 23: 'כ״ג', 24: 'כ״ד', 25: 'כ״ה',
    26: 'כ״ו', 27: 'כ״ז', 28: 'כ״ח', 29: 'כ״ט', 30: 'ל׳',
  };
  
  if (num <= 30) {
    return hebrewNumerals[num] || num.toString();
  }
  
  // For numbers > 30, use simple format
  return num.toString();
}

/**
 * Formats a Hebrew year (e.g., 5785 -> תשפ״ה)
 */
function formatHebrewYear(year: number): string {
  // Convert to Hebrew year format
  // This is a simplified version - full implementation would convert to Hebrew letters
  const yearStr = year.toString();
  const lastDigit = parseInt(yearStr[yearStr.length - 1]);
  
  // Simplified: just return the year for now
  // Full implementation would convert to Hebrew letters (תשפ״ה, etc.)
  return yearStr;
}

/**
 * Formats content reference to display format
 * Uses heRef from Sefaria if available, otherwise falls back to parsing refId
 * @param refId - English reference (e.g., "Mishnah_Berakhot.1.1")
 * @param heRef - Hebrew reference from Sefaria (e.g., "משנה ברכות א׳:א׳" or "משנה ברכות ב׳")
 * @returns Formatted Hebrew reference for display
 */
export function formatContentRef(refId: string | null, heRef?: string | null): string {
  // If heRef is provided, use it directly (Sefaria's Hebrew reference)
  // This is the preferred method as it provides accurate Hebrew formatting
  if (heRef && heRef.trim()) {
    return heRef;
  }
  
  // Debug: Log when heRef is missing
  if (refId && !heRef) {
    console.warn(`formatContentRef: he_ref missing for ref_id: ${refId}, using fallback`);
  }
  
  // Fallback: parse refId if heRef is not available
  // This should only happen for old content that hasn't been regenerated yet
  if (!refId) return '';
  
  // Parse Mishnah_{Tractate}.{Chapter}.{Mishnah} or Mishnah_{Tractate}.{Chapter}
  // Use non-greedy match to avoid capturing chapter number in tractate name
  const match = refId.match(/^Mishnah_([^.]+)\.(\d+)(?:\.(\d+))?$/);
  if (!match) {
    // If ref_id doesn't match expected format, return empty to avoid showing mixed format
    // Content should be regenerated to get proper he_ref
    return '';
  }
  
  const [, tractate, chapter, mishnah] = match;
  
  // Map common tractate names to Hebrew
  const tractateMap: Record<string, string> = {
    'Berakhot': 'ברכות',
    'Shabbat': 'שבת',
    'Eruvin': 'עירובין',
    'Pesachim': 'פסחים',
    'Rosh Hashanah': 'ראש השנה',
    'Yoma': 'יומא',
    'Sukkah': 'סוכה',
    'Beitzah': 'ביצה',
    'Taanit': 'תענית',
    'Megillah': 'מגילה',
    'Moed Katan': 'מועד קטן',
    'Chagigah': 'חגיגה',
    'Yevamot': 'יבמות',
    'Ketubot': 'כתובות',
    'Nedarim': 'נדרים',
    'Nazir': 'נזיר',
    'Sotah': 'סוטה',
    'Gittin': 'גיטין',
    'Kiddushin': 'קידושין',
    'Bava Kamma': 'בבא קמא',
    'Bava Metzia': 'בבא מציעא',
    'Bava Batra': 'בבא בתרא',
    'Sanhedrin': 'סנהדרין',
    'Makkot': 'מכות',
    'Shevuot': 'שבועות',
    'Avodah Zarah': 'עבודה זרה',
    'Horayot': 'הוריות',
    'Zevachim': 'זבחים',
    'Menachot': 'מנחות',
    'Chullin': 'חולין',
    'Bekhorot': 'בכורות',
    'Arakhin': 'ערכין',
    'Temurah': 'תמורה',
    'Keritot': 'כריתות',
    'Meilah': 'מעילה',
    'Tamid': 'תמיד',
    'Niddah': 'נדה',
  };
  
  const tractateHebrew = tractateMap[tractate];
  
  // If tractate not found in map, return empty to avoid showing English
  // Content should be regenerated to get proper he_ref from Sefaria
  if (!tractateHebrew) {
    console.warn(`Tractate "${tractate}" not found in mapping for ref_id: ${refId}`);
    return '';
  }
  
  // Format: "משנה {tractate} {chapter}" or "משנה {tractate} {chapter}:{mishnah}"
  let result = `משנה ${tractateHebrew} ${formatHebrewNumber(parseInt(chapter))}`;
  
  if (mishnah) {
    result += `:${formatHebrewNumber(parseInt(mishnah))}`;
  }
  
  return result;
}

/**
 * Checks if a date is today
 */
export function isToday(dateString: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateString === today;
}

/**
 * Checks if a date is in the past
 */
export function isPast(dateString: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateString < today;
}
