-- Create core analytics materialized views
-- Implements ANLYT-01 through ANLYT-04
-- Provides pre-computed aggregations for admin engagement metrics

-- ANLYT-01: Active Learning Days per User
-- Tracks completed study days per user (excludes non-scheduled days like Shabbat/holidays)
CREATE MATERIALIZED VIEW analytics.active_learning_days AS
SELECT
  user_id,
  COUNT(DISTINCT study_date) as total_active_days,
  COUNT(DISTINCT study_date) FILTER (WHERE study_date >= CURRENT_DATE - INTERVAL '7 days') as active_days_7d,
  COUNT(DISTINCT study_date) FILTER (WHERE study_date >= CURRENT_DATE - INTERVAL '30 days') as active_days_30d,
  MIN(study_date) as first_active_date,
  MAX(study_date) as last_active_date
FROM user_study_log
WHERE is_completed = TRUE
GROUP BY user_id;

-- Index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_active_learning_days_user ON analytics.active_learning_days(user_id);

-- Comment explaining refresh expectations
COMMENT ON MATERIALIZED VIEW analytics.active_learning_days IS
'ANLYT-01: Active learning days per user. Counts only completed units on scheduled days (automatically excludes Shabbat/holidays). Refreshed daily via pg_cron.';


-- ANLYT-02: Popular Tracks
-- Tracks user counts and completion rates per track
CREATE MATERIALIZED VIEW analytics.popular_tracks AS
SELECT
  t.id as track_id,
  t.title as track_title,
  COUNT(DISTINCT usl.user_id) as total_users,
  COUNT(*) FILTER (WHERE usl.is_completed) as total_completions,
  COUNT(*) as total_scheduled,
  ROUND(
    COUNT(*) FILTER (WHERE usl.is_completed)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as completion_rate_pct
FROM tracks t
LEFT JOIN user_study_log usl ON usl.track_id = t.id
GROUP BY t.id, t.title
ORDER BY total_users DESC;

-- Index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_popular_tracks_id ON analytics.popular_tracks(track_id);

-- Comment
COMMENT ON MATERIALIZED VIEW analytics.popular_tracks IS
'ANLYT-02: Popular tracks with user counts and completion rates. Ordered by total users enrolled. Refreshed daily via pg_cron.';


-- ANLYT-03: Streak Drop-offs
-- Identifies where users lose momentum (streak length at end)
CREATE MATERIALIZED VIEW analytics.streak_dropoffs AS
WITH numbered_dates AS (
  SELECT
    user_id,
    track_id,
    study_date,
    is_completed,
    ROW_NUMBER() OVER (PARTITION BY user_id, track_id ORDER BY study_date) as rn
  FROM user_study_log
  WHERE study_date >= CURRENT_DATE - INTERVAL '180 days'
),
streak_groups AS (
  SELECT
    user_id,
    track_id,
    study_date,
    (study_date - (rn * INTERVAL '1 day'))::date as streak_group
  FROM numbered_dates
  WHERE is_completed = TRUE
),
completed_streaks AS (
  SELECT
    user_id,
    track_id,
    streak_group,
    COUNT(*) as streak_length,
    MAX(study_date) as streak_end
  FROM streak_groups
  GROUP BY user_id, track_id, streak_group
)
SELECT
  streak_length as days_before_dropoff,
  COUNT(*) as num_streaks_ended,
  ROUND(COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM completed_streaks
WHERE streak_end < CURRENT_DATE - INTERVAL '7 days'
GROUP BY streak_length
ORDER BY streak_length;

-- Index for REFRESH CONCURRENTLY
CREATE INDEX idx_streak_dropoffs_days ON analytics.streak_dropoffs(days_before_dropoff);

-- Comment
COMMENT ON MATERIALIZED VIEW analytics.streak_dropoffs IS
'ANLYT-03: Streak drop-off analysis. Shows distribution of streak lengths at the point users stopped. Window functions identify consecutive completed days per track. Only considers streaks that ended 7+ days ago. Refreshed daily via pg_cron.';


-- ANLYT-04: Quiz Completion Rates by Week
-- Weekly aggregation of quiz completions from learning_path
CREATE MATERIALIZED VIEW analytics.quiz_completion_rates AS
SELECT
  DATE_TRUNC('week', unlock_date)::date as week_start,
  COUNT(DISTINCT user_id) as users_with_quizzes,
  COUNT(*) as total_quizzes,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_quizzes,
  ROUND(
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as completion_rate_pct
FROM learning_path
WHERE node_type = 'quiz'
  AND unlock_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', unlock_date)
ORDER BY week_start DESC;

-- Index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_quiz_rates_week ON analytics.quiz_completion_rates(week_start);

-- Comment
COMMENT ON MATERIALIZED VIEW analytics.quiz_completion_rates IS
'ANLYT-04: Weekly quiz completion rates. Aggregates quiz nodes from learning_path by week. Last 90 days only. Refreshed daily via pg_cron.';
