'use client';

import { useEffect, useState } from 'react';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import type { Database } from '@/lib/powersync/schema';

type TrackRecord = Database['tracks'];
type UserStudyLogRecord = Database['user_study_log'];

interface TrackWithStatus extends TrackRecord {
  hasStudiedToday: boolean;
  todayLogId: string | null;
}

export function useTracks() {
  const [tracks, setTracks] = useState<TrackWithStatus[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const normalizeRows = <T,>(result: any): T[] => {
      if (Array.isArray(result)) {
        return result as T[];
      }
      if (!result) {
        return [];
      }
      if (Array.isArray(result.rows)) {
        return result.rows as T[];
      }
      if (Array.isArray(result.rows?._array)) {
        return result.rows._array as T[];
      }
      if (typeof result.rows?.item === 'function' && typeof result.rows?.length === 'number') {
        return Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i)) as T[];
      }
      return [];
    };

    const loadTracks = async () => {
      try {
        const db = getPowerSyncDatabase();
        if (!db) {
          return;
        }

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Get all tracks that have started
        const tracksResult = await db.getAll(
          'SELECT * FROM tracks WHERE start_date IS NULL OR start_date <= ?',
          [today]
        );
        const allTracks = normalizeRows<TrackRecord>(tracksResult);

        // Get today's study logs
        const logsResult = await db.getAll(
          'SELECT * FROM user_study_log WHERE study_date = ?',
          [today]
        );
        const todayLogs = normalizeRows<UserStudyLogRecord>(logsResult);

        // Map tracks with status
        const tracksWithStatus: TrackWithStatus[] = allTracks.map((track: TrackRecord) => {
          const todayLog = todayLogs.find(
            (log: UserStudyLogRecord) => log.track_id === track.id
          );
          return {
            ...track,
            hasStudiedToday: todayLog?.is_completed === 1,
            todayLogId: todayLog?.id || null,
          };
        });

        if (isMounted) {
          setTracks(tracksWithStatus);
          setCompletedToday(
            todayLogs
              .filter((log: UserStudyLogRecord) => log.is_completed === 1)
              .map((log: UserStudyLogRecord) => log.track_id)
              .filter((id): id is string => id !== null)
          );
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading tracks:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTracks();

    // Watch for changes using callback approach
    // Note: watch() with callbacks returns void, so we use a mounted flag for cleanup
    const db = getPowerSyncDatabase();
    if (!db) {
      return () => {
        isMounted = false;
      };
    }

    db.watch(
      'SELECT * FROM tracks',
      [],
      {
        onResult: async () => {
          if (isMounted) {
            await loadTracks();
          }
        },
        onError: (error) => {
          if (isMounted) {
            console.error('Error watching tracks:', error);
          }
        },
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  return { tracks, completedToday, loading };
}
