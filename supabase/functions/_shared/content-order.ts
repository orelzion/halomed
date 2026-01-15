// supabase/functions/_shared/content-order.ts
// Track content ordering utilities
// Reference: scheduling.md Section "Content Assignment"

/**
 * Structure of Mishnah Berakhot: chapters and mishnayot per chapter
 * Source: https://www.sefaria.org/Mishnah_Berakhot
 */
const BERAKHOT_STRUCTURE: Record<number, number> = {
  1: 5,  // Chapter 1 has 5 mishnayot
  2: 8,  // Chapter 2 has 8 mishnayot
  3: 6,  // Chapter 3 has 6 mishnayot
  4: 7,  // Chapter 4 has 7 mishnayot
  5: 5,  // Chapter 5 has 5 mishnayot
  6: 8,  // Chapter 6 has 8 mishnayot
  7: 5,  // Chapter 7 has 5 mishnayot
  8: 8,  // Chapter 8 has 8 mishnayot
  9: 5,  // Chapter 9 has 5 mishnayot
};

const TOTAL_CHAPTERS = 9;
const TOTAL_MISHNAYOT = Object.values(BERAKHOT_STRUCTURE).reduce((sum, count) => sum + count, 0);

/**
 * Gets the content reference for a given index in the Mishnah track
 * Format depends on schedule type:
 * - DAILY_WEEKDAYS_ONLY: Mishnah_{Tractate}.{Chapter}.{Mishnah}
 * - DAILY_CHAPTER_PER_DAY: Mishnah_{Tractate}.{Chapter} (entire chapter)
 * 
 * Uses actual Berakhot structure to ensure valid references
 */
export function getContentRefForIndex(index: number, scheduleType?: string): string {
  const tractate = 'Berakhot';
  
  // For chapter-per-day: each index represents one chapter
  if (scheduleType === 'DAILY_CHAPTER_PER_DAY') {
    const chapter = Math.min(index + 1, TOTAL_CHAPTERS); // Cap at last chapter
    return `Mishnah_${tractate}.${chapter}`;
  }
  
  // For mishnah-by-mishnah: calculate chapter and mishnah based on actual structure
  // Index 0 = Berakhot.1.1, Index 1 = Berakhot.1.2, ..., Index 4 = Berakhot.1.5
  // Index 5 = Berakhot.2.1, Index 6 = Berakhot.2.2, etc.
  
  let remainingIndex = index;
  let chapter = 1;
  
  // Find which chapter this index belongs to
  while (chapter <= TOTAL_CHAPTERS && remainingIndex >= BERAKHOT_STRUCTURE[chapter]) {
    remainingIndex -= BERAKHOT_STRUCTURE[chapter];
    chapter++;
  }
  
  // If we've exceeded all chapters, wrap around or return last valid mishnah
  if (chapter > TOTAL_CHAPTERS) {
    // Return last valid mishnah (Berakhot.9.5)
    return `Mishnah_${tractate}.${TOTAL_CHAPTERS}.${BERAKHOT_STRUCTURE[TOTAL_CHAPTERS]}`;
  }
  
  const mishnah = remainingIndex + 1; // mishnah is 1-indexed
  
  // Validate mishnah number doesn't exceed chapter's mishnayot
  if (mishnah > BERAKHOT_STRUCTURE[chapter]) {
    // This shouldn't happen with correct logic, but handle gracefully
    // Move to first mishnah of next chapter
    if (chapter < TOTAL_CHAPTERS) {
      return `Mishnah_${tractate}.${chapter + 1}.1`;
    } else {
      // Last chapter, return last mishnah
      return `Mishnah_${tractate}.${chapter}.${BERAKHOT_STRUCTURE[chapter]}`;
    }
  }
  
  return `Mishnah_${tractate}.${chapter}.${mishnah}`;
}

/**
 * Gets the content reference ID format for content_cache lookup
 * This matches the ref_id format used in content_cache table
 */
export function getContentRefId(ref: string): string {
  // The ref_id in content_cache should match this format
  return ref;
}
