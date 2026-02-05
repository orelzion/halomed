-- Enhance summary_stats with health KPIs and trend comparisons
-- Task: BE-05

DROP MATERIALIZED VIEW IF EXISTS analytics.summary_stats_enhanced;

CREATE MATERIALIZED VIEW analytics.summary_stats AS
WITH user_stats AS (
  SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN last_activity >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_users_7d,
    COUNT(CASE WHEN last_activity >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_users_30d,
    ROUND(AVG(streak_count)::numeric, 1) as avg_streak,
    COUNT(CASE WHEN streak_count >= 7 THEN 1 END) as users_with_streak_7plus,
    COUNT(CASE WHEN streak_count >= 30 THEN 1 END) as users_with_streak_30plus
  FROM (
    SELECT 
      up.user_id,
      up.streak_count,
      MAX(usl.study_date) as last_activity
    FROM user_preferences up
    LEFT JOIN user_study_log usl ON up.user_id = usl.user_id
    GROUP BY up.user_id
  ) user_activity
),
completions AS (
  SELECT 
    COUNT(CASE WHEN node_type = 'learning' AND is_completed = true THEN 1 END) as total_learning_completed,
    COUNT(CASE WHEN node_type = 'learning' THEN 1 END) as total_learning_scheduled,
    COUNT(CASE WHEN node_type = 'quiz' AND is_completed = true THEN 1 END) as total_quiz_completed,
    COUNT(CASE WHEN node_type = 'quiz' THEN 1 END) as total_quiz_scheduled,
    COUNT(CASE WHEN node_type = 'review' AND is_completed = true THEN 1 END) as total_review_completed,
    COUNT(CASE WHEN node_type = 'review' THEN 1 END) as total_review_scheduled,
    COUNT(CASE WHEN node_type = 'learning' AND study_date >= CURRENT_DATE - INTERVAL '30 days' AND is_completed = true THEN 1 END) as learning_30d,
    COUNT(CASE WHEN node_type = 'learning' AND study_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as learning_scheduled_30d,
    COUNT(CASE WHEN node_type = 'quiz' AND study_date >= CURRENT_DATE - INTERVAL '30 days' AND is_completed = true THEN 1 END) as quiz_30d,
    COUNT(CASE WHEN node_type = 'quiz' AND study_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as quiz_scheduled_30d,
    COUNT(CASE WHEN node_type = 'review' AND study_date >= CURRENT_DATE - INTERVAL '30 days' AND is_completed = true THEN 1 END) as review_30d,
    COUNT(CASE WHEN node_type = 'review' AND study_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as review_scheduled_30d
  FROM user_study_log
  WHERE study_date >= CURRENT_DATE - INTERVAL '30 days'
),
period_comparison AS (
  SELECT 
    COUNT(CASE WHEN study_date >= CURRENT_DATE - INTERVAL '7 days' AND is_completed = true THEN 1 END) as current_week_completed,
    COUNT(CASE WHEN study_date >= CURRENT_DATE - INTERVAL '14 days' AND study_date < CURRENT_DATE - INTERVAL '7 days' AND is_completed = true THEN 1 END) as previous_week_completed,
    COUNT(CASE WHEN study_date >= CURRENT_DATE - INTERVAL '30 days' AND is_completed = true THEN 1 END) as current_month_completed,
    COUNT(CASE WHEN study_date >= CURRENT_DATE - INTERVAL '60 days' AND study_date < CURRENT_DATE - INTERVAL '30 days' AND is_completed = true THEN 1 END) as previous_month_completed
  FROM user_study_log
  WHERE node_type = 'learning'
)
SELECT 
  us.total_users,
  us.active_users_7d,
  us.active_users_30d,
  us.avg_streak,
  us.users_with_streak_7plus,
  us.users_with_streak_30plus,
  ROUND(us.active_users_7d::numeric / NULLIF(us.active_users_30d, 0) * 100, 1) as retention_7d_rate,
  ROUND(
    c.learning_30d::numeric / NULLIF(c.learning_scheduled_30d, 0) * 100, 1
  ) as completion_rate_30d,
  ROUND(
    c.quiz_30d::numeric / NULLIF(c.quiz_scheduled_30d, 0) * 100, 1
  ) as quiz_completion_rate_30d,
  ROUND(
    c.review_30d::numeric / NULLIF(c.review_scheduled_30d, 0) * 100, 1
  ) as review_completion_rate_30d,
  -- Trends
  ROUND(
    (pc.current_week_completed::numeric - pc.previous_week_completed) / 
    NULLIF(pc.previous_week_completed, 0) * 100, 1
  ) as week_over_week_change,
  ROUND(
    (pc.current_month_completed::numeric - pc.previous_month_completed) / 
    NULLIF(pc.previous_month_completed, 0) * 100, 1
  ) as month_over_month_change,
  -- Onboarding
  (SELECT COUNT(*) FROM user_preferences WHERE pace IS NOT NULL) as users_with_preferences,
  ROUND(
    (SELECT COUNT(*) FROM user_preferences WHERE pace IS NOT NULL)::numeric / 
    NULLIF(us.total_users, 0) * 100, 1
  ) as onboarding_completion_rate,
  NOW() as refreshed_at
FROM user_stats us, completions c, period_comparison pc;

-- Create indexes
CREATE INDEX idx_summary_stats_refreshed 
ON analytics.summary_stats (refreshed_at DESC);

COMMENT ON MATERIALIZED VIEW analytics.summary_stats IS 
'Enhanced summary stats with health KPIs, retention rates, and trend comparisons. Updated via analytics.refresh_materialized_views()';
