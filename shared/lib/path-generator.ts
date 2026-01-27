/**
 * Path Generator - Pure functions to compute learning path from position
 * No database queries - just math based on position and pace
 * Works in both browser and Deno
 */

// ============================================================================
// TYPES
// ============================================================================

export type Pace = 'one_chapter' | 'seder_per_year' | 'two_mishna';
export type ReviewIntensity = 'none' | 'light' | 'medium' | 'intensive';


export interface StudyDaysConfig {
  skipFriday: boolean;
  yomTovDates: Set<string>; // Pre-computed from backend API
}

export interface UserProgress {
  currentContentIndex: number;
  pace: Pace;
  reviewIntensity: ReviewIntensity;
  startDate: Date;
  studyDays?: StudyDaysConfig; // Optional - defaults to skip both
}

export interface TractateInfo {
  english: string;
  hebrew: string;
  chapters: number;
  totalMishnayot: number;
  spiIndex: number; // Seder-Position-Index for quick lookups
  mishnayotPerChapter: number[]; // Actual mishna counts per chapter
}

export interface SederInfo {
  english: string;
  hebrew: string;
  totalMishnayot: number;
  tractates: TractateInfo[];
}

export interface PathNode {
  index: number;
  contentRef: string;
  tractate: string;
  tractateHebrew: string;
  chapter: number;
  mishna: number;
  isCompleted: boolean;
  isCurrent: boolean;
  seder: string;
  unlockDate: string; // YYYY-MM-DD
  nodeType: 'learning' | 'review_session' | 'weekly_quiz' | 'divider';
  reviewCount?: number; // For review_session nodes
  reviewInterval?: number; // Days since learned (e.g., 3 for "day 3 review")
  reviewRangeStart?: string; // First item in review range (Hebrew, e.g., "ברכות א:ג")
  reviewRangeEnd?: string; // Last item in review range (Hebrew, e.g., "ברכות ב:ד")
}

export interface ReviewItem {
  contentRef: string;
  contentIndex: number;
  tractate: string;
  tractateHebrew: string;
  chapter: number;
  mishna: number;
  interval: number; // days since learned
}

export interface CompletionEstimate {
  years: number;
  finishDate: Date;
  totalItems: number;
  itemsPerDay: number;
}

// ============================================================================
// MISHNAH STRUCTURE DATA
// ============================================================================

