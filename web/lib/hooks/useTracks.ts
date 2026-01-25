'use client';

import { useEffect, useState } from 'react';
import { getDatabase } from '@/lib/database/database';
import { useAuthContext } from '@/components/providers/AuthProvider';

interface TrackWithStatus {
  id: string;
  title: string;
  source_endpoint?: string;
  schedule_type: string;
  start_date?: string;
  hasStudiedToday: boolean;
  todayLogId: string | null;
}

export function useTracks() {
  const [tracks, setTracks] = useState<TrackWithStatus[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthContext();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadTracks = async () => {
      try {
        const db = await getDatabase();
        if (!db) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Get all tracks that have started
        const allTracks = await db.tracks
          .find({
            selector: {
              $or: [
                { start_date: { $exists: false } },
                { start_date: { $eq: undefined } },
                { start_date: { $lte: today } },
              ],
            },
          })
          .exec();

        // Get today's study logs
        const todayLogs = await db.user_study_log
          .find({
            selector: {
              study_date: today,
              user_id: user.id,
            },
          })
          .exec();

        // Map tracks with status
        const tracksWithStatus: TrackWithStatus[] = allTracks.map((trackDoc) => {
          const track = trackDoc.toJSON();
          const todayLog = todayLogs.find((log) => log.track_id === track.id);
          return {
            ...track,
            hasStudiedToday: todayLog ? (todayLog.is_completed === 1 || (todayLog.is_completed as unknown) === true) : false,
            todayLogId: todayLog?.id || null,
          };
        });

        if (isMounted) {
          setTracks(tracksWithStatus);
          setCompletedToday(
            todayLogs
              .filter((log) => log.is_completed === 1 || (log.is_completed as unknown) === true)
              .map((log) => log.track_id)
              .filter((id): id is string => id !== null && id !== undefined)
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

    // Watch for changes using RxDB observables
    const dbPromise = getDatabase();
    dbPromise.then((db) => {
      if (!db || !isMounted) return;

      // Watch tracks
      const tracksQuery = db.tracks.find().$;
      const tracksSubscription = tracksQuery.subscribe(async () => {
        if (isMounted) {
          await loadTracks();
        }
      });

      // Watch user_study_log for today
      const today = new Date().toISOString().split('T')[0];
      const studyLogQuery = db.user_study_log
        .find({
          selector: {
            study_date: today,
            user_id: user.id,
          },
        })
        .$;
      const studyLogSubscription = studyLogQuery.subscribe(async () => {
        if (isMounted) {
          await loadTracks();
        }
      });

      return () => {
        tracksSubscription.unsubscribe();
        studyLogSubscription.unsubscribe();
      };
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  return { tracks, completedToday, loading };
}
