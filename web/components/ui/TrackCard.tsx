'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { StreakIndicator } from './StreakIndicator';
import type { Database } from '@/lib/powersync/schema';

type TrackRecord = Database['tracks'];

interface TrackCardProps {
  track: TrackRecord;
  streak: number;
  hasStudiedToday: boolean;
}

export function TrackCard({ track, streak, hasStudiedToday }: TrackCardProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleClick = () => {
    router.push(`/study/${track.id}`);
  };

  return (
    <div
      id="track_card"
      data-testid={`track_card_${track.id}`}
      onClick={handleClick}
      className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card rounded-xl p-6 shadow-md cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-source text-[var(--text-primary)]">
          {track.title}
        </h2>
        <StreakIndicator streak={streak} trackId={track.id} />
      </div>

      <div className="mt-4">
        {hasStudiedToday ? (
          <p className="text-desert-oasis-accent font-explanation">
            {t('studied_today')}
          </p>
        ) : (
          <p className="text-[var(--text-secondary)] font-explanation">
            {t('have_you_studied_today')}
          </p>
        )}
      </div>
    </div>
  );
}
