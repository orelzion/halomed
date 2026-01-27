'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { useSync } from '@/components/providers/SyncProvider';
import { getDatabase } from '@/lib/database/database';
import posthog from 'posthog-js';
import { Mascot } from '@/components/ui/Mascot';
import { getPaceOptions, type Pace as PaceType } from '@shared/lib/path-generator';

type Pace = 'one_chapter' | 'seder_per_year' | 'two_mishna';
type ReviewIntensity = 'none' | 'light' | 'medium' | 'intensive';
type OnboardingStep = 'pace' | 'review';

export default function OnboardingPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<OnboardingStep>('pace');
  const [pace, setPace] = useState<Pace | null>(null);
  const [reviewIntensity, setReviewIntensity] = useState<ReviewIntensity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { preferences: existingPrefs, loading: prefsLoading } = usePreferences();
  const { triggerSync } = useSync();

  // Check if user already has preferences (position-based model - no separate path)
  // Don't redirect if we're in the middle of submitting (handleStart is running)
  useEffect(() => {
    if (!loading && !prefsLoading && user && !isSubmitting) {
      // If user has preferences, they've already completed onboarding
      if (existingPrefs) {
        console.log('[Onboarding] User already has preferences, redirecting to home');
        router.replace('/');
      }
    }
  }, [user, loading, prefsLoading, existingPrefs, router, isSubmitting]);

  if (loading || prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <p className="text-desert-oasis-accent">טוען...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const handlePaceSelect = (selectedPace: Pace) => {
    setPace(selectedPace);
    setStep('review');

    // Capture pace selection event
    posthog.capture('onboarding_pace_selected', {
      pace: selectedPace,
    });
  };

  const handleReviewSelect = (selectedIntensity: ReviewIntensity) => {
    setReviewIntensity(selectedIntensity);
  };

  const handleStart = async () => {
    if (!pace || !reviewIntensity || !user) return;

    setIsSubmitting(true);
    try {
      // Get database
      const db = await getDatabase();
      if (!db) {
        throw new Error('Database not available');
      }

      // Save user preferences with position-based fields
      // No need to generate path rows - everything is computed from position!
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const prefsDoc = {
        id: crypto.randomUUID(),
        user_id: user.id,
        pace,
        review_intensity: reviewIntensity,
        streak_count: 0,
        current_content_index: 0, // Starting position
        path_start_date: today,   // Start date for computing unlock dates
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _deleted: false,
      };
      
      console.log('[Onboarding] Saving preferences with position:', prefsDoc);
      await db.user_preferences.upsert(prefsDoc);
      console.log('[Onboarding] Preferences saved to local RxDB');

      // Sync preferences to Supabase
      console.log('[Onboarding] Triggering sync...');
      await triggerSync();
      console.log('[Onboarding] Sync completed');

      // Capture onboarding completed event
      posthog.capture('onboarding_completed', {
        pace: pace,
        review_intensity: reviewIntensity,
      });

      router.replace('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      posthog.captureException(error);
      alert('שגיאה בהתחלת הלימוד. נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary p-4 flex flex-col">
      <div className="max-w-2xl mx-auto flex-1 flex flex-col w-full">

        {/* Pace selection step */}
        {step === 'pace' && (
          <>
            {/* Welcome mascot */}
            <div className="flex justify-center mb-6 mt-8">
              <Mascot mood="happy" size="lg" />
            </div>
            
            <h1 className="text-2xl font-source text-center mb-2 text-[var(--text-primary)]">
              {t('onboarding_welcome')}
            </h1>
            <p className="text-center mb-6 text-[var(--text-secondary)] font-explanation">
              {t('onboarding_subtitle')}
            </p>
          </>
        )}

        {step === 'pace' && (
          <div className="space-y-4">
            <h2 className="text-xl font-explanation font-semibold mb-4 text-[var(--text-primary)]">
              בחרו קצב לימוד
            </h2>
            
            {/* Fast pace - Chapter per day (~2 years) */}
            {(() => {
              const paceOptions = getPaceOptions(new Date());
              const chapterOption = paceOptions.find(p => p.pace === 'one_chapter')!;
              const finishYear = chapterOption.estimate.finishDate.getFullYear();
              const finishMonth = chapterOption.estimate.finishDate.toLocaleDateString('he-IL', { month: 'long' });
              return (
                <button
                  onClick={() => handlePaceSelect('one_chapter')}
                  className={`w-full p-6 rounded-2xl text-right transition-all ${
                    pace === 'one_chapter'
                      ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
                      : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pace === 'one_chapter' ? 'bg-white/20' : 'bg-desert-oasis-accent/10 text-desert-oasis-accent'
                    }`}>
                      מהיר
                    </span>
                    <div className="text-left">
                      <div className="font-explanation text-lg font-semibold mb-1">
                        {chapterOption.label}
                      </div>
                      <div className="font-explanation text-sm opacity-80">
                        ~{chapterOption.estimate.itemsPerDay} משניות ביום
                      </div>
                    </div>
                  </div>
                  <div className={`mt-3 pt-3 border-t ${pace === 'one_chapter' ? 'border-white/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="font-explanation text-sm">
                      <span className="font-semibold">~{chapterOption.estimate.years} שנים</span>
                      <span className="opacity-70"> • סיום משוער: {finishMonth} {finishYear}</span>
                    </div>
                  </div>
                </button>
              );
            })()}

            {/* Medium pace - Seder per year (~6 years) */}
            {(() => {
              const paceOptions = getPaceOptions(new Date());
              const sederOption = paceOptions.find(p => p.pace === 'seder_per_year')!;
              const finishYear = sederOption.estimate.finishDate.getFullYear();
              const finishMonth = sederOption.estimate.finishDate.toLocaleDateString('he-IL', { month: 'long' });
              return (
                <button
                  onClick={() => handlePaceSelect('seder_per_year')}
                  className={`w-full p-6 rounded-2xl text-right transition-all ${
                    pace === 'seder_per_year'
                      ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
                      : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pace === 'seder_per_year' ? 'bg-white/20' : 'bg-desert-oasis-accent/10 text-desert-oasis-accent'
                    }`}>
                      מאוזן
                    </span>
                    <div className="text-left">
                      <div className="font-explanation text-lg font-semibold mb-1">
                        {sederOption.label}
                      </div>
                      <div className="font-explanation text-sm opacity-80">
                        2-4 משניות ביום (משתנה לפי סדר)
                      </div>
                    </div>
                  </div>
                  <div className={`mt-3 pt-3 border-t ${pace === 'seder_per_year' ? 'border-white/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="font-explanation text-sm">
                      <span className="font-semibold">~{sederOption.estimate.years} שנים</span>
                      <span className="opacity-70"> • סיום משוער: {finishMonth} {finishYear}</span>
                    </div>
                  </div>
                </button>
              );
            })()}

            {/* Slow pace - Two mishna per day (~8 years) */}
            {(() => {
              const paceOptions = getPaceOptions(new Date());
              const twoMishnaOption = paceOptions.find(p => p.pace === 'two_mishna')!;
              const finishYear = twoMishnaOption.estimate.finishDate.getFullYear();
              const finishMonth = twoMishnaOption.estimate.finishDate.toLocaleDateString('he-IL', { month: 'long' });
              return (
                <button
                  onClick={() => handlePaceSelect('two_mishna')}
                  className={`w-full p-6 rounded-2xl text-right transition-all ${
                    pace === 'two_mishna'
                      ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
                      : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pace === 'two_mishna' ? 'bg-white/20' : 'bg-desert-oasis-accent/10 text-desert-oasis-accent'
                    }`}>
                      מעמיק
                    </span>
                    <div className="text-left">
                      <div className="font-explanation text-lg font-semibold mb-1">
                        {twoMishnaOption.label}
                      </div>
                      <div className="font-explanation text-sm opacity-80">
                        {twoMishnaOption.estimate.itemsPerDay} משניות ביום
                      </div>
                    </div>
                  </div>
                  <div className={`mt-3 pt-3 border-t ${pace === 'two_mishna' ? 'border-white/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="font-explanation text-sm">
                      <span className="font-semibold">~{twoMishnaOption.estimate.years} שנים</span>
                      <span className="opacity-70"> • סיום משוער: {finishMonth} {finishYear}</span>
                    </div>
                  </div>
                </button>
              );
            })()}
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('pace')}
              className="mb-4 text-desert-oasis-accent hover:underline"
            >
              ← חזור
            </button>

            {/* Review mascot */}
            <div className="flex justify-center mb-4">
              <Mascot mood="thinking" size="md" />
            </div>

            <h2 className="text-xl font-explanation font-semibold mb-2 text-[var(--text-primary)] text-center">
              {t('review_intensity_title')}
            </h2>
            <p className="text-sm mb-6 text-[var(--text-secondary)] text-center">
              {t('review_intensity_subtitle')}
            </p>

            <button
              onClick={() => handleReviewSelect('none')}
              className={`w-full p-6 rounded-2xl text-right transition-all ${
                reviewIntensity === 'none'
                  ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
                  : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card hover:shadow-md'
              }`}
            >
              <div className="font-explanation text-lg font-semibold mb-1">
                {t('review_none')}
              </div>
              <div className="font-explanation text-sm opacity-80">
                {t('review_none_desc')}
              </div>
            </button>

            <button
              onClick={() => handleReviewSelect('light')}
              className={`w-full p-6 rounded-2xl text-right transition-all ${
                reviewIntensity === 'light'
                  ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
                  : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card hover:shadow-md'
              }`}
            >
              <div className="font-explanation text-lg font-semibold mb-1">
                {t('review_light')}
              </div>
              <div className="font-explanation text-sm opacity-80">
                {t('review_light_desc')}
              </div>
            </button>

            <button
              onClick={() => handleReviewSelect('medium')}
              className={`w-full p-6 rounded-2xl text-right transition-all ${
                reviewIntensity === 'medium'
                  ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
                  : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card hover:shadow-md'
              }`}
            >
              <div className="font-explanation text-lg font-semibold mb-1">
                {t('review_medium')}
              </div>
              <div className="font-explanation text-sm opacity-80">
                {t('review_medium_desc')}
              </div>
            </button>

            <button
              onClick={() => handleReviewSelect('intensive')}
              className={`w-full p-6 rounded-2xl text-right transition-all ${
                reviewIntensity === 'intensive'
                  ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
                  : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card hover:shadow-md'
              }`}
            >
              <div className="font-explanation text-lg font-semibold mb-1">
                {t('review_intensive')}
              </div>
              <div className="font-explanation text-sm opacity-80">
                {t('review_intensive_desc')}
              </div>
            </button>

            {reviewIntensity && (
              <button
                onClick={handleStart}
                disabled={isSubmitting}
                className="w-full mt-8 p-4 bg-desert-oasis-accent text-white rounded-xl font-explanation text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'טוען...' : t('onboarding_start')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
