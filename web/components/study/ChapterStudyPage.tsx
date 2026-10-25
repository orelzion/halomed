'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { usePath } from '@/lib/hooks/usePath';
import { advanceStudyProgress, buildUserProgress } from '@/lib/utils/studyProgress';
import {
  getFirstIndexOfChapter,
  getGlobalChapterForIndex,
  getInfoForIndex,
  getLastIndexOfChapter,
  getUnlockDate,
  toHebrewChapter,
  toHebrewChapterOrdinal,
  toHebrewMishna,
} from '@shared/lib/path-generator';
import { TOTAL_MISHNAYOT } from '@shared/lib/mishnah-structure';
import { Mascot } from '@/components/ui/Mascot';
import { MishnaSection, type SectionMode } from './MishnaSection';
import { Ornament, PageMark } from './PageMarks';
import { StudyRunningHead, type ChapterLetter } from './StudyRunningHead';

interface ChapterStudyPageProps {
  /** Global index of the mishna the reader opened. */
  startIndex: number;
}

/** Which mishna is open, and which one was open just before it. */
type Unit = NonNullable<ReturnType<typeof getInfoForIndex>> & { index: number };

interface View {
  focus: number;
  previous: number | null;
}

function chapterOf(index: number): number {
  return getGlobalChapterForIndex(index);
}

/**
 * The study page: the mishnayot of a chapter on one continuous page, in the
 * way of a printed edition. Finishing one opens the next below it, with no
 * trip back to the path in between.
 */
