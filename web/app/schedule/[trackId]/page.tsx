'use client';

import { useParams } from 'next/navigation';
import { ScheduleScreen } from '@/components/screens/ScheduleScreen';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SchedulePage() {
  const params = useParams();
  const trackId = params.trackId as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <p className="text-desert-oasis-accent">טוען...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  if (!trackId) {
    router.push('/');
    return null;
  }

  return <ScheduleScreen trackId={trackId} />;
}
