'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useStudyUnit } from '@/lib/hooks/useStudyUnit';
import { formatContentRef, formatDateDual } from '@/lib/utils/date-format';
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
  // Get today's study unit to display the Hebrew reference
  const { studyUnit } = useStudyUnit(track.id);
  const todayContentRef = formatContentRef(
    studyUnit?.content?.ref_id || null,
    studyUnit?.content?.he_ref || null
  );

  const handleClick = () => {
    router.push(`/study/${track.id}`);
  };

  const handleScheduleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    router.push(`/schedule/${track.id}`);
  };

  return (
    <div
      id="track_card"
      data-testid={`track_card_${track.id}`}
      onClick={handleClick}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]
        ${hasStudiedToday 
          ? 'bg-gradient-to-br from-desert-oasis-card to-desert-oasis-accent/10 dark:from-desert-oasis-dark-card dark:to-desert-oasis-accent/20 ring-2 ring-desert-oasis-accent/30' 
          : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card shadow-lg'
        }
      `}
    >
      {/* Decorative accent bar */}
      <div className={`absolute top-0 right-0 w-1.5 h-full ${hasStudiedToday ? 'bg-desert-oasis-accent' : 'bg-desert-oasis-accent/30'}`} />
      
      <div className="flex">
        {/* Completion Status (appears on right in RTL) */}
        <div className="flex flex-col items-center justify-center px-4 border-l border-desert-oasis-muted/50 dark:border-gray-600/30" data-testid={`streak_indicator_${track.id}`}>
          <div
            className={`
              flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 shadow-sm
              ${hasStudiedToday 
                ? 'bg-desert-oasis-accent/20 dark:bg-desert-oasis-accent/30' 
                : 'bg-desert-oasis-muted/20 dark:bg-gray-700/30'
              }
            `}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-all duration-300 ${hasStudiedToday ? 'text-desert-oasis-accent' : 'text-[var(--text-secondary)] opacity-30'}`}
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          {streak > 0 && (
            <span className={`text-sm font-source font-bold mt-1 ${hasStudiedToday ? 'text-desert-oasis-accent' : 'text-[var(--text-secondary)]'}`}>
              {streak}
            </span>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 py-4 px-5">
          <h2 className="text-xl font-source font-bold text-[var(--text-primary)] leading-tight">
            {track.title}
          </h2>
          {todayContentRef && (
            <p className="text-base font-source text-[var(--text-secondary)] mt-0.5">
              {todayContentRef}
            </p>
          )}
          <p className="text-sm font-explanation text-[var(--text-secondary)] mt-1">
            {formatDateDual(new Date().toISOString().split('T')[0])}
          </p>
        </div>

        {/* Schedule Button (appears on left in RTL) */}
        <div className="flex items-center justify-center px-4 border-r border-desert-oasis-muted/50 dark:border-gray-600/30">
          <button
            onClick={handleScheduleClick}
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-desert-oasis-accent/15 hover:bg-desert-oasis-accent/25 dark:bg-desert-oasis-accent/25 dark:hover:bg-desert-oasis-accent/35 transition-all duration-200 shadow-sm hover:shadow-md"
            aria-label={t('view_schedule')}
            title={t('view_schedule')}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-desert-oasis-accent"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
