// Types for analytics RPC function return values
// Must match PostgreSQL function signatures from Phase 1 migrations

export interface SummaryStats {
  total_users: number
  active_users_7d: number
  active_users_30d: number
  completion_rate_30d: number
  quiz_completion_rate_30d: number
  review_completion_rate_30d: number
  refreshed_at: string
}

export interface PopularTrack {
  track_id: string
  track_title: string
  total_users: number
  total_completions: number
  total_scheduled: number
  completion_rate_pct: number
}

export interface StreakDropoff {
  days_before_dropoff: number
  num_streaks_ended: number
  percentage: number
}

export interface QuizCompletionRate {
  week_start: string
  users_with_quizzes: number
  total_quizzes: number
  completed_quizzes: number
  completion_rate_pct: number
}

export interface ReviewSessionUsage {
  week_start: string
  users_with_reviews: number
  total_reviews: number
  completed_reviews: number
  completion_rate_pct: number
  avg_days_to_complete: number | null
}

export interface ExplanationEngagement {
  week_start: string
  users_with_learning: number
  total_learning: number
  completed_learning: number
  engagement_rate_pct: number
  avg_hours_to_complete: number | null
}

export interface HealthCheck {
  view_name: string
  row_count: number
  refreshed_at: string | null
}

// Date range filter type
export type DateRange = '1d' | '7d' | '30d'
