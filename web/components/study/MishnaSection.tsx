'use client';

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useStudyContent } from '@/lib/hooks/useStudyContent';
import { formatContentRef } from '@/lib/utils/date-format';
import { MishnaText } from './MishnaText';
import { Ornament } from './PageMarks';
import { StudyDoneBar } from './StudyDoneBar';
import { StudyNotes } from './StudyNotes';

/**
 * full: the mishna with its notes (the one being studied, or the one just finished)
 * folded: a finished mishna reduced to a few lines
 * preview: a mishna that has not been reached yet, dimmed
 */
export type SectionMode = 'full' | 'folded' | 'preview';

interface MishnaSectionProps {
  index: number;
  contentRef: string;
  letter: string;
  mode: SectionMode;
  /** The mishna the reader is on now. Only this one generates missing content. */
  isFocus: boolean;
  isDone: boolean;
  isReachable: boolean;
  registerRef: (index: number, element: HTMLElement | null) => void;
  onComplete: (index: number) => void;
  onOpen: (index: number) => void;
}

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

/** The letter hung in the margin beside a mishna. */
function MarginLetter({ letter, isDone, isMuted }: { letter: string; isDone: boolean; isMuted: boolean }) {
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

function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden="true" className="space-y-4 pt-2">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-4 rounded bg-study-rule motion-safe:animate-pulse ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

/**
 * Keeps the page from jumping when a mishna that is entirely above the
 * viewport changes height (it folds, or its content arrives). Browsers differ
 * in whether they anchor the scroll position themselves, so it is done here.
 */
function useKeepScrollPosition(ref: RefObject<HTMLElement | null>) {
  const lastHeight = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const height = element.offsetHeight;
    const previous = lastHeight.current;
    lastHeight.current = height;
    if (previous === null || previous === height) return;
    if (element.getBoundingClientRect().top + previous <= 0) {
      window.scrollBy(0, height - previous);
    }
  });
}

export function MishnaSection({
  index,
  contentRef,
  letter,
  mode,
  isFocus,
  isDone,
  isReachable,
  registerRef,
  onComplete,
  onOpen,
}: MishnaSectionProps) {
  const { t } = useTranslation();
  const { content, explanationData, loading, isGenerating, ready, hasError, retry } = useStudyContent(
    contentRef,
    isFocus
  );
  const sourceText = ready && content ? content.source_text_he : null;
  const [notesOpen, setNotesOpen] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  useKeepScrollPosition(sectionRef);

  const setRef = (element: HTMLElement | null) => {
    sectionRef.current = element;
    registerRef(index, element);
  };

  const title = formatContentRef(contentRef);
  const heading = <h2 className="sr-only">{title}</h2>;
  const notesId = `study-notes-${index}`;

  if (mode === 'preview') {
    const body = (
      <div
        className="relative h-[6.5rem] overflow-hidden ps-14 pe-5 opacity-60 [mask-image:linear-gradient(#000_45%,transparent)]"
      >
        <MarginLetter letter={letter} isDone={false} isMuted />
        {sourceText !== null ? <MishnaText source={sourceText} size="preview" /> : <Skeleton lines={2} />}
      </div>
    );
    return (
      <section ref={setRef} data-testid={`study_unit_${index}`} className="mt-1.5 scroll-mt-28">
        {heading}
        {isReachable ? (
          <button type="button" onClick={() => onOpen(index)} className="block w-full text-start" aria-label={title}>
            {body}
          </button>
        ) : (
          body
        )}
      </section>
    );
  }

  if (mode === 'folded') {
    return (
      <section ref={setRef} data-testid={`study_unit_${index}`} className="mt-1.5 scroll-mt-28">
        {heading}
        <div className="relative h-[7.25rem] overflow-hidden ps-14 pe-5">
          <MarginLetter letter={letter} isDone isMuted={false} />
          {sourceText !== null ? (
            <MishnaText source={sourceText} size="folded" />
          ) : (
            <button
              type="button"
              onClick={() => onOpen(index)}
              className="text-start font-source text-[1.375rem] leading-[1.75] text-[var(--text-secondary)]"
            >
              {title}
            </button>
          )}
        </div>
        {sourceText !== null ? (
          <>
            <div className="px-5">
              <button
                type="button"
                onClick={() => setNotesOpen((open) => !open)}
                aria-expanded={notesOpen}
                aria-controls={notesId}
                className="flex h-12 w-full items-center justify-between border-y border-study-rule ps-9 pe-1.5 font-source text-base font-medium text-[var(--text-secondary)]"
              >
                <span>{t('study_notes_toggle')}</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={notesOpen ? 'rotate-180' : ''}
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
            <div id={notesId} hidden={!notesOpen} className="pt-4">
              {notesOpen && <StudyNotes explanation={explanationData} contentRef={contentRef} />}
            </div>
          </>
        ) : (
          // Same height as the toggle row, so the page does not move when the content arrives
          <div aria-hidden="true" className="h-12" />
        )}
      </section>
    );
  }

  // full
  return (
    <section ref={setRef} data-testid={`study_unit_${index}`} className="mt-1.5 scroll-mt-28">
      {heading}
      {sourceText !== null ? (
        <>
          <div className="relative ps-14 pe-5">
            <MarginLetter letter={letter} isDone={isDone} isMuted={false} />
            <MishnaText source={sourceText} size="full" id={isFocus ? 'mishna_text' : undefined} />
          </div>
          <Ornament />
          <StudyNotes explanation={explanationData} contentRef={contentRef} primary={isFocus} />
          <StudyDoneBar isDone={isDone} onClick={() => onComplete(index)} primary={isFocus} />
        </>
      ) : (
        // Tall enough to scroll to even before the content arrives, so opening the page at
        // this mishna lands on it instead of stopping short.
        <div className="relative min-h-[calc(100dvh-7rem)] ps-14 pe-5" aria-live="polite">
          <MarginLetter letter={letter} isDone={false} isMuted={false} />
          {hasError || (!loading && !isGenerating && !content) ? (
            <div className="pt-2 font-explanation text-[var(--text-primary)]">
              <p className="mb-3">{hasError ? t('study_load_error') : t('study_content_not_found')}</p>
              <button
                type="button"
                onClick={retry}
                className="h-11 rounded-xl bg-desert-oasis-accent px-6 font-explanation text-white"
              >
                {t('retry')}
              </button>
            </div>
          ) : (
            <>
              <p className="pt-1 font-explanation text-sm text-[var(--text-secondary)]">
                {isGenerating ? t('study_generating') : t('loading_content')}
              </p>
              <Skeleton lines={4} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
