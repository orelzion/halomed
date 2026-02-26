/**
 * Path Generator - Pure functions to compute learning path from position
 * No database queries - just math based on position and pace
 * Works in both browser and Deno
 */

// Canonical Mishnah structure — single source of truth shared with edge functions
export type { TractateInfo, SederInfo } from './mishnah-structure';
export {
  MISHNAH_STRUCTURE,
  TOTAL_MISHNAYOT,
  TOTAL_CHAPTERS,
  getContentRefForIndex,
} from './mishnah-structure';
import { MISHNAH_STRUCTURE, TOTAL_MISHNAYOT, TOTAL_CHAPTERS } from './mishnah-structure';
import type { TractateInfo, SederInfo } from './mishnah-structure';

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
  reviewItemIndexes?: number[]; // Content indexes of items to review (passed directly to review page)
  isAccessible?: boolean; // True if this node should be unlocked even though it's not "current"
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

// Flatten tractates and add seder info (used throughout path generation logic)
export const ALL_TRACTATES = MISHNAH_STRUCTURE.flatMap(seder =>
  seder.tractates.map(t => ({ ...t, seder: seder.english, sederHebrew: seder.hebrew }))
);

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

  // Find tractate using cumulative sum
  let cumulative = 0;
  let tractate = ALL_TRACTATES[ALL_TRACTATES.length - 1];
  let localIndex = 0;

  for (const t of ALL_TRACTATES) {
    if (index < cumulative + t.totalMishnayot) {
      tractate = t;
      localIndex = index - cumulative;
      break;
    }
    cumulative += t.totalMishnayot;
  }

  // Find chapter and mishna within tractate
  let chapter = tractate.chapters;
  let mishna = 1;

  if (tractate.mishnayotPerChapter && tractate.mishnayotPerChapter.length === tractate.chapters) {
    // Use actual chapter data when available
    let cum2 = 0;
    for (let c = 0; c < tractate.mishnayotPerChapter.length; c++) {
      if (localIndex < cum2 + tractate.mishnayotPerChapter[c]) {
        chapter = c + 1;
        mishna = Math.floor(localIndex - cum2 + 1);
        break;
      }
      cum2 += tractate.mishnayotPerChapter[c];
    }
  } else {
    // Fallback: float-average distribution (matches canonical getContentRefForIndex)
    const avgPerChapter = tractate.totalMishnayot / tractate.chapters;
    chapter = Math.min(Math.floor(localIndex / avgPerChapter) + 1, tractate.chapters);
    const mishnayotBeforeThisChapter = Math.floor((chapter - 1) * avgPerChapter);
    mishna = Math.max(Math.floor(localIndex - mishnayotBeforeThisChapter + 1), 1);
  }
  
  // Ensure integers (prevent floating point issues)
  chapter = Math.floor(chapter);
  mishna = Math.floor(mishna);
  
  const contentRef = `Mishnah_${tractate.english}.${chapter}.${mishna}`;
  
  return { tractate, chapter, mishna, contentRef };
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
    const sederTotal = seder.tractates.reduce((sum, t) => sum + t.totalMishnayot, 0);
    if (index < cumulative + sederTotal) {
      return seder;
    }
    cumulative += sederTotal;
  }
  return null;
}

/**
 * Get the global chapter number for an index (0-based)
 * Used for one_chapter pace where each chapter = one study day
 */
