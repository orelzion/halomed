'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import posthog from 'posthog-js';

// Back arrow icon
function ArrowRightIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

// Logout icon
function LogoutIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

// User icon
function UserIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, session } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      // Capture logout event before signing out
      posthog.capture('user_signed_out');

      await supabase.auth.signOut();

      // Reset PostHog identification after sign out
      posthog.reset();

      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      posthog.captureException(error);
      setIsLoggingOut(false);
    }
  };

  // Get user display info
  const email = user?.email;
  const isAnonymous = !email;
  const displayName = email || 'משתמש אנונימי';

  return (
    <div className="min-h-screen bg-gradient-to-b from-desert-oasis-primary to-desert-oasis-secondary dark:from-desert-oasis-dark-primary dark:to-desert-oasis-dark-secondary">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-desert-oasis-primary/95 dark:bg-desert-oasis-dark-primary/95 backdrop-blur-sm border-b border-desert-oasis-muted/20 dark:border-gray-700/30">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 -m-2 rounded-full hover:bg-desert-oasis-muted/20 dark:hover:bg-gray-700/30 transition-colors"
            >
              <ArrowRightIcon className="text-[var(--text-primary)]" />
            </button>
            <h1 className="text-2xl font-source font-bold text-[var(--text-primary)]">
              פרופיל
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* User info card */}
        <div className="bg-white/80 dark:bg-gray-800/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-desert-oasis-accent/20 dark:bg-desert-oasis-accent/30 flex items-center justify-center">
              <UserIcon className="text-desert-oasis-accent" />
            </div>
            <div className="flex-1">
              <p className="font-source text-lg text-[var(--text-primary)]">
                {displayName}
              </p>
              {isAnonymous && (
                <p className="font-explanation text-sm text-[var(--text-secondary)]">
                  התחבר כדי לשמור את ההתקדמות שלך
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-4 p-4 bg-white/80 dark:bg-gray-800/50 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
              <LogoutIcon className="text-red-600 dark:text-red-400 w-5 h-5" />
            </div>
            <span className="font-explanation text-red-600 dark:text-red-400 font-semibold">
              {isLoggingOut ? 'מתנתק...' : 'התנתק'}
            </span>
          </button>
        </div>

        {/* Future sections placeholder */}
        {/* 
        <div className="mt-8">
          <h2 className="font-source text-lg font-semibold text-[var(--text-primary)] mb-4">
            הגדרות
          </h2>
          <div className="space-y-3">
            Settings items will go here
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-source text-lg font-semibold text-[var(--text-primary)] mb-4">
            סטטיסטיקות
          </h2>
          <div className="space-y-3">
            Stats will go here
          </div>
        </div>
        */}
      </div>
    </div>
  );
}
