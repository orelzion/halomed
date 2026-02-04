import type { SummaryStats } from '@/types/analytics'

interface Props {
  data: SummaryStats
}

export function SummaryCards({ data }: Props) {
  const cards = [
    {
      label: 'Total Users',
      value: data.total_users.toLocaleString(),
      subtext: 'All time',
    },
    {
      label: 'Active Users (7d)',
      value: data.active_users_7d.toLocaleString(),
      subtext: 'Last 7 days',
    },
    {
      label: 'Active Users (30d)',
      value: data.active_users_30d.toLocaleString(),
      subtext: 'Last 30 days',
    },
    {
      label: 'Completion Rate',
      value: data.completion_rate_30d !== null ? `${data.completion_rate_30d.toFixed(1)}%` : 'N/A',
      subtext: 'Last 30 days',
    },
    {
      label: 'Quiz Completion',
      value: data.quiz_completion_rate_30d !== null ? `${data.quiz_completion_rate_30d.toFixed(1)}%` : 'N/A',
      subtext: 'Last 30 days',
    },
    {
      label: 'Review Completion',
      value: data.review_completion_rate_30d !== null ? `${data.review_completion_rate_30d.toFixed(1)}%` : 'N/A',
      subtext: 'Last 30 days',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card rounded-lg border border-muted p-4"
        >
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {card.value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {card.subtext}
          </p>
        </div>
      ))}
    </div>
  )
}
