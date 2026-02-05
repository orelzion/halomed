-- Create onboarding_funnel view to track user onboarding conversion
-- Task: BE-04

DROP MATERIALIZED VIEW IF EXISTS analytics.onboarding_funnel;

CREATE MATERIALIZED VIEW analytics.onboarding_funnel AS
WITH user_stages AS (
  SELECT 
    u.id as user_id,
    u.created_at,
    -- Stage 1: Has preferences set
    CASE WHEN up.id IS NOT NULL THEN 1 ELSE 0 END as has_preferences,
    -- Stage 2: Pace selected (preferences with pace set)
    CASE WHEN up.pace IS NOT NULL THEN 1 ELSE 0 END as pace_selected,
    -- Stage 3: Review intensity configured
    CASE WHEN up.review_intensity IS NOT NULL THEN 1 ELSE 0 END as review_configured,
    -- Stage 4: First lesson started
    CASE WHEN first_lesson.user_id IS NOT NULL THEN 1 ELSE 0 END as first_lesson_started,
    -- Stage 5: First lesson completed
    CASE WHEN first_lesson_completed.user_id IS NOT NULL THEN 1 ELSE 0 END as first_lesson_completed,
    -- Stage 6: Day 2 return
    CASE WHEN day2_return.user_id IS NOT NULL THEN 1 ELSE 0 END as day2_return,
    -- Stage 7: Week 1 active (completed at least one lesson each day for first 7 days, or 5 weekdays)
    CASE WHEN week1_active.user_id IS NOT NULL THEN 1 ELSE 0 END as week1_active
  FROM auth.users u
  LEFT JOIN user_preferences up ON u.id = up.user_id
  -- First lesson started (any learning node accessed)
  LEFT JOIN LATERAL (
    SELECT user_id FROM user_study_log 
    WHERE user_id = u.id AND node_type = 'learning'
    LIMIT 1
  ) first_lesson ON true
  -- First lesson completed (learning node marked complete)
  LEFT JOIN LATERAL (
    SELECT user_id FROM user_study_log 
    WHERE user_id = u.id AND node_type = 'learning' AND is_completed = true
    ORDER BY completed_at LIMIT 1
  ) first_lesson_completed ON true
  -- Day 2 return (activity on day after signup)
  LEFT JOIN LATERAL (
    SELECT user_id FROM user_study_log 
    WHERE user_id = u.id 
      AND study_date >= (u.created_at::date + INTERVAL '1 day')
      AND study_date <= (u + INTERVAL '.created_at::date2 days')
    LIMIT 1
  ) day2_return ON true
  -- Week 1 active (has activity on at least 3 of first 7 days)
  LEFT JOIN LATERAL (
    SELECT user_id, COUNT(DISTINCT study_date) as active_days
    FROM user_study_log 
    WHERE user_id = u.id 
      AND study_date >= u.created_at::date
      AND study_date <= (u.created_at::date + INTERVAL '6 days')
    GROUP BY user_id
    HAVING COUNT(DISTINCT study_date) >= 3
  ) week1_active ON true
)
SELECT 
  COUNT(*) as total_users,
  SUM(has_preferences) as has_preferences,
  SUM(pace_selected) as pace_selected,
  SUM(review_configured) as review_configured,
  SUM(first_lesson_started) as first_lesson_started,
  SUM(first_lesson_completed) as first_lesson_completed,
  SUM(day2_return) as day2_return,
  SUM(week1_active) as week1_active,
  -- Calculate conversion rates
  ROUND(SUM(has_preferences)::numeric / COUNT(*) * 100, 1) as conversion_to_preferences,
  ROUND(SUM(pace_selected)::numeric / NULLIF(SUM(has_preferences), 0) * 100, 1) as conversion_to_pace,
  ROUND(SUM(review_configured)::numeric / NULLIF(SUM(pace_selected), 0) * 100, 1) as conversion_to_review,
  ROUND(SUM(first_lesson_completed)::numeric / NULLIF(SUM(first_lesson_started), 0) * 100, 1) as conversion_first_lesson,
  ROUND(SUM(day2_return)::numeric / NULLIF(SUM(first_lesson_completed), 0) * 100, 1) as conversion_day2,
  ROUND(SUM(week1_active)::numeric / NULLIF(SUM(day2_return), 0) * 100, 1) as conversion_week1
FROM user_stages;

COMMENT ON MATERIALIZED VIEW analytics.onboarding_funnel IS 
'Tracks onboarding funnel conversion rates from signup to week 1 engagement. Updated via analytics.refresh_materialized_views()';
