'use client';

import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { Mascot } from '@/components/ui/Mascot';

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading, signInAnonymously, signInWithGoogle } = useAuthContext();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Check if user has seen intro (stored in localStorage)
  useEffect(() => {
    if (!loading && !user) {
      const hasSeenIntro = localStorage.getItem('halomed_seen_intro');
      if (!hasSeenIntro) {
        router.push('/welcome');
      }
    }
  }, [loading, user, router]);

  const handleAnonymousLogin = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const user = await signInAnonymously();

      // Identify user and capture sign-in event
      if (user) {
        posthog.identify(user.id, {
          is_anonymous: true,
        });
        posthog.capture('user_signed_in', {
          method: 'anonymous',
        });
      }

      router.push('/');
    } catch (err) {
      console.error('Anonymous login error:', err);
      posthog.captureException(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in anonymously';
      setError(errorMessage);
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('Google login error:', error);
        posthog.captureException(error);
        setIsSigningIn(false);
      }
      // OAuth redirect will happen automatically if successful
      // PostHog identification is handled in the auth callback
    } catch (error) {
      console.error('Google login error:', error);
      posthog.captureException(error);
      setIsSigningIn(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <div className="text-center">
          <Mascot mood="thinking" size="md" />
          <p className="text-desert-oasis-accent font-explanation mt-4">{t('syncing')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary p-4">
      <div className="max-w-md w-full bg-desert-oasis-card dark:bg-desert-oasis-dark-card rounded-xl p-8 shadow-lg">
        {/* Welcome mascot */}
        <div className="flex justify-center mb-4">
          <Mascot mood="happy" size="lg" />
        </div>
        
        <h1 className="text-3xl font-source text-center mb-6 text-[var(--text-primary)]">
          {t('login_title')}
        </h1>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl font-explanation text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={handleAnonymousLogin}
            disabled={isSigningIn}
            className="w-full py-4 px-6 bg-desert-oasis-muted hover:bg-desert-oasis-accent text-[var(--text-primary)] rounded-xl font-explanation text-lg transition-colors disabled:opacity-50"
          >
            {isSigningIn ? t('syncing') : t('continue_as_guest')}
          </button>

          <button
            onClick={handleGoogleLogin}
            disabled={isSigningIn}
            className="w-full py-4 px-6 bg-white hover:bg-gray-100 text-gray-800 rounded-xl font-explanation text-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('sign_in_with_google')}
          </button>

          <button
            disabled
            title="בקרוב - התחברות עם Apple"
            className="w-full py-4 px-6 bg-black/50 text-white/50 rounded-xl font-explanation text-lg cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            {t('sign_in_with_apple')}
            <span className="text-xs opacity-70">(בקרוב)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
