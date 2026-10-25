'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getDatabase } from '@/lib/database/database';
import { supabase } from '@/lib/supabase/client';
import { isPlaceholderContent } from '@/lib/utils/content-validation';
import { usePathStudyUnit } from './usePathStudyUnit';

const MAX_POLL_ATTEMPTS = 30; // ~30 seconds at one attempt per second
const POLL_INTERVAL_MS = 1000;

/** A row of content_cache as it is stored locally. */
interface ContentDoc {
  ref_id: string;
  source_text_he: string;
  ai_explanation_json: unknown;
}

interface StudyContent {
  content: ContentDoc | null;
  /** The parsed ai_explanation_json. */
  explanationData: unknown;
  /** Reading the local copy from RxDB. */
  loading: boolean;
  /** Real content is being generated on the server. */
  isGenerating: boolean;
  /** The content is there and is not a placeholder. */
  ready: boolean;
  hasError: boolean;
  retry: () => void;
}

/**
 * Loads the study content for one mishna from the local database. When
 * `generate` is true and the content is missing (or only a placeholder), it
 * asks the server to generate it and waits for the result.
 */
export function useStudyContent(contentRef: string, generate: boolean): StudyContent {
  const { content, explanationData, loading } = usePathStudyUnit(contentRef);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const attemptedFor = useRef<string | null>(null);
  const isMounted = useRef(true);

  const isPlaceholder = content ? isPlaceholderContent(content.ai_explanation_json) : false;
  const needsGeneration = !loading && (!content || isPlaceholder);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!generate || !needsGeneration || isGenerating) return;
    // One attempt per mishna, until the reader asks to retry
    if (attemptedFor.current === `${contentRef}:${retryToken}`) return;
    attemptedFor.current = `${contentRef}:${retryToken}`;

    const generateContent = async () => {
      setIsGenerating(true);
      setHasError(false);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          console.error('[useStudyContent] Not signed in, cannot generate', contentRef);
          if (isMounted.current) setHasError(true);
          return;
        }

        const response = await fetch('/api/generate-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ref_id: contentRef }),
        });

        if (!response.ok) {
          console.error('[useStudyContent] Generation failed:', await response.text());
          if (isMounted.current) setHasError(true);
          return;
        }

        // Generation is asynchronous: poll Supabase for the finished content so the
        // reader does not have to wait for replication to catch up.
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
          if (!isMounted.current) return;

          try {
            const { data: newContent, error: fetchError } = await supabase
              .from('content_cache')
              .select('*')
              .eq('ref_id', contentRef)
              .single();

            if (!fetchError && newContent && !isPlaceholderContent(newContent.ai_explanation_json)) {
              const db = await getDatabase();
              if (db) {
                // Convert the Supabase row to the RxDB shape, as replication does
                const doc: Record<string, unknown> = { ...newContent };
                const nullableFields = ['tractate', 'chapter', 'explanation'];
                Object.keys(doc).forEach((key) => {
                  if (doc[key] === null && !nullableFields.includes(key)) {
                    delete doc[key];
                  }
                });
                await db.content_cache.upsert(doc);
                return; // usePathStudyUnit picks the new document up reactively
              }
            }
          } catch (pollError) {
            console.error(`[useStudyContent] Poll attempt ${attempt + 1} failed:`, pollError);
          }

          if (attempt < MAX_POLL_ATTEMPTS - 1) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          }
        }

        // Replication may still deliver the content; if it does, `ready` takes over from this
        console.warn('[useStudyContent] Generation is taking longer than expected');
        if (isMounted.current) setHasError(true);
      } catch (error) {
        console.error('[useStudyContent] Error generating content:', error);
        if (isMounted.current) setHasError(true);
      } finally {
        if (isMounted.current) setIsGenerating(false);
      }
    };

    generateContent();
  }, [generate, needsGeneration, isGenerating, contentRef, retryToken]);

  const retry = useCallback(() => {
    setHasError(false);
    setRetryToken((token) => token + 1);
  }, []);

  return {
    content,
    explanationData,
    loading,
    // Counts the moment before the request starts, so callers never show "not found" in between
    isGenerating: isGenerating || (generate && needsGeneration && !hasError),
    ready: !!content && !isPlaceholder,
    hasError,
    retry,
  };
}
