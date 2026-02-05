'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/lib/i18n'
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

  const behindPace = t('velocity.behindPace')

  return (
    <CollapsibleSection
      title={t('sections.velocity.title')}
      description={t('sections.velocity.description')}
      summaryValue={displaySummary.onPace}
      summaryTrend={`${displaySummary.behind} ${behindPace}`}
      defaultOpen={false}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="rounded-xl p-5 transition-all duration-300 hover:shadow-md"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            {t('velocity.onTrack')}
          </p>
          <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>
            {displaySummary.onPace}
          </p>
        </div>
        <div
          className="rounded-xl p-5 transition-all duration-300 hover:shadow-md"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            {behindPace} (-7)
          </p>
          <p className="text-3xl font-bold" style={{ color: '#f59e0b' }}>
            {summary?.behind_1_7_count || 0}
          </p>
        </div>
        <div
          className="rounded-xl p-5 transition-all duration-300 hover:shadow-md"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            {behindPace} (-7+)
          </p>
          <p className="text-3xl font-bold" style={{ color: '#ef4444' }}>
            {summary?.behind_7_plus_count || 0}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('velocity.atRiskUsers')}</h4>
        <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', border: '1px solid' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottomColor: 'var(--border-color)', borderBottom: '1px solid' }}>
                <th className="text-right py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>User</th>
                <th className="text-right py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{t('velocity.daysBehind')}</th>
                <th className="text-right py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{t('retention.streakDistribution')}</th>
                <th className="text-right py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{t('velocity.actionNeeded')}</th>
              </tr>
            </thead>
            <tbody>
              {paceAdherence
                .filter((p) => p.pace_status === 'behind_7_plus')
                .slice(0, 5)
                .map((pace) => (
                  <tr key={pace.user_id} style={{ borderBottomColor: 'var(--border-color)', borderBottom: '1px solid' }}>
                    <td className="py-3 px-4 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {pace.user_id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>{pace.days_behind} {t('velocity.daysBehind').toLowerCase()}</td>
                    <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>{pace.streak_count}</td>
                    <td className="py-3 px-4">
                      <button
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 hover:shadow-md"
                        style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
                      >
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
