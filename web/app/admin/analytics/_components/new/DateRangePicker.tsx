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
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', border: '1px solid' }}
      >
        <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {value === 'custom' ? t('dateRange.custom') : t(`dateRange.${value}`)}
        </span>
        <svg
          className="w-4 h-4 transition-transform duration-300"
          style={{ color: 'var(--text-secondary)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute rtl:left-0 rtl:right-auto mt-2 z-20 w-64 rounded-xl shadow-xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', border: '1px solid' }}
          >
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handlePresetChange(preset.key)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg transition-all duration-200',
                      value === preset.key
                        ? 'shadow-md'
                        : 'hover:bg-muted/50'
                    )}
                    style={{
                      backgroundColor: value === preset.key ? 'var(--accent)' : undefined,
                      color: value === preset.key ? '#FFFFFF' : 'var(--text-primary)',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="pt-3 space-y-3" style={{ borderTopColor: 'var(--border-color)', borderTop: '1px solid' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {t('dateRange.custom')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      מתאריך
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg transition-colors"
                      dir="ltr"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', border: '1px solid', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      עד תאריך
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg transition-colors"
                      dir="ltr"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', border: '1px solid', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleCustomApply}
                  disabled={!startDate || !endDate}
                  className="w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
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