export function getGlobalChapterForIndex(index: number): number {
  if (index < 0) return 0;
  if (index >= TOTAL_MISHNAYOT) return TOTAL_CHAPTERS - 1;

  let globalChapter = 0;
  let cumulativeIndex = 0;

  for (const tractate of ALL_TRACTATES) {
    // Check if index is within this tractate
    if (index < cumulativeIndex + tractate.totalMishnayot) {
      const localIndex = index - cumulativeIndex;

      // Find which chapter within this tractate
      if (tractate.mishnayotPerChapter && tractate.mishnayotPerChapter.length === tractate.chapters) {
        let cumulative = 0;
        for (let c = 0; c < tractate.mishnayotPerChapter.length; c++) {
          if (localIndex < cumulative + tractate.mishnayotPerChapter[c]) {
            return globalChapter + c;
          }
          cumulative += tractate.mishnayotPerChapter[c];
        }
      } else {
        // Fallback: use average distribution
        const avgPerChapter = tractate.totalMishnayot / tractate.chapters;
        const localChapter = Math.min(Math.floor(localIndex / avgPerChapter), tractate.chapters - 1);
        return globalChapter + localChapter;
      }
    }

    globalChapter += tractate.chapters;
    cumulativeIndex += tractate.totalMishnayot;
  }

  return globalChapter;
}

/**
 * Get the first mishna index of a global chapter (0-based)
 */
export function getFirstIndexOfChapter(globalChapter: number): number {
  if (globalChapter < 0) return 0;
  if (globalChapter >= TOTAL_CHAPTERS) return TOTAL_MISHNAYOT - 1;

  let currentGlobalChapter = 0;
  let cumulativeIndex = 0;

  for (const tractate of ALL_TRACTATES) {
    for (let c = 0; c < tractate.chapters; c++) {
      if (currentGlobalChapter === globalChapter) {
        return cumulativeIndex;
      }

      // Move to next chapter
      const chapterSize = tractate.mishnayotPerChapter && tractate.mishnayotPerChapter.length === tractate.chapters
        ? tractate.mishnayotPerChapter[c]
        : Math.ceil(tractate.totalMishnayot / tractate.chapters);
      cumulativeIndex += chapterSize;
      currentGlobalChapter++;
    }
  }

  return Math.min(cumulativeIndex, TOTAL_MISHNAYOT - 1);
}

/**
 * Get the last mishna index of a global chapter (0-based)
 */
