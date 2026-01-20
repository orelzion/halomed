'use client';

import { useTranslation } from '@/lib/i18n';
import { usePreferences } from '@/lib/hooks/usePreferences';

type Pace = 'one_mishna' | 'two_mishna' | 'one_chapter';
type ReviewIntensity = 'none' | 'light' | 'medium' | 'intensive';

interface StudyPlanCardProps {
  onChangePlan: () => void;
}

// Edit icon
function EditIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

// Book icon for pace
function BookIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

// Repeat icon for review intensity
function RepeatIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

const PACE_LABELS: Record<Pace, string> = {
  one_mishna: 'pace_one_mishna_short',
  two_mishna: 'pace_two_mishna_short',
  one_chapter: 'pace_one_chapter_short',
};

const REVIEW_LABELS: Record<ReviewIntensity, string> = {
  none: 'review_none_short',
  light: 'review_light_short',
  medium: 'review_medium_short',
  intensive: 'review_intensive_short',
};

export function StudyPlanCard({ onChangePlan }: StudyPlanCardProps) {
  const { t } = useTranslation();
  const { preferences, loading } = usePreferences();

  if (loading) {
    return (
      <div className="bg-white/80 dark:bg-gray-800/50 rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return null; // User hasn't completed onboarding
  }

  const pace = preferences.pace as Pace;
  const reviewIntensity = preferences.review_intensity as ReviewIntensity;

  return (
    <div className="bg-white/80 dark:bg-gray-800/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-source text-lg font-semibold text-[var(--text-primary)]">
          {t('profile_study_plan_title')}
        </h2>
        <button
          onClick={onChangePlan}
          className="flex items-center gap-2 px-3 py-2 text-desert-oasis-accent hover:bg-desert-oasis-accent/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-oasis-accent focus-visible:ring-offset-2"
          aria-label={t('profile_change_plan')}
        >
          <EditIcon className="w-4 h-4" />
          <span className="font-explanation text-sm font-medium">
            {t('profile_change_plan')}
          </span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Pace */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-desert-oasis-accent/10 dark:bg-desert-oasis-accent/20 flex items-center justify-center">
            <BookIcon className="text-desert-oasis-accent" />
          </div>
          <div>
            <p className="font-explanation text-sm text-[var(--text-secondary)]">
              {t('pace_label')}
            </p>
            <p className="font-explanation text-base font-medium text-[var(--text-primary)]">
              {t(PACE_LABELS[pace] as any)}
            </p>
          </div>
        </div>

        {/* Review Intensity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-desert-oasis-accent/10 dark:bg-desert-oasis-accent/20 flex items-center justify-center">
            <RepeatIcon className="text-desert-oasis-accent" />
          </div>
          <div>
            <p className="font-explanation text-sm text-[var(--text-secondary)]">
              {t('review_intensity_label')}
            </p>
            <p className="font-explanation text-base font-medium text-[var(--text-primary)]">
              {t(REVIEW_LABELS[reviewIntensity] as any)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
