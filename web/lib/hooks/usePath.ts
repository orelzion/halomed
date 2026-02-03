'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { usePreferences } from './usePreferences';
import { 
  computePath, 
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

  // Helper function to determine if a review/quiz node appears before the first uncompleted learning node
  function isBeforeCurrentLearningNode(
    node: ComputedPathNode,
    allNodes: ComputedPathNode[]
  ): boolean {
    // Find the first uncompleted learning node's position in the allNodes array
    const firstUncompletedLearningIdx = allNodes.findIndex(
      n => n.nodeType === 'learning' && !n.isCompleted
    );
    if (firstUncompletedLearningIdx === -1) return true; // All learning nodes completed
    
    // Find this node's position in the array
    const thisNodeIdx = allNodes.indexOf(node);
    
    // Review/quiz is unlocked if it appears before the first uncompleted learning node
    return thisNodeIdx < firstUncompletedLearningIdx;
  }

  // Convert computed nodes to PathNode format (simplified - uses preferences from hook)
  const convertNodes = useCallback((computedNodes: ComputedPathNode[]): PathNode[] => {
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
        // Reviews/quizzes: unlocked if completed, current, or appear before the current learning node
        // Once unlocked, they stay unlocked forever
        isLocked = !node.isCompleted && !node.isCurrent && !isBeforeCurrentLearningNode(node, computedNodes);
      } else {
        // Learning nodes: unlocked if completed, current, or accessible (when review/quiz is current)
        isLocked = !node.isCompleted && !node.isCurrent && !node.isAccessible;
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
        completed_at: (() => {
          if (node.isCompleted) {
            return new Date().toISOString();
          }
          if ((isReviewSession || isWeeklyQuiz) && preferences && node.unlockDate) {
            const completedDates = isReviewSession 
              ? (preferences.review_completion_dates || [])
              : (preferences.quiz_completion_dates || []);
            
            if (completedDates.includes(node.unlockDate)) {
              return node.unlockDate + 'T00:00:00.000Z';
            }
          }
          return null;
        })(),
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


