'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PopularTrack } from '@/types/analytics'

interface Props {
  data: PopularTrack[]
}

export function PopularTracksChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No track data available
      </div>
    )
  }

  // Sort by total users and take top 10
  const chartData = [...data]
    .sort((a, b) => b.total_users - a.total_users)
    .slice(0, 10)
    .map((d) => ({
      name: d.track_title.length > 20
        ? d.track_title.slice(0, 20) + '...'
        : d.track_title,
      users: d.total_users,
      completionRate: d.completion_rate_pct,
    }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
          <YAxis
            dataKey="name"
            type="category"
            width={150}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--muted))',
              borderRadius: '8px',
            }}
            formatter={(value, name) => {
              if (typeof value !== 'number') return ['', '']
              return [
                name === 'users' ? value.toLocaleString() : `${value.toFixed(1)}%`,
                name === 'users' ? 'Total Users' : 'Completion Rate',
              ]
            }}
          />
          <Bar dataKey="users" fill="#D4A373" name="users" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
