'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { usePath } from '@/lib/hooks/usePath';
import { supabase } from '@/lib/supabase/client';
import posthog from 'posthog-js';
import { Mascot } from '@/components/ui/Mascot';

type Pace = 'one_mishna' | 'two_mishna' | 'one_chapter';
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
  const { nodes: existingPath, loading: pathLoading } = usePath();

  // Check if user already has preferences or path in PowerSync (source of truth)
  useEffect(() => {
    if (!loading && !prefsLoading && !pathLoading && user) {
      // If user has preferences OR a path, they've already completed onboarding
      if (existingPrefs || (existingPath && existingPath.length > 0)) {
        console.log('[Onboarding] User already has preferences or path in PowerSync, redirecting to home', {
          hasPrefs: !!existingPrefs,
          hasPath: existingPath && existingPath.length > 0
        });
        router.replace('/');
      }
    }
  }, [user, loading, prefsLoading, pathLoading, existingPrefs, existingPath, router]);

  if (loading || prefsLoading || pathLoading) {
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
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      // Save user preferences (upsert in case they already exist)
      console.log('[Onboarding] Upserting preferences:', { user_id: user.id, pace, review_intensity: reviewIntensity });
      const { data: insertedPrefs, error: prefError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          pace,
          review_intensity: reviewIntensity,
          streak_count: 0,
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (prefError) {
        console.error('[Onboarding] Error upserting preferences:', prefError);
        throw prefError;
      }
      console.log('[Onboarding] Preferences saved successfully:', insertedPrefs);

      // Generate learning path (if it doesn't already exist)
      const pathResponse = await fetch('/api/generate-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      const pathResult = await pathResponse.json();
      
      // If path already exists, that's okay - user might be re-doing onboarding or linking account
      if (!pathResponse.ok) {
        const errorDetails = pathResult.details || pathResult.message || pathResult.error || '';
        if (errorDetails.includes('already exists') || errorDetails.includes('already')) {
          console.log('[Onboarding] Path already exists, continuing...');
        } else {
          console.error('[Onboarding] Error generating path:', pathResult);
          throw new Error(pathResult.error || 'Failed to generate path');
        }
      } else {
        console.log('[Onboarding] Path generation result:', pathResult);
      }

      // Preferences and path saved successfully to Supabase
      // PowerSync will sync automatically in the background
      console.log('[Onboarding] Preferences and path saved, redirecting to home');

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
            
            <button
              onClick={() => handlePaceSelect('one_mishna')}
              className={`w-full p-6 rounded-2xl text-right transition-all ${
                pace === 'one_mishna'
                  ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
                  : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card hover:shadow-md'
              }`}
            >
              <div className="font-explanation text-lg font-semibold mb-1">
                {t('pace_one_mishna')}
              </div>
              <div className="font-explanation text-sm opacity-80">
                {t('pace_one_mishna_desc')}
              </div>
            </button>

            <button
              onClick={() => handlePaceSelect('two_mishna')}
              className={`w-full p-6 rounded-2xl text-right transition-all ${
                pace === 'two_mishna'
                  ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
                  : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card hover:shadow-md'
              }`}
            >
              <div className="font-explanation text-lg font-semibold mb-1">
                {t('pace_two_mishna')}
              </div>
              <div className="font-explanation text-sm opacity-80">
                {t('pace_two_mishna_desc')}
              </div>
            </button>

            <button
              onClick={() => handlePaceSelect('one_chapter')}
              className={`w-full p-6 rounded-2xl text-right transition-all ${
                pace === 'one_chapter'
                  ? 'bg-desert-oasis-accent text-white ring-2 ring-desert-oasis-accent/30'
                  : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card hover:shadow-md'
              }`}
            >
              <div className="font-explanation text-lg font-semibold mb-1">
                {t('pace_one_chapter')}
              </div>
              <div className="font-explanation text-sm opacity-80">
                {t('pace_one_chapter_desc')}
              </div>
            </button>
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
