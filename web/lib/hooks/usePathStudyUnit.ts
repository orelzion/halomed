'use client';

import { useEffect, useState } from 'react';
import { getDatabase } from '@/lib/database/database';

interface StudyUnit {
  content: any | null;
  explanationData: any;
  loading: boolean;
}

/**
 * Hook to load study content for a given content_ref
 * In the position-based model, we only need the content from content_cache
 * The path node data is computed from position, not stored
 */
export function usePathStudyUnit(contentRef: string | null): StudyUnit {
  const [content, setContent] = useState<any | null>(null);
  const [explanationData, setExplanationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contentRef) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadStudyUnit = async () => {
      try {
        const db = await getDatabase();
        if (!db) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // Get content by ref_id
        const contentDoc = await db.content_cache
          .findOne({
            selector: {
              ref_id: contentRef,
            },
          })
          .exec();

        const studyContent = contentDoc ? contentDoc.toJSON() : null;

        // Parse explanation JSON
        let explanation = null;
        if (studyContent?.ai_explanation_json) {
          try {
            explanation =
              typeof studyContent.ai_explanation_json === 'string'
                ? JSON.parse(studyContent.ai_explanation_json)
                : studyContent.ai_explanation_json;
          } catch (e) {
            console.error('Error parsing explanation JSON:', e);
          }
        }

        if (isMounted) {
          setContent(studyContent);
          setExplanationData(explanation);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading path study unit:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStudyUnit();

    // Watch for content changes
    const setupSubscription = async () => {
      const db = await getDatabase();
      if (!db || !isMounted) return;

      const contentQuery = db.content_cache
        .findOne({
          selector: {
            ref_id: contentRef,
          },
        })
        .$;
      
      const subscription = contentQuery.subscribe(async () => {
        if (isMounted) {
          await loadStudyUnit();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    setupSubscription();

    return () => {
      isMounted = false;
    };
  }, [contentRef]);

  return { content, explanationData, loading };
}
