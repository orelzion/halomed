-- Create RLS policies for analytics materialized views
-- Enforces admin-only access through wrapper functions
--
-- NOTE: PostgreSQL does not support RLS directly on materialized views.
-- Solution: Create SECURITY DEFINER wrapper functions that check is_admin()
-- and revoke direct table access to force use of these functions.

-- Analytics query functions with admin access enforcement
-- These wrap the materialized views with role checking

CREATE OR REPLACE FUNCTION analytics.get_active_learning_days()
RETURNS SETOF analytics.active_learning_days AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.active_learning_days;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION analytics.get_active_learning_days IS
'Admin-only access to active learning days metrics. Checks is_admin() before returning data.';


CREATE OR REPLACE FUNCTION analytics.get_popular_tracks()
RETURNS SETOF analytics.popular_tracks AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.popular_tracks;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION analytics.get_popular_tracks IS
'Admin-only access to popular tracks metrics. Checks is_admin() before returning data.';


CREATE OR REPLACE FUNCTION analytics.get_streak_dropoffs()
RETURNS SETOF analytics.streak_dropoffs AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.streak_dropoffs;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION analytics.get_streak_dropoffs IS
'Admin-only access to streak drop-off analysis. Checks is_admin() before returning data.';


CREATE OR REPLACE FUNCTION analytics.get_quiz_completion_rates()
RETURNS SETOF analytics.quiz_completion_rates AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.quiz_completion_rates;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION analytics.get_quiz_completion_rates IS
'Admin-only access to quiz completion rates. Checks is_admin() before returning data.';


-- Grant execute permissions on wrapper functions
-- Admin check happens inside the function, so authenticated users can call but will be rejected
GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_active_learning_days() TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_popular_tracks() TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_streak_dropoffs() TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.get_quiz_completion_rates() TO authenticated;


-- Revoke direct access to materialized views
-- This forces all access through the wrapper functions which enforce admin checks
REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM anon;

-- Grant SELECT to postgres (for refresh operations)
-- postgres role needs to read views to refresh them
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO postgres;

COMMENT ON SCHEMA analytics IS
'Admin-only analytics schema. All materialized views must be accessed via wrapper functions (analytics.get_*) that enforce is_admin() checks. Direct table access is revoked.';
