'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/lib/i18n'
import { CollapsibleSection } from './CollapsibleSection'
import { FunnelChart } from './FunnelChart'
import type { OnboardingFunnel } from '@/types/analytics'

interface OnboardingFunnelSectionProps {
  data: OnboardingFunnel
  loading?: boolean
}

export function OnboardingFunnelSection({
  data,
  loading = false,
}: OnboardingFunnelSectionProps) {
  const { t } = useTranslation('admin')

  const funnelSteps = useMemo(() => {
    if (!data || data.total_users === 0) return []

    return [
      {
        name: t('onboarding.steps.appOpened'),
        count: data.total_users,
        conversionRate: 100,
        dropOffRate: 0,
      },
      {
        name: t('onboarding.steps.paceSelected'),
        count: data.has_preferences,
        conversionRate: Math.round((data.has_preferences / data.total_users) * 100),
        dropOffRate: 100 - Math.round((data.has_preferences / data.total_users) * 100),
      },
      {
        name: t('onboarding.steps.reviewConfigured'),
        count: data.review_configured,
        conversionRate: data.has_preferences > 0
          ? Math.round((data.review_configured / data.has_preferences) * 100)
          : 0,
        dropOffRate: data.has_preferences > 0
          ? 100 - Math.round((data.review_configured / data.has_preferences) * 100)
          : 0,
      },
      {
        name: t('onboarding.steps.firstLessonCompleted'),
        count: data.first_lesson_completed,
        conversionRate: data.review_configured > 0
          ? Math.round((data.first_lesson_completed / data.review_configured) * 100)
          : 0,
        dropOffRate: data.review_configured > 0
          ? 100 - Math.round((data.first_lesson_completed / data.review_configured) * 100)
          : 0,
      },
      {
        name: t('onboarding.steps.week1Active'),
        count: data.week1_active,
        conversionRate: data.day2_return > 0
          ? Math.round((data.week1_active / data.day2_return) * 100)
          : 0,
        dropOffRate: data.day2_return > 0
          ? 100 - Math.round((data.week1_active / data.day2_return) * 100)
          : 0,
      },
    ]
  }, [data])

  const summary = useMemo(() => {
    if (!data) return { completion: '0%', dropOff: '0' }
    const completionRate = data.week1_active > 0
      ? Math.round((data.week1_active / data.total_users) * 100)
      : 0
    const biggestDrop = Math.max(
      100 - data.conversion_to_pace,
      data.conversion_to_pace - data.conversion_to_review,
      100 - data.conversion_first_lesson
    )
    return {
      completion: `${completionRate}%`,
      dropOff: `${biggestDrop}%`,
    }
  }, [data])

  const biggestDropOff = t('onboarding.biggestDropOff')

  return (
    <CollapsibleSection
      title={t('sections.onboarding.title')}
      description={t('sections.onboarding.description')}
      summaryValue={summary.completion}
      summaryTrend={`${biggestDropOff}: ${summary.dropOff}`}
      defaultOpen={false}
    >
      <FunnelChart steps={funnelSteps} />
    </CollapsibleSection>
  )
}
