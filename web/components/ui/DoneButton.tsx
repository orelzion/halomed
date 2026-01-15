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
      className={`
        w-full rounded-2xl overflow-hidden
        transition-all duration-300 shadow-sm hover:shadow-md
        active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
        flex
        ${isCompleted
          ? 'bg-gradient-to-br from-desert-oasis-card to-desert-oasis-accent/10 dark:from-desert-oasis-dark-card dark:to-desert-oasis-accent/20 ring-2 ring-desert-oasis-accent/30'
          : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card'
        }
      `}
    >
      {/* Checkmark Section */}
      <div className="flex items-center justify-center px-3 py-3 border-l border-desert-oasis-muted/50 dark:border-gray-600/30">
        <div
          className={`
            flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 shadow-sm
            ${isCompleted 
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
            className={`transition-all duration-300 ${isCompleted ? 'text-desert-oasis-accent' : 'text-[var(--text-secondary)] opacity-30'}`}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      {/* Text Section */}
      <div className="flex-1 flex items-center justify-center py-3 px-4">
        <span className={`font-explanation text-base font-semibold ${isCompleted ? 'text-desert-oasis-accent' : 'text-[var(--text-primary)]'}`}>
          {t(isCompleted ? 'done_completed' : 'done_button')}
        </span>
      </div>
    </button>
  );
}
