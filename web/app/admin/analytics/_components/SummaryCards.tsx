import type { SummaryStats } from '@/types/analytics'

interface Props {
  data: SummaryStats
}

export function SummaryCards({ data }: Props) {
  const cards = [
    {
      label: 'סה"כ משתמשים',
      value: data.total_users.toLocaleString(),
      subtext: 'מתחילת הדרך',
    },
    {
      label: 'משתמשים פעילים (7 ימים)',
      value: data.active_users_7d.toLocaleString(),
      subtext: '7 ימים אחרונים',
    },
    {
      label: 'משתמשים פעילים (30 יום)',
      value: data.active_users_30d.toLocaleString(),
      subtext: '30 ימים אחרונים',
    },
    {
      label: 'שיעור השלמה',
      value: data.completion_rate_30d !== null ? `${data.completion_rate_30d.toFixed(1)}%` : 'לא זמין',
      subtext: '30 ימים אחרונים',
    },
    {
      label: 'השלמת חידונים',
      value: data.quiz_completion_rate_30d !== null ? `${data.quiz_completion_rate_30d.toFixed(1)}%` : 'לא זמין',
      subtext: '30 ימים אחרונים',
    },
    {
      label: 'השלמת חזרות',
      value: data.review_completion_rate_30d !== null ? `${data.review_completion_rate_30d.toFixed(1)}%` : 'לא זמין',
      subtext: '30 ימים אחרונים',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            {card.value}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            {card.subtext}
          </p>
        </div>
      ))}
    </div>
  )
}
