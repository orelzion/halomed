'use client';

import { useEffect, useState } from 'react';
import { Mascot } from './Mascot';

interface CompletionToastProps {
  show: boolean;
  onComplete?: () => void;
}

export function CompletionToast({ show, onComplete }: CompletionToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 300);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center pointer-events-none
        transition-opacity duration-300
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <div 
        className={`
          bg-desert-oasis-card dark:bg-desert-oasis-dark-card
          rounded-2xl shadow-2xl p-6 mx-4
          transform transition-all duration-300
          ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
      >
        <div className="flex items-center gap-4">
          <Mascot mood="happy" size="sm" />
          <div>
            <p className="font-source font-bold text-lg text-[var(--text-primary)]">
              כל הכבוד!
            </p>
            <p className="font-explanation text-sm text-[var(--text-secondary)]">
              סיימת את הלימוד
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
