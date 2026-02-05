'use client'

import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface KPICardProps {
  label: string
  value: number | string
  trend: 'up' | 'down' | 'neutral'
  trendPercentage: number
  comparisonLabel?: string
  className?: string
  loading?: boolean
}

export function KPICard({
  label,
  value,
  trend,
  trendPercentage,
  comparisonLabel,
  className,
  loading = false,
}: KPICardProps) {
  const { t } = useTranslation('admin')

  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  }

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  }

  if (loading) {
    return (
      <div className={cn('bg-card rounded-lg border border-muted p-6', className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/3" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-card rounded-lg border border-muted p-6 transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground">
            {typeof value === 'number' ? value.toLocaleString('he-IL') : value}
          </p>
        </div>
        <div
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            trendColors[trend]
          )}
        >
          <span>{trendIcons[trend]}</span>
          <span>{Math.abs(trendPercentage)}%</span>
        </div>
      </div>
      {comparisonLabel && (
        <p className="mt-2 text-xs text-muted-foreground">
          {comparisonLabel}
        </p>
      )}
    </div>
  )
}
