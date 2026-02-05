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
      <div className="lg:col-span-2 bg-card rounded-lg border border-muted p-6">
        <h3 className="text-lg font-semibold mb-4">{t('preferences.title')}</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {t('preferences.pace.label')}
            </p>
            <div className="space-y-2">
              {paceData.map((pace) => {
                const paceLabel = {
                  TWO_MISHNAYOT: t('preferences.pace.twoMishna'),
                  ONE_CHAPTER: t('preferences.pace.oneChapter'),
                  SEDER_PER_YEAR: t('preferences.pace.sederYear'),
                }[pace.pace] || pace.pace

                return (
                  <div key={pace.pace} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{paceLabel}</span>
                        <span className="text-muted-foreground">
                          {pace.percentage}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pace.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {t('preferences.reviewIntensity.label')}
            </p>
            <div className="space-y-2">
              {reviewData.map((review) => {
                const intensityLabel = {
                  none: t('preferences.reviewIntensity.none'),
                  light: t('preferences.reviewIntensity.light'),
                  medium: t('preferences.reviewIntensity.medium'),
                  intensive: t('preferences.reviewIntensity.intensive'),
                }[review.review_intensity] || review.review_intensity
                const completionRate = review.overall_completion_rate || 0

                return (
                  <div key={review.review_intensity} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{intensityLabel}</span>
                        <span className="text-muted-foreground">
                          {completionRate}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${completionRate}%` }}
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
