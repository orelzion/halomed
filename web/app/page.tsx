'use client';

import { HomeScreen } from '@/components/screens/HomeScreen';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <p className="text-desert-oasis-accent">טוען...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return <HomeScreen />;
}
