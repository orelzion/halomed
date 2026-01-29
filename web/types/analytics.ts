// Types for analytics RPC function return values
// Matches current schema: user_preferences + learning_path

export interface SummaryStats {
  total_users: number
  active_users_7d: number
  active_users_30d: number
  completion_rate_30d: number | null
  quiz_completion_rate_30d: number | null
  review_completion_rate_30d: number | null
  refreshed_at: string
}

export interface UserPaceDistribution {
  pace: string
  user_count: number
  percentage: number
}

export interface StreakDistribution {
  streak_range: string
  user_count: number
  percentage: number
}

export interface WeeklyActivity {
  week_start: string
  active_users: number
  learning_nodes: number
  completed_learning: number
  quiz_nodes: number
  completed_quizzes: number
  review_nodes: number
  completed_reviews: number
  overall_completion_rate: number | null
}

export interface ReviewIntensityDistribution {
  review_intensity: string
  user_count: number
  percentage: number
}

// Date range filter type
export type DateRange = '1d' | '7d' | '30d'
