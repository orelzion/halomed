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

  // Load content for review items
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
        // First check what's in the cache
        const allCached = await db.content_cache.find().exec();
        console.log('[ReviewScreen] Total items in content_cache:', allCached.length);
        if (allCached.length > 0) {
          console.log('[ReviewScreen] Sample cached ref_ids:', allCached.slice(0, 5).map(d => d.ref_id));
        }

        const docs = await db.content_cache
          .find({ selector: { ref_id: { $in: contentRefs } } })
          .exec();

        const cache = new Map<string, ContentCacheDoc>();
        docs.forEach(doc => {
          cache.set(doc.ref_id, doc.toJSON() as ContentCacheDoc);
        });
        setContentCache(cache);
        console.log('[ReviewScreen] Loaded content for', cache.size, 'items out of', contentRefs.length, 'requested');
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

  const handleComplete = () => {
    // In the position-based model, we don't need to save review results
    // The reviews are auto-computed each day based on what was learned
    // Future enhancement: could track review performance for analytics
    router.push('/');
  };

  const hasReviews = reviews.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <p className="text-desert-oasis-accent">{t('review_session_loading')}</p>
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

  const currentReview = reviews[currentIndex];
  const content = currentReview ? contentCache.get(currentReview.contentRef) : null;

  // Parse AI explanation JSON if available
  let reviewSummary = '';
  let reviewHalakha = '';
  if (content?.ai_explanation_json) {
    try {
      const parsed = JSON.parse(content.ai_explanation_json);
      // Use summary (like study page) not brief_explanation
      reviewSummary = parsed.summary || '';
      reviewHalakha = parsed.halakha || '';
    } catch {
      // Ignore parse errors
    }
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
                // Use summary (like study page) not brief_explanation
                cardSummary = parsed.summary || '';
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
