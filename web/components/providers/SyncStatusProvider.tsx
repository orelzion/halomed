'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SyncIndicator } from '@/components/ui/SyncIndicator';

interface SyncStatusContextType {
  showSyncIndicator: (message: string, autoHideAfterMs?: number) => void;
  hideSyncIndicator: () => void;
}

const SyncStatusContext = createContext<SyncStatusContextType | null>(null);

export function useSyncStatus() {
  const context = useContext(SyncStatusContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncStatusProvider');
  }
  return context;
}

interface SyncStatusProviderProps {
  children: ReactNode;
}

export function SyncStatusProvider({ children }: SyncStatusProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [autoHideMs, setAutoHideMs] = useState<number | undefined>(undefined);

  const showSyncIndicator = useCallback((msg: string, autoHideAfterMs?: number) => {
    setMessage(msg);
    setAutoHideMs(autoHideAfterMs);
    setIsVisible(true);
  }, []);

  const hideSyncIndicator = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <SyncStatusContext.Provider value={{ showSyncIndicator, hideSyncIndicator }}>
      {children}
      <SyncIndicator />
    </SyncStatusContext.Provider>
  );
}
