-- Create engagement analytics views
-- Tracks: ANLYT-05 (review session usage), ANLYT-06 (explanation engagement)
-- Reference: Phase 01 Plan 03 (Engagement Analytics)

-- =============================================================================
-- ANLYT-05: Review Session Usage
-- =============================================================================

-- Review session usage analytics
-- Tracks how often users engage with spaced repetition review nodes
CREATE MATERIALIZED VIEW analytics.review_session_usage AS
SELECT
  DATE_TRUNC('week', unlock_date)::date as week_start,
  COUNT(DISTINCT user_id) as users_with_reviews,
  COUNT(*) as total_review_nodes,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_reviews,
  ROUND(
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as review_completion_rate_pct,
  AVG(
    CASE WHEN completed_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (completed_at - unlock_date::timestamp)) / 86400.0
    ELSE NULL END
  )::NUMERIC(10,2) as avg_days_to_complete
FROM learning_path
WHERE node_type = 'review'
  AND unlock_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', unlock_date)
ORDER BY week_start DESC;

CREATE UNIQUE INDEX idx_review_usage_week ON analytics.review_session_usage(week_start);

COMMENT ON MATERIALIZED VIEW analytics.review_session_usage IS
  'Review session usage frequency by week. Tracks ANLYT-05. Refreshed via pg_cron.';

-- =============================================================================
-- ANLYT-06: Explanation Engagement
-- =============================================================================

-- Explanation engagement analytics (proxy via learning completion)
-- Note: Current schema doesn't track explicit explanation views/clicks
-- Using learning node completion as proxy for engagement with explanations
-- Future enhancement: Add explanation_opened_at timestamp to learning_path
CREATE MATERIALIZED VIEW analytics.explanation_engagement AS
SELECT
  DATE_TRUNC('week', unlock_date)::date as week_start,
  COUNT(DISTINCT user_id) as users_with_learning,
  COUNT(*) as total_learning_nodes,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_learning,
  ROUND(
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as engagement_rate_pct,
  -- Track average time from unlock to completion (indicates engagement depth)
  AVG(
    CASE WHEN completed_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (completed_at - unlock_date::timestamp)) / 3600.0
    ELSE NULL END
  )::NUMERIC(10,2) as avg_hours_to_complete
FROM learning_path
WHERE node_type = 'learning'
  AND unlock_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', unlock_date)
ORDER BY week_start DESC;

CREATE UNIQUE INDEX idx_explanation_engagement_week ON analytics.explanation_engagement(week_start);

COMMENT ON MATERIALIZED VIEW analytics.explanation_engagement IS
  'Explanation engagement (proxy via learning completion). Tracks ANLYT-06. Future: add explicit explanation click tracking.';

-- =============================================================================
-- Admin-Only Access Wrapper Functions
-- =============================================================================

-- Wrapper function for review session usage
CREATE OR REPLACE FUNCTION analytics.get_review_session_usage()
RETURNS SETOF analytics.review_session_usage AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.review_session_usage;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Wrapper function for explanation engagement
CREATE OR REPLACE FUNCTION analytics.get_explanation_engagement()
RETURNS SETOF analytics.explanation_engagement AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.explanation_engagement;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions to authenticated users
-- (Admin check happens inside function)
GRANT EXECUTE ON FUNCTION analytics.get_review_session_usage TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_explanation_engagement TO authenticated;

-- Revoke direct access to materialized views
REVOKE ALL ON analytics.review_session_usage FROM authenticated, anon;
REVOKE ALL ON analytics.explanation_engagement FROM authenticated, anon;

-- Add comments for function documentation
COMMENT ON FUNCTION analytics.get_review_session_usage IS
  'Admin-only access to review session usage analytics. Throws exception if user is not admin.';
COMMENT ON FUNCTION analytics.get_explanation_engagement IS
  'Admin-only access to explanation engagement analytics. Throws exception if user is not admin.';
