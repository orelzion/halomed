'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import posthog from 'posthog-js';
import { DeleteAccountDialog } from '@/components/ui/DeleteAccountDialog';
import { StudyPlanCard } from '@/components/ui/StudyPlanCard';
import { ChangePlanDialog } from '@/components/ui/ChangePlanDialog';
import { useTranslation } from '@/lib/i18n';

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

// Download icon
function DownloadIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

// Delete icon
function DeleteIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, session } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isChangePlanDialogOpen, setIsChangePlanDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleDownloadData = async () => {
    if (!session) {
      setMessage({ type: 'error', text: 'נדרשת התחברות להורדת נתונים' });
      return;
    }

    setIsDownloading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      // Create a blob and download it
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `halomed-export-${user?.id}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'הנתונים הורדו בהצלחה' });
      posthog.capture('user_data_exported');
    } catch (error) {
      console.error('Error downloading data:', error);
      posthog.captureException(error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'שגיאה בהורדת הנתונים' 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session) {
      setMessage({ type: 'error', text: 'נדרשת התחברות למחיקת חשבון' });
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      // Capture deletion event before signing out
      posthog.capture('user_account_deleted');
      posthog.reset();

      // Sign out and redirect
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      posthog.captureException(error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'שגיאה במחיקת החשבון' 
      });
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
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

        {/* Study Plan Card */}
        <div className="mb-6">
          <StudyPlanCard onChangePlan={() => setIsChangePlanDialogOpen(true)} />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-4 p-4 bg-white/80 dark:bg-gray-800/50 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group disabled:opacity-50"
          >
            <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
              <LogoutIcon className="text-red-600 dark:text-red-400 w-5 h-5" aria-hidden="true" />
            </div>
            <span className="font-explanation text-red-600 dark:text-red-400 font-semibold">
              {isLoggingOut ? 'מתנתק...' : 'התנתק'}
            </span>
          </button>
        </div>

        {/* Privacy Rights Section */}
        <div className="mt-8">
          <h2 className="font-source text-lg font-semibold text-[var(--text-primary)] mb-4">
            זכויות פרטיות
          </h2>
          <div className="space-y-3">
            {/* Download Data button */}
            <button
              onClick={handleDownloadData}
              disabled={isDownloading || isAnonymous}
              className="w-full flex items-center gap-4 p-4 bg-white/80 dark:bg-gray-800/50 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <DownloadIcon className="text-blue-600 dark:text-blue-400 w-5 h-5" aria-hidden="true" />
              </div>
              <span className="font-explanation text-blue-600 dark:text-blue-400 font-semibold">
                {isDownloading ? 'מוריד...' : 'הורד את הנתונים שלי'}
              </span>
            </button>

            {/* Delete Account button */}
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isDeleting || isAnonymous}
              className="w-full flex items-center gap-4 p-4 bg-white/80 dark:bg-gray-800/50 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                <DeleteIcon className="text-red-600 dark:text-red-400 w-5 h-5" aria-hidden="true" />
              </div>
              <span className="font-explanation text-red-600 dark:text-red-400 font-semibold">
                מחק את החשבון שלי
              </span>
            </button>
          </div>

          {/* Success/Error message */}
          {message && (
            <div className={`mt-4 p-4 rounded-xl ${
              message.type === 'success' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            }`}>
              <p className="font-explanation text-sm">{message.text}</p>
            </div>
          )}
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

        {/* Delete Account Dialog */}
        <DeleteAccountDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteAccount}
        />

        {/* Change Plan Dialog */}
        <ChangePlanDialog
          isOpen={isChangePlanDialogOpen}
          onClose={() => setIsChangePlanDialogOpen(false)}
          onSuccess={() => {
            setMessage({ type: 'success', text: t('change_plan_success') });
          }}
        />
      </div>
    </div>
  );
}
