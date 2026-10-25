'use client';

import { useTranslation } from '@/lib/i18n';
import { toPlainText } from '@/lib/utils/mishnaText';
import { MarginLetter } from './MarginLetter';
import { MishnaText } from './MishnaText';

interface PinnedMishnaProps {
  sourceText: string;
  letter: string;
  isDone: boolean;
  collapsed: boolean;
  onToggle: () => void;
  /** Set on the mishna being studied, so tests can find the text by id. */
  textId?: string;
}

const PANEL =
  'sticky top-[var(--study-head,7rem)] z-10 border-b border-study-rule bg-desert-oasis-primary shadow-[0_10px_16px_-12px_rgba(0,0,0,0.45)] dark:bg-desert-oasis-dark-primary';

const CHEVRON_PATH = { down: 'M6 9l6 6 6-6', up: 'M6 15l6-6 6 6' };

function Chevron({ direction }: { direction: 'down' | 'up' }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={CHEVRON_PATH[direction]} />
    </svg>
  );
}

/**
 * The mishna itself, kept under the header from the moment its section starts
 * until the section ends, so the notes below it scroll while the text stays in
 * view. It sits in the page flow (the notes start below it, never under it),
 * is capped in height so a long mishna scrolls inside it, and can be folded to
 * a single line.
 */
export function PinnedMishna({ sourceText, letter, isDone, collapsed, onToggle, textId }: PinnedMishnaProps) {
  const { t } = useTranslation();

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        aria-label={t('study_pin_expand')}
        data-testid="pinned_mishna"
        className={`${PANEL} flex min-h-11 w-full items-center gap-3 px-4 text-start`}
      >
        <span
          aria-hidden="true"
          className={`grid size-[30px] flex-none place-items-center rounded-full border-[1.5px] border-study-ink font-source text-[0.9375rem] font-bold ${
            isDone ? 'bg-study-ink text-[var(--bg-primary)]' : 'text-study-ink'
          }`}
        >
          {letter}
        </span>
        <span aria-hidden="true" className="min-w-0 flex-1 truncate font-source text-lg font-medium text-[var(--text-primary)]">
          {toPlainText(sourceText)}
        </span>
        <span className="text-[var(--text-secondary)]">
          <Chevron direction="down" />
        </span>
      </button>
    );
  }

  return (
    <div data-testid="pinned_mishna" className={PANEL}>
      {/* The bottom padding keeps the fade off the last line when the text fits */}
      <div className="relative max-h-[min(34dvh,18rem)] overflow-y-auto pb-6 ps-14 pe-5 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.5rem),transparent)]">
        <MarginLetter letter={letter} isDone={isDone} isMuted={false} />
        <MishnaText source={sourceText} size="panel" id={textId} />
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded
        aria-label={t('study_pin_collapse')}
        className="flex h-9 w-full items-center justify-center border-t border-study-rule text-[var(--text-secondary)]"
      >
        <Chevron direction="up" />
      </button>
    </div>
  );
}
