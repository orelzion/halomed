'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { usePreferences } from './usePreferences';
import { 
  computePath, 
  getTodaysContent,
  type PathNode as ComputedPathNode,
  type Pace,
  type ReviewIntensity,
} from '@shared/lib/path-generator';
import { type UserPreferencesDoc } from '@/lib/database/schemas';

export interface PathNode {
  id: string;
  index: number;
  node_type: string;
  content_ref: string | null;
  tractate: string | null;
  tractateHebrew: string | null;
  chapter: number | null;
  mishna: number | null;
  is_divider: number; // 0 or 1
  completed_at: string | null;
  isCurrent: boolean;
  isLocked: boolean;
  seder: string | null;
  unlock_date: string; // YYYY-MM-DD
  review_count?: number; // For review_session nodes
  review_interval?: number; // Days since learned (e.g., 3 for "day 3 review")
  review_range_start?: string; // First item in review (Hebrew, e.g., "ברכות א:ג")
  review_range_end?: string; // Last item in review (Hebrew, e.g., "ברכות ב:ד")
  review_item_indexes?: number[]; // Content indexes of items to review (passed directly to review page)
}

const PAGE_SIZE = 14; // Days per page

export function usePath() {
  const { preferences, loading: prefsLoading } = usePreferences();
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [allNodes, setAllNodes] = useState<PathNode[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Build progress object for path computation
  const progress = useMemo(() => {
    if (!preferences) return null;
    
    const yomTovDatesSet = new Set<string>(preferences.yom_tov_dates || []);
    
    return {
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
  }, [preferences]);

  // Convert computed nodes to PathNode format with user preferences check
  const convertNodes = useCallback(async (computedNodes: ComputedPathNode[]): Promise<PathNode[]> => {
    // Get user preferences to check completion dates
    let userPrefs: UserPreferencesDoc | null = null;
    try {
      const { getDatabase } = await import('@/lib/database/database');
      const db = await getDatabase();
      if (db) {
        const prefs = await db.user_preferences.find().exec();
        if (prefs.length > 0) {
          userPrefs = prefs[0];
        }
      }
    } catch (error) {
      console.warn('[usePath] Error fetching user preferences for review completion check:', error);
    }
    return computedNodes.map((node) => {
      // Generate unique node IDs based on type
      let nodeId: string;
      if (node.nodeType === 'review_session') {
        nodeId = `review-session-${node.unlockDate}`;
      } else if (node.nodeType === 'divider') {
        nodeId = `divider-${node.tractate}-${node.chapter}`;
      } else if (node.nodeType === 'weekly_quiz') {
        nodeId = `weekly-quiz-${node.unlockDate}`;
      } else {
        nodeId = `computed-${node.index}`;
      }

      // Determine if node is locked
      const isReviewSession = node.nodeType === 'review_session';
      const isWeeklyQuiz = node.nodeType === 'weekly_quiz';
      const isDivider = node.nodeType === 'divider';
      let isLocked: boolean;

      if (isDivider) {
        isLocked = false;
      } else if (isReviewSession || isWeeklyQuiz) {
        // Check if review/quiz was completed using user_preferences arrays
        let isCompleted = false;
        if (userPrefs && node.unlockDate) {
          if (isReviewSession) {
            const completedDates = userPrefs.review_completion_dates || [];
            isCompleted = completedDates.includes(node.unlockDate);
          } else if (isWeeklyQuiz) {
            const completedDates = userPrefs.quiz_completion_dates || [];
            isCompleted = completedDates.includes(node.unlockDate);
          }
        }
        
        isLocked = !isCompleted && !node.isCurrent;
      } else {
        isLocked = !node.isCompleted && !node.isCurrent;
      }

      return {
        id: nodeId,
        index: node.index,
        node_type: node.nodeType === 'divider' ? 'learning' : node.nodeType,
        content_ref: node.contentRef,
        tractate: node.tractate,
        tractateHebrew: node.tractateHebrew,
        chapter: node.chapter,
        mishna: node.mishna,
        is_divider: node.nodeType === 'divider' ? 1 : 0,
        completed_at: node.isCompleted ? new Date().toISOString() : null,
        isCurrent: node.isCurrent,
        isLocked: isLocked,
        seder: node.seder,
        unlock_date: node.unlockDate,
        review_count: node.reviewCount,
        review_interval: node.reviewInterval,
        review_range_start: node.reviewRangeStart,
        review_range_end: node.reviewRangeEnd,
        review_item_indexes: node.reviewItemIndexes,
      };
    });
  }, []);

  // Load initial page
  useEffect(() => {
    if (!progress || prefsLoading) return;

    const loadInitialPage = async () => {
      const computedNodes = computePath(progress, 0, PAGE_SIZE);
      const pathNodes = await convertNodes(computedNodes);
      setAllNodes(pathNodes);
      setHasMore(computedNodes.length > 0);
      setLoading(false);
    };

    loadInitialPage();
  }, [progress, prefsLoading]);

  // Load more pages
  const loadMore = useCallback(async () => {
    if (!progress || !hasMore) return;

    const nextPage = currentPage + 1;
    const computedNodes = computePath(progress, nextPage, PAGE_SIZE);

    if (computedNodes.length === 0) {
      setHasMore(false);
      return;
    }

    const newNodes = await convertNodes(computedNodes);
    setAllNodes(prev => [...prev, ...newNodes]);
    setCurrentPage(nextPage);
  }, [progress, currentPage, hasMore, convertNodes]);

  // Find current node index (first uncompleted learning node)
  const currentNodeIndex = useMemo(() => {
    const idx = allNodes.findIndex(n => n.isCurrent);
    return idx >= 0 ? idx : null;
  }, [allNodes]);

  return {
    nodes: allNodes,
    loading,
    currentNodeIndex,
    loadMore,
    hasMore,
  };
}

/**
 * Hook to get today's content for studying
 */
export function useTodaysContent() {
  const { preferences, loading } = usePreferences();

  const todaysContent = useMemo(() => {
    if (!preferences || loading) return null;

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

    return getTodaysContent(progress);
  }, [preferences, loading]);

  return { content: todaysContent, loading };
}
