'use client';

// Import polyfills first to fix webpack module issues
import '@/lib/database/polyfill';

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import type { RxDatabase } from 'rxdb';
import { getDatabase } from '@/lib/database/database';
import { setupReplication } from '@/lib/sync/replication';
import { ensureContentGenerated } from '@/lib/sync/content-generation';
import { syncYomTovDates } from '@/lib/sync/yom-tov-sync';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import type { DatabaseCollections } from '@/lib/database/schemas';

// Storage keys for tracking sync state
const LAST_SYNC_DATE_KEY = 'halomed_last_sync_date';
const LAST_SYNC_TIMESTAMP_KEY = 'halomed_last_sync_timestamp';

// Sync interval for periodic sync while app is open (5 minutes)
const PERIODIC_SYNC_INTERVAL_MS = 5 * 60 * 1000;

interface SyncContextType {
  db: RxDatabase<DatabaseCollections> | null;
  isConnected: boolean;
  hasSynced: boolean;
  error: Error | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  db: null,
  isConnected: false,
  hasSynced: false,
  error: null,
  triggerSync: async () => {},
});

export function useSync() {
  return useContext(SyncContext);
}

interface SyncProviderProps {
  children: ReactNode;
}

/**
 * Get current date in YYYY-MM-DD format (Israel timezone)
 */
function getTodayDate(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
}

/**
 * Check if we need to sync based on date change or time elapsed
 */
function needsSync(): { needsSync: boolean; reason: string } {
  if (typeof window === 'undefined') {
    return { needsSync: false, reason: 'SSR' };
  }

  const lastSyncDate = localStorage.getItem(LAST_SYNC_DATE_KEY);
  const lastSyncTimestamp = localStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
  const today = getTodayDate();

  // If never synced, need to sync
  if (!lastSyncDate || !lastSyncTimestamp) {
    return { needsSync: true, reason: 'first_sync' };
  }

  // If date changed, need to sync for new content
  if (lastSyncDate !== today) {
    return { needsSync: true, reason: `date_changed (${lastSyncDate} -> ${today})` };
  }

  // If more than 6 hours since last sync, sync again for safety
  const hoursSinceLastSync = (Date.now() - parseInt(lastSyncTimestamp, 10)) / (1000 * 60 * 60);
  if (hoursSinceLastSync > 6) {
    return { needsSync: true, reason: `stale_sync (${hoursSinceLastSync.toFixed(1)}h ago)` };
  }

  return { needsSync: false, reason: 'recent_sync' };
}

/**
 * Mark sync as completed
 */
function markSyncCompleted(): void {
  if (typeof window === 'undefined') return;

  const today = getTodayDate();
  localStorage.setItem(LAST_SYNC_DATE_KEY, today);
  localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, Date.now().toString());
  console.log('[Sync] Marked sync completed for', today);
}

