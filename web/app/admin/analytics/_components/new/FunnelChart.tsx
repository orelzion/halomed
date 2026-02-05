'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { FunnelStep } from '@/types/analytics'

interface FunnelChartProps {
  steps: FunnelStep[]
  className?: string
}

export function FunnelChart({ steps, className }: FunnelChartProps) {
  const { t } = useTranslation('admin')

  const maxCount = useMemo(() => Math.max(...steps.map((s) => s.count)), [steps])

  const chartSteps = useMemo(() => {
    return steps.map((step, index) => {
      const widthPercent = (step.count / maxCount) * 100
      const conversionRate = step.conversionRate
      const dropOffRate = 100 - conversionRate

      return {
        ...step,
        width: Math.max(widthPercent, 20),
        dropOffRate,
        isBiggestDropOff: index > 0 && dropOffRate > (steps[index - 1]?.dropOffRate || 0),
      }
    })
  }, [steps, maxCount])

  if (steps.length === 0) {
    return (
      <div className={cn('bg-muted/20 rounded-lg p-8 text-center', className)}>
        <p className="text-muted-foreground">{t('empty.noData')}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {chartSteps.map((step, index) => (
        <div key={step.name} className="relative">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'bg-card rounded-lg border transition-all',
                step.isBiggestDropOff
                  ? 'border-orange-300 dark:border-orange-700'
                  : 'border-muted'
              )}
              style={{ width: `${step.width}%`, minWidth: '140px' }}
            >
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{step.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {step.count.toLocaleString()}
                  </span>
                </div>
                {index > 0 && (
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        'font-medium',
                        step.conversionRate >= 50
                          ? 'text-green-600 dark:text-green-400'
                          : step.conversionRate >= 25
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {step.conversionRate}% {t('onboarding.conversion')}
                    </span>
                    {step.dropOffRate > 0 && (
                      <span className="text-muted-foreground">
                        ↓ {step.dropOffRate}% {t('onboarding.dropOff')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {index > 0 && step.dropOffRate > 0 && (
              <div
                className={cn(
                  'absolute -left-12 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-10',
                  step.isBiggestDropOff
                    ? 'text-orange-500'
                    : 'text-muted-foreground'
                )}
                title={t('onboarding.biggestDropOff')}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
