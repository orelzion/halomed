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

interface StudyScreenProps {
  trackId: string;
  studyDate?: string;
}

export function StudyScreen({ trackId, studyDate }: StudyScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { studyUnit, explanationData, loading, studyTitle } = useStudyUnit(trackId, studyDate);
  const { toggleCompletion, isToggling } = useCompletion();
  const { session } = useAuthContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const hasTriggeredRef = useRef(false);
  // Debug panel removed after diagnosis

  const handleDone = async () => {
    if (!studyUnit?.log) return;

    try {
      const currentState = studyUnit.log.is_completed === 1;
      await toggleCompletion(studyUnit.log.id, currentState);
    } catch (error) {
      console.error('Error toggling completion:', error);
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

  // Determine header title: use study title if available, otherwise track title
  const headerTitle = studyTitle || studyUnit?.track?.title || '';

  return (
    <div
      id="study_screen"
      data-testid="study_screen"
      className="min-h-screen bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary pb-20"
    >
      <StudyHeader title={headerTitle} />
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
      </div>

      {/* Done Button - Fixed at bottom */}
      {studyUnit.log && (
        <div className="fixed bottom-0 left-0 right-0 z-10 p-4 bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary">
          <DoneButton
            isCompleted={isCompleted}
            onClick={handleDone}
            disabled={isToggling}
          />
        </div>
      )}
    </div>
  );
}