export const MISHNAH_STRUCTURE: SederInfo[] = [
  {
    english: 'Zeraim',
    hebrew: 'זרעים',
    totalMishnayot: 654,
    tractates: [
      { english: 'Berakhot', hebrew: 'ברכות', chapters: 9, totalMishnayot: 57, spiIndex: 0, mishnayotPerChapter: [5, 8, 6, 7, 5, 8, 5, 8, 5] },
      { english: 'Peah', hebrew: 'פאה', chapters: 8, totalMishnayot: 69, spiIndex: 57, mishnayotPerChapter: [6, 8, 8, 11, 8, 11, 8, 9] },
      { english: 'Demai', hebrew: 'דמאי', chapters: 7, totalMishnayot: 53, spiIndex: 126, mishnayotPerChapter: [4, 5, 6, 7, 11, 12, 8] },
      { english: 'Kilayim', hebrew: 'כלאים', chapters: 9, totalMishnayot: 76, spiIndex: 179, mishnayotPerChapter: [9, 11, 7, 9, 8, 9, 8, 6, 9] },
      { english: 'Sheviit', hebrew: 'שביעית', chapters: 10, totalMishnayot: 89, spiIndex: 255, mishnayotPerChapter: [8, 10, 10, 10, 9, 6, 7, 11, 9, 9] },
      { english: 'Terumot', hebrew: 'תרומות', chapters: 11, totalMishnayot: 109, spiIndex: 344, mishnayotPerChapter: [] }, // Will use fallback
      { english: 'Maasrot', hebrew: 'מעשרות', chapters: 5, totalMishnayot: 44, spiIndex: 453, mishnayotPerChapter: [] }, // Will use fallback
      { english: 'Maaser_Sheni', hebrew: 'מעשר שני', chapters: 5, totalMishnayot: 51, spiIndex: 497, mishnayotPerChapter: [] }, // Will use fallback
      { english: 'Challah', hebrew: 'חלה', chapters: 4, totalMishnayot: 38, spiIndex: 548, mishnayotPerChapter: [9, 8, 10, 11] },
      { english: 'Orlah', hebrew: 'ערלה', chapters: 3, totalMishnayot: 42, spiIndex: 586, mishnayotPerChapter: [] }, // Will use fallback
      { english: 'Bikkurim', hebrew: 'ביכורים', chapters: 4, totalMishnayot: 26, spiIndex: 628, mishnayotPerChapter: [] }, // Will use fallback
    ],
  },
  {
    english: 'Moed',
    hebrew: 'מועד',
    totalMishnayot: 694,
    tractates: [
      { english: 'Shabbat', hebrew: 'שבת', chapters: 24, totalMishnayot: 138, spiIndex: 654, mishnayotPerChapter: [] },
      { english: 'Eruvin', hebrew: 'עירובין', chapters: 10, totalMishnayot: 96, spiIndex: 792, mishnayotPerChapter: [] },
      { english: 'Pesachim', hebrew: 'פסחים', chapters: 10, totalMishnayot: 89, spiIndex: 888, mishnayotPerChapter: [] },
      { english: 'Shekalim', hebrew: 'שקלים', chapters: 8, totalMishnayot: 52, spiIndex: 977, mishnayotPerChapter: [] },
      { english: 'Yoma', hebrew: 'יומא', chapters: 8, totalMishnayot: 61, spiIndex: 1029, mishnayotPerChapter: [] },
      { english: 'Sukkah', hebrew: 'סוכה', chapters: 5, totalMishnayot: 56, spiIndex: 1090, mishnayotPerChapter: [] },
      { english: 'Beitzah', hebrew: 'ביצה', chapters: 5, totalMishnayot: 42, spiIndex: 1146, mishnayotPerChapter: [] },
      { english: 'Rosh_Hashanah', hebrew: 'ראש השנה', chapters: 4, totalMishnayot: 35, spiIndex: 1188, mishnayotPerChapter: [] },
      { english: 'Taanit', hebrew: 'תענית', chapters: 4, totalMishnayot: 34, spiIndex: 1223, mishnayotPerChapter: [] },
      { english: 'Megillah', hebrew: 'מגילה', chapters: 4, totalMishnayot: 35, spiIndex: 1257, mishnayotPerChapter: [] },
      { english: 'Moed_Katan', hebrew: 'מועד קטן', chapters: 3, totalMishnayot: 29, spiIndex: 1292, mishnayotPerChapter: [] },
      { english: 'Chagigah', hebrew: 'חגיגה', chapters: 3, totalMishnayot: 27, spiIndex: 1321, mishnayotPerChapter: [] },
    ],
  },
  {
    english: 'Nashim',
    hebrew: 'נשים',
    totalMishnayot: 611,
    tractates: [
      { english: 'Yevamot', hebrew: 'יבמות', chapters: 16, totalMishnayot: 122, spiIndex: 1348, mishnayotPerChapter: [] },
      { english: 'Ketubot', hebrew: 'כתובות', chapters: 13, totalMishnayot: 111, spiIndex: 1470, mishnayotPerChapter: [] },
      { english: 'Nedarim', hebrew: 'נדרים', chapters: 11, totalMishnayot: 91, spiIndex: 1581, mishnayotPerChapter: [] },
      { english: 'Nazir', hebrew: 'נזיר', chapters: 9, totalMishnayot: 66, spiIndex: 1672, mishnayotPerChapter: [] },
      { english: 'Sotah', hebrew: 'סוטה', chapters: 9, totalMishnayot: 49, spiIndex: 1738, mishnayotPerChapter: [] },
      { english: 'Gittin', hebrew: 'גיטין', chapters: 9, totalMishnayot: 90, spiIndex: 1787, mishnayotPerChapter: [] },
      { english: 'Kiddushin', hebrew: 'קידושין', chapters: 4, totalMishnayot: 82, spiIndex: 1877, mishnayotPerChapter: [] },
    ],
  },
  {
    english: 'Nezikin',
    hebrew: 'נזיקין',
    totalMishnayot: 851,
    tractates: [
      { english: 'Bava_Kamma', hebrew: 'בבא קמא', chapters: 10, totalMishnayot: 119, spiIndex: 1959, mishnayotPerChapter: [] },
      { english: 'Bava_Metzia', hebrew: 'בבא מציעא', chapters: 10, totalMishnayot: 118, spiIndex: 2078, mishnayotPerChapter: [] },
      { english: 'Bava_Batra', hebrew: 'בבא בתרא', chapters: 10, totalMishnayot: 176, spiIndex: 2196, mishnayotPerChapter: [] },
      { english: 'Sanhedrin', hebrew: 'סנהדרין', chapters: 11, totalMishnayot: 71, spiIndex: 2372, mishnayotPerChapter: [] },
      { english: 'Makkot', hebrew: 'מכות', chapters: 3, totalMishnayot: 24, spiIndex: 2443, mishnayotPerChapter: [] },
      { english: 'Shevuot', hebrew: 'שבועות', chapters: 8, totalMishnayot: 49, spiIndex: 2467, mishnayotPerChapter: [] },
      { english: 'Eduyot', hebrew: 'עדויות', chapters: 8, totalMishnayot: 96, spiIndex: 2516, mishnayotPerChapter: [] },
      { english: 'Avodah_Zarah', hebrew: 'עבודה זרה', chapters: 5, totalMishnayot: 76, spiIndex: 2612, mishnayotPerChapter: [] },
      { english: 'Avot', hebrew: 'אבות', chapters: 6, totalMishnayot: 108, spiIndex: 2688, mishnayotPerChapter: [] },
      { english: 'Horayot', hebrew: 'הוריות', chapters: 3, totalMishnayot: 14, spiIndex: 2796, mishnayotPerChapter: [] },
    ],
  },
  {
    english: 'Kodashim',
    hebrew: 'קדשים',
    totalMishnayot: 624,
    tractates: [
      { english: 'Zevachim', hebrew: 'זבחים', chapters: 14, totalMishnayot: 120, spiIndex: 2810, mishnayotPerChapter: [] },
      { english: 'Menachot', hebrew: 'מנחות', chapters: 13, totalMishnayot: 110, spiIndex: 2930, mishnayotPerChapter: [] },
      { english: 'Chullin', hebrew: 'חולין', chapters: 12, totalMishnayot: 142, spiIndex: 3040, mishnayotPerChapter: [] },
      { english: 'Bekhorot', hebrew: 'בכורות', chapters: 9, totalMishnayot: 61, spiIndex: 3182, mishnayotPerChapter: [] },
      { english: 'Arakhin', hebrew: 'ערכין', chapters: 9, totalMishnayot: 34, spiIndex: 3243, mishnayotPerChapter: [] },
      { english: 'Temurah', hebrew: 'תמורה', chapters: 7, totalMishnayot: 34, spiIndex: 3277, mishnayotPerChapter: [] },
      { english: 'Keritot', hebrew: 'כריתות', chapters: 6, totalMishnayot: 28, spiIndex: 3311, mishnayotPerChapter: [] },
      { english: 'Meilah', hebrew: 'מעילה', chapters: 6, totalMishnayot: 22, spiIndex: 3339, mishnayotPerChapter: [] },
      { english: 'Tamid', hebrew: 'תמיד', chapters: 7, totalMishnayot: 31, spiIndex: 3361, mishnayotPerChapter: [] },
      { english: 'Middot', hebrew: 'מידות', chapters: 5, totalMishnayot: 30, spiIndex: 3392, mishnayotPerChapter: [] },
      { english: 'Kinnim', hebrew: 'קינים', chapters: 3, totalMishnayot: 12, spiIndex: 3422, mishnayotPerChapter: [] },
    ],
  },
  {
    english: 'Taharot',
    hebrew: 'טהרות',
    totalMishnayot: 1072,
    tractates: [
      { english: 'Kelim', hebrew: 'כלים', chapters: 30, totalMishnayot: 300, spiIndex: 3434, mishnayotPerChapter: [] },
      { english: 'Oholot', hebrew: 'אהלות', chapters: 18, totalMishnayot: 181, spiIndex: 3734, mishnayotPerChapter: [] },
      { english: 'Negaim', hebrew: 'נגעים', chapters: 14, totalMishnayot: 126, spiIndex: 3915, mishnayotPerChapter: [] },
      { english: 'Parah', hebrew: 'פרה', chapters: 12, totalMishnayot: 72, spiIndex: 4041, mishnayotPerChapter: [] },
      { english: 'Tohorot', hebrew: 'טהרות', chapters: 10, totalMishnayot: 100, spiIndex: 4113, mishnayotPerChapter: [] },
      { english: 'Mikvaot', hebrew: 'מקואות', chapters: 10, totalMishnayot: 60, spiIndex: 4213, mishnayotPerChapter: [] },
      { english: 'Niddah', hebrew: 'נדה', chapters: 10, totalMishnayot: 79, spiIndex: 4273, mishnayotPerChapter: [] },
      { english: 'Machshirin', hebrew: 'מכשירין', chapters: 6, totalMishnayot: 60, spiIndex: 4352, mishnayotPerChapter: [] },
      { english: 'Zavim', hebrew: 'זבים', chapters: 5, totalMishnayot: 40, spiIndex: 4412, mishnayotPerChapter: [] },
      { english: 'Tevul_Yom', hebrew: 'טבול יום', chapters: 4, totalMishnayot: 20, spiIndex: 4452, mishnayotPerChapter: [] },
      { english: 'Yadayim', hebrew: 'ידים', chapters: 4, totalMishnayot: 22, spiIndex: 4472, mishnayotPerChapter: [] },
      { english: 'Uktzin', hebrew: 'עוקצין', chapters: 3, totalMishnayot: 12, spiIndex: 4494, mishnayotPerChapter: [] },
    ],
  },
];