export function SyncProvider({ children }: SyncProviderProps) {
  const [db, setDb] = useState<RxDatabase<DatabaseCollections> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuthContext();
  const isConnectingRef = useRef(false);
  const isSyncingScheduleRef = useRef(false);
  const periodicSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const replicationStatesRef = useRef<any[]>([]);

  const upsertTodayLogsFallback = useCallback(
    async (tracks: Array<{ id: string; start_date: string | null }>, today: string, userId: string) => {
      for (const track of tracks) {
        const startDate = track.start_date || today;
        if (startDate > today) {
          continue;
        }

        // Check if entry exists to preserve completion status
        const { data: existingLog } = await supabase
          .from('user_study_log')
          .select('is_completed, completed_at')
          .eq('user_id', userId)
          .eq('track_id', track.id)
          .eq('study_date', today)
          .maybeSingle();

        let logError;
        if (existingLog) {
          // Entry exists - only update content_id, preserve completion
          const { error } = await supabase
            .from('user_study_log')
            .update({ content_id: null })
            .eq('user_id', userId)
            .eq('track_id', track.id)
            .eq('study_date', today);
          logError = error;
        } else {
          // New entry - create with is_completed: false
          const { error } = await supabase.from('user_study_log').insert({
            user_id: userId,
            track_id: track.id,
            study_date: today,
            content_id: null,
            is_completed: false,
          });
          logError = error;
        }

        if (logError) {
          console.error('Fallback log upsert error:', logError);
        }
      }
    },
    []
  );

  const logScheduleError = useCallback((label: string, error: unknown, functionUrl: string) => {
    const err = error as { name?: string; message?: string; cause?: unknown };
    console.error(label, {
      name: err?.name,
      message: err?.message,
      cause: err?.cause,
      functionUrl,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      online: typeof navigator !== 'undefined' ? navigator.onLine : 'n/a',
    });
  }, []);

  /**
   * Generate schedule for 14 days ahead - this is the core sync function
   */
  const generateSchedule = useCallback(
    async (forceSync = false) => {
      if (!session) {
        console.log('[Sync] No session, skipping schedule generation');
        return;
      }

      // Prevent concurrent syncs
      if (isSyncingScheduleRef.current) {
        console.log('[Sync] Already syncing, skipping');
        return;
      }

      // Check if sync is needed (unless forced)
      if (!forceSync) {
        const syncCheck = needsSync();
        if (!syncCheck.needsSync) {
          console.log('[Sync] Skipping schedule generation:', syncCheck.reason);
          return;
        }
        console.log('[Sync] Schedule generation needed:', syncCheck.reason);
      } else {
        console.log('[Sync] Forced schedule generation triggered');
      }

      // Check if online
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('[Sync] Offline, skipping schedule generation');
        return;
      }

      isSyncingScheduleRef.current = true;

      try {
        const { data: tracks, error: tracksError } = await supabase.from('tracks').select('id, start_date');

        if (tracksError) {
          logScheduleError('Schedule tracks load error', tracksError, 'n/a');
          return;
        }

        const today = getTodayDate();
        const trackList = tracks ?? [];
        let hadFunctionError = false;

        console.log(`[Sync] Generating schedule for ${trackList.length} tracks, 14 days ahead from ${today}`);

        for (const track of trackList) {
          const startDate = track.start_date || today;
          const response = await fetch('/api/generate-schedule', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              track_id: track.id,
              start_date: startDate,
              days_ahead: 14,
            }),
          });

          if (!response.ok) {
            const details = await response.text();
            logScheduleError('Schedule invoke error', details, '/api/generate-schedule');
            hadFunctionError = true;
          } else {
            console.log(`[Sync] Schedule generated for track ${track.id}`);
          }
        }

        if (hadFunctionError) {
          await upsertTodayLogsFallback(trackList, today, session.user.id);
        }

        // Mark sync as completed
        markSyncCompleted();
      } catch (scheduleError) {
        console.error('Schedule generation failed:', scheduleError);
        const today = getTodayDate();
        const { data: tracks } = await supabase.from('tracks').select('id, start_date');
        await upsertTodayLogsFallback(tracks ?? [], today, session.user.id);
      } finally {
        isSyncingScheduleRef.current = false;
      }
    },
    [session, logScheduleError, upsertTodayLogsFallback]
  );

  // Expose triggerSync for manual sync (e.g., pull-to-refresh)
  // This triggers replication AND waits for it to complete
  const triggerSync = useCallback(async () => {
    await generateSchedule(true);
    
    // Trigger replication re-sync and wait for completion
    if (replicationStatesRef.current && replicationStatesRef.current.length > 0) {
      console.log('[Sync] Manually triggering replication re-sync...');
      
      const syncPromises: Promise<void>[] = [];
      
      for (const replicationState of replicationStatesRef.current) {
        if (replicationState) {
          // Trigger resync
          if (typeof replicationState.reSync === 'function') {
            try {
              replicationState.reSync();
            } catch (error) {
              console.error('[Sync] Error triggering re-sync:', error);
            }
          }
          
          // Wait for sync to complete
          if (typeof replicationState.awaitInSync === 'function') {
            syncPromises.push(
              replicationState.awaitInSync().catch((error: Error) => {
                console.error('[Sync] Error waiting for sync:', error);
              })
            );
          }
        }
      }
      
      // Wait for all replications to complete
      if (syncPromises.length > 0) {
        console.log('[Sync] Waiting for all replications to complete...');
        await Promise.all(syncPromises);
        console.log('[Sync] All replications completed');
      }
    }
  }, [generateSchedule]);

  // Initial RxDB connection and replication setup
  useEffect(() => {
    if (!session || isConnected || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;

    const connect = async () => {
      try {
        const database = await getDatabase();
        if (!database) {
          console.warn('[RxDB] Database not available');
          throw new Error('RxDB database not available');
        }

        setDb(database);
        setIsConnected(true);
        setError(null);
        console.log('[RxDB] Database initialized, setting up replication...');

        // Setup replication
        const replicationStates = await setupReplication(database, session.user.id);
        replicationStatesRef.current = [
          replicationStates.contentCache,
          replicationStates.userPreferences,
          replicationStates.quizQuestions,
        ];

        console.log('[RxDB] Replication setup complete');

        // Ensure content is generated
        await ensureContentGenerated(database, session.user.id);

        // Sync Yom Tov dates from backend (for accurate holiday skipping)
        await syncYomTovDates(database, session.user.id);

        setHasSynced(true);
        console.log('[RxDB] Initial sync, content generation, and Yom Tov sync completed');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to connect to RxDB');
        setError(error);
        console.error('RxDB connection error:', error);
        // App continues with local data even if connection fails
        // During migration period, users can still use the app with cached data
      } finally {
        isConnectingRef.current = false;
      }
    };

    connect();
  }, [session, isConnected]);

  // Schedule generation on session - runs once on initial load
  useEffect(() => {
    if (!session) {
      return;
    }

    // Initial schedule generation
    generateSchedule();
  }, [session, generateSchedule]);

  // Visibility change listener for PWA resume
  useEffect(() => {
    if (!session || typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Sync] App became visible, checking if sync needed...');
        generateSchedule();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('[Sync] Page restored from bfcache, checking if sync needed...');
        generateSchedule();
      }
    };

    const handleOnline = () => {
      console.log('[Sync] Network came online, triggering sync...');
      generateSchedule(true); // Force sync when coming online
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
    };
  }, [session, generateSchedule]);

  // Periodic sync while app is open (every 5 minutes)
  useEffect(() => {
    if (!session) {
      return;
    }

    // Clear any existing interval
    if (periodicSyncIntervalRef.current) {
      clearInterval(periodicSyncIntervalRef.current);
    }

    // Set up periodic sync
    periodicSyncIntervalRef.current = setInterval(() => {
      console.log('[Sync] Periodic sync check...');
      generateSchedule();
    }, PERIODIC_SYNC_INTERVAL_MS);

    return () => {
      if (periodicSyncIntervalRef.current) {
        clearInterval(periodicSyncIntervalRef.current);
        periodicSyncIntervalRef.current = null;
      }
    };
  }, [session, generateSchedule]);

  // Provide sync status via context
  return (
    <SyncContext.Provider value={{ db, isConnected, hasSynced, error, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}
