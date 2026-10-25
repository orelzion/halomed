'use client';

import { useTranslation } from '@/lib/i18n';

export interface ChapterLetter {
  index: number;
  letter: string;
  isDone: boolean;
  isFocus: boolean;
  /** Only mishnayot the reader has reached can be opened from here. */
  isReachable: boolean;
}

interface StudyRunningHeadProps {
  title: string;
  letters: ChapterLetter[];
  onBack: () => void;
  onJump: (index: number) => void;
}

/** Circles stop fitting on a phone beyond this many; the head shows a count instead. */
const MAX_LETTERS = 12;

const CHECK = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function circleClasses({ isDone, isFocus }: Pick<ChapterLetter, 'isDone' | 'isFocus'>): string {
  const base =
    'grid aspect-square w-full max-w-8 place-items-center rounded-full border-[1.5px] font-source text-base font-bold';
  const tone = isDone
    ? 'border-study-ink bg-study-ink text-[var(--bg-primary)]'
    : isFocus
      ? 'border-study-ink text-study-ink'
      : 'border-study-rule text-[var(--text-secondary)]';
  return `${base} ${tone} ${isFocus ? 'ring-[3px] ring-study-soft' : ''}`;
}

/**
 * The page header: back arrow, the tractate and chapter as a running head, a
 * row of letters for the mishnayot of the chapter, and a double rule.
 */
export function StudyRunningHead({ title, letters, onBack, onJump }: StudyRunningHeadProps) {
  const { t } = useTranslation();
  const focusPosition = letters.findIndex((l) => l.isFocus);

  return (
    <header className="sticky top-0 z-20 bg-desert-oasis-primary after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-5 after:bg-gradient-to-b after:from-[color:var(--bg-primary)] after:to-transparent dark:bg-desert-oasis-dark-primary">
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex h-14 items-center">
          <button
            type="button"
            onClick={onBack}
            className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-desert-oasis-card dark:hover:bg-desert-oasis-dark-card"
            aria-label={t('back')}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--text-primary)]"
              style={{ transform: 'scaleX(-1)' }}
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-center font-source text-base font-medium text-[var(--text-primary)]">{title}</h1>
          <div className="size-11" aria-hidden="true" />
        </div>

        {letters.length > 0 &&
          (letters.length > MAX_LETTERS ? (
            <p className="pb-2 text-center font-source text-sm text-[var(--text-secondary)]">
              {t('study_progress_compact', { current: Math.max(focusPosition, 0) + 1, total: letters.length })}
            </p>
          ) : (
            <nav aria-label={t('study_chapter_nav')} className="flex justify-center gap-2 pb-0.5">
              {letters.map((l) => (
                <button
                  key={l.index}
                  type="button"
                  disabled={!l.isReachable}
                  onClick={() => onJump(l.index)}
                  aria-current={l.isFocus ? 'step' : undefined}
                  aria-label={t('study_mishna_aria', { mishna: l.letter })}
                  className="grid h-11 min-w-0 max-w-9 flex-1 basis-0 place-items-center disabled:cursor-default"
                >
                  <span className={circleClasses(l)}>{l.isDone ? CHECK : l.letter}</span>
                </button>
              ))}
            </nav>
          ))}

        <div aria-hidden="true" className="h-1.5 border-b border-t-2 border-study-ink" />
      </div>
    </header>
  );
}
