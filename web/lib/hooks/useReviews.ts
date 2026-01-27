/**
 * useReviews Hook
 * Computes reviews due based on user's current position
 * No database queries for review nodes - everything computed from position
 */

import { useMemo } from 'react';
import { usePreferences } from './usePreferences';
import { 
  computeReviewsDue, 
  computeReviewsByDate,
  type ReviewItem, 
  type Pace, 
  type ReviewIntensity 
} from '@shared/lib/path-generator';

export interface UseReviewsResult {
  reviews: ReviewItem[];
  loading: boolean;
  hasReviews: boolean;
}

/**
 * Get reviews for a specific date or today
 * @param targetDate - Optional date string (YYYY-MM-DD) to get reviews for. If not provided, gets today's reviews.
 */
export function useReviews(targetDate?: string): UseReviewsResult {
  const { preferences, loading } = usePreferences();

  const reviews = useMemo(() => {
    if (!preferences || loading) {
      console.log('[useReviews] No preferences or still loading', { preferences: !!preferences, loading });
      return [];
    }

    const yomTovDatesSet = new Set<string>(preferences.yom_tov_dates || []);

    const progress = {
      currentContentIndex: preferences.current_content_index ?? 0,
      pace: (preferences.pace || 'two_mishna') as Pace,
      reviewIntensity: (preferences.review_intensity || 'none') as ReviewIntensity,
      startDate: preferences.path_start_date
        ? new Date(preferences.path_start_date)
        : new Date(),
      studyDays: {
        skipFriday: preferences.skip_friday ?? true,
        yomTovDates: yomTovDatesSet,
      },
    };

    console.log('[useReviews] Computing reviews with progress:', {
      currentContentIndex: progress.currentContentIndex,
      pace: progress.pace,
      reviewIntensity: progress.reviewIntensity,
      startDate: progress.startDate.toISOString(),
      targetDate,
    });

    // If a specific date is requested, get reviews for that date
    if (targetDate) {
      const reviewsByDate = computeReviewsByDate(progress, 60);
      const reviewsForDate = reviewsByDate.get(targetDate) || [];
      console.log('[useReviews] Reviews for date', targetDate, ':', reviewsForDate.length, 'items');
      console.log('[useReviews] All dates with reviews:', Array.from(reviewsByDate.keys()));
      return reviewsForDate;
    }

    // Default: get today's reviews
    const todayReviews = computeReviewsDue(progress);
    console.log('[useReviews] Today reviews:', todayReviews.length, 'items');
    return todayReviews;
  }, [preferences, loading, targetDate]);

  return {
    reviews,
    loading,
    hasReviews: reviews.length > 0,
  };
}
