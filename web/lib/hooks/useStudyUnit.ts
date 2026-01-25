'use client';

import { useEffect, useState } from 'react';
import { getDatabase } from '@/lib/database/database';
import { formatContentRef } from '@/lib/utils/date-format';
import { useAuthContext } from '@/components/providers/AuthProvider';

interface StudyUnit {
  log: any | null;
  content: any | null;
  track: any | null;
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
  const { user } = useAuthContext();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadStudyUnit = async () => {
      try {
        // Use provided date or today
        const date = studyDate || new Date().toISOString().split('T')[0];

        const db = await getDatabase();
        if (!db) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // Get study log for this track and date
        const logs = await db.user_study_log
          .find({
            selector: {
              track_id: trackId,
              study_date: date,
              user_id: user.id,
            },
          })
          .exec();

        const log = logs.length > 0 ? logs[0].toJSON() : null;

        let content: any | null = null;
        if (log?.content_id) {
          const contents = await db.content_cache
            .find({
              selector: {
                id: log.content_id,
              },
            })
            .exec();

          content = contents.length > 0 ? contents[0].toJSON() : null;
        }

        // Get track
        const tracks = await db.tracks
          .find({
            selector: {
              id: trackId,
            },
          })
          .exec();

        const track = tracks.length > 0 ? tracks[0].toJSON() : null;

        // Parse explanation JSON
        let explanation: ExplanationData | null = null;
        if (content?.ai_explanation_json) {
          try {
            explanation = JSON.parse(content.ai_explanation_json);
          } catch (error) {
            console.error('Error parsing explanation JSON:', error);
          }
        }

        if (isMounted) {
          setStudyUnit({
            log,
            content,
            track,
            trackId,
            studyDate: date,
          });
          setExplanationData(explanation);
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

    // Set up reactive query for updates
    const dbPromise = getDatabase();
    dbPromise.then((db) => {
      if (!db || !isMounted) return;

      // Watch for changes in user_study_log
      const userStudyLogQuery = db.user_study_log
        .find({
          selector: {
            track_id: trackId,
            user_id: user.id,
          },
        })
        .$;

      const subscription = userStudyLogQuery.subscribe(async () => {
        if (isMounted) {
          await loadStudyUnit();
        }
      });

      // Watch for changes in content_cache
      const contentCacheQuery = db.content_cache.find().$;
      const contentSubscription = contentCacheQuery.subscribe(async () => {
        if (isMounted) {
          await loadStudyUnit();
        }
      });

      // Watch for changes in tracks
      const tracksQuery = db.tracks
        .find({
          selector: {
            id: trackId,
          },
        })
        .$;
      const tracksSubscription = tracksQuery.subscribe(async () => {
        if (isMounted) {
          await loadStudyUnit();
        }
      });

      return () => {
        subscription.unsubscribe();
        contentSubscription.unsubscribe();
        tracksSubscription.unsubscribe();
      };
    });

    return () => {
      isMounted = false;
    };
  }, [trackId, studyDate, user]);

  // Format study title using he_ref from Sefaria if available, otherwise parse ref_id
  const studyTitle = formatContentRef(
    studyUnit?.content?.ref_id || null,
    studyUnit?.content?.he_ref || null
  );

  return { studyUnit, explanationData, loading, studyTitle };
}
