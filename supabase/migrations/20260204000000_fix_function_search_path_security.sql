-- Migration: Set search_path = '' on all functions to prevent search_path injection attacks
-- All internal references are fully schema-qualified

-- =============================================================================
-- 1. Simple trigger functions (public schema)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_user_consent_preferences_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_roles_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$function$;

-- =============================================================================
-- 2. Admin/security functions (public schema)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SET search_path = ''
AS $function$
  SELECT (SELECT (auth.jwt() ->> 'user_role')) = 'admin'
$function$;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path = ''
AS $function$
DECLARE
  user_role text;
BEGIN
  SELECT role::text INTO user_role
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid;

  event := jsonb_set(event, '{claims,user_role}', pg_catalog.to_jsonb(COALESCE(user_role, 'user')));

  RETURN event;
END;
$function$;

CREATE OR REPLACE FUNCTION public.manual_refresh()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $function$
BEGIN
  PERFORM analytics.manual_refresh();
END;
$function$;

-- =============================================================================
-- 3. Analytics wrapper functions (public schema)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_pace_distribution()
  RETURNS SETOF analytics.user_pace_distribution
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_user_pace_distribution();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_review_intensity_distribution()
  RETURNS SETOF analytics.review_intensity_distribution
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_review_intensity_distribution();
END;
$function$;

-- =============================================================================
-- 4. Analytics schema functions
-- =============================================================================

CREATE OR REPLACE FUNCTION analytics.manual_refresh()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  REFRESH MATERIALIZED VIEW analytics.summary_stats;
  REFRESH MATERIALIZED VIEW analytics.user_pace_distribution;
  REFRESH MATERIALIZED VIEW analytics.streak_distribution;
  REFRESH MATERIALIZED VIEW analytics.weekly_activity;
  REFRESH MATERIALIZED VIEW analytics.review_intensity_distribution;
END;
$function$;

CREATE OR REPLACE FUNCTION analytics.refresh_all_views()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.active_learning_days;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.popular_tracks;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.streak_dropoffs;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.quiz_completion_rates;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.review_session_usage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.explanation_engagement;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.summary_stats;

  RAISE NOTICE 'Analytics views refreshed at %', pg_catalog.now();
END;
$function$;

CREATE OR REPLACE FUNCTION analytics.get_cron_job_status()
  RETURNS TABLE(jobid bigint, jobname text, schedule text, command text, last_run timestamp with time zone, last_status text)
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path = ''
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.cron_job_status;
END;
$function$;

CREATE OR REPLACE FUNCTION analytics.get_user_pace_distribution()
  RETURNS SETOF analytics.user_pace_distribution
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path = ''
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.user_pace_distribution;
END;
$function$;

CREATE OR REPLACE FUNCTION analytics.get_review_intensity_distribution()
  RETURNS SETOF analytics.review_intensity_distribution
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path = ''
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY SELECT * FROM analytics.review_intensity_distribution;
END;
$function$;

CREATE OR REPLACE FUNCTION analytics.health_check()
  RETURNS TABLE(view_name text, row_count bigint, last_refresh timestamp with time zone)
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path = ''
AS $function$
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
$function$;
