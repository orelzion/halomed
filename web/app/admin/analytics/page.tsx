import { forbidden } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type {
  SummaryStats,
  PopularTrack,
  StreakDropoff,
  QuizCompletionRate,
  DateRange,
} from '@/types/analytics'
import { SummaryCards } from './_components/SummaryCards'
import { PopularTracksChart } from './_components/PopularTracksChart'
import { StreakDropoffsChart } from './_components/StreakDropoffsChart'
import { QuizCompletionChart } from './_components/QuizCompletionChart'
import { DateRangeFilter } from './_components/DateRangeFilter'
import { RefreshButton } from './_components/RefreshButton'

interface PageProps {
  searchParams: Promise<{ range?: string }>
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const range = (params.range || '7d') as DateRange
  const supabase = await createClient()

  // DEBUG: Check session and user
  const { data: { session } } = await supabase.auth.getSession()
  console.log('DEBUG - Session:', session?.user?.id, session?.user?.email)

  // ADMIN VALIDATION via RPC layer:
  // The RPC function get_summary_stats() enforces is_admin() at database level.
  // If user is not admin, function raises EXCEPTION with "Access denied" message.
  // This is the intentional security pattern - database is source of truth.
  const { data: summaryData, error: summaryError } = await supabase.rpc(
    'get_summary_stats'
  )

  console.log('DEBUG - RPC result:', { data: summaryData, error: summaryError })

  if (summaryError) {
    // RPC returns "Access denied" for non-admin users
    console.log('DEBUG - Error message:', summaryError.message)
    if (summaryError.message.includes('Access denied')) {
      console.log('DEBUG - Calling forbidden()')
      forbidden()
    }
    console.error('Error fetching summary stats:', summaryError)
    throw new Error('Failed to load analytics')
  }

  // Fetch all other analytics data in parallel
  const [tracksResult, streaksResult, quizResult] = await Promise.all([
    supabase.rpc('get_popular_tracks'),
    supabase.rpc('get_streak_dropoffs'),
    supabase.rpc('get_quiz_completion_rates'),
  ])

  // Type assertion - RPC returns array
  const summary = (summaryData as SummaryStats[])?.[0] || null
  const tracks = (tracksResult.data as PopularTrack[]) || []
  const streaks = (streaksResult.data as StreakDropoff[]) || []
  const quizRates = (quizResult.data as QuizCompletionRate[]) || []

  // Filter quiz data by date range (client-side filter on pre-aggregated weekly data)
  const filteredQuizRates = filterByDateRange(quizRates, range)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Analytics Dashboard
          </h1>
          {summary?.refreshed_at && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {new Date(summary.refreshed_at).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <DateRangeFilter />
          <RefreshButton />
        </div>
      </div>

      {summary && <SummaryCards data={summary} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-muted p-6">
          <h2 className="text-lg font-semibold mb-4">Popular Tracks</h2>
          <PopularTracksChart data={tracks} />
        </div>

        <div className="bg-card rounded-lg border border-muted p-6">
          <h2 className="text-lg font-semibold mb-4">Streak Drop-offs</h2>
          <StreakDropoffsChart data={streaks} />
        </div>

        <div className="bg-card rounded-lg border border-muted p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">
            Quiz Completion Rate ({range === '1d' ? 'Today' : range === '7d' ? 'Last Week' : 'Last Month'})
          </h2>
          <QuizCompletionChart data={filteredQuizRates} />
        </div>
      </div>
    </div>
  )
}

// Filter weekly data based on date range
function filterByDateRange(
  data: QuizCompletionRate[],
  range: DateRange
): QuizCompletionRate[] {
  const now = new Date()
  let cutoff: Date

  switch (range) {
    case '1d':
      cutoff = new Date(now.setDate(now.getDate() - 1))
      break
    case '7d':
      cutoff = new Date(now.setDate(now.getDate() - 7))
      break
    case '30d':
      cutoff = new Date(now.setDate(now.getDate() - 30))
      break
  }

  return data.filter((d) => new Date(d.week_start) >= cutoff)
}
