/**
 * Mishnah Structure - Single canonical source of truth
 * Used by both the web app (shared/lib/path-generator.ts) and
 * Supabase edge functions (supabase/functions/_shared/mishnah-structure.ts).
 *
 * Rules:
 *  - Multi-word tractate names use underscores (e.g. Maaser_Sheni, Bava_Kamma)
 *  - mishnayotPerChapter is a 0-indexed array; [] means "use fallback"
 *  - Fallback: float avg (totalMishnayot / chapters), no Math.ceil
 */

export interface TractateInfo {
  english: string;
  hebrew: string;
  chapters: number;
  totalMishnayot: number;
  mishnayotPerChapter: number[]; // exact counts; [] = use fallback
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
      { english: 'Berakhot',    hebrew: 'ברכות',    chapters: 9,  totalMishnayot: 57,  mishnayotPerChapter: [5, 8, 6, 7, 5, 8, 5, 8, 5] },
      { english: 'Peah',        hebrew: 'פאה',       chapters: 8,  totalMishnayot: 69,  mishnayotPerChapter: [6, 8, 8, 11, 8, 11, 8, 9] },
      { english: 'Demai',       hebrew: 'דמאי',      chapters: 7,  totalMishnayot: 53,  mishnayotPerChapter: [4, 5, 6, 7, 11, 12, 8] },
      { english: 'Kilayim',     hebrew: 'כלאים',     chapters: 9,  totalMishnayot: 76,  mishnayotPerChapter: [9, 11, 7, 9, 8, 9, 8, 6, 9] },
      { english: 'Sheviit',     hebrew: 'שביעית',    chapters: 10, totalMishnayot: 89,  mishnayotPerChapter: [8, 10, 10, 10, 9, 6, 7, 11, 9, 9] },
      { english: 'Terumot',     hebrew: 'תרומות',    chapters: 11, totalMishnayot: 109, mishnayotPerChapter: [] },
      { english: 'Maasrot',     hebrew: 'מעשרות',    chapters: 5,  totalMishnayot: 44,  mishnayotPerChapter: [] },
      { english: 'Maaser_Sheni',hebrew: 'מעשר שני',  chapters: 5,  totalMishnayot: 51,  mishnayotPerChapter: [] },
      { english: 'Challah',     hebrew: 'חלה',       chapters: 4,  totalMishnayot: 38,  mishnayotPerChapter: [9, 8, 10, 11] },
      { english: 'Orlah',       hebrew: 'ערלה',      chapters: 3,  totalMishnayot: 42,  mishnayotPerChapter: [] },
      { english: 'Bikkurim',    hebrew: 'ביכורים',   chapters: 4,  totalMishnayot: 26,  mishnayotPerChapter: [] },
    ],
  },
  {
    english: 'Moed',
    hebrew: 'מועד',
    tractates: [
      { english: 'Shabbat',      hebrew: 'שבת',       chapters: 24, totalMishnayot: 138, mishnayotPerChapter: [] },
      { english: 'Eruvin',       hebrew: 'עירובין',   chapters: 10, totalMishnayot: 96,  mishnayotPerChapter: [] },
      { english: 'Pesachim',     hebrew: 'פסחים',     chapters: 10, totalMishnayot: 89,  mishnayotPerChapter: [] },
      { english: 'Shekalim',     hebrew: 'שקלים',     chapters: 8,  totalMishnayot: 52,  mishnayotPerChapter: [] },
      { english: 'Yoma',         hebrew: 'יומא',      chapters: 8,  totalMishnayot: 61,  mishnayotPerChapter: [] },
      { english: 'Sukkah',       hebrew: 'סוכה',      chapters: 5,  totalMishnayot: 56,  mishnayotPerChapter: [] },
      { english: 'Beitzah',      hebrew: 'ביצה',      chapters: 5,  totalMishnayot: 42,  mishnayotPerChapter: [] },
      { english: 'Rosh_Hashanah',hebrew: 'ראש השנה',  chapters: 4,  totalMishnayot: 35,  mishnayotPerChapter: [] },
      { english: 'Taanit',       hebrew: 'תענית',     chapters: 4,  totalMishnayot: 34,  mishnayotPerChapter: [] },
      { english: 'Megillah',     hebrew: 'מגילה',     chapters: 4,  totalMishnayot: 35,  mishnayotPerChapter: [] },
      { english: 'Moed_Katan',   hebrew: 'מועד קטן',  chapters: 3,  totalMishnayot: 29,  mishnayotPerChapter: [] },
      { english: 'Chagigah',     hebrew: 'חגיגה',     chapters: 3,  totalMishnayot: 27,  mishnayotPerChapter: [] },
    ],
  },
  {
    english: 'Nashim',
    hebrew: 'נשים',
    tractates: [
      { english: 'Yevamot',   hebrew: 'יבמות',   chapters: 16, totalMishnayot: 122, mishnayotPerChapter: [] },
      { english: 'Ketubot',   hebrew: 'כתובות',  chapters: 13, totalMishnayot: 111, mishnayotPerChapter: [] },
      { english: 'Nedarim',   hebrew: 'נדרים',   chapters: 11, totalMishnayot: 91,  mishnayotPerChapter: [] },
      { english: 'Nazir',     hebrew: 'נזיר',    chapters: 9,  totalMishnayot: 66,  mishnayotPerChapter: [] },
      { english: 'Sotah',     hebrew: 'סוטה',    chapters: 9,  totalMishnayot: 49,  mishnayotPerChapter: [] },
      { english: 'Gittin',    hebrew: 'גיטין',   chapters: 9,  totalMishnayot: 90,  mishnayotPerChapter: [] },
      { english: 'Kiddushin', hebrew: 'קידושין', chapters: 4,  totalMishnayot: 82,  mishnayotPerChapter: [] },
    ],
  },
  {
    english: 'Nezikin',
    hebrew: 'נזיקין',
    tractates: [
      { english: 'Bava_Kamma',   hebrew: 'בבא קמא',   chapters: 10, totalMishnayot: 119, mishnayotPerChapter: [] },
      { english: 'Bava_Metzia',  hebrew: 'בבא מציעא', chapters: 10, totalMishnayot: 118, mishnayotPerChapter: [] },
      { english: 'Bava_Batra',   hebrew: 'בבא בתרא',  chapters: 10, totalMishnayot: 176, mishnayotPerChapter: [] },
      { english: 'Sanhedrin',    hebrew: 'סנהדרין',   chapters: 11, totalMishnayot: 71,  mishnayotPerChapter: [] },
      { english: 'Makkot',       hebrew: 'מכות',      chapters: 3,  totalMishnayot: 24,  mishnayotPerChapter: [] },
      { english: 'Shevuot',      hebrew: 'שבועות',    chapters: 8,  totalMishnayot: 49,  mishnayotPerChapter: [] },
      { english: 'Eduyot',       hebrew: 'עדויות',    chapters: 8,  totalMishnayot: 96,  mishnayotPerChapter: [] },
      { english: 'Avodah_Zarah', hebrew: 'עבודה זרה', chapters: 5,  totalMishnayot: 76,  mishnayotPerChapter: [] },
      { english: 'Avot',         hebrew: 'אבות',      chapters: 6,  totalMishnayot: 108, mishnayotPerChapter: [] },
      { english: 'Horayot',      hebrew: 'הוריות',    chapters: 3,  totalMishnayot: 14,  mishnayotPerChapter: [] },
    ],
  },
  {
    english: 'Kodashim',
    hebrew: 'קדשים',
    tractates: [
      { english: 'Zevachim',  hebrew: 'זבחים',  chapters: 14, totalMishnayot: 120, mishnayotPerChapter: [] },
      { english: 'Menachot',  hebrew: 'מנחות',  chapters: 13, totalMishnayot: 110, mishnayotPerChapter: [] },
      { english: 'Chullin',   hebrew: 'חולין',  chapters: 12, totalMishnayot: 142, mishnayotPerChapter: [] },
      { english: 'Bekhorot',  hebrew: 'בכורות', chapters: 9,  totalMishnayot: 61,  mishnayotPerChapter: [] },
      { english: 'Arakhin',   hebrew: 'ערכין',  chapters: 9,  totalMishnayot: 34,  mishnayotPerChapter: [] },
      { english: 'Temurah',   hebrew: 'תמורה',  chapters: 7,  totalMishnayot: 34,  mishnayotPerChapter: [] },
      { english: 'Keritot',   hebrew: 'כריתות', chapters: 6,  totalMishnayot: 28,  mishnayotPerChapter: [] },
      { english: 'Meilah',    hebrew: 'מעילה',  chapters: 6,  totalMishnayot: 22,  mishnayotPerChapter: [] },
      { english: 'Tamid',     hebrew: 'תמיד',   chapters: 7,  totalMishnayot: 31,  mishnayotPerChapter: [] },
      { english: 'Middot',    hebrew: 'מידות',  chapters: 5,  totalMishnayot: 30,  mishnayotPerChapter: [] },
      { english: 'Kinnim',    hebrew: 'קינים',  chapters: 3,  totalMishnayot: 12,  mishnayotPerChapter: [] },
    ],
  },
  {
    english: 'Tohorot',
    hebrew: 'טהרות',
    tractates: [
      { english: 'Kelim',      hebrew: 'כלים',    chapters: 30, totalMishnayot: 300, mishnayotPerChapter: [] },
      { english: 'Oholot',     hebrew: 'אהלות',   chapters: 18, totalMishnayot: 181, mishnayotPerChapter: [] },
      { english: 'Negaim',     hebrew: 'נגעים',   chapters: 14, totalMishnayot: 126, mishnayotPerChapter: [] },
      { english: 'Parah',      hebrew: 'פרה',     chapters: 12, totalMishnayot: 72,  mishnayotPerChapter: [] },
      { english: 'Tohorot',    hebrew: 'טהרות',   chapters: 10, totalMishnayot: 100, mishnayotPerChapter: [] },
      { english: 'Mikvaot',    hebrew: 'מקואות',  chapters: 10, totalMishnayot: 60,  mishnayotPerChapter: [] },
      { english: 'Niddah',     hebrew: 'נדה',     chapters: 10, totalMishnayot: 79,  mishnayotPerChapter: [] },
      { english: 'Machshirin', hebrew: 'מכשירין', chapters: 6,  totalMishnayot: 60,  mishnayotPerChapter: [] },
      { english: 'Zavim',      hebrew: 'זבים',    chapters: 5,  totalMishnayot: 40,  mishnayotPerChapter: [] },
      { english: 'Tevul_Yom',  hebrew: 'טבול יום', chapters: 4, totalMishnayot: 20,  mishnayotPerChapter: [] },
      { english: 'Yadayim',    hebrew: 'ידים',    chapters: 4,  totalMishnayot: 22,  mishnayotPerChapter: [] },
      { english: 'Uktzin',     hebrew: 'עוקצין',  chapters: 3,  totalMishnayot: 12,  mishnayotPerChapter: [] },
    ],
  },
];

