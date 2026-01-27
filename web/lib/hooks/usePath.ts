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

  // Convert computed nodes to PathNode format
  const convertNodes = useCallback((computedNodes: ComputedPathNode[], existingNodes: PathNode[]) => {
    // Find the current learning node index across all loaded nodes
    const allComputedNodes = [...existingNodes.map(n => ({ isCurrent: n.isCurrent })), ...computedNodes];
    const currentLearningIdx = allComputedNodes.findIndex(node => node.isCurrent);
    const existingCount = existingNodes.length;
    
    return computedNodes.map((node, idx) => {
      const globalIdx = existingCount + idx;
      
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
        isLocked = currentLearningIdx !== -1 && globalIdx > currentLearningIdx;
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
    
    const computedNodes = computePath(progress, 0, PAGE_SIZE);
    const pathNodes = convertNodes(computedNodes, []);
    setAllNodes(pathNodes);
    setHasMore(computedNodes.length > 0);
    setLoading(false);
  }, [progress, prefsLoading, convertNodes]);

  // Load more pages
  const loadMore = useCallback(() => {
    if (!progress || !hasMore) return;
    
    const nextPage = currentPage + 1;
    const computedNodes = computePath(progress, nextPage, PAGE_SIZE);
    
    if (computedNodes.length === 0) {
      setHasMore(false);
      return;
    }
    
    const newNodes = convertNodes(computedNodes, allNodes);
    setAllNodes(prev => [...prev, ...newNodes]);
    setCurrentPage(nextPage);
  }, [progress, currentPage, hasMore, allNodes, convertNodes]);

  // Find current node index
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
