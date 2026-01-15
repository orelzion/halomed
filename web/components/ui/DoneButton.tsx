'use client';

import { useTranslation } from '@/lib/i18n';

interface DoneButtonProps {
  isCompleted: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function DoneButton({ isCompleted, onClick, disabled }: DoneButtonProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    // Haptic feedback (vibration API)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onClick();
  };

  return (
    <button
      id="done_button"
      data-testid="done_button"
      onClick={handleClick}
      disabled={disabled}
      className="w-full py-4 px-6 bg-desert-oasis-accent hover:bg-desert-oasis-accent/90 text-white rounded-xl font-explanation text-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
    >
      {t(isCompleted ? 'done_completed' : 'done_button')}
    </button>
  );
}
