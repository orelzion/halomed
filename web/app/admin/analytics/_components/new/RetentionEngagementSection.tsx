'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
          <h4 className="text-md font-medium mb-4">{t('retention.cohortAnalysis')}</h4>
          <CohortHeatmap data={cohortData} />
        </div>
        <div>
          <h4 className="text-md font-medium mb-4">{t('velocity.paceAdherence')}</h4>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">
                {t('velocity.onTrack')}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {summary.paceAdherence}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {summary.paceTrend}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {paceData.slice(0, 3).map((pace) => (
                <div
                  key={pace.user_id}
                  className="bg-muted/50 rounded-lg p-3 text-center"
                >
                  <p className="text-lg font-semibold">
                    {pace.days_behind > 0 ? `+${pace.days_behind}` : pace.days_behind}
                  </p>
                  <p className="text-xs text-muted-foreground">
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
