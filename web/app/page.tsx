'use client';

import { PathScreen } from '@/components/screens/PathScreen';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading } = useAuthContext();
  const { preferences, loading: prefsLoading } = usePreferences();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Only redirect to onboarding if preferences don't exist in RxDB
    // RxDB is the source of truth
    if (!loading && !prefsLoading && user && !preferences) {
      router.push('/onboarding');
    }
  }, [user, loading, prefsLoading, preferences, router]);

  if (loading || prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <p className="text-desert-oasis-accent">טוען...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  if (!preferences) {
    return null; // Will redirect to onboarding
  }

  return <PathScreen />;
}
