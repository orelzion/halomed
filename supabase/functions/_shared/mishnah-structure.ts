// supabase/functions/_shared/mishnah-structure.ts
// Complete Mishnah structure: all 63 tractates with chapters and mishnayot
// Source: Sefaria.org, traditional Mishnah ordering
// Reference: Task 11.1

export interface TractateInfo {
  english: string;
  hebrew: string;
  chapters: number;
  totalMishnayot: number;
  mishnayotPerChapter?: Record<number, number>; // Optional: exact mishnayot per chapter
}

export interface SederInfo {
  english: string;
  hebrew: string;
  tractates: TractateInfo[];
}

/**
 * Complete Mishnah structure organized by Seder (Order)
 * Total: 63 tractates, 526 chapters, ~4,192 mishnayot
 */
export const MISHNAH_STRUCTURE: SederInfo[] = [
  {
    english: 'Zeraim',
    hebrew: 'זרעים',
    tractates: [
      { english: 'Berakhot', hebrew: 'ברכות', chapters: 9, totalMishnayot: 57, mishnayotPerChapter: { 1: 5, 2: 8, 3: 6, 4: 7, 5: 5, 6: 8, 7: 5, 8: 8, 9: 5 } },
      { english: 'Peah', hebrew: 'פאה', chapters: 8, totalMishnayot: 69 },
      { english: 'Demai', hebrew: 'דמאי', chapters: 7, totalMishnayot: 53 },
      { english: 'Kilayim', hebrew: 'כלאים', chapters: 9, totalMishnayot: 76 },
      { english: 'Sheviit', hebrew: 'שביעית', chapters: 10, totalMishnayot: 89 },
      { english: 'Terumot', hebrew: 'תרומות', chapters: 11, totalMishnayot: 109 },
      { english: 'Maasrot', hebrew: 'מעשרות', chapters: 5, totalMishnayot: 44 },
      { english: 'Maaser Sheni', hebrew: 'מעשר שני', chapters: 5, totalMishnayot: 51 },
      { english: 'Challah', hebrew: 'חלה', chapters: 4, totalMishnayot: 38 },
      { english: 'Orlah', hebrew: 'ערלה', chapters: 3, totalMishnayot: 42 },
      { english: 'Bikkurim', hebrew: 'ביכורים', chapters: 4, totalMishnayot: 26 },
    ],
  },
  {
    english: 'Moed',
    hebrew: 'מועד',
    tractates: [
      { english: 'Shabbat', hebrew: 'שבת', chapters: 24, totalMishnayot: 138 },
      { english: 'Eruvin', hebrew: 'עירובין', chapters: 10, totalMishnayot: 96 },
      { english: 'Pesachim', hebrew: 'פסחים', chapters: 10, totalMishnayot: 89 },
      { english: 'Shekalim', hebrew: 'שקלים', chapters: 8, totalMishnayot: 52 },
      { english: 'Yoma', hebrew: 'יומא', chapters: 8, totalMishnayot: 61 },
      { english: 'Sukkah', hebrew: 'סוכה', chapters: 5, totalMishnayot: 56 },
      { english: 'Beitzah', hebrew: 'ביצה', chapters: 5, totalMishnayot: 42 },
      { english: 'Rosh Hashanah', hebrew: 'ראש השנה', chapters: 4, totalMishnayot: 35 },
      { english: 'Taanit', hebrew: 'תענית', chapters: 4, totalMishnayot: 34 },
      { english: 'Megillah', hebrew: 'מגילה', chapters: 4, totalMishnayot: 35 },
      { english: 'Moed Katan', hebrew: 'מועד קטן', chapters: 3, totalMishnayot: 29 },
      { english: 'Chagigah', hebrew: 'חגיגה', chapters: 3, totalMishnayot: 27 },
    ],
  },
  {
    english: 'Nashim',
    hebrew: 'נשים',
    tractates: [
      { english: 'Yevamot', hebrew: 'יבמות', chapters: 16, totalMishnayot: 122 },
      { english: 'Ketubot', hebrew: 'כתובות', chapters: 13, totalMishnayot: 111 },
      { english: 'Nedarim', hebrew: 'נדרים', chapters: 11, totalMishnayot: 91 },
      { english: 'Nazir', hebrew: 'נזיר', chapters: 9, totalMishnayot: 66 },
      { english: 'Sotah', hebrew: 'סוטה', chapters: 9, totalMishnayot: 49 },
      { english: 'Gittin', hebrew: 'גיטין', chapters: 9, totalMishnayot: 90 },
      { english: 'Kiddushin', hebrew: 'קידושין', chapters: 4, totalMishnayot: 82 },
    ],
  },
  {
    english: 'Nezikin',
    hebrew: 'נזיקין',
    tractates: [
      { english: 'Bava Kamma', hebrew: 'בבא קמא', chapters: 10, totalMishnayot: 119 },
      { english: 'Bava Metzia', hebrew: 'בבא מציעא', chapters: 10, totalMishnayot: 118 },
      { english: 'Bava Batra', hebrew: 'בבא בתרא', chapters: 10, totalMishnayot: 176 },
      { english: 'Sanhedrin', hebrew: 'סנהדרין', chapters: 11, totalMishnayot: 71 },
      { english: 'Makkot', hebrew: 'מכות', chapters: 3, totalMishnayot: 24 },
      { english: 'Shevuot', hebrew: 'שבועות', chapters: 8, totalMishnayot: 49 },
      { english: 'Eduyot', hebrew: 'עדויות', chapters: 8, totalMishnayot: 96 },
      { english: 'Avodah Zarah', hebrew: 'עבודה זרה', chapters: 5, totalMishnayot: 76 },
      { english: 'Avot', hebrew: 'אבות', chapters: 6, totalMishnayot: 108 },
      { english: 'Horayot', hebrew: 'הוריות', chapters: 3, totalMishnayot: 14 },
    ],
  },
  {
    english: 'Kodashim',
    hebrew: 'קדשים',
    tractates: [
      { english: 'Zevachim', hebrew: 'זבחים', chapters: 14, totalMishnayot: 120 },
      { english: 'Menachot', hebrew: 'מנחות', chapters: 13, totalMishnayot: 110 },
      { english: 'Chullin', hebrew: 'חולין', chapters: 12, totalMishnayot: 142 },
      { english: 'Bekhorot', hebrew: 'בכורות', chapters: 9, totalMishnayot: 61 },
      { english: 'Arakhin', hebrew: 'ערכין', chapters: 9, totalMishnayot: 34 },
      { english: 'Temurah', hebrew: 'תמורה', chapters: 7, totalMishnayot: 34 },
      { english: 'Keritot', hebrew: 'כריתות', chapters: 6, totalMishnayot: 28 },
      { english: 'Meilah', hebrew: 'מעילה', chapters: 6, totalMishnayot: 22 },
      { english: 'Tamid', hebrew: 'תמיד', chapters: 7, totalMishnayot: 31 },
      { english: 'Middot', hebrew: 'מידות', chapters: 5, totalMishnayot: 30 },
      { english: 'Kinnim', hebrew: 'קינים', chapters: 3, totalMishnayot: 12 },
    ],
  },
  {
    english: 'Tohorot',
    hebrew: 'טהרות',
    tractates: [
      { english: 'Kelim', hebrew: 'כלים', chapters: 30, totalMishnayot: 300 },
      { english: 'Oholot', hebrew: 'אהלות', chapters: 18, totalMishnayot: 181 },
      { english: 'Negaim', hebrew: 'נגעים', chapters: 14, totalMishnayot: 126 },
      { english: 'Parah', hebrew: 'פרה', chapters: 12, totalMishnayot: 72 },
      { english: 'Tohorot', hebrew: 'טהרות', chapters: 10, totalMishnayot: 100 },
      { english: 'Mikvaot', hebrew: 'מקואות', chapters: 10, totalMishnayot: 60 },
      { english: 'Niddah', hebrew: 'נדה', chapters: 10, totalMishnayot: 79 },
      { english: 'Machshirin', hebrew: 'מכשירין', chapters: 6, totalMishnayot: 60 },
      { english: 'Zavim', hebrew: 'זבים', chapters: 5, totalMishnayot: 40 },
      { english: 'Tevul Yom', hebrew: 'טבול יום', chapters: 4, totalMishnayot: 20 },
      { english: 'Yadayim', hebrew: 'ידים', chapters: 4, totalMishnayot: 22 },
      { english: 'Uktzin', hebrew: 'עוקצין', chapters: 3, totalMishnayot: 12 },
    ],
  },
];

