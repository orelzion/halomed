'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import posthog from 'posthog-js';
import { DeleteAccountDialog } from '@/components/ui/DeleteAccountDialog';
import { StudyPlanCard } from '@/components/ui/StudyPlanCard';
import { ChangePlanDialog } from '@/components/ui/ChangePlanDialog';
import { useTranslation } from '@/lib/i18n';

// Google icon
function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24">
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
  );
}

// Apple icon
function AppleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

// Link icon
function LinkIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

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

// Chart icon for analytics
function ChartIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, session, linkGoogleIdentity } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isChangePlanDialogOpen, setIsChangePlanDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAdminOrDev, setIsAdminOrDev] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('user_roles').select('role').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data?.role === 'admin') setIsAdminOrDev(true);
        });
    }
  }, [user]);

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

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    setMessage(null);
    try {
      const { error } = await linkGoogleIdentity();
      if (error) {
        throw error;
      }
      // OAuth redirect will happen automatically if successful
      posthog.capture('account_link_started', { provider: 'google' });
    } catch (error) {
      console.error('Error linking Google account:', error);
      posthog.captureException(error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'שגיאה בקישור החשבון',
      });
      setIsLinkingGoogle(false);
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
              onClick={() => router.push('/')}
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
                  קשר חשבון כדי לשמור את ההתקדמות שלך
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Connect Account Section - Only for anonymous users */}
        {isAnonymous && (
          <div className="bg-gradient-to-br from-desert-oasis-accent/10 to-desert-oasis-accent/5 dark:from-desert-oasis-accent/20 dark:to-desert-oasis-accent/10 border border-desert-oasis-accent/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-desert-oasis-accent/20 flex items-center justify-center">
                <LinkIcon className="text-desert-oasis-accent w-5 h-5" />
              </div>
              <div>
                <h2 className="font-source text-lg font-semibold text-[var(--text-primary)]">
                  קשר חשבון
                </h2>
                <p className="font-explanation text-sm text-[var(--text-secondary)]">
                  כל ההתקדמות שלך תישמר
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleLinkGoogle}
                disabled={isLinkingGoogle}
                className="w-full py-3 px-4 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-explanation transition-colors disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
              >
                <GoogleIcon />
                <span>{isLinkingGoogle ? 'מקשר...' : 'המשך עם Google'}</span>
              </button>

              <button
                disabled
                title="בקרוב - התחברות עם Apple"
                className="w-full py-3 px-4 bg-black/50 text-white/50 rounded-xl font-explanation cursor-not-allowed flex items-center justify-center gap-3 shadow-sm"
              >
                <AppleIcon />
                <span>המשך עם Apple</span>
                <span className="text-xs opacity-70">(בקרוב)</span>
              </button>
            </div>

            <p className="mt-4 text-xs text-center text-[var(--text-secondary)] font-explanation">
              הנתונים שלך ישמרו ותוכל להתחבר מכל מכשיר
            </p>
          </div>
        )}

        {/* Logout button */}
        <div className="mb-6">
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

        {/* Study Plan Card */}
        <div className="mb-6">
          <StudyPlanCard onChangePlan={() => setIsChangePlanDialogOpen(true)} />
        </div>

        {/* Admin Section - Only visible to admins or on localhost */}
        {isAdminOrDev && (
          <div className="mb-6">
            <h2 className="font-source text-lg font-semibold text-[var(--text-primary)] mb-4">
              ניהול
            </h2>
            <button
              onClick={() => router.push('/admin/analytics')}
              className="w-full flex items-center gap-4 p-4 bg-white/80 dark:bg-gray-800/50 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
            >
              <div className="w-11 h-11 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                <ChartIcon className="text-purple-600 dark:text-purple-400 w-5 h-5" aria-hidden="true" />
              </div>
              <span className="font-explanation text-purple-600 dark:text-purple-400 font-semibold">
                סטטיסטיקות
              </span>
            </button>
          </div>
        )}

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
