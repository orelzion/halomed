'use client';

import { useEffect, useState } from 'react';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import type { Database } from '@/lib/powersync/schema';

type ContentCacheRecord = Database['content_cache'];
type LearningPathRecord = Database['learning_path'];

interface StudyUnit {
  content: ContentCacheRecord | null;
  node: LearningPathRecord | null;
  explanationData: any;
  loading: boolean;
}

export function usePathStudyUnit(contentRef: string | null, nodeId: string | null): StudyUnit {
  const [content, setContent] = useState<ContentCacheRecord | null>(null);
  const [node, setNode] = useState<LearningPathRecord | null>(null);
  const [explanationData, setExplanationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contentRef || !nodeId) {
      setLoading(false);
      return;
    }

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
        const db = getPowerSyncDatabase();
        if (!db) {
          return;
        }

        // Get path node
        const nodeResult = await db.getAll(
          'SELECT * FROM learning_path WHERE id = ?',
          [nodeId]
        );
        const nodes = normalizeRows<LearningPathRecord>(nodeResult);
        const pathNode = nodes[0] || null;

        // Get content
        const contentResult = await db.getAll(
          'SELECT * FROM content_cache WHERE ref_id = ?',
          [contentRef]
        );
        const contents = normalizeRows<ContentCacheRecord>(contentResult);
        const studyContent = contents[0] || null;

        // Parse explanation JSON
        let explanation = null;
        if (studyContent?.ai_explanation_json) {
          try {
            explanation = typeof studyContent.ai_explanation_json === 'string'
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

    return () => {
      isMounted = false;
    };
  }, [contentRef, nodeId]);

  return { content, node, explanationData, loading };
}
