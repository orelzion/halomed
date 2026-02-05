'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { useAnalytics } from '@/lib/hooks/useAnalytics'
import { useTranslation } from 'react-i18next'
import { DateRangeFilter } from './_components/new/DateRangePicker'
import { AlertStrip } from './_components/new/AlertStrip'
import { HealthKPIRow } from './_components/new/HealthKPIRow'
import { UserPreferencesRow } from './_components/new/UserPreferencesRow'
import { RetentionEngagementSection } from './_components/new/RetentionEngagementSection'
import { OnboardingFunnelSection } from './_components/new/OnboardingFunnelSection'
import { ContentPerformanceSection } from './_components/new/ContentPerformanceSection'
import { LearningVelocitySection } from './_components/new/LearningVelocitySection'
import type { DateRange, AnalyticsAlert } from '@/types/analytics'

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const { t } = useTranslation('admin')
  const [isAdmin, setIsAdmin] = useState(false)
  const [range, setRange] = useState<DateRange>('7d')

  const {
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
  } = useAnalytics(range)

  const [alerts, setAlerts] = useState<AnalyticsAlert[]>([])

  useEffect(() => {
    async function checkAdminStatus() {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (error || data?.role !== 'admin') {
        router.push('/')
        return
      }

      setIsAdmin(true)
    }

    checkAdminStatus()
  }, [user, authLoading, router])

  useEffect(() => {
    const newAlerts: AnalyticsAlert[] = []

    if (summary) {
      if ((summary.retention_7d_rate || 0) < 60) {
        newAlerts.push({
          id: 'retention-low',
          type: 'warning',
          message: t('alerts.retentionDrop'),
          value: summary.retention_7d_rate || 0,
          threshold: 60,
        })
      }

      if ((summary.week_over_week_change || 0) < -10) {
        newAlerts.push({
          id: 'activity-drop',
          type: 'warning',
          message: t('alerts.churnIncreased'),
          value: summary.week_over_week_change || 0,
          threshold: -10,
        })
      }
    }

    if (paceAdherenceSummary && (paceAdherenceSummary.behind_7_plus_pct || 0) > 10) {
      newAlerts.push({
        id: 'pace-behind',
        type: 'warning',
        message: t('alerts.paceIssue'),
        value: paceAdherenceSummary.behind_7_plus_count || 0,
        threshold: 10,
      })
    }

    setAlerts(newAlerts)
  }, [summary, paceAdherenceSummary])

  if (authLoading || loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">{t('loading.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600 dark:text-red-400">{t('errors.fetchFailed')}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
            {summary?.refreshed_at && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('lastUpdated')}: {new Date(summary.refreshed_at).toLocaleString('he-IL')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <DateRangeFilter value={range} onChange={setRange} />
            <button
              onClick={refresh}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t('refresh')}
            </button>
          </div>
        </div>

        <AlertStrip alerts={alerts} />

        <div className="space-y-6 mt-6">
          <HealthKPIRow data={summary!} loading={loading} />

          <UserPreferencesRow
            paceData={userPace}
            reviewData={reviewCompletion}
            loading={loading}
          />

          <RetentionEngagementSection
            cohortData={cohortRetention}
            paceData={paceAdherence}
            loading={loading}
          />

          <OnboardingFunnelSection data={onboardingFunnel!} loading={loading} />

          <ContentPerformanceSection
            difficultyData={contentDifficulty}
            hardestContent={hardestContent}
            loading={loading}
          />

          <LearningVelocitySection
            paceAdherence={paceAdherence}
            summary={paceAdherenceSummary}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
