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
      <div
        className={cn('rounded-xl p-8 text-center', className)}
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>{t('empty.noData')}</p>
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
                'rounded-xl border transition-all duration-300 hover:shadow-md',
                step.isBiggestDropOff
                  ? 'border-orange-300 dark:border-orange-700'
                  : 'border-muted'
              )}
              style={{
                width: `${step.width}%`,
                minWidth: '140px',
                backgroundColor: 'var(--bg-card)',
                borderColor: step.isBiggestDropOff ? 'var(--accent)' : 'var(--border-color)',
              }}
            >
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{step.name}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {step.count.toLocaleString()}
                  </span>
                </div>
                {index > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        'font-semibold px-2 py-0.5 rounded-full',
                        step.conversionRate >= 50
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : step.conversionRate >= 25
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      )}
                    >
                      {step.conversionRate}% {t('onboarding.conversion')}
                    </span>
                    {step.dropOffRate > 0 && (
                      <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        {step.dropOffRate}% {t('onboarding.dropOff')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {index > 0 && step.dropOffRate > 0 && (
              <div
                className={cn(
                  'hidden md:flex items-center justify-center w-10 absolute',
                  step.isBiggestDropOff ? 'text-orange-500' : 'text-muted-foreground'
                )}
                style={{ right: `calc(-${step.width / 2}% - 20px)` }}
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
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
