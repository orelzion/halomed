-- Create helper function for RLS admin checks
-- This function efficiently checks if the current user has admin role
-- Reference: Phase 1 Analytics Foundation, Plan 01-01
--
-- Usage in RLS policies:
--   CREATE POLICY "Admins can view all data"
--     ON table_name
--     FOR SELECT
--     USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  -- Wrap auth.jwt() in SELECT for query plan caching (avoids RLS performance issues)
  SELECT (SELECT (auth.jwt() ->> 'user_role')) = 'admin'
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_admin IS 'Helper function for RLS policies. Returns true if current user has admin role. Uses STABLE + wrapped SELECT for query plan caching.';