export function ChapterStudyPage({ startIndex }: ChapterStudyPageProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { preferences, loading: preferencesLoading } = usePreferences();
  const { nodes: pathNodes } = usePath();

  const [view, setView] = useState<View>({ focus: startIndex, previous: null });
  // The page holds every mishna from the start of the opened chapter to the end of the
  // furthest chapter reached, so a chapter that ends flows into the next one.
  const windowStart = useMemo(() => getFirstIndexOfChapter(chapterOf(startIndex)), [startIndex]);
  const [windowEnd, setWindowEnd] = useState(() => getLastIndexOfChapter(chapterOf(startIndex)));

  const savedIndex: number = preferences?.current_content_index ?? startIndex;
  // The saved position arrives a moment after a mishna is finished, so the page counts
  // everything before the open mishna as reached. Otherwise marks would pop in above it.
  const reachedIndex = Math.max(savedIndex, view.focus);
  const progress = useMemo(() => (preferences ? buildUserProgress(preferences) : null), [preferences]);

  const units = useMemo(() => {
    const result: Unit[] = [];
    for (let i = windowStart; i <= windowEnd; i++) {
      const info = getInfoForIndex(i);
      if (info) result.push({ ...info, index: i });
    }
    return result;
  }, [windowStart, windowEnd]);

  const focusInfo = useMemo(() => getInfoForIndex(view.focus), [view.focus]);

  const goTo = useCallback((index: number) => {
    setView((v) => (v.focus === index ? v : { focus: index, previous: v.focus }));
    setWindowEnd((end) => Math.max(end, getLastIndexOfChapter(chapterOf(index))));
  }, []);

  const handleComplete = useCallback(
    async (index: number) => {
      try {
        await advanceStudyProgress(index + 1);
      } catch (error) {
        console.error('[ChapterStudyPage] Error recording completion:', error);
      }
      if (index + 1 < TOTAL_MISHNAYOT) goTo(index + 1);
    },
    [goTo]
  );

  // Bring the mishna being studied to the top of the page. The first time is a plain jump
  // (the reader just arrived); after that it is the move from one mishna to the next.
  const sectionElements = useRef(new Map<number, HTMLElement>());
  const hasPositioned = useRef(false);
  const registerRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) sectionElements.current.set(index, element);
    else sectionElements.current.delete(index);
  }, []);

  const isReady = !preferencesLoading && focusInfo !== null;
  useEffect(() => {
    if (!isReady) return;
    const element = sectionElements.current.get(view.focus);
    if (!element) return;
    if (!hasPositioned.current) {
      hasPositioned.current = true;
      if (view.focus !== windowStart) element.scrollIntoView({ block: 'start' });
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, [isReady, view.focus, windowStart]);

  // Where one study day ends and the next begins, so the page can say the day is complete
  const dayEndsAfter = useMemo(() => {
    const ends = new Set<number>();
    if (!progress) return ends;
    for (let i = 0; i < units.length - 1; i++) {
      const here = getUnlockDate(units[i].index, progress.pace, progress.startDate, progress.studyDays);
      const next = getUnlockDate(units[i + 1].index, progress.pace, progress.startDate, progress.studyDays);
      if (here !== next) ends.add(units[i].index);
    }
    return ends;
  }, [progress, units]);

  const hasWaitingReview = pathNodes.some(
    (node) =>
      (node.node_type === 'review_session' || node.node_type === 'weekly_quiz') &&
      !node.isLocked &&
      !node.completed_at
  );

  if (!isReady || !focusInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary">
        <div className="text-center">
          <Mascot mood="reading" size="md" />
          <p className="mt-4 font-explanation text-[var(--text-secondary)]">{t('loading_content')}</p>
        </div>
      </div>
    );
  }

  const letters: ChapterLetter[] = units
    .filter((u) => u.tractate.english === focusInfo.tractate.english && u.chapter === focusInfo.chapter)
    .map((u) => ({
      index: u.index,
      letter: toHebrewMishna(u.mishna),
      isDone: u.index < reachedIndex,
      isFocus: u.index === view.focus,
      isReachable: u.index <= reachedIndex,
    }));

  const modeFor = (index: number): SectionMode => {
    if (index === view.focus) return 'full';
    // The mishna just finished stays open, so the page does not shift under the reader
    if (index === view.previous && index < reachedIndex) return 'full';
    if (index < reachedIndex) return 'folded';
    return 'preview';
  };

  return (
    <div className="min-h-screen bg-desert-oasis-primary pb-24 [overflow-anchor:none] dark:bg-desert-oasis-dark-primary">
      <StudyRunningHead
        title={t('study_running_head', {
          tractate: focusInfo.tractate.hebrew,
          chapter: toHebrewChapter(focusInfo.chapter),
        })}
        letters={letters}
        onBack={() => router.push('/')}
        onJump={goTo}
      />

      <div className="mx-auto max-w-2xl">
        {units.map((unit, position) => {
          const previousUnit = position > 0 ? units[position - 1] : null;
          const startsChapter = unit.mishna === 1;
          const isNewChapter =
            previousUnit !== null &&
            (previousUnit.tractate.english !== unit.tractate.english || previousUnit.chapter !== unit.chapter);
          const dayJustEnded =
            previousUnit !== null && dayEndsAfter.has(previousUnit.index) && previousUnit.index < reachedIndex;

          return (
            <Fragment key={unit.index}>
              {isNewChapter && previousUnit && (
                <PageMark>{t('study_chapter_end', { chapter: toHebrewChapterOrdinal(previousUnit.chapter) })}</PageMark>
              )}
              {dayJustEnded && previousUnit && (
                <>
                  <PageMark>{t('todays_study_complete')}</PageMark>
                  {previousUnit.index === reachedIndex - 1 && (
                    // The row keeps its height whether or not a review is waiting, so the
                    // path finishing its calculation later does not move the page.
                    <div className="mt-2 flex min-h-11 justify-center">
                      {hasWaitingReview && (
                        <button
                          type="button"
                          onClick={() => router.push('/')}
                          className="flex items-center gap-1 font-explanation text-sm text-[var(--text-secondary)]"
                        >
                          {t('study_review_waiting')}
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
              {startsChapter && (
                <h2 className="pt-6 text-center font-source text-[1.875rem] font-bold leading-tight text-[var(--text-primary)]">
                  {t('study_chapter_heading', { chapter: toHebrewChapterOrdinal(unit.chapter) })}
                </h2>
              )}
              {(startsChapter || position > 0) && <Ornament />}
              <MishnaSection
                index={unit.index}
                contentRef={unit.contentRef}
                letter={toHebrewMishna(unit.mishna)}
                mode={modeFor(unit.index)}
                isFocus={unit.index === view.focus}
                isDone={unit.index < reachedIndex}
                isReachable={unit.index <= reachedIndex}
                registerRef={registerRef}
                onComplete={handleComplete}
                onOpen={goTo}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
