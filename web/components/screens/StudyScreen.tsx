'use client';

import { useStudyUnit } from '@/lib/hooks/useStudyUnit';
import { DoneButton } from '@/components/ui/DoneButton';
import { ExpandableSection } from '@/components/ui/ExpandableSection';
import { StudyHeader } from '@/components/ui/StudyHeader';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { useCompletion } from '@/lib/hooks/useCompletion';
import { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '@/components/providers/AuthProvider';
import posthog from 'posthog-js';

interface StudyScreenProps {
  trackId?: string;
  studyDate?: string;
  contentRef?: string; // For path-based study
  isReview?: boolean; // For review nodes
  onCompletion?: (isCompleted: boolean) => void; // For path-based completion
  pathNodeId?: string; // Path node ID for completion tracking
}

export function StudyScreen({ trackId, studyDate, contentRef, isReview, onCompletion, pathNodeId }: StudyScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { studyUnit, explanationData, loading, studyTitle } = useStudyUnit(trackId ?? '', studyDate);
  const { toggleCompletion, isToggling } = useCompletion();
  const { session } = useAuthContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const hasTriggeredRef = useRef(false);
  const hasTrackedLessonStart = useRef(false);
  // Debug panel removed after diagnosis

  // Track lesson start when content is loaded
  useEffect(() => {
    if (studyUnit?.content && !hasTrackedLessonStart.current) {
      hasTrackedLessonStart.current = true;
      posthog.capture('study_lesson_started', {
        content_ref: studyUnit.content.ref_id,
        track_id: trackId,
        is_review: isReview || false,
        path_node_id: pathNodeId,
      });
    }
  }, [studyUnit?.content, trackId, isReview, pathNodeId]);

  const handleDone = async () => {
    if (!studyUnit?.log) return;

    try {
      const currentState = studyUnit.log.is_completed === 1;
      await toggleCompletion(studyUnit.log.id, currentState);

      // Capture completion event when marking as done (not when unchecking)
      if (!currentState) {
        posthog.capture('study_lesson_completed', {
          content_ref: studyUnit.content?.ref_id,
          track_id: trackId,
          is_review: isReview || false,
          path_node_id: pathNodeId,
        });
      }
    } catch (error) {
      console.error('Error toggling completion:', error);
      posthog.captureException(error);
      setGenerationError(error instanceof Error ? error.message : t('error_generic'));
    }
  };

  const triggerGeneration = async () => {
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStatus(null);
    setTimedOut(false);
    try {
      const today = studyDate || new Date().toISOString().split('T')[0];
      const response = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          track_id: trackId,
          start_date: today,
          days_ahead: 1,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        setGenerationError(details || t('error_generic'));
      } else {
        const details = await response.text();
        setGenerationStatus(details || 'Schedule generation requested');
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : t('error_generic'));
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (studyUnit?.log && !studyUnit.content && !isGenerating && !generationError && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      triggerGeneration();
    }
  }, [studyUnit?.log, studyUnit?.content, isGenerating, generationError, session?.access_token]);

  useEffect(() => {
    if (!studyUnit?.log || studyUnit.content) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setTimedOut(true);
    }, 20000);
    return () => window.clearTimeout(timeoutId);
  }, [studyUnit?.log, studyUnit?.content]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary">
        <p className="text-desert-oasis-accent">{t('syncing')}</p>
      </div>
    );
  }

  if (!studyUnit?.log) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary p-4">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] font-explanation mb-4">
            {t('no_study_today')}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-desert-oasis-accent text-white rounded-xl font-explanation"
          >
            חזור
          </button>
        </div>
      </div>
    );
  }

  if (studyUnit.log && !studyUnit.content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary p-4">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] font-explanation mb-4">
            {t('loading_content')}
          </p>
          {generationError && (
            <p className="text-red-500 font-explanation mb-4">{generationError}</p>
          )}
          {generationStatus && !generationError && (
            <p className="text-[var(--text-secondary)] font-explanation mb-4">
              {generationStatus}
            </p>
          )}
          {timedOut && !generationError && (
            <p className="text-red-500 font-explanation mb-4">
              {t('retry')}
            </p>
          )}
          <button
            onClick={triggerGeneration}
            disabled={isGenerating}
            className="px-6 py-3 bg-desert-oasis-accent text-white rounded-xl font-explanation disabled:opacity-50"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = studyUnit.log.is_completed === 1;
  const sourceText = studyUnit.content?.source_text_he || '';
  const explanation = explanationData?.summary || '';
  const halakha = explanationData?.halakha || '';

  // Determine header title: use study title if available, otherwise track title
  const headerTitle = studyTitle || studyUnit?.track?.title || '';

  // Convert ref_id to Sefaria URL
  // Format: "Mishnah_Berakhot.1.1" -> "https://www.sefaria.org/Mishnah_Berakhot.1.1"
  const getSefariaUrl = (refId: string | null): string => {
    if (!refId) return 'https://www.sefaria.org';
    // Sefaria URLs use the ref format with underscores replaced by spaces in the URL path
    // "Mishnah_Berakhot.1.1" -> "Mishnah Berakhot.1.1" -> "https://www.sefaria.org/Mishnah_Berakhot.1.1"
    // Actually, Sefaria accepts both formats, but the underscore format works
    return `https://www.sefaria.org/${refId}`;
  };

  const sefariaUrl = getSefariaUrl(studyUnit.content?.ref_id || null);

  return (
    <div
      id="study_screen"
      data-testid="study_screen"
      className="min-h-screen bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary pb-20"
    >
      <StudyHeader title={headerTitle} trackId={trackId} />
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Source Text (Mishnah) */}
        {sourceText && (
          <div
            id="mishna_text"
            data-testid="mishna_text"
            className="text-2xl font-source font-bold text-[var(--text-primary)] leading-relaxed"
          >
            {sourceText}
          </div>
        )}

        {/* AI Explanation */}
        {explanation && (
          <div
            id="explanation_text"
            data-testid="explanation_text"
            className="text-lg font-explanation text-[var(--text-secondary)] leading-relaxed"
          >
            {explanation}
          </div>
        )}

        {/* Halakha Section */}
        {halakha && halakha.trim() && (
          <div className="space-y-3">
            <h2 className="text-xl font-source font-bold text-[var(--text-primary)]">
              הלכה
            </h2>
            <div className="text-lg font-explanation text-[var(--text-secondary)] leading-relaxed">
              {halakha}
            </div>
            {/* AI Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-r-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-lg">
              <p className="text-sm font-explanation text-[var(--text-secondary)] mb-2">
                <span className="font-bold">⚠️ אזהרה:</span> תוכן זה נוצר על ידי בינה מלאכותית. מומלץ לבדוק את המקור המקורי ב-
                <a
                  href={sefariaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-desert-oasis-accent underline hover:text-desert-oasis-accent/80"
                >
                  Sefaria
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {/* Expandable Section: Summary of Commentaries */}
        {explanationData?.opinions && explanationData.opinions.length > 0 && (
          <ExpandableSection title={t('summary_of_commentaries')}>
            <div className="space-y-4">
              {explanationData.opinions.map((opinion, index) => (
                <div key={index} className="border-r-2 border-desert-oasis-muted pr-4">
                  <p className="font-source font-bold text-[var(--text-primary)] mb-2">
                    {opinion.source}
                  </p>
                  <p className="font-explanation text-[var(--text-secondary)]">
                    {opinion.details}
                  </p>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Expansions */}
        {explanationData?.expansions && explanationData.expansions.length > 0 && (
          <ExpandableSection title="הרחבות">
            <div className="space-y-4">
              {explanationData.expansions.map((expansion, index) => (
                <div key={index}>
                  <p className="font-source font-bold text-[var(--text-primary)] mb-2">
                    {expansion.topic}
                  </p>
                  <p className="font-explanation text-[var(--text-secondary)]">
                    {expansion.explanation}
                  </p>
                  {expansion.source && (
                    <p className="font-explanation text-sm text-desert-oasis-muted mt-2">
                      מקור: {expansion.source}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}
        {/* Spacer */}
        <div className="h-12"/>
        {/* Done Button */}
        {studyUnit.log && (
          <div className="mt-16">
            <DoneButton
              isCompleted={isCompleted}
              onClick={handleDone}
              disabled={isToggling}
            />
          </div>
        )}
      </div>
    </div>
  );
}
