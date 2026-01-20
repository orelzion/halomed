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
  ALL_TRACTATES,
  TractateInfo,
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

/**
 * Gets all global mishnah indices for a given chapter index (0-based)
 * Used for one_chapter pace where all mishnayot in a chapter unlock on the same day
 * 
 * @param chapterIndex - Global chapter index (0-based, across all tractates)
 * @returns Array of global mishnah indices, or empty array if invalid
 */
export function getMishnayotIndicesForChapter(chapterIndex: number): number[] {
  if (chapterIndex < 0 || chapterIndex >= TOTAL_CHAPTERS) {
    return [];
  }

  // Find which tractate and chapter this index represents
  let remainingChapterIndex = chapterIndex;
  let tractateIndex = 0;
  let globalMishnahOffset = 0; // Track global mishnah index offset
  
  while (tractateIndex < ALL_TRACTATES.length) {
    const tractate = ALL_TRACTATES[tractateIndex];
    
    if (remainingChapterIndex < tractate.chapters) {
      // This chapter is in this tractate
      const chapter = remainingChapterIndex + 1; // 1-based chapter number
      
      // Calculate mishnah indices for this chapter
      const mishnayotInChapter = getMishnayotCountForChapter(tractate, chapter);
      
      // Calculate global offset for mishnayot before this chapter in this tractate
      let chapterOffset = 0;
      for (let c = 1; c < chapter; c++) {
        chapterOffset += getMishnayotCountForChapter(tractate, c);
      }
      
      // Generate array of global mishnah indices
      const indices: number[] = [];
      for (let m = 0; m < mishnayotInChapter; m++) {
        indices.push(globalMishnahOffset + chapterOffset + m);
      }
      
      return indices;
    }
    
    remainingChapterIndex -= tractate.chapters;
    globalMishnahOffset += tractate.totalMishnayot;
    tractateIndex++;
  }
  
  return [];
}

/**
 * Gets the number of mishnayot in a specific chapter of a tractate
 */
function getMishnayotCountForChapter(tractate: TractateInfo, chapter: number): number {
  if (tractate.mishnayotPerChapter && tractate.mishnayotPerChapter[chapter]) {
    return tractate.mishnayotPerChapter[chapter];
  }
  // Estimate: divide mishnayot evenly across chapters
  return Math.ceil(tractate.totalMishnayot / tractate.chapters);
}

/**
 * Gets the global content index for a given content reference
 * Reverse of getContentRefForIndex - parses the ref and calculates the index
 * 
 * @param contentRef - Content reference string (e.g., "Mishnah_Berakhot.1.5")
 * @returns Global content index (0-based) or null if invalid
 */
export function getContentIndexForRef(contentRef: string): number | null {
  if (!contentRef || !contentRef.startsWith('Mishnah_')) {
    return null;
  }

  // Parse the reference: "Mishnah_Tractate.Chapter.Mishnah" or "Mishnah_Tractate.Chapter"
  const match = contentRef.match(/^Mishnah_([^.]+)\.(\d+)(?:\.(\d+))?$/);
  if (!match) {
    return null;
  }

  const [, tractateName, chapterStr, mishnahStr] = match;
  const chapter = parseInt(chapterStr, 10);
  const mishnah = mishnahStr ? parseInt(mishnahStr, 10) : 1;

  // Find the tractate
  const tractateIndex = ALL_TRACTATES.findIndex(t => t.english === tractateName);
  if (tractateIndex === -1) {
    return null;
  }

  // Calculate global index
  let globalIndex = 0;

  // Add all mishnayot from previous tractates
  for (let i = 0; i < tractateIndex; i++) {
    globalIndex += ALL_TRACTATES[i].totalMishnayot;
  }

  // Add mishnayot from previous chapters in this tractate
  const tractate = ALL_TRACTATES[tractateIndex];
  if (tractate.mishnayotPerChapter) {
    for (let c = 1; c < chapter; c++) {
      globalIndex += tractate.mishnayotPerChapter[c] || 0;
    }
  } else {
    // Estimate: divide mishnayot evenly across chapters
    const mishnayotPerChapter = Math.ceil(tractate.totalMishnayot / tractate.chapters);
    globalIndex += (chapter - 1) * mishnayotPerChapter;
  }

  // Add the mishnah number within the chapter (1-based to 0-based)
  globalIndex += mishnah - 1;

  return globalIndex;
}
