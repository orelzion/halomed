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
      className="px-4 py-2 bg-card border border-muted rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <option value="1d">Last Day</option>
      <option value="7d">Last Week</option>
      <option value="30d">Last Month</option>
    </select>
  )
}