// Flatten tractates with seder info
export const ALL_TRACTATES = MISHNAH_STRUCTURE.flatMap(seder => 
  seder.tractates.map(t => ({ ...t, seder: seder.english, sederHebrew: seder.hebrew }))
);

export const TOTAL_MISHNAYOT = MISHNAH_STRUCTURE.reduce((sum, s) => sum + s.totalMishnayot, 0); // 4506
export const TOTAL_CHAPTERS = ALL_TRACTATES.reduce((sum, t) => sum + t.chapters, 0); // 526

// Review intervals by intensity (in DAYS since learning)
// Reviews are due X days after the item was learned
export const REVIEW_INTERVALS: Record<ReviewIntensity, number[]> = {
  none: [],
  light: [7, 30],           // Review 7 and 30 days after learning
  medium: [3, 7, 30],       // Review 3, 7, 30 days after learning
  intensive: [1, 3, 7, 14, 30], // Review 1, 3, 7, 14, 30 days after learning
};

// Study days per year (weekdays minus holidays)
const STUDY_DAYS_PER_YEAR = 250;

// ============================================================================
// STUDY DAY HELPERS
// ============================================================================

/**
 * Check if a date is Shabbat (Saturday)
 */
function isShabbat(date: Date): boolean {
  return date.getDay() === 6; // Saturday
}

