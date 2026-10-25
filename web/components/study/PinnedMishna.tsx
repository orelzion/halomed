'use client';

import { useTranslation } from '@/lib/i18n';
import { toPlainText } from '@/lib/utils/mishnaText';
import { MishnaText } from './MishnaText';

interface PinnedMishnaProps {
  sourceText: string;
  letter: string;
  collapsed: boolean;
  onToggle: () => void;
}

const PANEL =
  'border-b border-study-rule bg-desert-oasis-primary shadow-[0_10px_16px_-12px_rgba(0,0,0,0.45)] dark:bg-desert-oasis-dark-primary';

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
 * The mishna kept under the header while its notes are read. The text is
 * already on the page, so it is hidden from screen readers here.
 */
export function PinnedMishna({ sourceText, letter, collapsed, onToggle }: PinnedMishnaProps) {
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
          className="grid size-[30px] flex-none place-items-center rounded-full border-[1.5px] border-study-ink font-source text-[0.9375rem] font-bold text-study-ink"
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
      <button
        type="button"
        onClick={onToggle}
        aria-expanded
        aria-label={t('study_pin_collapse')}
        className="flex min-h-11 w-full items-center justify-between px-5 font-explanation text-[0.8125rem] text-[var(--text-secondary)]"
      >
        <span aria-hidden="true">{t('study_mishna_aria', { mishna: letter })}</span>
        <Chevron direction="up" />
      </button>
      {/* Capped, and scrolls inside itself for the longer mishnayot */}
      <div
        aria-hidden="true"
        className="max-h-[min(8.5em,22dvh)] overflow-y-auto px-5 pb-3 text-[1.3125rem] text-justify"
      >
        <MishnaText source={sourceText} size="pinned" />
      </div>
    </div>
  );
}
