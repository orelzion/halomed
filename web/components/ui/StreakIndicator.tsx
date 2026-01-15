'use client';

import { useTranslation } from '@/lib/i18n';

interface StreakIndicatorProps {
  streak: number;
  trackId: string;
}

export function StreakIndicator({ streak, trackId }: StreakIndicatorProps) {
  const { t } = useTranslation();

  if (streak === 0) {
    return null;
  }

  return (
    <div
      id="streak_indicator"
      className="flex items-center gap-2 text-desert-oasis-accent"
      data-testid={`streak_indicator_${trackId}`}
    >
      <span className="text-xl">🔥</span>
      <span className="font-explanation text-sm">
        {t('streak_count', { count: streak })}
      </span>
    </div>
  );
}
