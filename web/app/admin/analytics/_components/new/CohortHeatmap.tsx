'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { CohortRetention, CohortHeatmapRow } from '@/types/analytics'

interface CohortHeatmapProps {
  data: CohortRetention[]
  className?: string
}

export function CohortHeatmap({ data, className }: CohortHeatmapProps) {
  const { t } = useTranslation('admin')

  const heatmapData = useMemo((): CohortHeatmapRow[] => {
    const cohortMap = new Map<string, { [week: number]: number }>()

    data.forEach((row) => {
      if (!cohortMap.has(row.cohort_month)) {
        cohortMap.set(row.cohort_month, {})
      }
      const cohort = cohortMap.get(row.cohort_month)!
      cohort[row.weeks_since_signup] = row.retention_pct
    })

    return Array.from(cohortMap.entries())
      .map(([cohort, retentionByWeek]) => ({
        cohort: new Date(cohort).toLocaleDateString('he-IL', {
          month: 'short',
          year: 'numeric',
        }),
        retentionByWeek,
      }))
      .sort((a, b) => b.cohort.localeCompare(a.cohort))
      .slice(0, 6)
  }, [data])

  const maxWeeks = 8
  const weeks = Array.from({ length: maxWeeks }, (_, i) => i + 1)

  const getCellColor = (value: number | undefined): string => {
    if (value === undefined) return 'bg-muted/30'
    if (value >= 80) return 'bg-green-500/20 text-green-700 dark:text-green-300'
    if (value >= 60) return 'bg-green-500/10 text-green-600 dark:text-green-400'
    if (value >= 40) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    if (value >= 20) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
    return 'bg-red-500/10 text-red-600 dark:text-red-400'
  }

  const getCellTextColor = (value: number | undefined): string => {
    if (value === undefined) return 'text-muted-foreground'
    if (value >= 60) return 'text-foreground'
    return 'text-foreground'
  }

  if (data.length === 0) {
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
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
              {t('retention.cohort')}
            </th>
            {weeks.map((week) => (
              <th key={week} className="text-center py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t(`retention.week_${week}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heatmapData.map((row) => (
            <tr key={row.cohort} style={{ borderTopColor: 'var(--border-color)', borderTop: '1px solid' }}>
              <td className="py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{row.cohort}</td>
              {weeks.map((week) => {
                const value = row.retentionByWeek[week]
                return (
                  <td key={week} className="py-2 px-2">
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2 text-center text-sm font-semibold transition-all duration-200 hover:scale-105',
                        getCellColor(value),
                        getCellTextColor(value)
                      )}
                    >
                      {value !== undefined ? `${value}%` : '-'}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
