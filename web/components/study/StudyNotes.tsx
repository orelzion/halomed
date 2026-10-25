'use client';

import ReactMarkdown from 'react-markdown';
import { useTranslation } from '@/lib/i18n';
import { buildStudyNotes } from '@/lib/utils/studyNotes';

interface StudyNotesProps {
  explanation: unknown;
  contentRef: string;
  /** Set on the mishna being studied, so tests can find it by id. */
  primary?: boolean;
}

const NOTE_TEXT = 'font-notes text-[1.125rem] leading-[1.8] text-justify text-pretty text-[var(--text-secondary)]';

/** Adds the closing period to a lead that has no punctuation of its own. */
function withPeriod(lead: string): string {
  return /[.:!?]$/.test(lead) ? lead : `${lead}.`;
}

/**
 * Everything written about a mishna, in the order of a printed page: the
 * explanation, then the opinions and expansions as notes that open with their
 * own lead, and the halakha last, followed by the notice about AI.
 */
export function StudyNotes({ explanation, contentRef, primary }: StudyNotesProps) {
  const { t } = useTranslation();
  const { explanation: intro, notes, halakha } = buildStudyNotes(explanation);

  if (!intro && notes.length === 0 && !halakha) return null;

  return (
    <div
      id={primary ? 'explanation_text' : undefined}
      data-testid="explanation_text"
      className="ps-14 pe-5"
    >
      {intro && (
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className={`${NOTE_TEXT} mb-2.5`}>{children}</p>,
          }}
        >
          {intro}
        </ReactMarkdown>
      )}

      {notes.map((note, i) => (
        <p key={i} className={`${NOTE_TEXT} mb-2.5`}>
          {note.lead && (
            <>
              <b className="font-bold text-[var(--text-primary)]">{withPeriod(note.lead)}</b>{' '}
            </>
          )}
          {note.text}
          {note.source && (
            <span className="whitespace-nowrap font-explanation text-[0.78em]">
              {' '}
              ({t('study_source_prefix')} {note.source})
            </span>
          )}
        </p>
      ))}

      {halakha && (
        <div className="mt-4">
          <div className="mb-2.5 flex items-center gap-3 font-source text-[1.0625rem] font-bold text-study-ink">
            <span>{t('study_halakha_label')}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-study-ink opacity-40" />
          </div>
          <p className="font-notes text-[1.1875rem] leading-[1.8] text-justify text-pretty text-[var(--text-primary)]">
            {halakha}
          </p>
        </div>
      )}

      <div aria-hidden="true" className="mt-5 w-24 border-t border-[var(--text-secondary)]" />
      <p className="mt-2 font-explanation text-[0.8125rem] leading-[1.7] text-[var(--text-secondary)]">
        * {t('study_ai_notice')}
        <a
          href={`https://www.sefaria.org/${contentRef}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Sefaria
        </a>
        .
      </p>
    </div>
  );
}
