'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { DateRange } from '@/types/analytics'

export function DateRangeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentRange = (searchParams.get('range') || '7d') as DateRange

  const handleChange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', range)
    router.push(`/admin/analytics?${params.toString()}`)
  }

  return (
    <select
      value={currentRange}
      onChange={(e) => handleChange(e.target.value as DateRange)}
      className="px-4 py-2 bg-card border border-muted rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <option value="1d">Last Day</option>
      <option value="7d">Last Week</option>
      <option value="30d">Last Month</option>
    </select>
  )
}
