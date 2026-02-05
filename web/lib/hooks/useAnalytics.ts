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
      // For analytics, we only need the anon key since verify_jwt is false
      // Don't send Authorization header to avoid JWT validation
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analytics`,
        {
          method: 'POST',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ date_range: range }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch analytics: ${response.status} ${errorText}`)
      }

      const result = await response.json()

      setSummary(result.summary?.[0] || null)
      setUserPace(result.userPace || [])
      setCohortRetention(result.cohortRetention || [])
      setPaceAdherence(result.paceAdherence || [])
      setPaceAdherenceSummary(null)
      setContentDifficulty(result.contentDifficulty || [])
      setHardestContent([])
      setOnboardingFunnel(result.onboardingFunnel || null)
      setReviewCompletion(result.reviewCompletion || [])
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }, [range])

  const refresh = useCallback(async () => {
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analytics`,
      {
        method: 'POST',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: true }),
      }
    )
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
