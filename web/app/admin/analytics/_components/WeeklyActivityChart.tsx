'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import type { WeeklyActivity } from '@/types/analytics'

interface Props {
  data: WeeklyActivity[]
}

export function WeeklyActivityChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="h-64 flex items-center justify-center rounded-xl"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>אין נתוני פעילות זמינים לתקופה זו</p>
      </div>
    )
  }

  const chartData = data
    .sort(
      (a, b) =>
        new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
    )
    .map((d) => ({
      week: format(new Date(d.week_start), 'dd MMM'),
      activeUsers: d.active_users,
      completionRate: d.overall_completion_rate,
      completedLearning: d.completed_learning,
      completedQuizzes: d.completed_quizzes,
      completedReviews: d.completed_reviews,
    }))

  return (
    <div className="h-64" dir="rtl">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="week"
            stroke="var(--text-secondary)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
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
              if (name === 'completionRate') {
                return [`${value.toFixed(1)}%`, 'שיעור השלמה']
              }
              return [value.toLocaleString(), name === 'activeUsers' ? 'משתמשים פעילים' : name]
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="activeUsers"
            stroke="var(--accent)"
            strokeWidth={3}
            dot={{ fill: 'var(--accent)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: 'var(--accent)' }}
            name="משתמשים פעילים"
          />
          <Line
            type="monotone"
            dataKey="completionRate"
            stroke="var(--muted-accent)"
            strokeWidth={3}
            dot={{ fill: 'var(--muted-accent)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: 'var(--muted-accent)' }}
            name="שיעור השלמה (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