/**
 * Flattened list of all tractates in order
 */
export const ALL_TRACTATES: TractateInfo[] = MISHNAH_STRUCTURE.flatMap(seder => seder.tractates);

/**
 * Get total number of mishnayot in entire Mishnah
 */
export function getTotalMishnayot(): number {
  return ALL_TRACTATES.reduce((sum, tractate) => sum + tractate.totalMishnayot, 0);
}

/**
 * Get total number of chapters in entire Mishnah
 */
export function getTotalChapters(): number {
  return ALL_TRACTATES.reduce((sum, tractate) => sum + tractate.chapters, 0);
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
 * Get tractate and chapter for a given global mishnah index
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

  // Find which tractate this index belongs to
  while (tractateIndex < ALL_TRACTATES.length) {
    const tractate = ALL_TRACTATES[tractateIndex];
    
    if (remainingIndex < tractate.totalMishnayot) {
      // This mishnah is in this tractate
      // Now find which chapter
      let chapter = 1;
      let chapterRemaining = remainingIndex;
      
      // If we have exact per-chapter data, use it
      if (tractate.mishnayotPerChapter) {
        while (chapter <= tractate.chapters && chapterRemaining >= (tractate.mishnayotPerChapter[chapter] || 0)) {
          chapterRemaining -= tractate.mishnayotPerChapter[chapter] || 0;
          chapter++;
        }
        const mishnah = chapterRemaining + 1;
        return {
          tractateIndex,
          tractate,
          chapter,
          mishnah,
          globalIndex: globalMishnahIndex,
        };
      } else {
        // Estimate: divide mishnayot evenly across chapters
        const mishnayotPerChapter = Math.ceil(tractate.totalMishnayot / tractate.chapters);
        chapter = Math.floor(remainingIndex / mishnayotPerChapter) + 1;
        const mishnah = (remainingIndex % mishnayotPerChapter) + 1;
        
        // Cap at last chapter
        if (chapter > tractate.chapters) {
          chapter = tractate.chapters;
          const lastChapterMishnayot = tractate.totalMishnayot - (tractate.chapters - 1) * mishnayotPerChapter;
          const finalMishnah = Math.min((remainingIndex % mishnayotPerChapter) + 1, lastChapterMishnayot);
          return {
            tractateIndex,
            tractate,
            chapter,
            mishnah: finalMishnah,
            globalIndex: globalMishnahIndex,
          };
        }
        
        return {
          tractateIndex,
          tractate,
          chapter,
          mishnah,
          globalIndex: globalMishnahIndex,
        };
      }
    }
    
    remainingIndex -= tractate.totalMishnayot;
    tractateIndex++;
  }

  // Index exceeds all mishnayot - return last mishnah
  const lastTractate = ALL_TRACTATES[ALL_TRACTATES.length - 1];
  const lastChapter = lastTractate.chapters;
  const lastMishnah = lastTractate.mishnayotPerChapter?.[lastChapter] || 
    Math.ceil(lastTractate.totalMishnayot / lastTractate.chapters);
  
  return {
    tractateIndex: ALL_TRACTATES.length - 1,
    tractate: lastTractate,
    chapter: lastChapter,
    mishnah: lastMishnah,
    globalIndex: getTotalMishnayot() - 1,
  };
}

