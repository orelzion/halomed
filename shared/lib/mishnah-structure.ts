/**
 * Mishnah Structure - Single canonical source of truth
 * Used by both the web app (shared/lib/path-generator.ts) and
 * Supabase edge functions (supabase/functions/_shared/mishnah-structure.ts).
 *
 * Rules:
 *  - Multi-word tractate names use underscores (e.g. Maaser_Sheni, Bava_Kamma)
 *  - mishnayotPerChapter is a required 0-indexed array of exact chapter lengths
 *  - No fallback math is allowed
 */

export interface TractateInfo {
  english: string;
  hebrew: string;
  chapters: number;
  totalMishnayot: number;
  mishnayotPerChapter: number[]; // exact chapter lengths, index 0 = chapter 1
}

export interface SederInfo {
  english: string;
  hebrew: string;
  tractates: TractateInfo[];
}

export const MISHNAH_STRUCTURE: SederInfo[] = [
  {
    english: 'Zeraim',
    hebrew: 'זרעים',
    tractates: [
      { english: 'Berakhot',     hebrew: 'ברכות',    chapters: 9, totalMishnayot: 57,  mishnayotPerChapter: [5, 8, 6, 7, 5, 8, 5, 8, 5] },
      { english: 'Peah',     hebrew: 'פאה',    chapters: 8, totalMishnayot: 69,  mishnayotPerChapter: [6, 8, 8, 11, 8, 11, 8, 9] },
      { english: 'Demai',     hebrew: 'דמאי',    chapters: 7, totalMishnayot: 53,  mishnayotPerChapter: [4, 5, 6, 7, 11, 12, 8] },
      { english: 'Kilayim',     hebrew: 'כלאים',    chapters: 9, totalMishnayot: 77,  mishnayotPerChapter: [9, 11, 7, 9, 8, 9, 8, 6, 10] },
      { english: 'Sheviit',     hebrew: 'שביעית',    chapters: 10, totalMishnayot: 89,  mishnayotPerChapter: [8, 10, 10, 10, 9, 6, 7, 11, 9, 9] },
      { english: 'Terumot',     hebrew: 'תרומות',    chapters: 11, totalMishnayot: 101,  mishnayotPerChapter: [10, 6, 9, 13, 9, 6, 7, 12, 7, 12, 10] },
      { english: 'Maasrot',     hebrew: 'מעשרות',    chapters: 5, totalMishnayot: 40,  mishnayotPerChapter: [8, 8, 10, 6, 8] },
      { english: 'Maaser_Sheni',     hebrew: 'מעשר שני',    chapters: 5, totalMishnayot: 57,  mishnayotPerChapter: [7, 10, 13, 12, 15] },
      { english: 'Challah',     hebrew: 'חלה',    chapters: 4, totalMishnayot: 38,  mishnayotPerChapter: [9, 8, 10, 11] },
      { english: 'Orlah',     hebrew: 'ערלה',    chapters: 3, totalMishnayot: 35,  mishnayotPerChapter: [9, 17, 9] },
      { english: 'Bikkurim',     hebrew: 'ביכורים',    chapters: 4, totalMishnayot: 39,  mishnayotPerChapter: [11, 11, 12, 5] },
    ],
  },
  {
    english: 'Moed',
    hebrew: 'מועד',
    tractates: [
      { english: 'Shabbat',     hebrew: 'שבת',    chapters: 24, totalMishnayot: 139,  mishnayotPerChapter: [11, 7, 6, 2, 4, 10, 4, 7, 7, 6, 6, 6, 7, 4, 3, 8, 8, 3, 6, 5, 3, 6, 5, 5] },
      { english: 'Eruvin',     hebrew: 'עירובין',    chapters: 10, totalMishnayot: 96,  mishnayotPerChapter: [10, 6, 9, 11, 9, 10, 11, 11, 4, 15] },
      { english: 'Pesachim',     hebrew: 'פסחים',    chapters: 10, totalMishnayot: 89,  mishnayotPerChapter: [7, 8, 8, 9, 10, 6, 13, 8, 11, 9] },
      { english: 'Shekalim',     hebrew: 'שקלים',    chapters: 8, totalMishnayot: 52,  mishnayotPerChapter: [7, 5, 4, 9, 6, 6, 7, 8] },
      { english: 'Yoma',     hebrew: 'יומא',    chapters: 8, totalMishnayot: 61,  mishnayotPerChapter: [8, 7, 11, 6, 7, 8, 5, 9] },
      { english: 'Sukkah',     hebrew: 'סוכה',    chapters: 5, totalMishnayot: 53,  mishnayotPerChapter: [11, 9, 15, 10, 8] },
      { english: 'Beitzah',     hebrew: 'ביצה',    chapters: 5, totalMishnayot: 42,  mishnayotPerChapter: [10, 10, 8, 7, 7] },
      { english: 'Rosh_Hashanah',     hebrew: 'ראש השנה',    chapters: 4, totalMishnayot: 35,  mishnayotPerChapter: [9, 9, 8, 9] },
      { english: 'Taanit',     hebrew: 'תענית',    chapters: 4, totalMishnayot: 34,  mishnayotPerChapter: [7, 10, 9, 8] },
      { english: 'Megillah',     hebrew: 'מגילה',    chapters: 4, totalMishnayot: 33,  mishnayotPerChapter: [11, 6, 6, 10] },
      { english: 'Moed_Katan',     hebrew: 'מועד קטן',    chapters: 3, totalMishnayot: 24,  mishnayotPerChapter: [10, 5, 9] },
      { english: 'Chagigah',     hebrew: 'חגיגה',    chapters: 3, totalMishnayot: 23,  mishnayotPerChapter: [8, 7, 8] },
    ],
  },
  {
    english: 'Nashim',
    hebrew: 'נשים',
    tractates: [
      { english: 'Yevamot',     hebrew: 'יבמות',    chapters: 16, totalMishnayot: 128,  mishnayotPerChapter: [4, 10, 10, 13, 6, 6, 6, 6, 6, 9, 7, 6, 13, 9, 10, 7] },
      { english: 'Ketubot',     hebrew: 'כתובות',    chapters: 13, totalMishnayot: 111,  mishnayotPerChapter: [10, 10, 9, 12, 9, 7, 10, 8, 9, 6, 6, 4, 11] },
      { english: 'Nedarim',     hebrew: 'נדרים',    chapters: 11, totalMishnayot: 90,  mishnayotPerChapter: [4, 5, 11, 8, 6, 10, 9, 7, 10, 8, 12] },
      { english: 'Nazir',     hebrew: 'נזיר',    chapters: 9, totalMishnayot: 60,  mishnayotPerChapter: [7, 10, 7, 7, 7, 11, 4, 2, 5] },
      { english: 'Sotah',     hebrew: 'סוטה',    chapters: 9, totalMishnayot: 67,  mishnayotPerChapter: [9, 6, 8, 5, 5, 4, 8, 7, 15] },
      { english: 'Gittin',     hebrew: 'גיטין',    chapters: 9, totalMishnayot: 75,  mishnayotPerChapter: [6, 7, 8, 9, 9, 7, 9, 10, 10] },
      { english: 'Kiddushin',     hebrew: 'קידושין',    chapters: 4, totalMishnayot: 47,  mishnayotPerChapter: [10, 10, 13, 14] },
    ],
  },
  {
    english: 'Nezikin',
    hebrew: 'נזיקין',
    tractates: [
      { english: 'Bava_Kamma',     hebrew: 'בבא קמא',    chapters: 10, totalMishnayot: 79,  mishnayotPerChapter: [4, 6, 11, 9, 7, 6, 7, 7, 12, 10] },
      { english: 'Bava_Metzia',     hebrew: 'בבא מציעא',    chapters: 10, totalMishnayot: 101,  mishnayotPerChapter: [8, 11, 12, 12, 11, 8, 11, 9, 13, 6] },
      { english: 'Bava_Batra',     hebrew: 'בבא בתרא',    chapters: 10, totalMishnayot: 86,  mishnayotPerChapter: [6, 14, 8, 9, 11, 8, 4, 8, 10, 8] },
      { english: 'Sanhedrin',     hebrew: 'סנהדרין',    chapters: 11, totalMishnayot: 71,  mishnayotPerChapter: [6, 5, 8, 5, 5, 6, 11, 7, 6, 6, 6] },
      { english: 'Makkot',     hebrew: 'מכות',    chapters: 3, totalMishnayot: 34,  mishnayotPerChapter: [10, 8, 16] },
      { english: 'Shevuot',     hebrew: 'שבועות',    chapters: 8, totalMishnayot: 62,  mishnayotPerChapter: [7, 5, 11, 13, 5, 7, 8, 6] },
      { english: 'Eduyot',     hebrew: 'עדויות',    chapters: 8, totalMishnayot: 74,  mishnayotPerChapter: [14, 10, 12, 12, 7, 3, 9, 7] },
      { english: 'Avodah_Zarah',     hebrew: 'עבודה זרה',    chapters: 5, totalMishnayot: 50,  mishnayotPerChapter: [9, 7, 10, 12, 12] },
      { english: 'Avot',     hebrew: 'אבות',    chapters: 6, totalMishnayot: 108,  mishnayotPerChapter: [18, 16, 18, 22, 23, 11] },
      { english: 'Horayot',     hebrew: 'הוריות',    chapters: 3, totalMishnayot: 20,  mishnayotPerChapter: [5, 7, 8] },
    ],
  },
  {
    english: 'Kodashim',
    hebrew: 'קדשים',
    tractates: [
      { english: 'Zevachim',     hebrew: 'זבחים',    chapters: 14, totalMishnayot: 101,  mishnayotPerChapter: [4, 5, 6, 6, 8, 7, 6, 12, 7, 8, 8, 6, 8, 10] },
      { english: 'Menachot',     hebrew: 'מנחות',    chapters: 13, totalMishnayot: 93,  mishnayotPerChapter: [4, 5, 7, 5, 9, 7, 6, 7, 9, 9, 9, 5, 11] },
      { english: 'Chullin',     hebrew: 'חולין',    chapters: 12, totalMishnayot: 74,  mishnayotPerChapter: [7, 10, 7, 7, 5, 7, 6, 6, 8, 4, 2, 5] },
      { english: 'Bekhorot',     hebrew: 'בכורות',    chapters: 9, totalMishnayot: 73,  mishnayotPerChapter: [7, 9, 4, 10, 6, 12, 7, 10, 8] },
      { english: 'Arakhin',     hebrew: 'ערכין',    chapters: 9, totalMishnayot: 50,  mishnayotPerChapter: [4, 6, 5, 4, 6, 5, 5, 7, 8] },
      { english: 'Temurah',     hebrew: 'תמורה',    chapters: 7, totalMishnayot: 35,  mishnayotPerChapter: [6, 3, 5, 4, 6, 5, 6] },
      { english: 'Keritot',     hebrew: 'כריתות',    chapters: 6, totalMishnayot: 43,  mishnayotPerChapter: [7, 6, 10, 3, 8, 9] },
      { english: 'Meilah',     hebrew: 'מעילה',    chapters: 6, totalMishnayot: 38,  mishnayotPerChapter: [4, 9, 8, 6, 5, 6] },
      { english: 'Tamid',     hebrew: 'תמיד',    chapters: 7, totalMishnayot: 34,  mishnayotPerChapter: [4, 5, 9, 3, 6, 3, 4] },
      { english: 'Middot',     hebrew: 'מידות',    chapters: 5, totalMishnayot: 34,  mishnayotPerChapter: [9, 6, 8, 7, 4] },
      { english: 'Kinnim',     hebrew: 'קינים',    chapters: 3, totalMishnayot: 15,  mishnayotPerChapter: [4, 5, 6] },
    ],
  },
  {
    english: 'Tohorot',
    hebrew: 'טהרות',
    tractates: [
      { english: 'Kelim',     hebrew: 'כלים',    chapters: 30, totalMishnayot: 254,  mishnayotPerChapter: [9, 8, 8, 4, 11, 4, 6, 11, 8, 8, 9, 8, 8, 8, 6, 8, 17, 9, 10, 7, 3, 10, 5, 17, 9, 9, 12, 10, 8, 4] },
      { english: 'Oholot',     hebrew: 'אהלות',    chapters: 18, totalMishnayot: 134,  mishnayotPerChapter: [8, 7, 7, 3, 7, 7, 6, 6, 16, 7, 9, 8, 6, 7, 10, 5, 5, 10] },
      { english: 'Negaim',     hebrew: 'נגעים',    chapters: 14, totalMishnayot: 115,  mishnayotPerChapter: [6, 5, 8, 11, 5, 8, 5, 10, 3, 10, 12, 7, 12, 13] },
      { english: 'Parah',     hebrew: 'פרה',    chapters: 12, totalMishnayot: 96,  mishnayotPerChapter: [4, 5, 11, 4, 9, 5, 12, 11, 9, 6, 9, 11] },
      { english: 'Tahorot',     hebrew: 'טהרות',    chapters: 10, totalMishnayot: 92,  mishnayotPerChapter: [9, 8, 8, 13, 9, 10, 9, 9, 9, 8] },
      { english: 'Mikvaot',     hebrew: 'מקואות',    chapters: 10, totalMishnayot: 71,  mishnayotPerChapter: [8, 10, 4, 5, 6, 11, 7, 5, 7, 8] },
      { english: 'Niddah',     hebrew: 'נדה',    chapters: 10, totalMishnayot: 79,  mishnayotPerChapter: [7, 7, 7, 7, 9, 14, 5, 4, 11, 8] },
      { english: 'Makhshirin',     hebrew: 'מכשירין',    chapters: 6, totalMishnayot: 54,  mishnayotPerChapter: [6, 11, 8, 10, 11, 8] },
      { english: 'Zavim',     hebrew: 'זבים',    chapters: 5, totalMishnayot: 32,  mishnayotPerChapter: [6, 4, 3, 7, 12] },
      { english: 'Tevul_Yom',     hebrew: 'טבול יום',    chapters: 4, totalMishnayot: 26,  mishnayotPerChapter: [5, 8, 6, 7] },
      { english: 'Yadayim',     hebrew: 'ידים',    chapters: 4, totalMishnayot: 22,  mishnayotPerChapter: [5, 4, 5, 8] },
      { english: 'Oktzin',     hebrew: 'עוקצין',    chapters: 3, totalMishnayot: 28,  mishnayotPerChapter: [6, 10, 12] },
    ],
  },
];

