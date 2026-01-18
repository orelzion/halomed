// supabase/functions/_shared/content-order.ts
// Track content ordering utilities
// Reference: scheduling.md Section "Content Assignment"
// Updated: Task 11.2 - Full Shas support

import { 
  getTractateAndChapterForMishnahIndex,
  getContentRefForGlobalIndex,
  getTotalMishnayot,
  getTotalChapters,
  isChapterEnd,
  isTractateEnd,
  getTractateAtIndex,
} from './mishnah-structure.ts';

/**
 * Total chapters in complete Mishnah
 */
export const TOTAL_CHAPTERS = getTotalChapters();

/**
 * Total mishnayot in complete Mishnah
 */
export const TOTAL_MISHNAYOT = getTotalMishnayot();

/**
 * Gets the content reference for a given index in the Mishnah track
 * Format depends on schedule type:
 * - DAILY_WEEKDAYS_ONLY: Mishnah_{Tractate}.{Chapter}.{Mishnah}
 * - DAILY_CHAPTER_PER_DAY: Mishnah_{Tractate}.{Chapter} (entire chapter)
 * 
 * Uses complete Mishnah structure (all 63 tractates)
 * 
 * @param index - Global mishnah index (0-based, across all tractates)
 * @param scheduleType - Schedule type (DAILY_WEEKDAYS_ONLY or DAILY_CHAPTER_PER_DAY)
 * @returns Content reference string
 */
export function getContentRefForIndex(index: number, scheduleType?: string): string {
  // For chapter-per-day: each index represents one chapter
  if (scheduleType === 'DAILY_CHAPTER_PER_DAY') {
    // Find which chapter this index represents across all tractates
    let remainingIndex = index;
    let tractateIndex = 0;
    
    while (tractateIndex < 63) {
      const tractate = getTractateAtIndex(tractateIndex);
      if (!tractate) break;
      
      if (remainingIndex < tractate.chapters) {
        // This chapter is in this tractate
        const chapter = remainingIndex + 1;
        return `Mishnah_${tractate.english}.${chapter}`;
      }
      
      remainingIndex -= tractate.chapters;
      tractateIndex++;
    }
    
    // If we've exceeded all chapters, return last chapter
    const lastTractate = getTractateAtIndex(62);
    if (lastTractate) {
      return `Mishnah_${lastTractate.english}.${lastTractate.chapters}`;
    }
    
    return `Mishnah_Berakhot.9`; // Fallback
  }
  
  // For mishnah-by-mishnah: use global index
  return getContentRefForGlobalIndex(index);
}

/**
 * Gets the current tractate for a given mishnah index
 * @param index - Global mishnah index
 * @returns Tractate English name or undefined
 */
export function getCurrentTractate(index: number): string | undefined {
  const info = getTractateAndChapterForMishnahIndex(index);
  return info?.tractate.english;
}

/**
 * Gets the current chapter for a given mishnah index
 * @param index - Global mishnah index
 * @returns Chapter number (1-based) or undefined
 */
export function getCurrentChapter(index: number): number | undefined {
  const info = getTractateAndChapterForMishnahIndex(index);
  return info?.chapter;
}

/**
 * Check if index is at the end of a chapter
 * @param index - Global mishnah index
 * @returns true if this is the last mishnah in a chapter
 */
export function isChapterEndIndex(index: number): boolean {
  return isChapterEnd(index);
}

/**
 * Check if index is at the end of a tractate
 * @param index - Global mishnah index
 * @returns true if this is the last mishnah in a tractate
 */
export function isTractateEndIndex(index: number): boolean {
  return isTractateEnd(index);
}

/**
 * Gets the content reference ID format for content_cache lookup
 * This matches the ref_id format used in content_cache table
 */
export function getContentRefId(ref: string): string {
  // The ref_id in content_cache should match this format
  return ref;
}
