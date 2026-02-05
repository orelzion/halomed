// Types for analytics RPC function return values
// Matches current schema: user_preferences (position-based model)

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
export type DateRange = '1d' | '7d' | '30d' | 'custom'

// Custom date range
export interface CustomDateRange {
  start: string
  end: string
}

// Summary stats with health KPIs
export interface SummaryStats {
  total_users: number
  active_users_7d: number
  active_users_30d: number
  avg_streak: number
  users_with_streak_7plus: number
  users_with_streak_30plus: number
  retention_7d_rate: number | null
  completion_rate_30d: number | null
  quiz_completion_rate_30d: number | null
  review_completion_rate_30d: number | null
  week_over_week_change: number | null
  month_over_month_change: number | null
  users_with_preferences: number
  onboarding_completion_rate: number | null
  refreshed_at: string
}

// KPI card data
export interface KPIData {
  label: string
  value: number | string
  trend: 'up' | 'down' | 'neutral'
  trendPercentage: number
  comparisonLabel: string
}

// Cohort retention data
export interface CohortRetention {
  cohort_month: string
  weeks_since_signup: number
  active_users: number
  cohort_size: number
  retention_pct: number
}

// Cohort heatmap row
export interface CohortHeatmapRow {
  cohort: string
  retentionByWeek: { [week: number]: number }
}

// Pace adherence data
export interface PaceAdherence {
  user_id: string
  pace: string
  current_position: number
  expected_position: number
  days_behind: number
  pace_status: 'on_pace' | 'behind_1_7' | 'behind_7_plus'
  streak_count: number
  start_date: string
  business_days_elapsed: number
}

// Pace adherence summary
export interface PaceAdherenceSummary {
  on_pace_count: number
  behind_1_7_count: number
  behind_7_plus_count: number
  on_pace_pct: number
  behind_1_7_pct: number
  behind_7_plus_pct: number
}

// Content difficulty data
export interface ContentDifficulty {
  ref_id: string
  tractate: string
  chapter: string | null
  avg_score: number
  attempt_count: number
  pass_rate: number
  difficulty_tier: number
  difficulty_label: string
  tractate_avg_score: number
}

// Hardest content items
export interface HardestContent {
  ref_id: string
  tractate: string
  avg_score: number
  pass_rate: number
  attempt_count: number
}

// Onboarding funnel data
export interface OnboardingFunnel {
  total_users: number
  has_preferences: number
  pace_selected: number
  review_configured: number
  first_lesson_started: number
  first_lesson_completed: number
  day2_return: number
  week1_active: number
  conversion_to_preferences: number
  conversion_to_pace: number
  conversion_to_review: number
  conversion_first_lesson: number
  conversion_day2: number
  conversion_week1: number
}

// Funnel step
export interface FunnelStep {
  name: string
  count: number
  conversionRate: number
  dropOffRate: number
}

// Review completion data
export interface ReviewCompletion {
  review_intensity: string
  total_users: number
  total_reviews_scheduled: number
  total_reviews_completed: number
  overall_completion_rate: number
}

// User preferences summary
export interface UserPreferencesSummary {
  paceDistribution: UserPaceDistribution[]
  reviewIntensityDistribution: ReviewIntensityDistribution[]
  reviewCompletionByIntensity: ReviewCompletion[]
}

// Alert types
export interface AnalyticsAlert {
  id: string
  type: 'info' | 'warning' | 'error'
  message: string
  metric?: string
  value?: number
  threshold?: number
}

// Health KPIs for executive summary
export interface HealthKPIs {
  activeUsers: {
    value: number
    trend: number
  }
  retentionRate: {
    value: number
    trend: number
  }
  onboardingCompletion: {
    value: number
    trend: number
  }
  avgStreak: {
    value: number
    trend: number
  }
}
