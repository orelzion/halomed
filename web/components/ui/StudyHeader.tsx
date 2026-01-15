'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

interface StudyHeaderProps {
  title: string;
  onBack?: () => void;
}

export function StudyHeader({ title, onBack }: StudyHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary border-b border-desert-oasis-muted">
      <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-desert-oasis-card dark:hover:bg-desert-oasis-dark-card transition-colors"
          aria-label={t('back') || 'חזור'}
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
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-source font-bold text-[var(--text-primary)] flex-1 text-center">
          {title}
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>
    </header>
  );
}