/**
 * Check if a date is Friday
 */
function isFriday(date: Date): boolean {
  return date.getDay() === 5; // Friday
}


/**
 * Format date as YYYY-MM-DD in local timezone (not UTC)
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string (YYYY-MM-DD) as LOCAL date at noon
 * This avoids timezone issues where midnight UTC could be previous day locally
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date at noon local time to avoid timezone edge cases
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Check if a date is Yom Tov (major Jewish holiday)
 */
function isYomTov(date: Date, yomTovDates?: Set<string>): boolean {
  if (!yomTovDates || yomTovDates.size === 0) return false;
  const dateStr = formatLocalDate(date);
  return yomTovDates.has(dateStr);
}

/**
 * Check if a date is a valid study day
 */
export function isStudyDay(date: Date, config?: StudyDaysConfig): boolean {
  // Always skip Shabbat (Saturday)
  if (isShabbat(date)) return false;
  
  // Skip Friday if configured (default: skip)
  const skipFriday = config?.skipFriday ?? true;
  if (skipFriday && isFriday(date)) return false;
  
  // Skip Yom Tov if dates are provided
  if (config?.yomTovDates && isYomTov(date, config.yomTovDates)) return false;
  
  return true;
}

/**
 * Get the next valid study day starting from a given date
 * If the given date is a valid study day, returns it
 */
