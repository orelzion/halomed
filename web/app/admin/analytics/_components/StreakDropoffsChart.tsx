'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { StreakDropoff } from '@/types/analytics'

interface Props {
  data: StreakDropoff[]
}

export function StreakDropoffsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No streak data available
      </div>
    )
  }

  const chartData = data
    .sort((a, b) => a.days_before_dropoff - b.days_before_dropoff)
    .map((d) => ({
      day: d.days_before_dropoff,
      streaksEnded: d.num_streaks_ended,
      percentage: d.percentage,
    }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
          <XAxis
            dataKey="day"
            stroke="hsl(var(--muted-foreground))"
            label={{
              value: 'Days Before Drop-off',
              position: 'insideBottom',
              offset: -5,
            }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            label={{
              value: 'Streaks Ended',
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
            formatter={(value: number, name: string) => [
              name === 'streaksEnded'
                ? value.toLocaleString()
                : `${value.toFixed(1)}%`,
              name === 'streaksEnded' ? 'Streaks Ended' : 'Percentage',
            ]}
          />
          <Area
            type="monotone"
            dataKey="streaksEnded"
            stroke="#D4A373"
            fill="#D4A373"
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
