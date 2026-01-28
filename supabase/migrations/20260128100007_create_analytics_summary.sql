-- Create analytics summary statistics view
-- Provides high-level KPIs for admin dashboard
-- Reference: Phase 01 Plan 03 (Engagement Analytics)

-- =============================================================================
-- Analytics Summary Statistics
-- =============================================================================

-- High-level analytics summary for admin dashboard
-- Single-row materialized view with aggregated KPIs
CREATE MATERIALIZED VIEW analytics.summary_stats AS
SELECT
  -- User counts
  (SELECT COUNT(DISTINCT user_id) FROM user_study_log) as total_users,
  (SELECT COUNT(DISTINCT user_id) FROM user_study_log
   WHERE study_date >= CURRENT_DATE - INTERVAL '7 days' AND is_completed) as active_users_7d,
  (SELECT COUNT(DISTINCT user_id) FROM user_study_log
   WHERE study_date >= CURRENT_DATE - INTERVAL '30 days' AND is_completed) as active_users_30d,

  -- Completion metrics
  (SELECT ROUND(AVG(CASE WHEN is_completed THEN 1.0 ELSE 0.0 END) * 100, 2)
   FROM user_study_log WHERE study_date >= CURRENT_DATE - INTERVAL '30 days') as completion_rate_30d,

  -- Quiz metrics
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2)
   FROM learning_path WHERE node_type = 'quiz' AND unlock_date >= CURRENT_DATE - INTERVAL '30 days') as quiz_completion_rate_30d,

  -- Review metrics
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2)
   FROM learning_path WHERE node_type = 'review' AND unlock_date >= CURRENT_DATE - INTERVAL '30 days') as review_completion_rate_30d,

  -- Metadata
  NOW() as refreshed_at;

-- Create unique index for singleton pattern (single row)
CREATE UNIQUE INDEX idx_summary_stats_singleton ON analytics.summary_stats((1));

COMMENT ON MATERIALIZED VIEW analytics.summary_stats IS
  'High-level KPI summary for admin dashboard. Single row with aggregated stats. Refreshed via pg_cron.';

-- =============================================================================
-- Admin-Only Access Wrapper Function
-- =============================================================================

-- Wrapper function for summary statistics
CREATE OR REPLACE FUNCTION analytics.get_summary_stats()
RETURNS analytics.summary_stats AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN (SELECT s FROM analytics.summary_stats s LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
-- (Admin check happens inside function)
GRANT EXECUTE ON FUNCTION analytics.get_summary_stats TO authenticated;

-- Revoke direct access to materialized view
REVOKE ALL ON analytics.summary_stats FROM authenticated, anon;

-- Add comment for function documentation
COMMENT ON FUNCTION analytics.get_summary_stats IS
  'Admin-only access to summary statistics. Returns single row with high-level KPIs. Throws exception if user is not admin.';
