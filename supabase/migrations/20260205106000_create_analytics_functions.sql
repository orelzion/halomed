-- Create analytics schema functions for new dashboard views
-- Task: BE-07 (partial)

-- Function to get cohort retention data
CREATE OR REPLACE FUNCTION analytics.get_cohort_retention()
RETURNS SETOF analytics.cohort_retention AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.cohort_retention;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get pace adherence data
CREATE OR REPLACE FUNCTION analytics.get_pace_adherence()
RETURNS SETOF analytics.pace_adherence AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.pace_adherence;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get pace adherence summary
CREATE OR REPLACE FUNCTION analytics.get_pace_adherence_summary()
RETURNS TABLE (
  on_pace_count BIGINT,
  behind_1_7_count BIGINT,
  behind_7_plus_count BIGINT,
  on_pace_pct NUMERIC,
  behind_1_7_pct NUMERIC,
  behind_7_plus_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(CASE WHEN pace_status = 'on_pace' THEN 1 END) as on_pace_count,
    COUNT(CASE WHEN pace_status = 'behind_1_7' THEN 1 END) as behind_1_7_count,
    COUNT(CASE WHEN pace_status = 'behind_7_plus' THEN 1 END) as behind_7_plus_count,
    ROUND(COUNT(CASE WHEN pace_status = 'on_pace' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as on_pace_pct,
    ROUND(COUNT(CASE WHEN pace_status = 'behind_1_7' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as behind_1_7_pct,
    ROUND(COUNT(CASE WHEN pace_status = 'behind_7_plus' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as behind_7_plus_pct
  FROM analytics.pace_adherence;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get content difficulty data
CREATE OR REPLACE FUNCTION analytics.get_content_difficulty()
RETURNS SETOF analytics.content_difficulty AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.content_difficulty;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get hardest content
CREATE OR REPLACE FUNCTION analytics.get_hardest_content(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  ref_id TEXT,
  tractate TEXT,
  avg_score NUMERIC,
  pass_rate NUMERIC,
  attempt_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cd.ref_id,
    cd.tractate,
    cd.avg_score,
    cd.pass_rate,
    cd.attempt_count
  FROM analytics.content_difficulty cd
  ORDER BY cd.pass_rate ASC, cd.avg_score ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get onboarding funnel data
CREATE OR REPLACE FUNCTION analytics.get_onboarding_funnel()
RETURNS analytics.onboarding_funnel AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.onboarding_funnel;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get review completion data
CREATE OR REPLACE FUNCTION analytics.get_review_completion()
RETURNS SETOF analytics.review_completion AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.review_completion;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get user preferences summary
CREATE OR REPLACE FUNCTION analytics.get_user_preferences_summary()
RETURNS TABLE (
  pace_distribution JSONB,
  review_intensity_distribution JSONB,
  review_completion JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT JSON_AGG(JSON_BUILD_OBJECT('pace', pace, 'user_count', user_count, 'percentage', percentage))
     FROM analytics.user_pace_distribution) as pace_distribution,
    (SELECT JSON_AGG(JSON_BUILD_OBJECT('intensity', review_intensity, 'user_count', user_count, 'percentage', percentage))
     FROM analytics.review_intensity_distribution) as review_intensity_distribution,
    (SELECT JSON_AGG(JSON_BUILD_OBJECT('intensity', review_intensity, 'completion_rate', overall_completion_rate))
     FROM analytics.review_completion) as review_completion;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get churn risk users (users with declining activity)
CREATE OR REPLACE FUNCTION analytics.get_churn_risk_users(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  days_since_last_activity INTEGER,
  streak_broken BOOLEAN,
  last_streak INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    COALESCE(
      EXTRACT(DAY FROM (CURRENT_DATE - MAX(usl.study_date))), 
      EXTRACT(DAY FROM (CURRENT_DATE - up.created_at::date))
    )::INTEGER as days_since_last_activity,
    CASE WHEN up.streak_count = 0 AND MAX(usl.study_date) < CURRENT_DATE - INTERVAL '2 days' THEN true ELSE false END as streak_broken,
    up.streak_count as last_streak
  FROM user_preferences up
  LEFT JOIN user_study_log usl ON up.user_id = usl.user_id
  GROUP BY up.user_id, up.streak_count, up.created_at
  HAVING 
    (MAX(usl.study_date) IS NULL AND EXTRACT(DAY FROM (CURRENT_DATE - up.created_at::date)) > 3)
    OR (MAX(usl.study_date) < CURRENT_DATE - INTERVAL '5 days')
  ORDER BY 
    CASE 
      WHEN MAX(usl.study_date) IS NULL THEN EXTRACT(DAY FROM (CURRENT_DATE - up.created_at::date))
      ELSE EXTRACT(DAY FROM (CURRENT_DATE - MAX(usl.study_date)))
    END DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update refresh_all_views to include new views
CREATE OR REPLACE FUNCTION analytics.refresh_all_views()
RETURNS BOOLEAN AS $$
BEGIN
  -- Refresh existing views
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.summary_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.user_pace_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.streak_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.weekly_activity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.review_intensity_distribution;
  
  -- Refresh new views
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.cohort_retention;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.pace_adherence;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.content_difficulty;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.onboarding_funnel;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.review_completion;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Create public wrappers for new functions
CREATE OR REPLACE FUNCTION public.get_cohort_retention()
RETURNS SETOF analytics.cohort_retention AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_cohort_retention();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_pace_adherence()
RETURNS SETOF analytics.pace_adherence AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_pace_adherence();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_pace_adherence_summary()
RETURNS TABLE (
  on_pace_count BIGINT,
  behind_1_7_count BIGINT,
  behind_7_plus_count BIGINT,
  on_pace_pct NUMERIC,
  behind_1_7_pct NUMERIC,
  behind_7_plus_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_pace_adherence_summary();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_content_difficulty()
RETURNS SETOF analytics.content_difficulty AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_content_difficulty();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_hardest_content(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  ref_id TEXT,
  tractate TEXT,
  avg_score NUMERIC,
  pass_rate NUMERIC,
  attempt_count BIGINT
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_hardest_content(limit_count);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_onboarding_funnel()
RETURNS analytics.onboarding_funnel AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_onboarding_funnel();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_review_completion()
RETURNS SETOF analytics.review_completion AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_review_completion();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_preferences_summary()
RETURNS TABLE (
  pace_distribution JSONB,
  review_intensity_distribution JSONB,
  review_completion JSONB
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_user_preferences_summary();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_churn_risk_users(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  days_since_last_activity INTEGER,
  streak_broken BOOLEAN,
  last_streak INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_churn_risk_users(limit_count);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute on new functions
GRANT EXECUTE ON FUNCTION public.get_cohort_retention TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pace_adherence TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pace_adherence_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_difficulty TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hardest_content TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_onboarding_funnel TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_review_completion TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_preferences_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_churn_risk_users TO authenticated;

-- Comments
COMMENT ON FUNCTION analytics.get_cohort_retention IS 'Returns cohort retention data for dashboard';
COMMENT ON FUNCTION analytics.get_pace_adherence IS 'Returns pace adherence data showing users ahead/behind schedule';
COMMENT ON FUNCTION analytics.get_content_difficulty IS 'Returns quiz performance by tractate and mishnah';
COMMENT ON FUNCTION analytics.get_onboarding_funnel IS 'Returns onboarding funnel conversion rates';
COMMENT ON FUNCTION analytics.get_review_completion IS 'Returns review completion rates by intensity setting';
COMMENT ON FUNCTION public.get_cohort_retention IS 'Public wrapper for analytics.get_cohort_retention()';
COMMENT ON FUNCTION public.get_pace_adherence IS 'Public wrapper for analytics.get_pace_adherence()';
COMMENT ON FUNCTION public.get_onboarding_funnel IS 'Public wrapper for analytics.get_onboarding_funnel()';
COMMENT ON FUNCTION public.get_review_completion IS 'Public wrapper for analytics.get_review_completion()';
COMMENT ON FUNCTION public.get_user_preferences_summary IS 'Returns aggregated user preferences data for dashboard';
COMMENT ON FUNCTION public.get_churn_risk_users IS 'Returns users at risk of churning based on activity patterns';
