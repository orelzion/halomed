// lib/utils/studyNotes.ts
// Turns the AI explanation JSON into the notes shown under a mishna.

export interface StudyNote {
  /** Bold opening of the note (a topic or the name of an opinion). */
  lead: string;
  text: string;
  /** Where the note comes from, shown in small type after the text. */
  source?: string;
}

export interface StudyNotes {
  /** The modern-Hebrew rewrite of the mishna, as Markdown paragraphs. */
  explanation: string | null;
  /** Opinions and expansions, in that order, as notes of their own. */
  notes: StudyNote[];
  halakha: string | null;
}

/** The shape of ai_explanation_json. Every field may be missing in older content. */
interface ExplanationData {
  mishna_modern?: unknown;
  halakha?: unknown;
  opinions?: Array<{ source?: unknown; details?: unknown } | null>;
  expansions?: Array<{ topic?: unknown; explanation?: unknown; source?: unknown } | null>;
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Builds the notes for one mishna. The explanation comes first, then each
 * opinion and each expansion as a note that opens with its own lead, and the
 * halakha is returned separately so the page can close the mishna with it.
 */
export function buildStudyNotes(input: unknown): StudyNotes {
  if (!input || typeof input !== 'object') {
    return { explanation: null, notes: [], halakha: null };
  }
  const explanation = input as ExplanationData;

  const notes: StudyNote[] = [];

  if (Array.isArray(explanation.opinions)) {
    for (const opinion of explanation.opinions) {
      const lead = clean(opinion?.source);
      const text = clean(opinion?.details);
      if (text) notes.push({ lead, text });
    }
  }

  if (Array.isArray(explanation.expansions)) {
    for (const expansion of explanation.expansions) {
      const lead = clean(expansion?.topic);
      const text = clean(expansion?.explanation);
      const source = clean(expansion?.source);
      if (text) notes.push({ lead, text, ...(source ? { source } : {}) });
    }
  }

  return {
    explanation: clean(explanation.mishna_modern) || null,
    notes,
    halakha: clean(explanation.halakha) || null,
  };
}
