/**
 * ReviewScreen - Tinder-style review session
 * Shows swipeable cards for items due for review
 *
 * Accepts content indexes directly via URL params (indexes=1,2,3)
 * instead of re-computing reviews from date.
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ReviewCard } from '../ui/ReviewCard';
import { getDatabase } from '@/lib/database/database';
import { useTranslation } from '@/lib/i18n';
import type { ContentCacheDoc } from '@/lib/database/schemas';
import { getInfoForIndex } from '@shared/lib/path-generator';
import { supabase } from '@/lib/supabase/client';
import { isPlaceholderContent } from '@/lib/utils/content-validation';

interface ReviewItemFromIndex {
  contentRef: string;
  contentIndex: number;
  tractate: string;
  tractateHebrew: string;
  chapter: number;
  mishna: number;
}

export function ReviewScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  // Get content indexes from URL query param (passed by PathScreen)
  const indexesParam = searchParams.get('indexes') || '';

  // Parse indexes and build review items
  const reviews = useMemo<ReviewItemFromIndex[]>(() => {
    if (!indexesParam) {
      console.log('[ReviewScreen] No indexes param provided');
      return [];
    }

    const indexes = indexesParam.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

    console.log('[ReviewScreen] Parsed indexes:', indexes);

    const items: ReviewItemFromIndex[] = [];
    for (const index of indexes) {
      const info = getInfoForIndex(index);
      if (info) {
        items.push({
          contentRef: info.contentRef,
          contentIndex: index,
          tractate: info.tractate.english,
          tractateHebrew: info.tractate.hebrew,
          chapter: info.chapter,
          mishna: info.mishna,
        });
      } else {
        console.warn('[ReviewScreen] No info for index:', index);
      }
    }

    console.log('[ReviewScreen] Built review items:', items.length);
    return items;
  }, [indexesParam]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [contentCache, setContentCache] = useState<Map<string, ContentCacheDoc>>(new Map());
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  // Load content for review items (same strategy as study page)
  useEffect(() => {
    if (reviews.length === 0) {
      setLoading(false);
      return;
    }

    const loadContent = async () => {
      const db = await getDatabase();
      if (!db) {
        setLoading(false);
        return;
      }

      const contentRefs = reviews.map(r => r.contentRef);
      console.log('[ReviewScreen] Looking for content refs:', contentRefs);

      try {
        // First try local RxDB cache
        const localDocs = await db.content_cache
          .find({ selector: { ref_id: { $in: contentRefs } } })
          .exec();

        const cache = new Map<string, ContentCacheDoc>();
        localDocs.forEach(doc => {
          const json = doc.toJSON() as ContentCacheDoc;
          // Only add to cache if it's not a placeholder
          if (!isPlaceholderContent(json.ai_explanation_json)) {
            cache.set(doc.ref_id, json);
          }
        });
        console.log('[ReviewScreen] Found', cache.size, 'valid items in local cache');

        // Check for missing refs (not in cache or placeholder content)
        const missingRefs = contentRefs.filter(ref => !cache.has(ref));

        if (missingRefs.length > 0) {
          console.log('[ReviewScreen] Loading', missingRefs.length, 'items via backend cache/generation');

          // Get auth session for API calls
          const sessionResult = await supabase.auth.getSession();
          const session = sessionResult.data.session;
          if (!session) {
            console.error('[ReviewScreen] No session, cannot fetch content');
            setLoading(false);
            return;
          }

          for (const refId of missingRefs) {
            try {
              const response = await fetch('/api/generate-content', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ ref_id: refId }),
              });

              if (!response.ok) {
                console.warn('[ReviewScreen] Failed to load content for', refId, ':', response.status);
                continue;
              }

              const payload = await response.json();
              if (isPlaceholderContent(payload.ai_explanation_json)) {
                console.warn('[ReviewScreen] Placeholder content returned for', refId);
                continue;
              }

              const contentDoc: ContentCacheDoc = {
                id: payload.id,
                ref_id: payload.ref_id,
                source_text_he: payload.source_text_he,
                ai_explanation_json: typeof payload.ai_explanation_json === 'string'
                  ? payload.ai_explanation_json
                  : JSON.stringify(payload.ai_explanation_json || {}),
                he_ref: payload.he_ref,
                created_at: payload.created_at,
                updated_at: payload.updated_at,
                _deleted: false,
              };

              cache.set(refId, contentDoc);

              // Save to local RxDB
              try {
                await db.content_cache.upsert(contentDoc);
              } catch (upsertError) {
                console.warn('[ReviewScreen] Failed to cache locally:', refId, upsertError);
              }
            } catch (loadError) {
              console.error('[ReviewScreen] Error loading content for', refId, ':', loadError);
            }
          }
        }

        setContentCache(cache);
        console.log('[ReviewScreen] Total content loaded:', cache.size, 'out of', contentRefs.length, 'requested');
      } catch (error) {
        console.error('[ReviewScreen] Error loading content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [reviews]);

  const handleNext = useCallback(() => {
    if (currentIndex < reviews.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, reviews.length]);

  const handleDeeper = useCallback((contentIndex: number) => {
    // Navigate to the study page using computed-{index} format
    router.push(`/study/path/computed-${contentIndex}`);
  }, [router]);

  const handleBack = () => {
    router.back();
  };

  const handleComplete = async () => {
    // Mark review completion in user_preferences
    const reviewDate = searchParams.get('date');
    if (reviewDate) {
      try {
        const db = await getDatabase();
        if (db) {
          if (!db.user_preferences) {
            console.error('[ReviewScreen] user_preferences collection not available');
            router.push('/');
            return;
          }

          const userPrefs = await db.user_preferences.find().exec();
          if (userPrefs.length > 0) {
            const pref = userPrefs[0];
            const existingDates = pref.review_completion_dates || [];
            
            // Add review date if not already present
            if (!existingDates.includes(reviewDate)) {
              const newReviewDates = [...existingDates, reviewDate];
              console.log(`[ReviewScreen] Adding review completion date: ${reviewDate}`);
              
              await pref.patch({
                review_completion_dates: newReviewDates,
                updated_at: new Date().toISOString(),
              });
              
              console.log(`[ReviewScreen] Updated review_completion_dates:`, newReviewDates);
            } else {
              console.log(`[ReviewScreen] Review completion already recorded for: ${reviewDate}`);
            }
          } else {
            console.warn('[ReviewScreen] No user_preferences found');
          }
        }
      } catch (error) {
        console.error('[ReviewScreen] Error marking review session as completed:', error);
      }
    }
    router.push('/');
  };

  const hasReviews = reviews.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <div className="text-center">
          <p className="text-desert-oasis-accent">
            {t('review_session_loading')}
          </p>
        </div>
      </div>
    );
  }

  if (!hasReviews) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-source mb-2 text-[var(--text-primary)]">
            {t('review_session_fresh_content')}
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            {t('review_session_empty')}
          </p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-desert-oasis-accent text-white rounded-xl font-explanation"
          >
            {t('review_session_back_to_path')}
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-source mb-4 text-[var(--text-primary)]">
            {t('review_session_complete')}
          </h2>

          <p className="text-[var(--text-secondary)] mb-6">
            סיימת לחזור על {reviews.length} משניות
          </p>

          <button
            onClick={handleComplete}
            className="px-6 py-3 bg-gradient-to-r from-desert-oasis-accent to-orange-500 text-white rounded-2xl font-explanation text-lg font-semibold shadow-md"
          >
            {t('review_session_back_to_path')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-desert-oasis-secondary/80 dark:bg-desert-oasis-dark-secondary/80 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            onClick={handleBack}
            className="text-desert-oasis-accent hover:underline"
          >
            ← חזור
          </button>
          <h1 className="text-lg font-source text-[var(--text-primary)]">
            {t('review_session_title')}
          </h1>
          <span className="text-sm text-[var(--text-secondary)]">
            {currentIndex + 1}/{reviews.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="max-w-lg mx-auto mt-2">
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-desert-oasis-accent"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex) / reviews.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Card stack */}
      <div className="relative h-[calc(100vh-120px)] max-w-lg mx-auto p-4">
        <AnimatePresence mode="popLayout">
          {reviews.slice(currentIndex, currentIndex + 2).map((review, idx) => {
            const reviewContent = contentCache.get(review.contentRef);
            let cardSummary = '';
            let cardHalakha = '';

            if (reviewContent?.ai_explanation_json) {
              try {
                const parsed = JSON.parse(reviewContent.ai_explanation_json);
                cardSummary = parsed.mishna_modern || '';
                cardHalakha = parsed.halakha || '';
              } catch {
                // Ignore
              }
            }

            return (
              <ReviewCard
                key={review.contentRef}
                contentRef={review.contentRef}
                tractate={review.tractate}
                tractateHebrew={review.tractateHebrew}
                chapter={review.chapter}
                mishna={review.mishna}
                sourceText={reviewContent?.source_text_he}
                explanation={cardSummary}
                halakha={cardHalakha}
                heRef={reviewContent?.he_ref}
                onNext={handleNext}
                onDeeper={() => handleDeeper(review.contentIndex)}
                isTop={idx === 0}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