export function getLastIndexOfChapter(globalChapter: number): number {
  if (globalChapter < 0) return 0;
  if (globalChapter >= TOTAL_CHAPTERS - 1) return TOTAL_MISHNAYOT - 1;

  // Last index of chapter N = first index of chapter N+1 - 1
  const nextChapterStart = getFirstIndexOfChapter(globalChapter + 1);
  return Math.max(0, nextChapterStart - 1);
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
          const sederTotal = seder.tractates.reduce((sum, t) => sum + t.totalMishnayot, 0);
          return sederTotal / STUDY_DAYS_PER_YEAR;
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

  const sederTotal = seder.tractates.reduce((sum, t) => sum + t.totalMishnayot, 0);
  const dailyAvg = sederTotal / STUDY_DAYS_PER_YEAR;
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
  // For one_chapter pace, each chapter = one study day
  // For other paces, use items-per-day calculation
  let studyDaysFromStart: number;

  if (pace === 'one_chapter') {
    // Use global chapter number as the study day
    studyDaysFromStart = getGlobalChapterForIndex(index);
  } else {
    const itemsPerDay = getItemsPerDay(pace, index);
    studyDaysFromStart = Math.floor(index / itemsPerDay);
  }

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

  // For one_chapter pace, we use chapters as the unit, not items
  // For other paces, use itemsPerDay
  const itemsPerDay = pace === 'one_chapter' ? 8 : getItemsPerDay(pace, currentContentIndex); // Average for estimation
  const daysPerPage = pageSize;

  // Page 0: show some completed items + first 14 days ahead
  // Page 1+: show next 14 days
  let startIndex: number;
  let endIndex: number;

  if (pace === 'one_chapter') {
    // For one_chapter pace, use chapter-based calculations
    const currentChapter = getGlobalChapterForIndex(currentContentIndex);

    if (page === 0) {
      // First page: 30 chapters back + pageSize chapters ahead
      const lookbackChapters = Math.min(currentChapter, 30);
      const targetStartChapter = currentChapter - lookbackChapters;
      const targetEndChapter = Math.min(currentChapter + daysPerPage, TOTAL_CHAPTERS - 1);

      // Find the first index of the start chapter
      startIndex = getFirstIndexOfChapter(targetStartChapter);
      // Find the last index of the end chapter
      endIndex = getLastIndexOfChapter(targetEndChapter);
    } else {
      // Subsequent pages: next pageSize chapters
      const pageStartChapter = currentChapter + page * daysPerPage;
      const pageEndChapter = Math.min(pageStartChapter + daysPerPage - 1, TOTAL_CHAPTERS - 1);

      startIndex = getFirstIndexOfChapter(pageStartChapter);
      endIndex = getLastIndexOfChapter(pageEndChapter);
    }
  } else {
    // For other paces, use items-per-day calculation
    if (page === 0) {
      // First page: 30 days back + 14 days ahead
      const lookbackItems = Math.min(currentContentIndex, 30 * itemsPerDay);
      startIndex = currentContentIndex - lookbackItems;
      endIndex = Math.min(
        currentContentIndex + daysPerPage * itemsPerDay,
        TOTAL_MISHNAYOT - 1
      );
    } else {
      // Subsequent pages: next 14 days
      const pageStartDays = page * daysPerPage;
      startIndex = Math.min(
        currentContentIndex + pageStartDays * itemsPerDay,
        TOTAL_MISHNAYOT - 1
      );
      endIndex = Math.min(
        currentContentIndex + (pageStartDays + daysPerPage) * itemsPerDay,
        TOTAL_MISHNAYOT - 1
      );
    }
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

    // Don't set isCurrent yet - we'll do it at the end for the first unlocked node
    const isCompleted = i < currentContentIndex;
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
        isCurrent: false, // Will be set at the end if this is the first unlocked node
        seder: '',
        unlockDate: unlockDate,
        nodeType: 'review_session',
        reviewCount: reviewsForDate.length,
        reviewInterval: reviewInterval,
        reviewRangeStart: reviewRangeStart,
        reviewRangeEnd: reviewRangeEnd,
        reviewItemIndexes: sortedReviews.map(r => r.contentIndex), // Pass content indexes directly
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
      isCompleted: isCompleted,
      isCurrent: false, // Will be set at the end if this is the first unlocked node
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
      path.push({
        index: -1,
        contentRef: `weekly_quiz_${currentWeekFriday}`,
        tractate: info.tractate.english,
        tractateHebrew: info.tractate.hebrew,
        chapter: info.chapter,
        mishna: 0,
        // Quiz completion tracked via quiz_completion_dates in convertNodes
        isCompleted: false,
        isCurrent: false, // Will be set at the end if this is the first unlocked node
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

  // Position-based progression: no date gating
  // Mark the first uncompleted non-divider node as "current"
  // But skip quiz/review nodes that appear before current learning frontier
  const firstUncompletedLearningIdx = path.findIndex(
    n => n.nodeType === 'learning' && !n.isCompleted
  );

  for (let idx = 0; idx < path.length; idx++) {
    const node = path[idx];
    if (node.nodeType === 'divider') continue;
    if (node.isCompleted) continue;

    // Skip quiz/review nodes that are before the current learning position
    // These are structurally "passed" — user has progressed beyond them
    if ((node.nodeType === 'weekly_quiz' || node.nodeType === 'review_session') 
        && firstUncompletedLearningIdx !== -1 
        && idx < firstUncompletedLearningIdx) {
      continue;
    }

    node.isCurrent = true;
    break;
  }

  // If the current node is a review/quiz, also mark the next learning node as accessible
  const currentNode = path.find(n => n.isCurrent);
  if (currentNode && (currentNode.nodeType === 'review_session' || currentNode.nodeType === 'weekly_quiz')) {
    for (const node of path) {
      if (node.nodeType === 'learning' && !node.isCompleted) {
        node.isAccessible = true;
        break;
      }
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
