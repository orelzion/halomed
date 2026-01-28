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
import type { QuizCompletionRate } from '@/types/analytics'

interface Props {
  data: QuizCompletionRate[]
}

export function QuizCompletionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No quiz data available for this period
      </div>
    )
  }

  const chartData = data
    .sort(
      (a, b) =>
        new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
    )
    .map((d) => ({
      week: format(new Date(d.week_start), 'MMM dd'),
      completionRate: d.completion_rate_pct,
      totalQuizzes: d.total_quizzes,
      completedQuizzes: d.completed_quizzes,
    }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
          <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
          <YAxis
            domain={[0, 100]}
            stroke="hsl(var(--muted-foreground))"
            label={{
              value: 'Completion %',
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
            formatter={(value: number, name: string) => {
              if (name === 'completionRate') {
                return [`${value.toFixed(1)}%`, 'Completion Rate']
              }
              return [value.toLocaleString(), name]
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="completionRate"
            stroke="#D4A373"
            strokeWidth={2}
            dot={{ fill: '#D4A373' }}
            name="Completion Rate (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
