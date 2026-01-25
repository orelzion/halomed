'use client';

import { useEffect, useState } from 'react';
import { getDatabase } from '@/lib/database/database';

interface StudyUnit {
  content: any | null;
  node: any | null;
  explanationData: any;
  loading: boolean;
}

export function usePathStudyUnit(contentRef: string | null, nodeId: string | null): StudyUnit {
  const [content, setContent] = useState<any | null>(null);
  const [node, setNode] = useState<any | null>(null);
  const [explanationData, setExplanationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contentRef || !nodeId) {
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

        // Get path node
        const nodeDoc = await db.learning_path.findOne(nodeId).exec();
        const pathNode = nodeDoc ? nodeDoc.toJSON() : null;

        // Get content by ref_id
        const contentDocs = await db.content_cache
          .find({
            selector: {
              ref_id: contentRef,
            },
          })
          .exec();

        const studyContent = contentDocs.length > 0 ? contentDocs[0].toJSON() : null;

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
          setNode(pathNode);
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

    // Watch for changes
    const dbPromise = getDatabase();
    dbPromise.then((db) => {
      if (!db || !isMounted) return;

      // Watch learning_path
      if (nodeId) {
        const nodeQuery = db.learning_path.findOne(nodeId).$;
        const nodeSubscription = nodeQuery.subscribe(async () => {
          if (isMounted) {
            await loadStudyUnit();
          }
        });

        // Watch content_cache
        const contentQuery = db.content_cache
          .find({
            selector: {
              ref_id: contentRef,
            },
          })
          .$;
        const contentSubscription = contentQuery.subscribe(async () => {
          if (isMounted) {
            await loadStudyUnit();
          }
        });

        return () => {
          nodeSubscription.unsubscribe();
          contentSubscription.unsubscribe();
        };
      }
    });

    return () => {
      isMounted = false;
    };
  }, [contentRef, nodeId]);

  return { content, node, explanationData, loading };
}
