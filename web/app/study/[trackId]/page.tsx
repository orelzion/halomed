'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { StudyScreen } from '@/components/screens/StudyScreen';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StudyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const trackId = params.trackId as string;
  const studyDate = searchParams.get('date') || undefined;
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary">
        <p className="text-desert-oasis-accent">טוען...</p>
      </div>
    );
  }

  if (!trackId) {
    router.push('/');
    return null;
  }

  return <StudyScreen trackId={trackId} studyDate={studyDate} />;
}
