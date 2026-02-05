'use client'

import { useTranslation } from 'react-i18next'
import { KPICard } from './KPICard'
import type { SummaryStats } from '@/types/analytics'

interface HealthKPIRowProps {
  data: SummaryStats
  loading?: boolean
}

export function HealthKPIRow({ data, loading = false }: HealthKPIRowProps) {
  const { t } = useTranslation('admin')

  const kpis = [
    {
      key: 'activeUsers',
      label: t('kpi.activeUsers.label'),
      value: data.active_users_7d,
      trend: (data.week_over_week_change || 0) > 0 ? 'up' : (data.week_over_week_change || 0) < 0 ? 'down' : 'neutral',
      trendPercentage: Math.abs(data.week_over_week_change || 0),
      comparisonLabel: t('trends.vsPrevious'),
    },
    {
      key: 'retention',
      label: t('kpi.retention.label'),
      value: `${data.retention_7d_rate || 0}%`,
      trend: 'neutral' as const,
      trendPercentage: 0,
      comparisonLabel: `${data.active_users_7d} / ${data.active_users_30d}`,
    },
    {
      key: 'onboarding',
      label: t('kpi.onboardingComplete.label'),
      value: `${data.onboarding_completion_rate || 0}%`,
      trend: (data.month_over_month_change || 0) > 0 ? 'up' : (data.month_over_month_change || 0) < 0 ? 'down' : 'neutral',
      trendPercentage: Math.abs(data.month_over_month_change || 0),
      comparisonLabel: `${data.users_with_preferences} / ${data.total_users}`,
    },
    {
      key: 'streak',
      label: t('kpi.avgStreak.label'),
      value: data.avg_streak || 0,
      trend: (data.week_over_week_change || 0) > 0 ? 'up' : (data.week_over_week_change || 0) < 0 ? 'down' : 'neutral',
      trendPercentage: Math.abs(data.week_over_week_change || 0),
      comparisonLabel: `${data.users_with_streak_7plus} ${t('retention.streakDistribution')}`,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KPICard
          key={kpi.key}
          label={kpi.label}
          value={kpi.value}
          trend={kpi.trend}
          trendPercentage={kpi.trendPercentage}
          comparisonLabel={kpi.comparisonLabel}
          loading={loading}
        />
      ))}
    </div>
  )
}
