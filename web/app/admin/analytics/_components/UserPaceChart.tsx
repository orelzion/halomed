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
import type { UserPaceDistribution } from '@/types/analytics'

interface Props {
  data: UserPaceDistribution[]
}

export function UserPaceChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No pace data available
      </div>
    )
  }

  const chartData = data.map((d) => ({
    pace: d.pace,
    users: d.user_count,
    percentage: d.percentage,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
          <XAxis dataKey="pace" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
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
