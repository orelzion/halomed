'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/lib/i18n'
import { KPICard } from './KPICard'
import type { UserPaceDistribution, ReviewCompletion } from '@/types/analytics'

interface UserPreferencesRowProps {
  paceData: UserPaceDistribution[]
  reviewData: ReviewCompletion[]
  loading?: boolean
}

export function UserPreferencesRow({
  paceData,
  reviewData,
  loading = false,
}: UserPreferencesRowProps) {
  const { t } = useTranslation('admin')

  const reviewCompletionRate = useMemo(() => {
    const enabled = reviewData.find((r) => r.review_intensity !== 'none')
    const totalScheduled = enabled?.total_reviews_scheduled || 0
    const totalCompleted = enabled?.total_reviews_completed || 0
    return totalScheduled > 0
      ? Math.round((totalCompleted / totalScheduled) * 100)
      : 0
  }, [reviewData])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div
        className="lg:col-span-2 rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>{t('preferences.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              {t('preferences.pace.label')}
            </p>
            <div className="space-y-3">
              {paceData.map((pace) => {
                const paceLabel = {
                  TWO_MISHNAYOT: t('preferences.pace.twoMishna'),
                  ONE_CHAPTER: t('preferences.pace.oneChapter'),
                  SEDER_PER_YEAR: t('preferences.pace.sederYear'),
                }[pace.pace] || pace.pace

                return (
                  <div key={pace.pace} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{paceLabel}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{pace.percentage}%</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pace.percentage}%`, backgroundColor: 'var(--accent)' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              {t('preferences.reviewIntensity.label')}
            </p>
            <div className="space-y-3">
              {reviewData.map((review) => {
                const intensityLabel = {
                  none: t('preferences.reviewIntensity.none'),
                  light: t('preferences.reviewIntensity.light'),
                  medium: t('preferences.reviewIntensity.medium'),
                  intensive: t('preferences.reviewIntensity.intensive'),
                }[review.review_intensity] || review.review_intensity
                const completionRate = review.overall_completion_rate || 0

                return (
                  <div key={review.review_intensity} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{intensityLabel}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{completionRate}%</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${completionRate}%`, backgroundColor: 'var(--muted-accent)' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <KPICard
        label={t('preferences.actualReviewUse')}
        value={`${reviewCompletionRate}%`}
        trend={reviewCompletionRate >= 50 ? 'up' : reviewCompletionRate >= 25 ? 'neutral' : 'down'}
        trendPercentage={reviewCompletionRate}
        comparisonLabel={t('preferences.completionRate')}
        loading={loading}
      />
    </div>
  )
}
