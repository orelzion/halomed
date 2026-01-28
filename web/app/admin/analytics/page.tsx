'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import type {
  SummaryStats,
  PopularTrack,
  StreakDropoff,
  QuizCompletionRate,
  DateRange,
} from '@/types/analytics'
import { SummaryCards } from './_components/SummaryCards'
import { PopularTracksChart } from './_components/PopularTracksChart'
import { StreakDropoffsChart } from './_components/StreakDropoffsChart'
import { QuizCompletionChart } from './_components/QuizCompletionChart'
import { DateRangeFilter } from './_components/DateRangeFilter'
import { RefreshButton } from './_components/RefreshButton'

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryStats | null>(null)
  const [tracks, setTracks] = useState<PopularTrack[]>([])
  const [streaks, setStreaks] = useState<StreakDropoff[]>([])
  const [quizRates, setQuizRates] = useState<QuizCompletionRate[]>([])
  const [range, setRange] = useState<DateRange>('7d')

  // Check if user is admin
  useEffect(() => {
    async function checkAdminStatus() {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      // Check user_roles table
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (error || data?.role !== 'admin') {
        router.push('/') // Redirect non-admin users to home
        return
      }

      setIsAdmin(true)
    }

    checkAdminStatus()
  }, [user, authLoading, router])

  // Fetch analytics data
  useEffect(() => {
    async function fetchAnalytics() {
      if (!isAdmin) return

      try {
        const [summaryResult, tracksResult, streaksResult, quizResult] = await Promise.all([
          supabase.rpc('get_summary_stats'),
          supabase.rpc('get_popular_tracks'),
          supabase.rpc('get_streak_dropoffs'),
          supabase.rpc('get_quiz_completion_rates'),
        ])

        if (summaryResult.data) {
          setSummary((summaryResult.data as SummaryStats[])[0] || null)
        }
        if (tracksResult.data) {
          setTracks(tracksResult.data as PopularTrack[])
        }
        if (streaksResult.data) {
          setStreaks(streaksResult.data as StreakDropoff[])
        }
        if (quizResult.data) {
          setQuizRates(quizResult.data as QuizCompletionRate[])
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [isAdmin])

  // Filter quiz data by date range
  const filteredQuizRates = quizRates.filter((d) => {
    const now = new Date()
    let cutoff: Date

    switch (range) {
      case '1d':
        cutoff = new Date(now.setDate(now.getDate() - 1))
        break
      case '7d':
        cutoff = new Date(now.setDate(now.getDate() - 7))
        break
      case '30d':
        cutoff = new Date(now.setDate(now.getDate() - 30))
        break
    }

    return new Date(d.week_start) >= cutoff
  })

  if (authLoading || loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Analytics Dashboard
          </h1>
          {summary?.refreshed_at && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {new Date(summary.refreshed_at).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <DateRangeFilter value={range} onChange={setRange} />
          <RefreshButton />
        </div>
      </div>

      {summary && <SummaryCards data={summary} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-muted p-6">
          <h2 className="text-lg font-semibold mb-4">Popular Tracks</h2>
          <PopularTracksChart data={tracks} />
        </div>

        <div className="bg-card rounded-lg border border-muted p-6">
          <h2 className="text-lg font-semibold mb-4">Streak Drop-offs</h2>
          <StreakDropoffsChart data={streaks} />
        </div>

        <div className="bg-card rounded-lg border border-muted p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">
            Quiz Completion Rate ({range === '1d' ? 'Today' : range === '7d' ? 'Last Week' : 'Last Month'})
          </h2>
          <QuizCompletionChart data={filteredQuizRates} />
        </div>
      </div>
    </div>
  )
}
