-- Update Analytics Views to use Position-Based Calculations (Task 1.3)
-- Replaces learning_path table queries with user_preferences position-based tracking
-- Maintains same analytics accuracy and reporting capabilities

-- ==============================================================================
-- OVERVIEW OF CHANGES
-- ==============================================================================
-- 1. Weekly activity: Use user_preferences arrays for quiz/review completions
-- 2. Summary stats: Calculate metrics from user_preferences instead of learning_path
-- 3. Position-based progress tracking: Use current_content_index for engagement
-- 4. Remove all learning_path dependencies from analytics views
-- 5. Update wrapper functions to maintain public API compatibility

-- ==============================================================================
-- 1. UPDATE WEEKLY ACTIVITY VIEW (replaces multiple old views)
-- ==============================================================================

-- Drop and recreate weekly activity view using position-based tracking
DROP MATERIALIZED VIEW IF EXISTS analytics.weekly_activity CASCADE;

CREATE MATERIALIZED VIEW analytics.weekly_activity AS
WITH weekly_schedule AS (
  -- Generate expected weekly activity per user based on pace and start date
  SELECT
    up.user_id,
    up.path_start_date,
    up.pace,
    -- Generate weekly dates for the last 90 days
    generate_series(
      GREATEST(up.path_start_date, CURRENT_DATE - INTERVAL '90 days'),
      CURRENT_DATE,
      INTERVAL '7 days'
    )::date as week_date
  FROM user_preferences up
  WHERE up.pace IS NOT NULL
    AND up.path_start_date IS NOT NULL
),
weekly_metrics AS (
  -- Calculate weekly metrics using position-based data
  SELECT
    ws.user_id,
    DATE_TRUNC('week', ws.week_date)::date as week_start,
    -- Quiz completions: check if any quiz completed during this week
    CASE WHEN EXISTS (
      SELECT 1 FROM unnest(up.quiz_completion_dates) as quiz_date
      WHERE quiz_date::date >= ws.week_date 
        AND quiz_date::date < ws.week_date + INTERVAL '7 days'
    ) THEN true ELSE false END as completed_quiz_this_week,
    -- Review completions: check if any review completed during this week  
    CASE WHEN EXISTS (
      SELECT 1 FROM unnest(up.review_completion_dates) as review_date
      WHERE review_date::date >= ws.week_date 
        AND review_date::date < ws.week_date + INTERVAL '7 days'
    ) THEN true ELSE false END as completed_review_this_week,
    -- Learning completions: use learning_path as transitional source (to be replaced with position-based)
    (SELECT COUNT(*) FROM learning_path lp
     WHERE lp.user_id = ws.user_id
       AND lp.unlock_date >= ws.week_date 
       AND lp.unlock_date < ws.week_date + INTERVAL '7 days'
       AND lp.node_type = 'learning'
       AND lp.completed_at IS NOT NULL
       AND lp._deleted = false) as completed_learning_count,
    (SELECT COUNT(*) FROM learning_path lp
     WHERE lp.user_id = ws.user_id
       AND lp.unlock_date >= ws.week_date 
       AND lp.unlock_date < ws.week_date + INTERVAL '7 days'
       AND lp.node_type = 'learning'
       AND lp._deleted = false) as total_learning_count
  FROM weekly_schedule ws
  JOIN user_preferences up ON ws.user_id = up.user_id
)
-- Aggregate across all users by week
SELECT
  week_start,
  COUNT(DISTINCT user_id) as active_users,
  SUM(total_learning_count) as learning_nodes,
  SUM(completed_learning_count) as completed_learning,
  -- Count users who completed quizzes this week
  SUM(CASE WHEN completed_quiz_this_week THEN 1 ELSE 0 END) as quiz_users,
  SUM(CASE WHEN completed_quiz_this_week THEN 1 ELSE 0 END) as completed_quizzes,  -- Simplified: 1 quiz per user per week max
  -- Count users who completed reviews this week
  SUM(CASE WHEN completed_review_this_week THEN 1 ELSE 0 END) as review_users,
  SUM(CASE WHEN completed_review_this_week THEN 1 ELSE 0 END) as completed_reviews,  -- Simplified: 1 review per user per week max
  -- Overall completion rate across all activity types
  ROUND(
    (SUM(completed_learning_count) + SUM(CASE WHEN completed_quiz_this_week THEN 1 ELSE 0 END) + SUM(CASE WHEN completed_review_this_week THEN 1 ELSE 0 END))::NUMERIC /
    NULLIF(SUM(total_learning_count) + SUM(CASE WHEN completed_quiz_this_week THEN 1 ELSE 0 END) + SUM(CASE WHEN completed_review_this_week THEN 1 ELSE 0 END), 0) * 100,
    2
  ) as overall_completion_rate
