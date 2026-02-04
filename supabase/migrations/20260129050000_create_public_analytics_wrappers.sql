-- Create public schema wrappers for analytics RPC functions
-- This allows Supabase JS client to call them without schema prefix
-- The wrappers simply delegate to the analytics schema functions

CREATE OR REPLACE FUNCTION public.get_summary_stats()
RETURNS analytics.summary_stats AS $$
BEGIN
  RETURN analytics.get_summary_stats();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_popular_tracks()
RETURNS SETOF analytics.popular_tracks AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_popular_tracks();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_streak_dropoffs()
RETURNS SETOF analytics.streak_dropoffs AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_streak_dropoffs();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_quiz_completion_rates()
RETURNS SETOF analytics.quiz_completion_rates AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_quiz_completion_rates();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
-- Admin check happens in the analytics schema functions
GRANT EXECUTE ON FUNCTION public.get_summary_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_popular_tracks TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_streak_dropoffs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_completion_rates TO authenticated;

COMMENT ON FUNCTION public.get_summary_stats IS 'Public wrapper for analytics.get_summary_stats(). Admin access enforced by underlying function.';
COMMENT ON FUNCTION public.get_popular_tracks IS 'Public wrapper for analytics.get_popular_tracks(). Admin access enforced by underlying function.';
COMMENT ON FUNCTION public.get_streak_dropoffs IS 'Public wrapper for analytics.get_streak_dropoffs(). Admin access enforced by underlying function.';
COMMENT ON FUNCTION public.get_quiz_completion_rates IS 'Public wrapper for analytics.get_quiz_completion_rates(). Admin access enforced by underlying function.';
