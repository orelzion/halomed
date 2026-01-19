'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

interface StudyHeaderProps {
  title: string;
  onBack?: () => void;
  trackId?: string;
}

export function StudyHeader({ title, onBack, trackId }: StudyHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  const handleSchedule = () => {
    if (trackId) {
      router.push(`/schedule/${trackId}`);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary border-b border-desert-oasis-muted">
      <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-desert-oasis-card dark:hover:bg-desert-oasis-dark-card transition-colors"
          aria-label={t('back')}
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
        <h1 className="text-xl font-source font-bold text-[var(--text-primary)] flex-1 text-center">
          {title}
        </h1>
        {trackId ? (
          <button
            onClick={handleSchedule}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-desert-oasis-card dark:hover:bg-desert-oasis-dark-card transition-colors"
            aria-label={t('view_schedule') || 'צפה בלוח זמנים'}
            title={t('view_schedule') || 'צפה בלוח זמנים'}
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
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>
    </header>
  );
}