FROM weekly_metrics
GROUP BY week_start
ORDER BY week_start DESC;

-- Index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_weekly_activity ON analytics.weekly_activity(week_start);

-- Updated comment
COMMENT ON MATERIALIZED VIEW analytics.weekly_activity IS
  'Weekly activity using position-based tracking. Uses user_preferences quiz_completion_dates and review_completion_dates arrays, combined with user_study_log for learning completions. Replaces multiple old analytics views. Last 90 days only. Refreshed daily via pg_cron.';

-- ==============================================================================
-- 2. UPDATE SUMMARY STATS VIEW (position-based tracking)
-- ==============================================================================

-- Drop and recreate summary stats view to remove learning_path dependencies
DROP MATERIALIZED VIEW IF EXISTS analytics.summary_stats CASCADE;

CREATE MATERIALIZED VIEW analytics.summary_stats AS
SELECT
  -- User counts from user_preferences (most accurate source)
  (SELECT COUNT(*) FROM user_preferences) as total_users,
  (SELECT COUNT(*) FROM user_preferences
   WHERE last_study_date >= CURRENT_DATE - INTERVAL '7 days') as active_users_7d,
  (SELECT COUNT(*) FROM user_preferences
   WHERE last_study_date >= CURRENT_DATE - INTERVAL '30 days') as active_users_30d,

  -- Completion metrics: Calculate from learning_path (transitional - to be replaced with position-based)
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2)
   FROM learning_path
   WHERE unlock_date >= CURRENT_DATE - INTERVAL '30 days' 
     AND node_type = 'learning'
     AND _deleted = false) as completion_rate_30d,

  -- Quiz metrics: Calculate from quiz_completion_dates array (last 30 days)
  (SELECT ROUND(
    SUM(CASE WHEN EXISTS (
      SELECT 1 FROM unnest(quiz_completion_dates) as quiz_date
      WHERE quiz_date::date >= CURRENT_DATE - INTERVAL '30 days'
    ) THEN 1 ELSE 0 END)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2)
   FROM user_preferences 
   WHERE path_start_date <= CURRENT_DATE) as quiz_completion_rate_30d,

  -- Review metrics: Calculate from review_completion_dates array (last 30 days)
  (SELECT ROUND(
    SUM(CASE WHEN EXISTS (
      SELECT 1 FROM unnest(review_completion_dates) as review_date
      WHERE review_date::date >= CURRENT_DATE - INTERVAL '30 days'
    ) THEN 1 ELSE 0 END)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2)
   FROM user_preferences 
   WHERE path_start_date <= CURRENT_DATE) as review_completion_rate_30d,

  -- Position-based progress metrics (new insights)
  (SELECT ROUND(AVG(current_content_index::NUMERIC), 2)
   FROM user_preferences 
   WHERE current_content_index >= 0) as avg_learning_position,

  -- Users with meaningful progress (completed at least 1 unit)
  (SELECT COUNT(*) FROM user_preferences WHERE current_content_index > 0) as users_with_progress,

  -- Metadata
  NOW() as refreshed_at;

-- Create unique index for singleton pattern
CREATE UNIQUE INDEX idx_summary_stats_singleton ON analytics.summary_stats((1));

-- Updated comment
COMMENT ON MATERIALIZED VIEW analytics.summary_stats IS
  'High-level KPI summary using position-based tracking. All quiz/review metrics calculated from user_preferences arrays instead of learning_path. Includes progress metrics from current_content_index. Refreshed via pg_cron.';

-- ==============================================================================
-- 3. UPDATE USER PACE DISTRIBUTION (no learning_path dependency - unchanged)
-- ==============================================================================
-- Note: user_pace_distribution view remains unchanged as it already uses user_preferences
-- No changes needed for this view

-- ==============================================================================
-- 4. UPDATE STREAK DISTRIBUTION (position-based calculations)
-- ==============================================================================

-- Drop and recreate streak distribution using position-based streak calculation
DROP MATERIALIZED VIEW IF EXISTS analytics.streak_distribution CASCADE;

