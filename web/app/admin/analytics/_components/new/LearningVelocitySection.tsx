'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CollapsibleSection } from './CollapsibleSection'
import type { PaceAdherence, PaceAdherenceSummary } from '@/types/analytics'

interface LearningVelocitySectionProps {
  paceAdherence: PaceAdherence[]
  summary: PaceAdherenceSummary | null
  loading?: boolean
}

export function LearningVelocitySection({
  paceAdherence,
  summary,
  loading = false,
}: LearningVelocitySectionProps) {
  const { t } = useTranslation('admin')

  const displaySummary = useMemo(() => {
    if (!summary) return { onPace: '0%', behind: '0', trend: '0%' }
    return {
      onPace: `${summary.on_pace_pct}%`,
      behind: summary.behind_1_7_count + summary.behind_7_plus_count,
      trend: `${summary.behind_7_plus_pct}% ${t('velocity.behindPace')}`,
    }
  }, [summary])

  return (
    <CollapsibleSection
      title={t('sections.velocity.title')}
      description={t('sections.velocity.description')}
      summaryValue={displaySummary.onPace}
      summaryTrend={`${displaySummary.behind} ${t('velocity.behindPace')}`}
      defaultOpen={false}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            {t('velocity.onTrack')}
          </p>
          <p className="text-2xl font-bold text-green-800 dark:text-green-200">
            {displaySummary.onPace}
          </p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {t('velocity.behindPace')} (-7)
          </p>
          <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
            {summary?.behind_1_7_count || 0}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">
            {t('velocity.behindPace')} (-7+)
          </p>
          <p className="text-2xl font-bold text-red-800 dark:text-red-200">
            {summary?.behind_7_plus_count || 0}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-md font-medium mb-4">{t('velocity.atRiskUsers')}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-muted">
                <th className="text-right py-2 px-3 font-medium">User</th>
                <th className="text-right py-2 px-3 font-medium">{t('velocity.daysBehind')}</th>
                <th className="text-right py-2 px-3 font-medium">{t('retention.streakDistribution')}</th>
                <th className="text-right py-2 px-3 font-medium">{t('velocity.actionNeeded')}</th>
              </tr>
            </thead>
            <tbody>
              {paceAdherence
                .filter((p) => p.pace_status === 'behind_7_plus')
                .slice(0, 5)
                .map((pace) => (
                  <tr key={pace.user_id} className="border-b border-muted/50">
                    <td className="py-2 px-3 font-mono text-xs">
                      {pace.user_id.slice(0, 8)}...
                    </td>
                    <td className="py-2 px-3">{pace.days_behind} {t('velocity.daysBehind').toLowerCase()}</td>
                    <td className="py-2 px-3">{pace.streak_count}</td>
                    <td className="py-2 px-3">
                      <button className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
                        {t('onboarding.recommendation')}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </CollapsibleSection>
  )
}
