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
      <div
        className="h-64 flex items-center justify-center rounded-xl"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>אין נתוני קצב זמינים</p>
      </div>
    )
  }

  const chartData = data.map((d) => ({
    pace: d.pace,
    users: d.user_count,
    percentage: d.percentage,
  }))

  return (
    <div className="h-64" dir="rtl">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="pace"
            stroke="var(--text-secondary)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          />
          <YAxis
            stroke="var(--text-secondary)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
            formatter={(value, name) => {
              if (typeof value !== 'number') return ['', '']
              return [
                name === 'users' ? value.toLocaleString() : `${value.toFixed(1)}%`,
                name === 'users' ? 'משתמשים' : 'אחוז',
              ]
            }}
          />
          <Bar
            dataKey="users"
            fill="var(--accent)"
            name="משתמשים"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
