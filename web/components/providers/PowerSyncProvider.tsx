'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import { SupabaseConnector } from '@/lib/powersync/connector';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';

interface PowerSyncProviderProps {
  children: ReactNode;
}

export function PowerSyncProvider({ children }: PowerSyncProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuthContext();
  const isConnectingRef = useRef(false);
  const hasGeneratedScheduleRef = useRef(false);

  useEffect(() => {
    if (!session || isConnected || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    const connector = new SupabaseConnector();

    const connect = async () => {
      try {
        const db = getPowerSyncDatabase();
        if (!db) {
          throw new Error('PowerSync database not available');
        }

        await db.connect(connector);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to connect to PowerSync');
        setError(error);
        console.error('PowerSync connection error:', error);
        // App continues with local data even if connection fails
      } finally {
        isConnectingRef.current = false;
      }
    };

    connect();
  }, [session, isConnected]);

  useEffect(() => {
    if (!session || hasGeneratedScheduleRef.current) {
      return;
    }

    hasGeneratedScheduleRef.current = true;

    const upsertTodayLogsFallback = async (tracks: Array<{ id: string; start_date: string | null }>, today: string) => {
      for (const track of tracks) {
        const startDate = track.start_date || today;
        if (startDate > today) {
          continue;
        }

        // Check if entry exists to preserve completion status
        const { data: existingLog } = await supabase
          .from('user_study_log')
          .select('is_completed, completed_at')
          .eq('user_id', session.user.id)
          .eq('track_id', track.id)
          .eq('study_date', today)
          .maybeSingle();

        let logError;
        if (existingLog) {
          // Entry exists - only update content_id, preserve completion
          const { error } = await supabase
            .from('user_study_log')
            .update({ content_id: null })
            .eq('user_id', session.user.id)
            .eq('track_id', track.id)
            .eq('study_date', today);
          logError = error;
        } else {
          // New entry - create with is_completed: false
          const { error } = await supabase
            .from('user_study_log')
            .insert({
              user_id: session.user.id,
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
    };

    const logScheduleError = (label: string, error: unknown, functionUrl: string) => {
      const err = error as { name?: string; message?: string; cause?: unknown };
      console.error(label, {
        name: err?.name,
        message: err?.message,
        cause: err?.cause,
        functionUrl,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        online: typeof navigator !== 'undefined' ? navigator.onLine : 'n/a',
      });
    };

    const generateSchedule = async () => {
      try {
        const { data: tracks, error: tracksError } = await supabase
          .from('tracks')
          .select('id, start_date');

        if (tracksError) {
          logScheduleError('Schedule tracks load error', tracksError, 'n/a');
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        const trackList = tracks ?? [];
        let hadFunctionError = false;

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
          }
        }

        if (hadFunctionError) {
          await upsertTodayLogsFallback(trackList, today);
        }
      } catch (scheduleError) {
        console.error('Schedule generation failed:', scheduleError);
        const today = new Date().toISOString().split('T')[0];
        const { data: tracks } = await supabase.from('tracks').select('id, start_date');
        await upsertTodayLogsFallback(tracks ?? [], today);
      }
    };

    generateSchedule();
  }, [session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const db = getPowerSyncDatabase();
      if (db) {
        db.disconnectAndClear();
      }
    };
  }, []);

  // Monitor connection status and upload activity
  useEffect(() => {
    const db = getPowerSyncDatabase();
    if (!db) {
      return;
    }

    // Register status listener to monitor PowerSync connection and upload status
    const listener = {
      statusChanged: (status: any) => {
        console.log('[PowerSync] Status changed:', {
          connected: status.connected,
          connecting: status.connecting,
          uploading: status.dataFlowStatus?.uploading,
          uploadError: status.dataFlowStatus?.uploadError,
        });
        setIsConnected(status.connected === true);
      },
    };

    db.registerListener(listener);

    return () => {
      // Cleanup - PowerSync should handle listener cleanup automatically
    };
  }, []);

  // Provide database instance via context if needed
  // For now, components call getPowerSyncDatabase() directly

  return <>{children}</>;
}
