'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type {
  SummaryStats,
  UserPaceDistribution,
  CohortRetention,
  PaceAdherence,
  PaceAdherenceSummary,
  ContentDifficulty,
  HardestContent,
  OnboardingFunnel,
  ReviewCompletion,
  DateRange,
} from '@/types/analytics'

interface AnalyticsData {
  summary: SummaryStats | null
  userPace: UserPaceDistribution[]
  cohortRetention: CohortRetention[]
  paceAdherence: PaceAdherence[]
  paceAdherenceSummary: PaceAdherenceSummary | null
  contentDifficulty: ContentDifficulty[]
  hardestContent: HardestContent[]
  onboardingFunnel: OnboardingFunnel | null
  reviewCompletion: ReviewCompletion[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAnalytics(range: DateRange = '7d'): AnalyticsData {
  const [summary, setSummary] = useState<SummaryStats | null>(null)
  const [userPace, setUserPace] = useState<UserPaceDistribution[]>([])
  const [cohortRetention, setCohortRetention] = useState<CohortRetention[]>([])
  const [paceAdherence, setPaceAdherence] = useState<PaceAdherence[]>([])
  const [paceAdherenceSummary, setPaceAdherenceSummary] = useState<PaceAdherenceSummary | null>(null)
  const [contentDifficulty, setContentDifficulty] = useState<ContentDifficulty[]>([])
  const [hardestContent, setHardestContent] = useState<HardestContent[]>([])
  const [onboardingFunnel, setOnboardingFunnel] = useState<OnboardingFunnel | null>(null)
  const [reviewCompletion, setReviewCompletion] = useState<ReviewCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [
        summaryResult,
        paceResult,
        cohortResult,
        paceAdherenceResult,
        paceSummaryResult,
        difficultyResult,
        hardestResult,
        funnelResult,
        reviewResult,
      ] = await Promise.all([
        supabase.rpc('get_summary_stats'),
        supabase.rpc('get_user_pace_distribution'),
        supabase.rpc('get_cohort_retention'),
        supabase.rpc('get_pace_adherence'),
        supabase.rpc('get_pace_adherence_summary'),
        supabase.rpc('get_content_difficulty'),
        supabase.rpc('get_hardest_content', { limit_count: 10 }),
        supabase.rpc('get_onboarding_funnel'),
        supabase.rpc('get_review_completion'),
      ])

      if (summaryResult.error) throw new Error(summaryResult.error.message)
      if (summaryResult.data) {
        setSummary((summaryResult.data as SummaryStats[])[0] || null)
      }

      if (paceResult.data) {
        setUserPace(paceResult.data as UserPaceDistribution[])
      }

      if (cohortResult.error) {
        console.warn('Cohort retention not available:', cohortResult.error)
        setCohortRetention([])
      } else if (cohortResult.data) {
        setCohortRetention(cohortResult.data as CohortRetention[])
      }

      if (paceAdherenceResult.error) {
        console.warn('Pace adherence not available:', paceAdherenceResult.error)
        setPaceAdherence([])
      } else if (paceAdherenceResult.data) {
        setPaceAdherence(paceAdherenceResult.data as PaceAdherence[])
      }

      if (paceSummaryResult.error) {
        setPaceAdherenceSummary(null)
      } else if (paceSummaryResult.data) {
        const data = paceSummaryResult.data as PaceAdherenceSummary[]
        setPaceAdherenceSummary(data[0] || null)
      }

      if (difficultyResult.error) {
        setContentDifficulty([])
      } else if (difficultyResult.data) {
        setContentDifficulty(difficultyResult.data as ContentDifficulty[])
      }

      if (hardestResult.error) {
        setHardestContent([])
      } else if (hardestResult.data) {
        setHardestContent(hardestResult.data as HardestContent[])
      }

      if (funnelResult.error) {
        setOnboardingFunnel(null)
      } else if (funnelResult.data) {
        setOnboardingFunnel((funnelResult.data as OnboardingFunnel[])[0] || null)
      }

      if (reviewResult.error) {
        setReviewCompletion([])
      } else if (reviewResult.data) {
        setReviewCompletion(reviewResult.data as ReviewCompletion[])
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    const { error: refreshError } = await supabase.rpc('refresh_all_views')
    if (refreshError) {
      console.error('Error refreshing views:', refreshError)
    }
    await fetchAnalytics()
  }, [fetchAnalytics])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    summary,
    userPace,
    cohortRetention,
    paceAdherence,
    paceAdherenceSummary,
    contentDifficulty,
    hardestContent,
    onboardingFunnel,
    reviewCompletion,
    loading,
    error,
    refresh,
  }
}
