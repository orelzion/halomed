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
    up: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: '↑' },
    down: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: '↓' },
    neutral: { bg: 'bg-muted/50', text: 'text-muted-foreground', icon: '→' },
  }

  const currentTrend = trendColors[trend]

  if (loading) {
    return (
      <div
        className={cn('rounded-2xl border p-6', className)}
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 rounded" style={{ backgroundColor: 'var(--muted-accent)' }} />
          <div className="h-8 rounded" style={{ backgroundColor: 'var(--muted-accent)' }} />
          <div className="h-4 rounded w-1/3" style={{ backgroundColor: 'var(--muted-accent)' }} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer',
        className
      )}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {typeof value === 'number' ? value.toLocaleString('he-IL') : value}
          </p>
        </div>
        <div
          className={cn('flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium', currentTrend.bg, currentTrend.text)}
        >
          <span>{currentTrend.icon}</span>
          <span>{Math.abs(trendPercentage)}%</span>
        </div>
      </div>
      {comparisonLabel && (
        <p className="mt-3 text-xs font-medium pt-3 border-t" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
          {comparisonLabel}
        </p>
      )}
    </div>
  )
}
