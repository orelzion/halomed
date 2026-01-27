'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { supabase } from '@/lib/supabase/client';
import { useSync } from '@/components/providers/SyncProvider';
import posthog from 'posthog-js';
import { getDatabase } from '@/lib/database/database';

type Pace = 'one_mishna' | 'two_mishna' | 'one_chapter';
type ReviewIntensity = 'none' | 'light' | 'medium' | 'intensive';

interface ChangePlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Close icon
function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

// Info icon for preservation message
function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

// Check icon
function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ChangePlanDialog({ isOpen, onClose, onSuccess }: ChangePlanDialogProps) {
  const { t } = useTranslation();
  const { preferences } = usePreferences();
  const { triggerSync } = useSync();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  const [selectedPace, setSelectedPace] = useState<Pace | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewIntensity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selections from current preferences
  useEffect(() => {
    if (preferences && isOpen) {
      setSelectedPace(preferences.pace as Pace);
      setSelectedReview(preferences.review_intensity as ReviewIntensity);
      setError(null);
    }
  }, [preferences, isOpen]);

  // Focus trap and escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't allow closing while submitting
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the first focusable element when dialog opens
    setTimeout(() => {
      firstFocusableRef.current?.focus();
    }, 0);

    // Prevent body scroll when dialog is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, isSubmitting]);

  const hasChanges = useCallback(() => {
    if (!preferences) return false;
    return (
      selectedPace !== preferences.pace ||
      selectedReview !== preferences.review_intensity
    );
  }, [preferences, selectedPace, selectedReview]);

  const updateLocalPreferences = async (pace: Pace, reviewIntensity: ReviewIntensity, userId: string) => {
    const db = await getDatabase();
    if (!db) return;

    try {
      // Find existing preferences
      const prefsDocs = await db.user_preferences
        .find({
          selector: {
            user_id: userId,
          },
        })
        .limit(1)
        .exec();

      if (prefsDocs.length > 0) {
        // Update existing preferences
        await prefsDocs[0].update({
          $set: {
            pace,
            review_intensity: reviewIntensity,
            updated_at: new Date().toISOString(),
          },
        });
      } else {
        // Create new preferences (shouldn't happen, but handle gracefully)
        await db.user_preferences.insert({
          id: crypto.randomUUID(),
          user_id: userId,
          pace,
          review_intensity: reviewIntensity,
          streak_count: 0,
          current_content_index: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _deleted: false,
        });
      }
      console.log('[ChangePlanDialog] Local preferences updated optimistically');
    } catch (e) {
      console.error('[ChangePlanDialog] Failed to update local preferences:', e);
      // Non-fatal - the sync will eventually update it
    }
  };

  const handleSubmit = async () => {
    if (!selectedPace || !selectedReview || !hasChanges()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch('/api/update-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          pace: selectedPace,
          review_intensity: selectedReview,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to update preferences');
      }

      posthog.capture('study_plan_changed', {
        new_pace: selectedPace,
        new_review_intensity: selectedReview,
        nodes_preserved: result.nodes_preserved,
        nodes_created: result.nodes_created,
      });

      // Optimistically update local database for immediate UI feedback
      await updateLocalPreferences(selectedPace, selectedReview, session.user.id);

      // Trigger sync to push changes to server
      await triggerSync();

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error updating preferences:', err);
      posthog.captureException(err);
      setError(err instanceof Error ? err.message : t('change_plan_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-plan-dialog-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div 
        ref={dialogRef}
        className="relative bg-desert-oasis-card dark:bg-desert-oasis-dark-card rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-desert-oasis-card dark:bg-desert-oasis-dark-card px-6 py-4 border-b border-desert-oasis-muted/20 dark:border-gray-700/30 flex items-center justify-between">
          <h2 
            id="change-plan-dialog-title"
            className="font-source text-xl font-bold text-[var(--text-primary)]"
          >
            {t('change_plan_dialog_title')}
          </h2>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 -m-2 rounded-full hover:bg-desert-oasis-muted/20 dark:hover:bg-gray-700/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-oasis-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="סגור"
          >
            <CloseIcon className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info messages */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <InfoIcon className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="font-explanation text-sm text-amber-800 dark:text-amber-200">
                {t('change_plan_warning')}
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <CheckIcon className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="font-explanation text-sm text-green-800 dark:text-green-200">
                {t('change_plan_preservation')}
              </p>
            </div>
          </div>

          {/* Pace selection */}
          <div>
            <h3 className="font-explanation font-semibold text-[var(--text-primary)] mb-3">
              {t('pace_label')}
            </h3>
            <div className="space-y-2">
              <PaceOption
                pace="one_mishna"
                selected={selectedPace === 'one_mishna'}
                onSelect={() => setSelectedPace('one_mishna')}
                title={t('pace_one_mishna')}
                description={t('pace_one_mishna_desc')}
              />
              <PaceOption
                pace="two_mishna"
                selected={selectedPace === 'two_mishna'}
                onSelect={() => setSelectedPace('two_mishna')}
                title={t('pace_two_mishna')}
                description={t('pace_two_mishna_desc')}
              />
              <PaceOption
                pace="one_chapter"
                selected={selectedPace === 'one_chapter'}
                onSelect={() => setSelectedPace('one_chapter')}
                title={t('pace_one_chapter')}
                description={t('pace_one_chapter_desc')}
              />
            </div>
          </div>

          {/* Review intensity selection */}
          <div>
            <h3 className="font-explanation font-semibold text-[var(--text-primary)] mb-3">
              {t('review_intensity_label')}
            </h3>
            <div className="space-y-2">
              <ReviewOption
                intensity="none"
                selected={selectedReview === 'none'}
                onSelect={() => setSelectedReview('none')}
                title={t('review_none')}
                description={t('review_none_desc')}
              />
              <ReviewOption
                intensity="light"
                selected={selectedReview === 'light'}
                onSelect={() => setSelectedReview('light')}
                title={t('review_light')}
                description={t('review_light_desc')}
              />
              <ReviewOption
                intensity="medium"
                selected={selectedReview === 'medium'}
                onSelect={() => setSelectedReview('medium')}
                title={t('review_medium')}
                description={t('review_medium_desc')}
              />
              <ReviewOption
                intensity="intensive"
                selected={selectedReview === 'intensive'}
                onSelect={() => setSelectedReview('intensive')}
                title={t('review_intensive')}
                description={t('review_intensive_desc')}
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="font-explanation text-sm text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-desert-oasis-card dark:bg-desert-oasis-dark-card px-6 py-4 border-t border-desert-oasis-muted/20 dark:border-gray-700/30 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl font-explanation font-semibold text-[var(--text-secondary)] bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-oasis-accent focus-visible:ring-offset-2"
          >
            {t('change_plan_cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasChanges()}
            className="flex-1 py-3 px-4 rounded-xl font-explanation font-semibold text-white bg-desert-oasis-accent hover:bg-desert-oasis-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-oasis-accent focus-visible:ring-offset-2"
          >
            {isSubmitting ? t('change_plan_loading') : t('change_plan_confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Option components
interface PaceOptionProps {
  pace: Pace;
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}

function PaceOption({ pace, selected, onSelect, title, description }: PaceOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-xl text-right transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-oasis-accent focus-visible:ring-offset-2 ${
        selected
          ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
          : 'bg-white/80 dark:bg-gray-800/50 hover:shadow-md'
      }`}
      role="radio"
      aria-checked={selected}
    >
      <div className={`font-explanation font-semibold mb-1 ${selected ? 'text-white' : 'text-[var(--text-primary)]'}`}>
        {title}
      </div>
      <div className={`font-explanation text-sm ${selected ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>
        {description}
      </div>
    </button>
  );
}

interface ReviewOptionProps {
  intensity: ReviewIntensity;
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}

function ReviewOption({ intensity, selected, onSelect, title, description }: ReviewOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-xl text-right transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-oasis-accent focus-visible:ring-offset-2 ${
        selected
          ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
          : 'bg-white/80 dark:bg-gray-800/50 hover:shadow-md'
      }`}
      role="radio"
      aria-checked={selected}
    >
      <div className={`font-explanation font-semibold mb-1 ${selected ? 'text-white' : 'text-[var(--text-primary)]'}`}>
        {title}
      </div>
      <div className={`font-explanation text-sm ${selected ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>
        {description}
      </div>
    </button>
  );
}