/**
 * Check if a mishnah index is at the end of a chapter
 */
export function isChapterEnd(globalMishnahIndex: number): boolean {
  const info = getTractateAndChapterForMishnahIndex(globalMishnahIndex);
  if (!info) return false;
  
  const { tractate, chapter, mishnah } = info;
  
  if (tractate.mishnayotPerChapter && tractate.mishnayotPerChapter[chapter]) {
    return mishnah === tractate.mishnayotPerChapter[chapter];
  }
  
  // Estimate: check if this is the last mishnah in the chapter
  const mishnayotPerChapter = Math.ceil(tractate.totalMishnayot / tractate.chapters);
  const chapterStartIndex = (chapter - 1) * mishnayotPerChapter;
  const chapterEndIndex = chapter === tractate.chapters 
    ? tractate.totalMishnayot - 1
    : chapterStartIndex + mishnayotPerChapter - 1;
  
  // Calculate global index for this chapter's end
  let globalChapterEnd = 0;
  for (let i = 0; i < info.tractateIndex; i++) {
    globalChapterEnd += ALL_TRACTATES[i].totalMishnayot;
  }
  globalChapterEnd += chapterEndIndex;
  
  return globalMishnahIndex === globalChapterEnd;
}

/**
 * Check if a mishnah index is at the end of a tractate
 */
export function isTractateEnd(globalMishnahIndex: number): boolean {
  const info = getTractateAndChapterForMishnahIndex(globalMishnahIndex);
  if (!info) return false;
  
  const { tractateIndex, tractate, chapter, mishnah } = info;
  
  // Check if this is the last chapter and last mishnah
  if (chapter !== tractate.chapters) return false;
  
  if (tractate.mishnayotPerChapter && tractate.mishnayotPerChapter[chapter]) {
    return mishnah === tractate.mishnayotPerChapter[chapter];
  }
  
  // Calculate if this is the last mishnah in the tractate
  let tractateStartIndex = 0;
  for (let i = 0; i < tractateIndex; i++) {
    tractateStartIndex += ALL_TRACTATES[i].totalMishnayot;
  }
  const tractateEndIndex = tractateStartIndex + tractate.totalMishnayot - 1;
  
  return globalMishnahIndex === tractateEndIndex;
}

/**
 * Get content reference string for a global mishnah index
 * Format: "Mishnah_{Tractate}.{Chapter}.{Mishnah}"
 */
export function getContentRefForGlobalIndex(globalMishnahIndex: number): string {
  const info = getTractateAndChapterForMishnahIndex(globalMishnahIndex);
  if (!info) {
    // Return last valid reference
    const lastTractate = ALL_TRACTATES[ALL_TRACTATES.length - 1];
    return `Mishnah_${lastTractate.english}.${lastTractate.chapters}.${lastTractate.totalMishnayot}`;
  }
  
  return `Mishnah_${info.tractate.english}.${info.chapter}.${info.mishnah}`;
}
