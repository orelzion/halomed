'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { DateRange, CustomDateRange } from '@/types/analytics'

interface DateRangeFilterProps {
  value: DateRange
  onChange: (value: DateRange) => void
  className?: string
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const { t } = useTranslation('admin')
  const [isOpen, setIsOpen] = useState(false)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const presets = [
    { key: '1d', label: t('dateRange.1d') },
    { key: '7d', label: t('dateRange.7d') },
    { key: '30d', label: t('dateRange.30d') },
    { key: '90d', label: t('dateRange.90d') },
  ] as const

  const handlePresetChange = (preset: typeof presets[number]['key']) => {
    onChange(preset as DateRange)
    setIsOpen(false)
  }

  const handleCustomApply = () => {
    if (startDate && endDate) {
      onChange('custom')
      setIsOpen(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-card border border-muted rounded-lg hover:bg-muted/50 transition-colors"
      >
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium text-foreground">
          {value === 'custom' ? t('dateRange.custom') : t(`dateRange.${value}`)}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 z-20 w-64 bg-card border border-muted rounded-lg shadow-lg p-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handlePresetChange(preset.key)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors',
                      value === preset.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-muted pt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('dateRange.custom')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      מתאריך
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-muted rounded border border-muted"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      עד תאריך
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-muted rounded border border-muted"
                      dir="ltr"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCustomApply}
                  disabled={!startDate || !endDate}
                  className="w-full px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  החל
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
