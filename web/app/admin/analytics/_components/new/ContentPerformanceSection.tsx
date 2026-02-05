'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/lib/i18n'
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

  const hardestLabel = t('content.hardestMishnayot')

  return (
    <CollapsibleSection
      title={t('sections.content.title')}
      description={t('sections.content.description')}
      summaryValue={summary.passRate}
      summaryTrend={`${hardestLabel}: ${summary.hardest}`}
      defaultOpen={false}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('content.hardestMishnayot')}</h4>
          <div className="space-y-3">
            {hardestContent.slice(0, 5).map((content, index) => (
              <div
                key={content.ref_id}
                className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <span
                  className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold"
                  style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
                >
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{content.tractate}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {content.attempt_count} {t('content.attempts')}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg" style={{ color: 'var(--accent)' }}>{content.pass_rate}%</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('content.passRate')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('content.quizPerformance')}</h4>
          <div
            className="rounded-xl p-6 transition-all duration-300 hover:shadow-md"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              {t('sections.content.title')}
            </p>
            <p className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>
              {summary.passRate}
            </p>
            <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
              {hardestContent.length} {hardestLabel.toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  )
}
