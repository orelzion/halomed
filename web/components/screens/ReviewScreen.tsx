/**
 * ReviewScreen - Tinder-style review session
 * Shows swipeable cards for items due for review
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ReviewCard } from '../ui/ReviewCard';
import { useReviews } from '@/lib/hooks/useReviews';
import { getDatabase } from '@/lib/database/database';
import { useTranslation } from '@/lib/i18n';
import type { ContentCacheDoc } from '@/lib/database/schemas';

export function ReviewScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  // Get date from URL query param (if provided by PathScreen)
  const targetDate = searchParams.get('date') || undefined;
  const { reviews, loading: reviewsLoading, hasReviews } = useReviews(targetDate);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [contentCache, setContentCache] = useState<Map<string, ContentCacheDoc>>(new Map());
  const [isComplete, setIsComplete] = useState(false);

  // Load content for review items
  useEffect(() => {
    if (reviews.length === 0) return;

    const loadContent = async () => {
      const db = await getDatabase();
      if (!db) return;
      
      const contentRefs = reviews.map(r => r.contentRef);
      
      try {
        const docs = await db.content_cache
          .find({ selector: { ref_id: { $in: contentRefs } } })
          .exec();
        
        const cache = new Map<string, ContentCacheDoc>();
        docs.forEach(doc => {
          cache.set(doc.ref_id, doc.toJSON() as ContentCacheDoc);
        });
        setContentCache(cache);
      } catch (error) {
        console.error('[ReviewScreen] Error loading content:', error);
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

  if (reviewsLoading) {
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
  let explanation = '';
  if (content?.ai_explanation_json) {
    try {
      const parsed = JSON.parse(content.ai_explanation_json);
      explanation = parsed.brief_explanation || parsed.explanation || '';
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
            let reviewSummary = '';
            let reviewHalakha = '';
            
            if (reviewContent?.ai_explanation_json) {
              try {
                const parsed = JSON.parse(reviewContent.ai_explanation_json);
                // Use summary (like study page) not brief_explanation
                reviewSummary = parsed.summary || '';
                reviewHalakha = parsed.halakha || '';
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
                explanation={reviewSummary}
                halakha={reviewHalakha}
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