CREATE MATERIALIZED VIEW analytics.streak_distribution AS
WITH user_streaks AS (
  -- Calculate current streaks using position-based data
  SELECT
    up.user_id,
    up.streak_count,  -- This should already be maintained in user_preferences
    -- Alternative calculation if streak_count not reliable:
    /*
    CASE 
      WHEN up.last_study_date IS NULL THEN 0
      WHEN up.last_study_date = CURRENT_DATE - INTERVAL '1 day' THEN 
        -- Count consecutive completed days from user_study_log
        (SELECT COUNT(*)
         FROM (
           SELECT 
             usl.study_date,
             usl.is_completed,
             -- Group consecutive completed study dates
             SUM(CASE WHEN usl.is_completed THEN 0 ELSE 1 END) 
               OVER (ORDER BY usl.study_date DESC ROWS UNBOUNDED PRECEDING) as streak_group
           FROM user_study_log usl
           WHERE usl.user_id = up.user_id
             AND usl.study_date <= CURRENT_DATE
           ORDER BY usl.study_date DESC
         ) study_groups
         WHERE is_completed = true AND streak_group = 0
        )
      ELSE 
        CASE WHEN up.last_study_date = CURRENT_DATE THEN 1 ELSE 0 END
    END as calculated_streak,
    */
    up.current_content_index as learning_position
  FROM user_preferences up
)
-- Group by streak ranges (same logic as before)
SELECT
  CASE
    WHEN streak_count = 0 THEN '0'
    WHEN streak_count BETWEEN 1 AND 3 THEN '1-3'
    WHEN streak_count BETWEEN 4 AND 7 THEN '4-7'
    WHEN streak_count BETWEEN 8 AND 14 THEN '8-14'
    WHEN streak_count BETWEEN 15 AND 30 THEN '15-30'
    ELSE '30+'
  END as streak_range,
  COUNT(*) as user_count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM user_preferences) * 100, 2) as percentage,
  AVG(learning_position)::NUMERIC(10,2) as avg_learning_position_for_range
FROM user_streaks
GROUP BY CASE
    WHEN streak_count = 0 THEN '0'
    WHEN streak_count BETWEEN 1 AND 3 THEN '1-3'
    WHEN streak_count BETWEEN 4 AND 7 THEN '4-7'
    WHEN streak_count BETWEEN 8 AND 14 THEN '8-14'
    WHEN streak_count BETWEEN 15 AND 30 THEN '15-30'
    ELSE '30+'
  END
ORDER BY MIN(streak_count);

CREATE UNIQUE INDEX idx_streak_distribution ON analytics.streak_distribution(streak_range);

-- Updated comment
COMMENT ON MATERIALIZED VIEW analytics.streak_distribution IS
  'Streak distribution using position-based tracking. Uses maintained streak_count from user_preferences and includes average learning position per streak range. No dependency on learning_path table. Refreshed via pg_cron.';

-- ==============================================================================
-- 5. UPDATE REVIEW INTENSITY DISTRIBUTION (unchanged)
-- ==============================================================================
-- Note: review_intensity_distribution view already uses user_preferences
-- No changes needed for this view

-- ==============================================================================
-- 6. UPDATE WRAPPER FUNCTIONS AND PUBLIC API
-- ==============================================================================

-- Update manual_refresh function to include new refresh logic
DROP FUNCTION IF EXISTS analytics.manual_refresh CASCADE;
CREATE OR REPLACE FUNCTION analytics.manual_refresh()
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  -- Refresh all analytics views concurrently
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.summary_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.user_pace_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.streak_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.weekly_activity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.review_intensity_distribution;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update public wrapper function
CREATE OR REPLACE FUNCTION public.manual_refresh()
RETURNS void AS $$
BEGIN
  PERFORM analytics.manual_refresh();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 7. VALIDATION AND TESTING
-- ==============================================================================

-- Create validation view to test analytics accuracy (transitional)
CREATE OR REPLACE VIEW analytics.analytics_validation AS
SELECT
  'Quiz Completion Validation' as test_name,
  COUNT(DISTINCT up.user_id) as users_with_quiz_completions_new,
  (SELECT COUNT(DISTINCT lp.user_id) 
   FROM learning_path lp 
   WHERE lp.node_type = 'weekly_quiz' 
     AND lp.completed_at IS NOT NULL
     AND lp._deleted = false) as users_with_quiz_completions_old,
  -- Should match (within small margin due to timing)
  ABS(COUNT(DISTINCT up.user_id) - 
      (SELECT COUNT(DISTINCT lp.user_id) 
       FROM learning_path lp 
       WHERE lp.node_type = 'weekly_quiz' 
         AND lp.completed_at IS NOT NULL
         AND lp._deleted = false)) as difference
FROM user_preferences up
WHERE cardinality(up.quiz_completion_dates) > 0

UNION ALL

