'use client';

import { useTracks } from '@/lib/hooks/useTracks';
import { useStreaks } from '@/lib/hooks/useStreak';
import { TrackCard } from '@/components/ui/TrackCard';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTranslation } from '@/lib/i18n';

export function HomeScreen() {
  const { t } = useTranslation();
  const { tracks, completedToday, loading } = useTracks();
  const { streaks } = useStreaks();
  // Debug panel removed after diagnosis

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <p className="text-desert-oasis-accent">{t('syncing')}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-source text-center flex-1 text-[var(--text-primary)]">
          {t('app_name')}
        </h1>
        <div className="ml-4">
          <ThemeToggle />
        </div>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {tracks.length === 0 ? (
          <p className="text-center text-[var(--text-secondary)] font-explanation">
            {t('no_study_today')}
          </p>
        ) : (
          tracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              streak={streaks[track.id] || 0}
              hasStudiedToday={completedToday.includes(track.id)}
            />
          ))
        )}
      </div>
    </main>
  );
}
