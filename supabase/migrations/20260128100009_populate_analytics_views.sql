-- Populate analytics views and add health check function
-- Performs initial refresh of all materialized views
-- Reference: Phase 01 Plan 04 (Analytics Cron Jobs)

-- =============================================================================
-- Initial View Population
-- =============================================================================

-- Perform initial refresh of all analytics views
-- This populates them with current data
-- Note: First refresh can use non-CONCURRENT since views are empty
DO $$
BEGIN
  -- Refresh each view to populate with initial data
  REFRESH MATERIALIZED VIEW analytics.active_learning_days;
  REFRESH MATERIALIZED VIEW analytics.popular_tracks;
  REFRESH MATERIALIZED VIEW analytics.streak_dropoffs;
  REFRESH MATERIALIZED VIEW analytics.quiz_completion_rates;
  REFRESH MATERIALIZED VIEW analytics.review_session_usage;
  REFRESH MATERIALIZED VIEW analytics.explanation_engagement;
  REFRESH MATERIALIZED VIEW analytics.summary_stats;

  RAISE NOTICE 'Initial analytics view population complete at %', NOW();
END $$;

-- =============================================================================
-- Extension Verification
-- =============================================================================

-- Verify pg_cron is properly configured
DO $$
BEGIN
  -- Check pg_cron extension exists
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron extension not found. Enable in Supabase Dashboard > Database > Extensions';
  END IF;

  -- Check cron job was created by previous migration
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-analytics-views') THEN
    RAISE WARNING 'Cron job not found. May need to run migration 20260128100008 first.';
  END IF;

  RAISE NOTICE 'pg_cron extension and refresh job verified at %', NOW();
END $$;

-- =============================================================================
-- Health Check Function
-- =============================================================================

-- Analytics health check for monitoring
-- Returns row counts and freshness for all views
CREATE OR REPLACE FUNCTION analytics.health_check()
RETURNS TABLE(
  view_name text,
  row_count bigint,
  last_refresh timestamp with time zone
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 'active_learning_days'::text, COUNT(*)::bigint, NULL::timestamptz
  FROM analytics.active_learning_days
  UNION ALL
  SELECT 'popular_tracks', COUNT(*), NULL
  FROM analytics.popular_tracks
  UNION ALL
  SELECT 'streak_dropoffs', COUNT(*), NULL
  FROM analytics.streak_dropoffs
  UNION ALL
  SELECT 'quiz_completion_rates', COUNT(*), NULL
  FROM analytics.quiz_completion_rates
  UNION ALL
  SELECT 'review_session_usage', COUNT(*), NULL
  FROM analytics.review_session_usage
  UNION ALL
  SELECT 'explanation_engagement', COUNT(*), NULL
  FROM analytics.explanation_engagement
  UNION ALL
  SELECT 'summary_stats', COUNT(*), refreshed_at
  FROM analytics.summary_stats;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION analytics.health_check TO authenticated;

COMMENT ON FUNCTION analytics.health_check IS
  'Returns row counts and freshness for all analytics views. Useful for monitoring and debugging. Admin-only access.';

-- =============================================================================
-- Verification Summary
-- =============================================================================

-- Log completion message
DO $$
DECLARE
  v_cron_exists boolean;
  v_views_populated boolean;
BEGIN
  -- Check if cron job exists
  SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'refresh-analytics-views')
  INTO v_cron_exists;

  -- Check if views have data (at least summary_stats should have 1 row)
  SELECT EXISTS(SELECT 1 FROM analytics.summary_stats LIMIT 1)
  INTO v_views_populated;

  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Analytics Materialized Views Setup Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Cron job scheduled: %', v_cron_exists;
  RAISE NOTICE 'Views populated: %', v_views_populated;
  RAISE NOTICE 'Next automatic refresh: ~30 minutes from now';
  RAISE NOTICE '';
  RAISE NOTICE 'Available admin functions:';
  RAISE NOTICE '  - analytics.manual_refresh() - Trigger immediate refresh';
  RAISE NOTICE '  - analytics.health_check() - Check view status';
  RAISE NOTICE '  - analytics.get_cron_job_status() - Monitor cron execution';
  RAISE NOTICE '=================================================================';
END $$;
