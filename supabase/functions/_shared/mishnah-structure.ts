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
 * Uses mishnayotPerChapter (number[], index 0 = chapter 1) when available,
 * otherwise falls back to the same float-division algorithm as canonical
 * getContentRefForIndex to guarantee identical ref_id strings.
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
      // Use exact per-chapter data when available.
      // mishnayotPerChapter is a number[] where index 0 = chapter 1.
      if (tractate.mishnayotPerChapter.length === tractate.chapters) {
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
      } else {
        // Fallback: same float-division algorithm as canonical getContentRefForIndex.
        const avgPerChapter = tractate.totalMishnayot / tractate.chapters;
        const chapter = Math.min(
          Math.floor(remainingIndex / avgPerChapter) + 1,
          tractate.chapters
        );
        const mishnayotBeforeThisChapter = Math.floor((chapter - 1) * avgPerChapter);
        const mishnah = Math.max(
          Math.floor(remainingIndex - mishnayotBeforeThisChapter + 1),
          1
        );
        return { tractateIndex, tractate, chapter, mishnah, globalIndex: globalMishnahIndex };
      }
    }

    remainingIndex -= tractate.totalMishnayot;
    tractateIndex++;
  }

  // Index exceeds all mishnayot — return last mishnah
  const lastTractate = ALL_TRACTATES[ALL_TRACTATES.length - 1];
  const lastChapter = lastTractate.chapters;
  const lastMishnah =
    lastTractate.mishnayotPerChapter.length === lastTractate.chapters
      ? lastTractate.mishnayotPerChapter[lastChapter - 1]
      : Math.ceil(lastTractate.totalMishnayot / lastTractate.chapters);

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

  if (tractate.mishnayotPerChapter.length === tractate.chapters) {
    return mishnah === tractate.mishnayotPerChapter[chapter - 1];
  }

  // Fallback: determine chapter boundary via float-division (matches canonical algorithm)
  let tractateStart = 0;
  for (let i = 0; i < info.tractateIndex; i++) {
    tractateStart += ALL_TRACTATES[i].totalMishnayot;
  }
  const avg = tractate.totalMishnayot / tractate.chapters;
  const chapterEndLocal =
    chapter === tractate.chapters
      ? tractate.totalMishnayot - 1
      : Math.floor(chapter * avg) - 1;

  return globalMishnahIndex === tractateStart + chapterEndLocal;
}

/**
 * Check if a mishnah index is at the end of a tractate
 */
export function isTractateEnd(globalMishnahIndex: number): boolean {
  const info = getTractateAndChapterForMishnahIndex(globalMishnahIndex);
  if (!info) return false;

  const { tractateIndex, tractate, chapter, mishnah } = info;

  if (chapter !== tractate.chapters) return false;

  if (tractate.mishnayotPerChapter.length === tractate.chapters) {
    return mishnah === tractate.mishnayotPerChapter[chapter - 1];
  }

  let tractateStartIndex = 0;
  for (let i = 0; i < tractateIndex; i++) {
    tractateStartIndex += ALL_TRACTATES[i].totalMishnayot;
  }
  return globalMishnahIndex === tractateStartIndex + tractate.totalMishnayot - 1;
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
