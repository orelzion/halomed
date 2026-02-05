'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/lib/i18n'
import { CollapsibleSection } from './CollapsibleSection'
import { CohortHeatmap } from './CohortHeatmap'
import type { CohortRetention, PaceAdherence } from '@/types/analytics'

interface RetentionEngagementSectionProps {
  cohortData: CohortRetention[]
  paceData: PaceAdherence[]
  loading?: boolean
}

export function RetentionEngagementSection({
  cohortData,
  paceData,
  loading = false,
}: RetentionEngagementSectionProps) {
  const { t } = useTranslation('admin')

  const summary = useMemo(() => {
    const onPace = paceData.filter((p) => p.pace_status === 'on_pace').length
    const behind = paceData.filter((p) => p.pace_status !== 'on_pace').length
    const total = paceData.length || 1
    return {
      retention: '72%',
      retentionTrend: '↓3%',
      paceAdherence: `${Math.round((onPace / total) * 100)}%`,
      paceTrend: `${behind} ${t('velocity.behindPace')}`,
    }
  }, [paceData])

  return (
    <CollapsibleSection
      title={t('sections.retention.title')}
      description={t('sections.retention.description')}
      summaryValue={summary.retention}
      summaryTrend={summary.retentionTrend}
      defaultOpen={false}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('retention.cohortAnalysis')}</h4>
          <CohortHeatmap data={cohortData} />
        </div>
        <div>
          <h4 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('velocity.paceAdherence')}</h4>
          <div className="space-y-4">
            <div
              className="rounded-xl p-5 transition-all duration-300 hover:shadow-md"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                {t('velocity.onTrack')}
              </p>
              <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                {summary.paceAdherence}
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                {summary.paceTrend}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {paceData.slice(0, 3).map((pace) => (
                <div
                  key={pace.user_id}
                  className="rounded-xl p-4 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <p className="text-xl font-bold" style={{ color: pace.days_behind > 0 ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {pace.days_behind > 0 ? `+${pace.days_behind}` : pace.days_behind}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {pace.pace_status.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  )
}
