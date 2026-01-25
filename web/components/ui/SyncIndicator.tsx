'use client';

import { useEffect, useState } from 'react';
import { useSync } from '@/components/providers/SyncProvider';

/**
 * Non-intrusive sync status indicator
 * Shows sync status in corner without blocking UI
 * Reference: Migration Plan Phase 5, Task 5.2, PRD Section 9
 */
export function SyncIndicator() {
  const { isConnected, hasSynced, error } = useSync();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'idle' | 'syncing' | 'complete' | 'error'>('idle');

  useEffect(() => {
    if (error) {
      setStatus('error');
      setVisible(true);
    } else if (isConnected && !hasSynced) {
      setStatus('syncing');
      setVisible(true);
    } else if (isConnected && hasSynced) {
      setStatus('complete');
      setVisible(true);
      // Auto-hide after 2-3 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setStatus('idle');
      setVisible(false);
    }
  }, [isConnected, hasSynced, error]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg
          ${
            status === 'syncing'
              ? 'bg-blue-500 text-white'
              : status === 'complete'
              ? 'bg-green-500 text-white'
              : status === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-gray-500 text-white'
          }
        `}
        role="status"
        aria-live="polite"
      >
        {status === 'syncing' && (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span className="text-sm">מסנכרן...</span>
          </>
        )}
        {status === 'complete' && (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">סינכרון הושלם</span>
          </>
        )}
        {status === 'error' && (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">שגיאת סנכרון</span>
          </>
        )}
        <button
          onClick={() => setVisible(false)}
          className="ml-2 text-white hover:text-gray-200"
          aria-label="סגור"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
