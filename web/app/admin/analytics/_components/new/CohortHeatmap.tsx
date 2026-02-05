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
    if (value >= 40) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
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
      <div className={cn('bg-muted/20 rounded-lg p-8 text-center', className)}>
        <p className="text-muted-foreground">{t('empty.noData')}</p>
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-right pr-4 py-2 font-medium text-muted-foreground">
              {t('retention.cohort')}
            </th>
            {weeks.map((week) => (
              <th key={week} className="text-center px-2 py-2 font-medium text-muted-foreground">
                {t(`retention.week_${week}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heatmapData.map((row) => (
            <tr key={row.cohort} className="border-t border-muted/50">
              <td className="pr-4 py-2 font-medium">{row.cohort}</td>
              {weeks.map((week) => {
                const value = row.retentionByWeek[week]
                return (
                  <td key={week} className="px-1 py-1">
                    <div
                      className={cn(
                        'rounded px-2 py-1 text-center text-sm font-medium',
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
