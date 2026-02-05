'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CollapsibleSection } from './CollapsibleSection'
import type { ContentDifficulty, HardestContent } from '@/types/analytics'

interface ContentPerformanceSectionProps {
  difficultyData: ContentDifficulty[]
  hardestContent: HardestContent[]
  loading?: boolean
}

export function ContentPerformanceSection({
  difficultyData,
  hardestContent,
  loading = false,
}: ContentPerformanceSectionProps) {
  const { t } = useTranslation('admin')

  const summary = useMemo(() => {
    if (hardestContent.length === 0) return { passRate: '0%', hardest: '-' }
    const avgPass = hardestContent.reduce((acc, c) => acc + (c.pass_rate || 0), 0) / hardestContent.length
    return {
      passRate: `${Math.round(avgPass)}%`,
      hardest: hardestContent[0]?.tractate || '-',
    }
  }, [hardestContent])

  return (
    <CollapsibleSection
      title={t('sections.content.title')}
      description={t('sections.content.description')}
      summaryValue={summary.passRate}
      summaryTrend={t('content.hardestMishnayot')}: {summary.hardest}
      defaultOpen={false}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-medium mb-4">{t('content.hardestMishnayot')}</h4>
          <div className="space-y-2">
            {hardestContent.slice(0, 5).map((content, index) => (
              <div
                key={content.ref_id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <span className="w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground rounded-full text-sm font-medium">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{content.tractate}</p>
                  <p className="text-xs text-muted-foreground">
                    {content.attempt_count} {t('content.attempts')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{content.pass_rate}%</p>
                  <p className="text-xs text-muted-foreground">{t('content.passRate')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-md font-medium mb-4">{t('content.quizPerformance')}</h4>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">
              {t('sections.content.title')}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {summary.passRate}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {hardestContent.length} {t('content.hardestMishnayot').toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  )
}