export const ALL_TRACTATES: TractateInfo[] = MISHNAH_STRUCTURE.flatMap(s => s.tractates);
export const TOTAL_MISHNAYOT: number = ALL_TRACTATES.reduce((sum, t) => sum + t.totalMishnayot, 0);
export const TOTAL_CHAPTERS: number = ALL_TRACTATES.reduce((sum, t) => sum + t.chapters, 0);

/**
 * Convert a global mishnah index to a content ref string.
 * Format: "Mishnah_{Tractate}.{Chapter}.{Mishna}"
 */
export function getContentRefForIndex(index: number): string {
  index = Math.floor(index);
  if (index < 0 || index >= TOTAL_MISHNAYOT) {
    return `Mishnah_Unknown.${index}`;
  }

  let cumulative = 0;
  for (const tractate of ALL_TRACTATES) {
    if (index < cumulative + tractate.totalMishnayot) {
      const localIndex = index - cumulative;
      if (tractate.mishnayotPerChapter.length !== tractate.chapters) {
        throw new Error(
          `Invalid mishnayotPerChapter for ${tractate.english}: expected ${tractate.chapters}, got ${tractate.mishnayotPerChapter.length}`
        );
      }

      let cum2 = 0;
      let chapter = tractate.chapters;
      let mishna = 1;
      for (let c = 0; c < tractate.mishnayotPerChapter.length; c++) {
        if (localIndex < cum2 + tractate.mishnayotPerChapter[c]) {
          chapter = c + 1;
          mishna = localIndex - cum2 + 1;
          break;
        }
        cum2 += tractate.mishnayotPerChapter[c];
      }

      return `Mishnah_${tractate.english}.${chapter}.${mishna}`;
    }
    cumulative += tractate.totalMishnayot;
  }

  // Should never reach here
  const last = ALL_TRACTATES[ALL_TRACTATES.length - 1];
  return `Mishnah_${last.english}.${last.chapters}.1`;
}
