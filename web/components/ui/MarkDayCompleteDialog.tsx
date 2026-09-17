'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';

interface MarkDayCompleteDialogProps {
  isOpen: boolean;
  itemCount: number;
  dateLabel: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function MarkDayCompleteDialog({
  isOpen,
  itemCount,
  dateLabel,
  isSubmitting,
  onConfirm,
  onClose,
}: MarkDayCompleteDialogProps) {
  const { t } = useTranslation();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    setTimeout(() => confirmRef.current?.focus(), 0);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mark-day-complete-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      <div className="relative bg-desert-oasis-card dark:bg-desert-oasis-dark-card rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h2
          id="mark-day-complete-dialog-title"
          className="font-source text-xl font-bold text-[var(--text-primary)] mb-2"
        >
          {t('mark_day_complete_title', { date: dateLabel })}
        </h2>

        <p className="font-explanation text-sm text-[var(--text-secondary)] mb-6">
          {t('mark_day_complete_message', { count: itemCount })}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl font-explanation font-semibold text-[var(--text-secondary)] bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-oasis-accent focus-visible:ring-offset-2"
          >
            {t('mark_day_complete_cancel')}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl font-explanation font-semibold text-white bg-desert-oasis-accent hover:bg-desert-oasis-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-oasis-accent focus-visible:ring-offset-2"
          >
            {isSubmitting ? t('mark_day_complete_confirm_loading') : t('mark_day_complete_confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
