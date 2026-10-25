const CHECK = (
  <svg
    width="18"
    height="18"
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

interface MarginLetterProps {
  letter: string;
  isDone: boolean;
  /** Dimmed, for a mishna that has not been reached yet. */
  isMuted: boolean;
}

/** The letter hung in the margin beside a mishna. */
export function MarginLetter({ letter, isDone, isMuted }: MarginLetterProps) {
  const tone = isDone
    ? 'border-study-ink bg-study-ink text-[var(--bg-primary)]'
    : isMuted
      ? 'border-study-rule text-[var(--text-secondary)]'
      : 'border-study-ink text-study-ink';
  return (
    <span
      aria-hidden="true"
      className={`absolute start-4 top-2.5 grid size-[34px] place-items-center rounded-full border-[1.5px] font-source text-lg font-bold ${tone}`}
    >
      {isDone ? CHECK : letter}
    </span>
  );
}
