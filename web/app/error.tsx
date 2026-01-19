'use client';

import { useEffect } from 'react';
import { Mascot } from '@/components/ui/Mascot';
import posthog from 'posthog-js';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to PostHog
    posthog.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-desert-oasis-primary to-desert-oasis-secondary dark:from-desert-oasis-dark-primary dark:to-desert-oasis-dark-secondary p-4">
      <div className="text-center max-w-md">
        <Mascot mood="sad" size="lg" />
        
        <h1 className="text-2xl font-source font-bold text-[var(--text-primary)] mt-6 mb-2">
          אופס! משהו השתבש
        </h1>
        
        <p className="text-[var(--text-secondary)] font-explanation mb-6">
          קרתה שגיאה בלתי צפויה. אנחנו מצטערים על אי הנוחות.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-desert-oasis-accent hover:bg-desert-oasis-accent/90 text-white rounded-xl font-explanation font-semibold transition-colors"
          >
            נסה שוב
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-6 py-3 bg-desert-oasis-muted/30 hover:bg-desert-oasis-muted/50 text-[var(--text-primary)] rounded-xl font-explanation transition-colors"
          >
            חזור לדף הבית
          </button>
        </div>
      </div>
    </div>
  );
}
