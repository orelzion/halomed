-- Fix analytics views to query current data model
-- OLD model: tracks + user_study_log
-- NEW model: user_preferences + learning_path

-- Drop old views
DROP MATERIALIZED VIEW IF EXISTS analytics.summary_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.popular_tracks CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.streak_dropoffs CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.quiz_completion_rates CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.review_session_usage CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.explanation_engagement CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.active_learning_days CASCADE;

-- =============================================================================
-- Summary Statistics (fixed for current schema)
-- =============================================================================

CREATE MATERIALIZED VIEW analytics.summary_stats AS
SELECT
  -- User counts from user_preferences
  (SELECT COUNT(*) FROM user_preferences) as total_users,
  (SELECT COUNT(*) FROM user_preferences
   WHERE last_study_date >= CURRENT_DATE - 7) as active_users_7d,
  (SELECT COUNT(*) FROM user_preferences
   WHERE last_study_date >= CURRENT_DATE - 30) as active_users_30d,

  -- Completion rate: completed learning nodes / total unlocked nodes (last 30 days)
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2)
   FROM learning_path
   WHERE unlock_date >= CURRENT_DATE - 30 AND node_type = 'learning') as completion_rate_30d,

  -- Quiz completion rate (last 30 days)
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2)
   FROM learning_path
   WHERE unlock_date >= CURRENT_DATE - 30 AND node_type = 'weekly_quiz') as quiz_completion_rate_30d,

  -- Review completion rate (last 30 days)
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2)
   FROM learning_path
   WHERE unlock_date >= CURRENT_DATE - 30 AND node_type = 'review') as review_completion_rate_30d,

  NOW() as refreshed_at;

CREATE UNIQUE INDEX idx_summary_stats_singleton ON analytics.summary_stats((1));

-- =============================================================================
-- User Pace Distribution (replaces popular_tracks)
-- =============================================================================

CREATE MATERIALIZED VIEW analytics.user_pace_distribution AS
SELECT
  pace,
  COUNT(*) as user_count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM user_preferences) * 100, 2) as percentage
FROM user_preferences
GROUP BY pace
ORDER BY user_count DESC;

CREATE UNIQUE INDEX idx_user_pace_distribution ON analytics.user_pace_distribution(pace);

-- =============================================================================
-- Streak Distribution (replaces streak_dropoffs)
-- =============================================================================

CREATE MATERIALIZED VIEW analytics.streak_distribution AS
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
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM user_preferences) * 100, 2) as percentage
FROM user_preferences
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

-- =============================================================================
-- Weekly Activity (replaces quiz_completion_rates)
-- =============================================================================

CREATE MATERIALIZED VIEW analytics.weekly_activity AS
SELECT
  DATE_TRUNC('week', lp.unlock_date)::date as week_start,
  COUNT(DISTINCT lp.user_id) as active_users,
  COUNT(*) FILTER (WHERE lp.node_type = 'learning') as learning_nodes,
  COUNT(*) FILTER (WHERE lp.node_type = 'learning' AND lp.completed_at IS NOT NULL) as completed_learning,
  COUNT(*) FILTER (WHERE lp.node_type = 'weekly_quiz') as quiz_nodes,
  COUNT(*) FILTER (WHERE lp.node_type = 'weekly_quiz' AND lp.completed_at IS NOT NULL) as completed_quizzes,
  COUNT(*) FILTER (WHERE lp.node_type = 'review') as review_nodes,
  COUNT(*) FILTER (WHERE lp.node_type = 'review' AND lp.completed_at IS NOT NULL) as completed_reviews,
  ROUND(
    COUNT(*) FILTER (WHERE lp.completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2
  ) as overall_completion_rate
FROM learning_path lp
WHERE lp.unlock_date >= CURRENT_DATE - 90
GROUP BY week_start
ORDER BY week_start DESC;

CREATE UNIQUE INDEX idx_weekly_activity ON analytics.weekly_activity(week_start);

-- =============================================================================
-- Review Intensity Distribution
-- =============================================================================

CREATE MATERIALIZED VIEW analytics.review_intensity_distribution AS
SELECT
  review_intensity,
  COUNT(*) as user_count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM user_preferences) * 100, 2) as percentage
FROM user_preferences
GROUP BY review_intensity
ORDER BY user_count DESC;

CREATE UNIQUE INDEX idx_review_intensity_distribution ON analytics.review_intensity_distribution(review_intensity);

-- =============================================================================
-- Update wrapper functions
-- =============================================================================

-- Keep get_summary_stats (already correct return type)

-- Replace get_popular_tracks with get_user_pace_distribution
DROP FUNCTION IF EXISTS analytics.get_popular_tracks CASCADE;
DROP FUNCTION IF EXISTS public.get_popular_tracks CASCADE;

CREATE OR REPLACE FUNCTION analytics.get_user_pace_distribution()
RETURNS SETOF analytics.user_pace_distribution AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.user_pace_distribution;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_pace_distribution()
RETURNS SETOF analytics.user_pace_distribution AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_user_pace_distribution();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Replace get_streak_dropoffs with get_streak_distribution
DROP FUNCTION IF EXISTS analytics.get_streak_dropoffs CASCADE;
DROP FUNCTION IF EXISTS public.get_streak_dropoffs CASCADE;

CREATE OR REPLACE FUNCTION analytics.get_streak_distribution()
RETURNS SETOF analytics.streak_distribution AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.streak_distribution;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_streak_distribution()
RETURNS SETOF analytics.streak_distribution AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_streak_distribution();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Replace get_quiz_completion_rates with get_weekly_activity
DROP FUNCTION IF EXISTS analytics.get_quiz_completion_rates CASCADE;
DROP FUNCTION IF EXISTS public.get_quiz_completion_rates CASCADE;

CREATE OR REPLACE FUNCTION analytics.get_weekly_activity()
RETURNS SETOF analytics.weekly_activity AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.weekly_activity;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_weekly_activity()
RETURNS SETOF analytics.weekly_activity AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_weekly_activity();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add review intensity function
CREATE OR REPLACE FUNCTION analytics.get_review_intensity_distribution()
RETURNS SETOF analytics.review_intensity_distribution AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.review_intensity_distribution;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_review_intensity_distribution()
RETURNS SETOF analytics.review_intensity_distribution AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_review_intensity_distribution();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION analytics.get_user_pace_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_pace_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_streak_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_streak_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_weekly_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_activity TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_review_intensity_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_review_intensity_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.manual_refresh TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_refresh TO authenticated;

-- Populate views
REFRESH MATERIALIZED VIEW analytics.summary_stats;
REFRESH MATERIALIZED VIEW analytics.user_pace_distribution;
REFRESH MATERIALIZED VIEW analytics.streak_distribution;
REFRESH MATERIALIZED VIEW analytics.weekly_activity;
REFRESH MATERIALIZED VIEW analytics.review_intensity_distribution;

-- Update manual refresh function
DROP FUNCTION IF EXISTS analytics.manual_refresh CASCADE;
CREATE OR REPLACE FUNCTION analytics.manual_refresh()
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.summary_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.user_pace_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.streak_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.weekly_activity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.review_intensity_distribution;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.manual_refresh()
RETURNS void AS $$
BEGIN
  PERFORM analytics.manual_refresh();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