export function getNextStudyDay(date: Date, config?: StudyDaysConfig): Date {
  const result = new Date(date);
  while (!isStudyDay(result, config)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

/**
 * Count the number of study days between two dates
 */
export function countStudyDays(startDate: Date, endDate: Date, config?: StudyDaysConfig): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (isStudyDay(current, config)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Add N study days to a date (skipping non-study days)
 */
export function addStudyDays(startDate: Date, studyDaysToAdd: number, config?: StudyDaysConfig): Date {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  // First, make sure we start on a valid study day
  while (!isStudyDay(result, config)) {
    result.setDate(result.getDate() + 1);
  }
  
  // Then add the required number of study days
  while (daysAdded < studyDaysToAdd) {
    result.setDate(result.getDate() + 1);
    if (isStudyDay(result, config)) {
      daysAdded++;
    }
  }
  
  return result;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert a number (1-30) to Hebrew letters for chapter/mishna display
 */
const HEBREW_LETTERS = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 
                        'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ',
                        'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל'];

export function toHebrewChapter(num: number): string {
  if (num >= 1 && num <= 30) {
    return HEBREW_LETTERS[num];
  }
  return String(num);
}

export function toHebrewMishna(num: number): string {
  if (num >= 1 && num <= 30) {
    return HEBREW_LETTERS[num];
  }
  return String(num);
}

/**
 * Format a content ref (e.g., "Mishnah_Berakhot.1.1") to Hebrew (e.g., "ברכות א:א")
 */
function formatContentRefHebrew(contentRef: string): string {
  const info = getInfoForContentRef(contentRef);
  if (!info) return contentRef;
  return `${info.tractate.hebrew} ${toHebrewChapter(info.chapter)}:${toHebrewMishna(info.mishna)}`;
}

/**
 * Get info for a content ref string
 */
function getInfoForContentRef(contentRef: string): { tractate: TractateInfo; chapter: number; mishna: number } | null {
  // Parse "Mishnah_Tractate.Chapter.Mishna"
  const match = contentRef.match(/^Mishnah_([^.]+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  
  const [, tractateName, chapterStr, mishnaStr] = match;
  const chapter = parseInt(chapterStr, 10);
  const mishna = parseInt(mishnaStr, 10);
  
  // Find tractate
  for (const seder of MISHNAH_STRUCTURE) {
    for (const tractate of seder.tractates) {
      if (tractate.english === tractateName) {
        return { tractate, chapter, mishna };
      }
    }
  }
  return null;
}

/**
 * Get tractate and position info for a global mishnah index
 */
export function getInfoForIndex(index: number): {
  tractate: TractateInfo & { seder: string; sederHebrew: string };
  chapter: number;
  mishna: number;
  contentRef: string;
} | null {
  // Ensure index is an integer (prevent floating point issues)
  index = Math.floor(index);
  
  if (index < 0 || index >= TOTAL_MISHNAYOT) return null;
  
  // Find tractate using spiIndex
  let tractateIdx = ALL_TRACTATES.length - 1;
  for (let i = 0; i < ALL_TRACTATES.length; i++) {
    if (ALL_TRACTATES[i].spiIndex > index) {
      tractateIdx = i - 1;
      break;
    }
  }
  
  const tractate = ALL_TRACTATES[tractateIdx];
  const localIndex = index - tractate.spiIndex;
  
  // Find chapter and mishna within tractate
  let chapter = 1;
  let mishna = 1;
  
  if (tractate.mishnayotPerChapter && tractate.mishnayotPerChapter.length === tractate.chapters) {
    // Use actual chapter data when available
    let cumulative = 0;
    for (let c = 0; c < tractate.mishnayotPerChapter.length; c++) {
      if (localIndex < cumulative + tractate.mishnayotPerChapter[c]) {
        chapter = c + 1;
        mishna = Math.floor(localIndex - cumulative + 1);
        break;
      }
      cumulative += tractate.mishnayotPerChapter[c];
    }
  } else {
    // Fallback: use average distribution but with safe bounds
    const avgPerChapter = tractate.totalMishnayot / tractate.chapters;
    chapter = Math.min(Math.floor(localIndex / avgPerChapter) + 1, tractate.chapters);
    
    // Calculate mishna based on remaining index after accounting for previous chapters
    const mishnayotBeforeThisChapter = Math.floor((chapter - 1) * avgPerChapter);
    mishna = Math.floor(localIndex - mishnayotBeforeThisChapter + 1);
    
    // Ensure mishna is within reasonable bounds (max ~15 per chapter typically)
    const maxMishnaPerChapter = Math.ceil(avgPerChapter * 1.5);
    mishna = Math.min(mishna, maxMishnaPerChapter);
    mishna = Math.max(mishna, 1);
  }
  
  // Ensure integers (prevent floating point issues)
  chapter = Math.floor(chapter);
  mishna = Math.floor(mishna);
  
  const contentRef = `Mishnah_${tractate.english}.${chapter}.${mishna}`;
  
  return { tractate, chapter, mishna, contentRef };
}

/**
 * Get content reference string for index
 */
export function getContentRefForIndex(index: number): string {
  const info = getInfoForIndex(index);
  return info?.contentRef ?? `Mishnah_Unknown.${index}`;
}

/**
 * Get content refs for a range of indices
 * Useful for determining which content to sync
 */
export function getContentRefsForRange(startIndex: number, endIndex: number): string[] {
  const refs: string[] = [];
  const start = Math.max(0, startIndex);
  const end = Math.min(TOTAL_MISHNAYOT - 1, endIndex);
  
  for (let i = start; i <= end; i++) {
    const info = getInfoForIndex(i);
    if (info) {
      refs.push(info.contentRef);
    }
  }
  
  return refs;
}

/**
 * Get seder info for a global index
 */
export function getSederForIndex(index: number): SederInfo | null {
  let cumulative = 0;
  for (const seder of MISHNAH_STRUCTURE) {
    if (index < cumulative + seder.totalMishnayot) {
      return seder;
    }
    cumulative += seder.totalMishnayot;
  }
  return null;
}

/**
 * Get items per day for a pace
 * For seder_per_year, this varies by seder
 */
export function getItemsPerDay(pace: Pace, currentIndex?: number): number {
  switch (pace) {
    case 'one_chapter':
      // Average ~8 mishnayot per chapter
      return 8;
    case 'two_mishna':
      return 2;
    case 'seder_per_year':
      // Dynamic based on current seder
      if (currentIndex !== undefined) {
        const seder = getSederForIndex(currentIndex);
        if (seder) {
          // Calculate to complete seder in ~250 study days
          return seder.totalMishnayot / STUDY_DAYS_PER_YEAR;
        }
      }
      // Default average across all sedarim
      return 3;
    default:
      return 2;
  }
}

/**
 * Get the actual items to study today for seder_per_year
 * Uses floor/ceil alternation to hit exact target
 */
export function getItemsForToday(pace: Pace, currentIndex: number, dayNumber: number): number {
  if (pace !== 'seder_per_year') {
    return pace === 'one_chapter' ? 8 : 2;
  }
  
  const seder = getSederForIndex(currentIndex);
  if (!seder) return 3;
  
  const dailyAvg = seder.totalMishnayot / STUDY_DAYS_PER_YEAR;
  const floor = Math.floor(dailyAvg);
  const ceil = Math.ceil(dailyAvg);
  
  // Alternate to hit exact target
  // Ratio of ceil days needed: dailyAvg - floor
  const ceilRatio = dailyAvg - floor;
  
  // Use day number to determine floor or ceil
  return (dayNumber % 10) / 10 < ceilRatio ? ceil : floor;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Compute unlock date for a given content index
 */
export function getUnlockDate(
  index: number,
  pace: Pace,
  startDate: Date,
  studyDaysConfig?: StudyDaysConfig
): string {
  const itemsPerDay = getItemsPerDay(pace, index);
  const studyDaysFromStart = Math.floor(index / itemsPerDay);
  
  // Start from the first valid study day
  const validStartDate = getNextStudyDay(startDate, studyDaysConfig);
  
  // Add study days (skipping Shabbat, Friday, Yom Tov as configured)
  const unlockDate = studyDaysFromStart === 0 
    ? validStartDate 
    : addStudyDays(validStartDate, studyDaysFromStart, studyDaysConfig);
  
  return formatLocalDate(unlockDate);
}

/**
 * Compute the visible path nodes around current position
 * Includes review session nodes on days when reviews are due
 */
export function computePath(
  progress: UserProgress,
  page: number = 0, // Page number (0 = current, 1 = next 14 days, etc.)
  pageSize: number = 14 // Days per page
): PathNode[] {
  const { currentContentIndex, pace, startDate, reviewIntensity, studyDays } = progress;
  const itemsPerDay = getItemsPerDay(pace, currentContentIndex);
  
  // Page 0: show some completed items + first 14 days ahead
  // Page 1+: show next 14 days
  let startIndex: number;
  let endIndex: number;
  
  if (page === 0) {
    // First page: 30 completed items back + 14 days ahead
    const lookbackItems = Math.min(currentContentIndex, 30 * itemsPerDay);
    startIndex = currentContentIndex - lookbackItems;
    endIndex = Math.min(
      currentContentIndex + pageSize * itemsPerDay,
      TOTAL_MISHNAYOT - 1
    );
  } else {
    // Subsequent pages: next 14 days
    const pageStartDays = page * pageSize;
    startIndex = Math.min(
      currentContentIndex + pageStartDays * itemsPerDay,
      TOTAL_MISHNAYOT - 1
    );
    endIndex = Math.min(
      currentContentIndex + (pageStartDays + pageSize) * itemsPerDay,
      TOTAL_MISHNAYOT - 1
    );
  }
  
  const path: PathNode[] = [];
  
  // Calculate review dates only for this page's date range
  const reviewsByDate = computeReviewsByDate(progress, pageSize, page);
  
  // Track which dates we've added review sessions for
  const reviewDatesAdded = new Set<string>();
  
  // Helper to get Friday of a date's week (cached for performance)
  const getFridayOfWeek = (date: Date): string => {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    // Days to add to get to Friday (0=Sun -> +5, 1=Mon -> +4, ... 5=Fri -> 0, 6=Sat -> -1)
    const daysToFriday = dayOfWeek === 6 ? -1 : (5 - dayOfWeek);
    d.setDate(d.getDate() + daysToFriday);
    return formatLocalDate(d);
  };
  
  // Track current week for quiz generation (avoids O(n²) lookback)
  let currentWeekStart: string | null = null;
  let currentWeekFriday: string | null = null;
  
  for (let i = startIndex; i <= endIndex; i++) {
    const info = getInfoForIndex(i);
    if (!info) continue;
    
    const isCurrent = i === currentContentIndex;
    const unlockDate = getUnlockDate(i, pace, startDate, studyDays);
    
    // Add review session node for this date if not already added
    const reviewsForDate = reviewsByDate.get(unlockDate);
    if (reviewsForDate && reviewsForDate.length > 0 && !reviewDatesAdded.has(unlockDate)) {
      reviewDatesAdded.add(unlockDate);
      
      // Get the interval (days since learned) - use the first item's interval
      // All items in this review session should have the same interval
      const reviewInterval = reviewsForDate[0].interval;
      
      // Get the range of items being reviewed (sorted by content index)
      const sortedReviews = [...reviewsForDate].sort((a, b) => a.contentIndex - b.contentIndex);
      const firstItem = sortedReviews[0];
      const lastItem = sortedReviews[sortedReviews.length - 1];
      
      // Format Hebrew range strings (e.g., "ברכות א:ג")
      const formatHebrewRef = (item: ReviewItem) => 
        `${item.tractateHebrew} ${toHebrewChapter(item.chapter)}:${toHebrewMishna(item.mishna)}`;
      
      const reviewRangeStart = formatHebrewRef(firstItem);
      const reviewRangeEnd = sortedReviews.length > 1 ? formatHebrewRef(lastItem) : undefined;
      
      path.push({
        index: -1, // Special index for review session
        contentRef: 'review_session',
        tractate: '',
        tractateHebrew: '',
        chapter: 0,
        mishna: 0,
        isCompleted: false,
        isCurrent: false, // Review sessions are not "current" - user chooses when to do them
        seder: '',
        unlockDate: unlockDate,
        nodeType: 'review_session',
        reviewCount: reviewsForDate.length,
        reviewInterval: reviewInterval,
        reviewRangeStart: reviewRangeStart,
        reviewRangeEnd: reviewRangeEnd,
      });
    }
    
    // Add the learning node
    path.push({
      index: i,
      contentRef: info.contentRef,
      tractate: info.tractate.english,
      tractateHebrew: info.tractate.hebrew,
      chapter: info.chapter,
      mishna: info.mishna,
      isCompleted: i < currentContentIndex,
      isCurrent: isCurrent, // Learning node is current regardless of reviews
      seder: info.tractate.seder,
      unlockDate: unlockDate,
      nodeType: 'learning',
    });
    
    // Check if this is the last mishna of a chapter (add divider + quiz after)
    const nextInfo = i < endIndex ? getInfoForIndex(i + 1) : null;
    const isChapterEnd = nextInfo && (
      nextInfo.tractate.english !== info.tractate.english || 
      nextInfo.chapter !== info.chapter
    );
    
    if (isChapterEnd) {
      // Chapter completed = all mishnayot in this chapter are done
      const chapterIsCompleted = i < currentContentIndex;
      
      // Add divider node to mark chapter completion
      path.push({
        index: -1,
        contentRef: `divider_${info.tractate.english}_${info.chapter}`,
        tractate: info.tractate.english,
        tractateHebrew: info.tractate.hebrew,
        chapter: info.chapter,
        mishna: 0,
        isCompleted: chapterIsCompleted,
        isCurrent: false,
        seder: info.tractate.seder,
        unlockDate: unlockDate,
        nodeType: 'divider',
      });
    }
    
    // Track week start for quiz (updated as we iterate - avoids O(n²) lookback)
    if (!currentWeekStart || currentWeekFriday !== getFridayOfWeek(new Date(unlockDate))) {
      currentWeekStart = info.contentRef;
      currentWeekFriday = getFridayOfWeek(new Date(unlockDate));
    }
    
    // Check if we need to add a weekly quiz (quizzes are on Fridays, covering Sunday-Thursday)
    // IMPORTANT: Always check the actual next item, even beyond endIndex, to avoid duplicate quizzes at page boundaries
    const nextItemIndex = i + 1;
    const hasNextItem = nextItemIndex < TOTAL_MISHNAYOT;
    const nextUnlockDate = hasNextItem ? getUnlockDate(nextItemIndex, pace, startDate, studyDays) : null;
    const nextFridayStr = nextUnlockDate ? getFridayOfWeek(new Date(nextUnlockDate)) : null;
    
    // Add quiz only if this is truly the last node before a new week starts (not just end of page)
    const isLastNodeOfWeek = !hasNextItem || (nextFridayStr !== currentWeekFriday);
    
    if (isLastNodeOfWeek && currentWeekFriday) {
      const today = formatLocalDate(new Date());
      const quizIsAvailable = currentWeekFriday <= today;
      const quizIsCompleted = i < currentContentIndex && quizIsAvailable;
      
      path.push({
        index: -1,
        contentRef: `weekly_quiz_${currentWeekFriday}`,
        tractate: info.tractate.english,
        tractateHebrew: info.tractate.hebrew,
        chapter: info.chapter,
        mishna: 0,
        isCompleted: quizIsCompleted,
        isCurrent: quizIsAvailable && !quizIsCompleted && i >= currentContentIndex,
        seder: info.tractate.seder,
        unlockDate: currentWeekFriday,
        nodeType: 'weekly_quiz',
        // Store week range for display
        reviewRangeStart: formatContentRefHebrew(currentWeekStart),
        reviewRangeEnd: formatContentRefHebrew(info.contentRef),
      });
      
      // Reset for next week
      currentWeekStart = null;
      currentWeekFriday = null;
    }
  }
  
  return path;
}

/**
 * Compute reviews grouped by the date they're due
 * Returns a map of date string -> review items due on that date
 */
export function computeReviewsByDate(
  progress: UserProgress,
  pageSize: number = 14,
  page: number = 0
): Map<string, ReviewItem[]> {
  const { currentContentIndex, pace, startDate, reviewIntensity, studyDays } = progress;
  const intervals = REVIEW_INTERVALS[reviewIntensity];
  const reviewsByDate = new Map<string, ReviewItem[]>();
  
  if (intervals.length === 0 || currentContentIndex === 0) {
    return reviewsByDate;
  }
  
  // Calculate date range for this page
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pageStartDate = new Date(today);
  pageStartDate.setDate(pageStartDate.getDate() + (page * pageSize));
  const pageEndDate = new Date(today);
  pageEndDate.setDate(pageEndDate.getDate() + ((page + 1) * pageSize));
  
  // For each completed item, calculate its review dates
  for (let i = 0; i < currentContentIndex; i++) {
    const info = getInfoForIndex(i);
    if (!info) continue;
    
    // When was this item learned?
    const learnDateStr = getUnlockDate(i, pace, startDate, studyDays);
    const learnDate = parseLocalDate(learnDateStr);
    
    // Calculate review dates based on intervals
    for (const interval of intervals) {
      const reviewDate = new Date(learnDate);
      reviewDate.setDate(reviewDate.getDate() + interval);
      const reviewDateStr = formatLocalDate(reviewDate);
      
      // Only include reviews within this page's date range
      if (reviewDate >= pageStartDate && reviewDate < pageEndDate) {
        const reviewItem: ReviewItem = {
          contentRef: info.contentRef,
          contentIndex: i,
          tractate: info.tractate.english,
          tractateHebrew: info.tractate.hebrew,
          chapter: info.chapter,
          mishna: info.mishna,
          interval,
        };
        
        if (!reviewsByDate.has(reviewDateStr)) {
          reviewsByDate.set(reviewDateStr, []);
        }
        // Avoid duplicates for same item on same date
        const existing = reviewsByDate.get(reviewDateStr)!;
        if (!existing.find(r => r.contentIndex === i)) {
          existing.push(reviewItem);
        }
      }
    }
  }
  
  return reviewsByDate;
}

/**
 * Get today's content to study
 */
export function getTodaysContent(progress: UserProgress): PathNode | null {
  const { currentContentIndex, pace, startDate, studyDays } = progress;
  
  if (currentContentIndex >= TOTAL_MISHNAYOT) {
    return null; // Completed all!
  }
  
  const info = getInfoForIndex(currentContentIndex);
  if (!info) return null;
  
  return {
    index: currentContentIndex,
    contentRef: info.contentRef,
    tractate: info.tractate.english,
    tractateHebrew: info.tractate.hebrew,
    chapter: info.chapter,
    mishna: info.mishna,
    isCompleted: false,
    isCurrent: true,
    seder: info.tractate.seder,
    unlockDate: getUnlockDate(currentContentIndex, pace, startDate, studyDays),
    nodeType: 'learning',
  };
}

/**
 * Compute reviews due TODAY based on spaced repetition intervals
 * An item is due for review if: today = learnDate + interval days
 */
export function computeReviewsDue(progress: UserProgress): ReviewItem[] {
  const { currentContentIndex, pace, startDate, reviewIntensity, studyDays } = progress;
  const intervals = REVIEW_INTERVALS[reviewIntensity];
  
  if (intervals.length === 0 || currentContentIndex === 0) {
    return [];
  }
  
  const reviews: ReviewItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatLocalDate(today);
  
  // Check each completed item to see if it's due for review today
  for (let i = 0; i < currentContentIndex; i++) {
    const info = getInfoForIndex(i);
    if (!info) continue;
    
    // Calculate when this item was learned (its unlock date)
    const learnDateStr = getUnlockDate(i, pace, startDate, studyDays);
    const learnDate = new Date(learnDateStr);
    learnDate.setHours(0, 0, 0, 0);
    
    // Check each review interval
    for (const interval of intervals) {
      const reviewDate = new Date(learnDate);
      reviewDate.setDate(reviewDate.getDate() + interval);
      const reviewDateStr = formatLocalDate(reviewDate);
      
      // Is this item due for review today?
      if (reviewDateStr === todayStr) {
        // Avoid duplicates (same item might match multiple intervals)
        if (!reviews.find(r => r.contentIndex === i)) {
          reviews.push({
            contentRef: info.contentRef,
            contentIndex: i,
            tractate: info.tractate.english,
            tractateHebrew: info.tractate.hebrew,
            chapter: info.chapter,
            mishna: info.mishna,
            interval,
          });
        }
        break; // Only add once per item
      }
    }
  }
  
  return reviews;
}

/**
 * Get completion estimate for a pace
 */
export function getCompletionEstimate(
  pace: Pace,
  startDate: Date = new Date()
): CompletionEstimate {
  const itemsPerDay = getItemsPerDay(pace);
  const totalDays = TOTAL_MISHNAYOT / itemsPerDay;
  const years = totalDays / STUDY_DAYS_PER_YEAR;
  
  const finishDate = new Date(startDate);
  finishDate.setDate(finishDate.getDate() + Math.round(totalDays * (365 / STUDY_DAYS_PER_YEAR)));
  
  return {
    years: Math.round(years * 10) / 10, // Round to 1 decimal
    finishDate,
    totalItems: TOTAL_MISHNAYOT,
    itemsPerDay: Math.round(itemsPerDay * 10) / 10,
  };
}

/**
 * Get all pace options with their estimates
 */
export function getPaceOptions(startDate: Date = new Date()): Array<{
  pace: Pace;
  label: string;
  estimate: CompletionEstimate;
}> {
  return [
    {
      pace: 'one_chapter',
      label: 'פרק ביום',
      estimate: getCompletionEstimate('one_chapter', startDate),
    },
    {
      pace: 'seder_per_year',
      label: 'סדר בשנה',
      estimate: getCompletionEstimate('seder_per_year', startDate),
    },
    {
      pace: 'two_mishna',
      label: 'שתי משניות',
      estimate: getCompletionEstimate('two_mishna', startDate),
    },
  ];
}
