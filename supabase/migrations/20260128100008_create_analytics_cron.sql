-- Create pg_cron job for analytics materialized view refresh
-- Implements automatic refresh of all analytics views every 30 minutes
-- Reference: Phase 01 Plan 04 (Analytics Cron Jobs)

-- =============================================================================
-- Enable pg_cron extension
-- =============================================================================

-- pg_cron is enabled by default in Supabase, but ensure it's available
CREATE EXTENSION IF NOT EXISTS pg_cron;

COMMENT ON EXTENSION pg_cron IS
  'Cron-based job scheduler for PostgreSQL. Used to refresh analytics materialized views.';

-- =============================================================================
-- Refresh Function
-- =============================================================================

-- Function to refresh all analytics views
-- Can be called manually or via cron
-- Refreshes in dependency order (base views first)
CREATE OR REPLACE FUNCTION analytics.refresh_all_views()
RETURNS void AS $$
BEGIN
  -- Refresh in dependency order (base views first)
  -- Use CONCURRENTLY to avoid blocking reads (requires unique indexes)
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.active_learning_days;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.popular_tracks;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.streak_dropoffs;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.quiz_completion_rates;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.review_session_usage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.explanation_engagement;
  -- Summary stats last (depends on no other views but good to be fresh)
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.summary_stats;

  RAISE NOTICE 'Analytics views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION analytics.refresh_all_views IS
  'Refreshes all analytics materialized views. Called by pg_cron every 30 minutes. Can be called manually via analytics.manual_refresh().';

-- =============================================================================
-- Schedule Cron Job
-- =============================================================================

-- Schedule refresh every 30 minutes
-- Supabase pg_cron runs in UTC timezone
SELECT cron.schedule(
  'refresh-analytics-views',      -- job name
  '*/30 * * * *',                 -- every 30 minutes
  'SELECT analytics.refresh_all_views()'
);

-- =============================================================================
-- Manual Refresh Function (Admin Only)
-- =============================================================================

-- Admin-accessible manual refresh
-- Allows admins to trigger immediate refresh without waiting for cron
CREATE OR REPLACE FUNCTION analytics.manual_refresh()
RETURNS TEXT AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  PERFORM analytics.refresh_all_views();
  RETURN 'Analytics views refreshed at ' || NOW()::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION analytics.manual_refresh TO authenticated;

COMMENT ON FUNCTION analytics.manual_refresh IS
  'Allows admins to manually trigger analytics view refresh. Rate limit should be applied in application layer.';

-- =============================================================================
-- Cron Job Monitoring
-- =============================================================================

-- View for monitoring cron job execution (admin only via wrapper function)
CREATE OR REPLACE VIEW analytics.cron_job_status AS
SELECT
  jobid,
  jobname,
  schedule,
  command,
  (SELECT MAX(start_time) FROM cron.job_run_details WHERE jobid = cron.job.jobid) as last_run,
  (SELECT status FROM cron.job_run_details WHERE jobid = cron.job.jobid ORDER BY start_time DESC LIMIT 1) as last_status
FROM cron.job
WHERE jobname = 'refresh-analytics-views';

COMMENT ON VIEW analytics.cron_job_status IS
  'Monitoring view for analytics refresh cron job. Accessible via analytics.get_cron_job_status() function.';

-- Wrapper function for admin access to cron job status
CREATE OR REPLACE FUNCTION analytics.get_cron_job_status()
RETURNS TABLE(
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  last_run timestamp with time zone,
  last_status text
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.cron_job_status;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION analytics.get_cron_job_status TO authenticated;

COMMENT ON FUNCTION analytics.get_cron_job_status IS
  'Admin-only access to cron job status and execution history. Shows last run time and status for analytics refresh job.';
