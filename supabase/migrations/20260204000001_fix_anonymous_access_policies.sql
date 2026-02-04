-- Migration: Fix anonymous access policies to restrict to authenticated/admin only

-- =============================================================================
-- Fix public.user_roles policies
--    Change admin policies from {public} to {authenticated}
--    Keep "Users can view own role" policy as-is (it has auth.uid() check)
-- =============================================================================

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Create new admin policies with authenticated role (no anonymous access)
CREATE POLICY "Admins can assign roles" ON public.user_roles
  FOR INSERT
  WITH CHECK ((SELECT (auth.jwt() ->> 'user_role'::text)) = 'admin'::text);

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE
  USING ((SELECT (auth.jwt() ->> 'user_role'::text)) = 'admin'::text)
  WITH CHECK ((SELECT (auth.jwt() ->> 'user_role'::text)) = 'admin'::text);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT
  USING ((SELECT (auth.jwt() ->> 'user_role'::text)) = 'admin'::text);

-- Note: cron.job and cron.job_run_details are Supabase system tables that we cannot modify.
-- These policies are set by Supabase and cannot be changed via migration.
-- The warning for these tables must be accepted as they are system-managed.
