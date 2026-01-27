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
    if (!preferences || loading) return [];

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

    // If a specific date is requested, get reviews for that date
    if (targetDate) {
      const reviewsByDate = computeReviewsByDate(progress, 60);
      return reviewsByDate.get(targetDate) || [];
    }

    // Default: get today's reviews
    return computeReviewsDue(progress);
  }, [preferences, loading, targetDate]);

  return {
    reviews,
    loading,
    hasReviews: reviews.length > 0,
  };
}
