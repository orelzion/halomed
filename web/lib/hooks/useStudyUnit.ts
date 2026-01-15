'use client';

import { useEffect, useState } from 'react';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import type { Database } from '@/lib/powersync/schema';

type UserStudyLogRecord = Database['user_study_log'];
type ContentCacheRecord = Database['content_cache'];
type TrackRecord = Database['tracks'];

interface StudyUnit {
  log: UserStudyLogRecord | null;
  content: ContentCacheRecord | null;
  track: TrackRecord | null;
  trackId: string;
  studyDate: string;
}

interface ExplanationData {
  summary?: string;
  halakha?: string;
  opinions?: Array<{ source: string; details: string }>;
  expansions?: Array<{ topic: string; explanation: string; source?: string }>;
}

export function useStudyUnit(trackId: string, studyDate?: string) {
  const [studyUnit, setStudyUnit] = useState<StudyUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [explanationData, setExplanationData] = useState<ExplanationData | null>(null);

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

    const loadStudyUnit = async () => {
      try {
        // Get current user
        const { supabase } = await import('@/lib/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // Use provided date or today
        const date = studyDate || new Date().toISOString().split('T')[0];

        const db = getPowerSyncDatabase();
        if (!db) {
          return;
        }

        // Get study log for this track and date
        const logResult = await db.getAll(
          'SELECT * FROM user_study_log WHERE track_id = ? AND study_date = ? AND user_id = ?',
          [trackId, date, user.id]
        );
        const logs = normalizeRows<UserStudyLogRecord>(logResult);
        let log = logs[0] ?? null;
        
        // Debug: Log what we're reading from PowerSync
        if (log) {
          console.log(`[useStudyUnit] Loaded log from PowerSync:`, {
            id: log.id,
            is_completed: log.is_completed,
            completed_at: log.completed_at,
          });
          
          // Guard: If we have a completed_at timestamp but is_completed is false,
          // this is likely stale server data overwriting our local write.
          // PowerSync conflict resolution should handle this, but if it doesn't,
          // we need to check if this is a conflict and preserve the local state.
          // However, we can't easily detect this here since we don't know the "correct" state.
          // The real fix is in PowerSync's conflict resolution or preventing the stale sync.
        }

        let content: ContentCacheRecord | null = null;
        if (log?.content_id) {
          // Get content from cache
          const contentResult = await db.getAll(
            'SELECT * FROM content_cache WHERE id = ?',
            [log.content_id]
          );
          const contents = normalizeRows<ContentCacheRecord>(contentResult);
          content = contents[0] ?? null;

          // Parse explanation JSON
          if (content?.ai_explanation_json && isMounted) {
            try {
              const parsed = JSON.parse(content.ai_explanation_json);
              setExplanationData(parsed);
            } catch (e) {
              console.error('Error parsing explanation JSON:', e);
            }
          }
        }

        // Get track information
        let track: TrackRecord | null = null;
        try {
          const trackResult = await db.getAll(
            'SELECT * FROM tracks WHERE id = ?',
            [trackId]
          );
          const tracks = normalizeRows<TrackRecord>(trackResult);
          track = tracks[0] ?? null;
        } catch (error) {
          console.error('Error loading track:', error);
        }

        if (isMounted) {
          setStudyUnit({
            log,
            content,
            track,
            trackId,
            studyDate: date,
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading study unit:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStudyUnit();

    // Watch for changes
    // Note: watch() with callbacks returns void, so we use a mounted flag for cleanup
    const db = getPowerSyncDatabase();
    if (!db) {
      return () => {
        isMounted = false;
      };
    }

    db.watch(
      'SELECT * FROM user_study_log WHERE track_id = ?',
      [trackId],
      {
        onResult: async () => {
          if (isMounted) {
            await loadStudyUnit();
          }
        },
        onError: (error) => {
          if (isMounted) {
            console.error('Error watching study unit:', error);
          }
        },
      }
    );

    // Also watch content cache so we update when content syncs in
    db.watch(
      'SELECT * FROM content_cache',
      [],
      {
        onResult: async () => {
          if (isMounted) {
            await loadStudyUnit();
          }
        },
        onError: (error) => {
          if (isMounted) {
            console.error('Error watching content cache:', error);
          }
        },
      }
    );

    // Watch track updates
    db.watch(
      'SELECT * FROM tracks WHERE id = ?',
      [trackId],
      {
        onResult: async () => {
          if (isMounted) {
            await loadStudyUnit();
          }
        },
        onError: (error) => {
          if (isMounted) {
            console.error('Error watching track:', error);
          }
        },
      }
    );

    return () => {
      isMounted = false;
    };
  }, [trackId, studyDate]);

  // Format study title from ref_id (e.g., "Mishnah_Berakhot.1.1" -> "ברכות, פרק א")
  const formatStudyTitle = (refId: string | null | undefined): string => {
    if (!refId) return '';
    
    // Parse format: Mishnah_{Tractate}.{Chapter}.{Mishnah}
    const match = refId.match(/Mishnah_(\w+)\.(\d+)\.(\d+)/);
    if (!match) return refId;
    
    const [, tractate, chapter, mishnah] = match;
    
    // Map tractate names to Hebrew
    const tractateMap: Record<string, string> = {
      'Berakhot': 'ברכות',
      'Shabbat': 'שבת',
      'Eruvin': 'עירובין',
      'Pesachim': 'פסחים',
      // Add more as needed
    };
    
    const tractateHebrew = tractateMap[tractate] || tractate;
    
    // Convert chapter number to Hebrew (1 -> א, 2 -> ב, etc.)
    const hebrewNumbers = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ'];
    const chapterNum = parseInt(chapter, 10);
    const chapterHebrew = chapterNum <= hebrewNumbers.length 
      ? hebrewNumbers[chapterNum - 1] 
      : chapter;
    
    return `${tractateHebrew}, פרק ${chapterHebrew}`;
  };

  const studyTitle = formatStudyTitle(studyUnit?.content?.ref_id);

  return { studyUnit, explanationData, loading, studyTitle };
}
