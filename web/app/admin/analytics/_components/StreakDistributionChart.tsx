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
import type { StreakDistribution } from '@/types/analytics'

interface Props {
  data: StreakDistribution[]
}

export function StreakDistributionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No streak data available
      </div>
    )
  }

  const chartData = data.map((d) => ({
    range: d.streak_range,
    users: d.user_count,
    percentage: d.percentage,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
          <XAxis
            dataKey="range"
            stroke="hsl(var(--muted-foreground))"
            label={{
              value: 'Streak Days',
              position: 'insideBottom',
              offset: -5,
            }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            label={{
              value: 'Users',
              angle: -90,
              position: 'insideLeft',
            }}
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
                name === 'users' ? 'Users' : 'Percentage',
              ]
            }}
          />
          <Bar dataKey="users" fill="#D4A373" name="users" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
