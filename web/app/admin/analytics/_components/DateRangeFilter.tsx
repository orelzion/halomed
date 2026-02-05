'use client'

import type { DateRange } from '@/types/analytics'

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangeFilter({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DateRange)}
      className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-md focus:outline-none focus:ring-2"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        border: '1px solid',
        color: 'var(--text-primary)',
        '--tw-ring-color': 'var(--accent)',
      } as React.CSSProperties}
    >
      <option value="1d">יום אחרון</option>
      <option value="7d">שבוע אחרון</option>
      <option value="30d">חודש אחרון</option>
    </select>
  )
}
