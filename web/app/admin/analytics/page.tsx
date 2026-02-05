'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import type {
  SummaryStats,
  UserPaceDistribution,
  StreakDistribution,
  WeeklyActivity,
  ReviewIntensityDistribution,
  DateRange,
} from '@/types/analytics'
import { SummaryCards } from './_components/SummaryCards'
import { UserPaceChart } from './_components/UserPaceChart'
import { StreakDistributionChart } from './_components/StreakDistributionChart'
import { WeeklyActivityChart } from './_components/WeeklyActivityChart'
import { DateRangeFilter } from './_components/DateRangeFilter'
import { RefreshButton } from './_components/RefreshButton'

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryStats | null>(null)
  const [userPace, setUserPace] = useState<UserPaceDistribution[]>([])
  const [streaks, setStreaks] = useState<StreakDistribution[]>([])
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([])
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
        const [summaryResult, paceResult, streakResult, activityResult] = await Promise.all([
          supabase.rpc('get_summary_stats'),
          supabase.rpc('get_user_pace_distribution'),
          supabase.rpc('get_streak_distribution'),
          supabase.rpc('get_weekly_activity'),
        ])

        if (summaryResult.data) {
          setSummary((summaryResult.data as SummaryStats[])[0] || null)
        }
        if (paceResult.data) {
          setUserPace(paceResult.data as UserPaceDistribution[])
        }
        if (streakResult.data) {
          setStreaks(streakResult.data as StreakDistribution[])
        }
        if (activityResult.data) {
          setWeeklyActivity(activityResult.data as WeeklyActivity[])
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [isAdmin])

  // Filter weekly activity by date range
  const filteredActivity = weeklyActivity.filter((d) => {
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
      default:
        cutoff = new Date(now.setDate(now.getDate() - 7))
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
          <h2 className="text-lg font-semibold mb-4">User Pace Distribution</h2>
          <UserPaceChart data={userPace} />
        </div>

        <div className="bg-card rounded-lg border border-muted p-6">
          <h2 className="text-lg font-semibold mb-4">Streak Distribution</h2>
          <StreakDistributionChart data={streaks} />
        </div>

        <div className="bg-card rounded-lg border border-muted p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">
            Weekly Activity ({range === '1d' ? 'Today' : range === '7d' ? 'Last Week' : 'Last Month'})
          </h2>
          <WeeklyActivityChart data={filteredActivity} />
        </div>
      </div>
    </div>
  )
}