export const ALL_TRACTATES: TractateInfo[] = MISHNAH_STRUCTURE.flatMap(s => s.tractates);
export const TOTAL_MISHNAYOT: number = ALL_TRACTATES.reduce((sum, t) => sum + t.totalMishnayot, 0);
export const TOTAL_CHAPTERS: number = ALL_TRACTATES.reduce((sum, t) => sum + t.chapters, 0);

/**
 * Convert a global mishnah index to a content ref string.
 * Format: "Mishnah_{Tractate}.{Chapter}.{Mishna}"
 *
 * Uses exact mishnayotPerChapter data when available, otherwise falls back to
 * float-average distribution (NOT Math.ceil — that produces different chapter
 * boundaries and creates ref_id mismatches in content_cache).
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
      let chapter: number;
      let mishna: number;

      if (tractate.mishnayotPerChapter.length === tractate.chapters) {
        // Exact chapter data available
        let cum2 = 0;
        chapter = tractate.chapters; // fallback to last chapter
        mishna = 1;
        for (let c = 0; c < tractate.mishnayotPerChapter.length; c++) {
          if (localIndex < cum2 + tractate.mishnayotPerChapter[c]) {
            chapter = c + 1;
            mishna = localIndex - cum2 + 1;
            break;
          }
          cum2 += tractate.mishnayotPerChapter[c];
        }
      } else {
        // Fallback: float-average distribution
        const avg = tractate.totalMishnayot / tractate.chapters;
        chapter = Math.min(Math.floor(localIndex / avg) + 1, tractate.chapters);
        const before = Math.floor((chapter - 1) * avg);
        mishna = Math.max(Math.floor(localIndex - before + 1), 1);
      }

      return `Mishnah_${tractate.english}.${chapter}.${mishna}`;
    }
    cumulative += tractate.totalMishnayot;
  }

  // Should never reach here
  const last = ALL_TRACTATES[ALL_TRACTATES.length - 1];
  return `Mishnah_${last.english}.${last.chapters}.1`;
}
