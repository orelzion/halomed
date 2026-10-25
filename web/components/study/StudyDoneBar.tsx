'use client';

import { useTranslation } from '@/lib/i18n';

interface StudyDoneBarProps {
  isDone: boolean;
  onClick: () => void;
  /** Set on the mishna being studied, so tests can find it by id. */
  primary?: boolean;
}

/** The סיימתי bar that closes a mishna: ruled like the page, filled once done. */
export function StudyDoneBar({ isDone, onClick, primary }: StudyDoneBarProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onClick();
  };

  return (
    <div className="mt-6 px-5">
      <button
        id={primary ? 'done_button' : undefined}
        data-testid="done_button"
        type="button"
        onClick={handleClick}
        aria-pressed={isDone}
        className={`flex h-14 w-full items-center justify-center gap-3 border-b border-t-2 border-study-ink font-source text-[1.1875rem] font-bold text-[var(--text-primary)] transition-colors active:bg-study-soft ${
          isDone ? 'bg-study-soft' : ''
        }`}
      >
        <span
          className={`grid size-[30px] place-items-center rounded-full border-[1.5px] border-study-ink ${
            isDone ? 'bg-study-ink text-[var(--bg-primary)]' : 'text-study-ink'
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isDone ? '' : 'opacity-40'}
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span>{t(isDone ? 'done_completed' : 'done_button')}</span>
      </button>
    </div>
  );
}
