'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useSchedule } from '@/lib/hooks/useSchedule';
import { formatDateDual, formatContentRef, isToday, isPast } from '@/lib/utils/date-format';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface ScheduleScreenProps {
  trackId: string;
}

export function ScheduleScreen({ trackId }: ScheduleScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { units, loading, error } = useSchedule(trackId);

  const handleUnitClick = (unit: { study_date: string }) => {
    router.push(`/study/${trackId}?date=${unit.study_date}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <p className="text-desert-oasis-accent">{t('syncing')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary p-4">
        <p className="text-red-500 mb-4">{t('error_generic')}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-desert-oasis-accent text-white rounded-lg"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  // Group units by past/today/future
  const today = new Date().toISOString().split('T')[0];
  const pastUnits = units.filter(u => isPast(u.study_date));
  const todayUnits = units.filter(u => isToday(u.study_date));
  const futureUnits = units.filter(u => !isPast(u.study_date) && !isToday(u.study_date));

  return (
    <div
      id="schedule_page"
      data-testid="schedule_page"
      className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary"
    >
      {/* Header */}
      <div className="sticky top-0 bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary z-10 border-b border-desert-oasis-muted dark:border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-desert-oasis-card dark:hover:bg-desert-oasis-dark-card transition-colors"
            aria-label="חזור"
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
              className="text-[var(--text-primary)]"
              style={{ transform: 'scaleX(-1)' }}
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-source text-[var(--text-primary)]">
            {t('schedule_title')}
          </h1>
          <ThemeToggle />
        </div>
      </div>

      {/* Schedule List */}
      <div
        id="schedule_list"
        data-testid="schedule_list"
        className="max-w-2xl mx-auto p-4 space-y-6"
      >
        {units.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)] font-explanation">
              {t('schedule_empty')}
            </p>
          </div>
        ) : (
          <>
            {/* Past Units */}
            {pastUnits.length > 0 && (
              <div>
                <h2 className="text-lg font-source text-[var(--text-secondary)] mb-3">
                  {t('schedule_past')}
                </h2>
                <div className="space-y-2">
                  {pastUnits.map((unit) => (
                    <ScheduleUnit
                      key={unit.id}
                      unit={unit}
                      onClick={() => handleUnitClick(unit)}
                      isToday={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Today */}
            {todayUnits.length > 0 && (
              <div>
                <h2 className="text-lg font-source text-desert-oasis-accent mb-3">
                  {t('schedule_today')}
                </h2>
                <div className="space-y-2">
                  {todayUnits.map((unit) => (
                    <ScheduleUnit
                      key={unit.id}
                      unit={unit}
                      onClick={() => handleUnitClick(unit)}
                      isToday={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Future Units */}
            {futureUnits.length > 0 && (
              <div>
                <h2 className="text-lg font-source text-[var(--text-secondary)] mb-3">
                  {t('schedule_future')}
                </h2>
                <div className="space-y-2">
                  {futureUnits.map((unit) => (
                    <ScheduleUnit
                      key={unit.id}
                      unit={unit}
                      onClick={() => handleUnitClick(unit)}
                      isToday={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Progress Indicator */}
            <div
              id="progress_indicator"
              data-testid="progress_indicator"
              className="mt-8 pt-6 border-t border-desert-oasis-muted dark:border-gray-700"
            >
              <div className="flex justify-between items-center text-sm font-explanation text-[var(--text-secondary)]">
                <span>
                  {units.filter(u => u.is_completed).length} / {units.length} {t('schedule_completed')}
                </span>
                <span>
                  {Math.round((units.filter(u => u.is_completed).length / units.length) * 100)}%
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ScheduleUnitProps {
  unit: {
    id: string;
    study_date: string;
    content_ref_id: string | null;
    content_he_ref: string | null;
    is_completed: boolean;
  };
  onClick: () => void;
  isToday: boolean;
}

function ScheduleUnit({ unit, onClick, isToday }: ScheduleUnitProps) {
  const dateFormatted = formatDateDual(unit.study_date);
  
  // Debug: Log he_ref availability
  if (unit.content_ref_id && !unit.content_he_ref) {
    console.log(`[ScheduleUnit] Missing he_ref for ref_id: ${unit.content_ref_id}`);
  }
  
  const contentFormatted = formatContentRef(unit.content_ref_id, unit.content_he_ref);

  return (
    <div
      id="schedule_unit"
      data-testid={`schedule_unit_${unit.id}`}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]
        ${unit.is_completed 
          ? 'bg-gradient-to-br from-desert-oasis-card to-desert-oasis-accent/10 dark:from-desert-oasis-dark-card dark:to-desert-oasis-accent/20 ring-2 ring-desert-oasis-accent/30' 
          : isToday
            ? 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card shadow-lg ring-2 ring-desert-oasis-accent'
            : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card shadow-md'
        }
      `}
    >
      {/* Decorative accent bar */}
      <div className={`absolute top-0 right-0 w-1.5 h-full ${unit.is_completed ? 'bg-desert-oasis-accent' : 'bg-desert-oasis-accent/30'}`} />
      
      <div className="flex">
        {/* Completion Status - Vertically Centered */}
        <div 
          id="completion_status"
          data-testid={`completion_status_${unit.id}`}
          className="flex flex-col items-center justify-center px-4 border-l border-desert-oasis-muted/50 dark:border-gray-600/30"
        >
          <div
            className={`
              flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 shadow-sm
              ${unit.is_completed 
                ? 'bg-desert-oasis-accent/20 dark:bg-desert-oasis-accent/30' 
                : 'bg-desert-oasis-muted/20 dark:bg-gray-700/30'
              }
            `}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-all duration-300 ${unit.is_completed ? 'text-desert-oasis-accent' : 'text-[var(--text-secondary)] opacity-30'}`}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4">
          {/* Content Reference */}
          {contentFormatted && (
            <p className="text-base font-source font-semibold text-[var(--text-primary)]">
              {contentFormatted}
            </p>
          )}
          
          {/* Date */}
          <p className="text-sm font-explanation text-[var(--text-secondary)] mt-1">
            {dateFormatted}
          </p>
        </div>
      </div>
    </div>
  );
}