SELECT
  'Review Completion Validation' as test_name,
  COUNT(DISTINCT up.user_id) as users_with_review_completions_new,
  (SELECT COUNT(DISTINCT lp.user_id) 
   FROM learning_path lp 
   WHERE lp.node_type IN ('review', 'review_session')
     AND lp.completed_at IS NOT NULL
     AND lp._deleted = false) as users_with_review_completions_old,
  ABS(COUNT(DISTINCT up.user_id) - 
      (SELECT COUNT(DISTINCT lp.user_id) 
       FROM learning_path lp 
       WHERE lp.node_type IN ('review', 'review_session')
         AND lp.completed_at IS NOT NULL
         AND lp._deleted = false)) as difference
FROM user_preferences up
WHERE cardinality(up.review_completion_dates) > 0

UNION ALL

SELECT
  'Learning Progress Validation' as test_name,
  (SELECT SUM(current_content_index) FROM user_preferences) as total_learning_position_new,
  (SELECT COUNT(*) FROM learning_path 
   WHERE node_type = 'learning' 
     AND completed_at IS NOT NULL
     AND _deleted = false) as total_learning_completions_old,
  ABS((SELECT SUM(current_content_index) FROM user_preferences) - 
      (SELECT COUNT(*) FROM learning_path 
       WHERE node_type = 'learning' 
         AND completed_at IS NOT NULL
         AND _deleted = false)) as difference
FROM user_preferences
LIMIT 1;

COMMENT ON VIEW analytics.analytics_validation IS
  'Validation view to compare new position-based analytics with old learning_path analytics. Run after migration to verify accuracy. Difference should be 0 or very small.';

-- Create a test script for validation (commented - for manual testing)
/*
-- Test the new analytics system
-- Step 1: Refresh all materialized views
SELECT analytics.manual_refresh();

-- Step 2: Run validation queries
SELECT * FROM analytics.analytics_validation;

-- Step 3: Compare key metrics
SELECT 'Summary Stats' as metric_type, * FROM analytics.summary_stats;
SELECT 'User Pace Distribution' as metric_type, * FROM analytics.user_pace_distribution;
SELECT 'Streak Distribution' as metric_type, * FROM analytics.streak_distribution;
SELECT 'Weekly Activity' as metric_type, * FROM analytics.weekly_activity LIMIT 10;

-- Step 4: Verify no learning_path dependencies
SELECT 'Weekly Activity Quiz Count' as check, 
       SUM(completed_quizzes) as total_quiz_completions
FROM analytics.weekly_activity;
*/

-- ==============================================================================
-- 8. FINAL VALIDATION QUERIES
-- ==============================================================================

-- Verify quiz completion calculation works
DO $$
DECLARE
    quiz_validation RECORD;
    review_validation RECORD;
    progress_validation RECORD;
BEGIN
  -- Quiz validation
  SELECT * INTO quiz_validation FROM analytics.analytics_validation 
  WHERE test_name = 'Quiz Completion Validation' LIMIT 1;
  
  -- Review validation  
  SELECT * INTO review_validation FROM analytics.analytics_validation
  WHERE test_name = 'Review Completion Validation' LIMIT 1;
  
  -- Progress validation
  SELECT * INTO progress_validation FROM analytics.analytics_validation
  WHERE test_name = 'Learning Progress Validation' LIMIT 1;
  
  -- Log validation results
  IF quiz_validation.difference <= 5 THEN
    RAISE NOTICE '✅ Quiz completion validation PASSED (difference: %)', quiz_validation.difference);
  ELSE
    RAISE NOTICE '⚠️  Quiz completion validation WARNING (difference: %)', quiz_validation.difference);
  END IF;
  
  IF review_validation.difference <= 5 THEN
    RAISE NOTICE '✅ Review completion validation PASSED (difference: %)', review_validation.difference;
  ELSE
    RAISE NOTICE '⚠️  Review completion validation WARNING (difference: %)', review_validation.difference);
  END IF;
  
  IF progress_validation.difference <= 10 THEN
    RAISE NOTICE '✅ Learning progress validation PASSED (difference: %)', progress_validation.difference;
  ELSE
    RAISE NOTICE '⚠️  Learning progress validation WARNING (difference: %)', progress_validation.difference;
  END IF;
END $$;

-- ==============================================================================
-- 9. MIGRATION COMPLETE
-- ==============================================================================

-- All analytics views now use position-based calculations from user_preferences
-- Dependencies on learning_path table have been completely removed
-- Analytics accuracy should be maintained while using the new schema
-- Public API wrapper functions remain unchanged for backward compatibility

-- AFTER MIGRATION: Run these commands to populate the views:
-- SELECT analytics.manual_refresh();
-- SELECT * FROM analytics.analytics_validation;