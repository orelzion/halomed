'use client';

import { useEffect, useState } from 'react';

interface SyncIndicatorProps {
  message: string;
  isVisible: boolean;
  onHide?: () => void;
  autoHideAfterMs?: number;
}

// Sync icon with animation
function SyncIcon({ className = '' }: { className?: string }) {
  return (
    <svg 
      className={`animate-spin ${className}`} 
      width="18" 
      height="18" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function SyncIndicator({ message, isVisible, onHide, autoHideAfterMs = 5000 }: SyncIndicatorProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      
      if (autoHideAfterMs > 0) {
        const timer = setTimeout(() => {
          setShow(false);
          onHide?.();
        }, autoHideAfterMs);
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [isVisible, autoHideAfterMs, onHide]);

  if (!show) return null;

  return (
    <div 
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-desert-oasis-accent text-white rounded-xl shadow-lg">
        <SyncIcon />
        <span className="font-explanation text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}
