// supabase/functions/_shared/mishnah-structure.ts
// Thin wrapper around the canonical shared/lib/mishnah-structure.ts.
// All data and the core getContentRefForIndex function live there.
// This file re-exports everything consumers need and provides
// edge-function-specific helper functions.

export type { TractateInfo, SederInfo } from '../../../shared/lib/mishnah-structure.ts';
export {
  MISHNAH_STRUCTURE,
  ALL_TRACTATES,
  TOTAL_MISHNAYOT,
  TOTAL_CHAPTERS,
  getContentRefForIndex,
} from '../../../shared/lib/mishnah-structure.ts';

import {
  ALL_TRACTATES,
  TOTAL_MISHNAYOT,
  TOTAL_CHAPTERS,
} from '../../../shared/lib/mishnah-structure.ts';
import type { TractateInfo } from '../../../shared/lib/mishnah-structure.ts';

/**
 * Get total number of mishnayot in entire Mishnah
 */
export function getTotalMishnayot(): number {
  return TOTAL_MISHNAYOT;
}

/**
 * Get total number of chapters in entire Mishnah
 */
export function getTotalChapters(): number {
  return TOTAL_CHAPTERS;
}

/**
 * Get tractate info by English name
 */
export function getTractateByName(englishName: string): TractateInfo | undefined {
  return ALL_TRACTATES.find(t => t.english === englishName);
}

/**
 * Get tractate info by Hebrew name
 */
export function getTractateByHebrew(hebrewName: string): TractateInfo | undefined {
  return ALL_TRACTATES.find(t => t.hebrew === hebrewName);
}

/**
 * Get tractate at a given global index (0-based, across all tractates)
 */
export function getTractateAtIndex(tractateIndex: number): TractateInfo | undefined {
  if (tractateIndex < 0 || tractateIndex >= ALL_TRACTATES.length) {
    return undefined;
  }
  return ALL_TRACTATES[tractateIndex];
}

/**
 * Get tractate and chapter for a given global mishnah index.
 * Uses exact mishnayotPerChapter data (number[], index 0 = chapter 1).
 *
 * Returns: { tractateIndex, tractate, chapter, mishnah, globalIndex }
 */
export function getTractateAndChapterForMishnahIndex(globalMishnahIndex: number): {
  tractateIndex: number;
  tractate: TractateInfo;
  chapter: number;
  mishnah: number;
  globalIndex: number;
} | null {
  if (globalMishnahIndex < 0) {
    return null;
  }

  let remainingIndex = globalMishnahIndex;
  let tractateIndex = 0;

  while (tractateIndex < ALL_TRACTATES.length) {
    const tractate = ALL_TRACTATES[tractateIndex];

    if (remainingIndex < tractate.totalMishnayot) {
      if (tractate.mishnayotPerChapter.length !== tractate.chapters) {
        throw new Error(
          `Invalid mishnayotPerChapter for ${tractate.english}: expected ${tractate.chapters}, got ${tractate.mishnayotPerChapter.length}`
        );
      }

      let chapter = 1;
      let chapterRemaining = remainingIndex;
      while (
        chapter <= tractate.chapters &&
        chapterRemaining >= tractate.mishnayotPerChapter[chapter - 1]
      ) {
        chapterRemaining -= tractate.mishnayotPerChapter[chapter - 1];
        chapter++;
      }
      return {
        tractateIndex,
        tractate,
        chapter,
        mishnah: chapterRemaining + 1,
        globalIndex: globalMishnahIndex,
      };
    }

    remainingIndex -= tractate.totalMishnayot;
    tractateIndex++;
  }

  // Index exceeds all mishnayot — return last mishnah
  const lastTractate = ALL_TRACTATES[ALL_TRACTATES.length - 1];
  const lastChapter = lastTractate.chapters;
  if (lastTractate.mishnayotPerChapter.length !== lastTractate.chapters) {
    throw new Error(
      `Invalid mishnayotPerChapter for ${lastTractate.english}: expected ${lastTractate.chapters}, got ${lastTractate.mishnayotPerChapter.length}`
    );
  }
  const lastMishnah = lastTractate.mishnayotPerChapter[lastChapter - 1];

  return {
    tractateIndex: ALL_TRACTATES.length - 1,
    tractate: lastTractate,
    chapter: lastChapter,
    mishnah: lastMishnah,
    globalIndex: TOTAL_MISHNAYOT - 1,
  };
}

/**
 * Check if a mishnah index is at the end of a chapter
 */
export function isChapterEnd(globalMishnahIndex: number): boolean {
  const info = getTractateAndChapterForMishnahIndex(globalMishnahIndex);
  if (!info) return false;

  const { tractate, chapter, mishnah } = info;

  if (tractate.mishnayotPerChapter.length !== tractate.chapters) {
    throw new Error(
      `Invalid mishnayotPerChapter for ${tractate.english}: expected ${tractate.chapters}, got ${tractate.mishnayotPerChapter.length}`
    );
  }
  return mishnah === tractate.mishnayotPerChapter[chapter - 1];
}

/**
 * Check if a mishnah index is at the end of a tractate
 */
export function isTractateEnd(globalMishnahIndex: number): boolean {
  const info = getTractateAndChapterForMishnahIndex(globalMishnahIndex);
  if (!info) return false;

  const { tractate, chapter, mishnah } = info;

  if (chapter !== tractate.chapters) return false;

  if (tractate.mishnayotPerChapter.length !== tractate.chapters) {
    throw new Error(
      `Invalid mishnayotPerChapter for ${tractate.english}: expected ${tractate.chapters}, got ${tractate.mishnayotPerChapter.length}`
    );
  }
  return mishnah === tractate.mishnayotPerChapter[chapter - 1];
}

/**
 * Get content reference string for a global mishnah index
 * Format: "Mishnah_{Tractate}.{Chapter}.{Mishnah}"
 */
export function getContentRefForGlobalIndex(globalMishnahIndex: number): string {
  const info = getTractateAndChapterForMishnahIndex(globalMishnahIndex);
  if (!info) {
    const lastTractate = ALL_TRACTATES[ALL_TRACTATES.length - 1];
    return `Mishnah_${lastTractate.english}.${lastTractate.chapters}.${lastTractate.totalMishnayot}`;
  }
  return `Mishnah_${info.tractate.english}.${info.chapter}.${info.mishnah}`;
}
