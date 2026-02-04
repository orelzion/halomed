-- Create Auth Hook for JWT custom claims
-- This function injects user_role claim into JWT tokens for efficient RLS checks
-- Reference: Phase 1 Analytics Foundation, Plan 01-01
--
-- IMPORTANT: After deployment, this must be registered in Supabase Dashboard:
--   Auth > Hooks > Custom Access Token Hook
--   Hook Name: custom_access_token_hook
--   URI: pg-functions://postgres/public/custom_access_token_hook

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  -- Query user_roles table for user's role
  SELECT role::text INTO user_role
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid;

  -- Inject role into JWT claims (defaults to 'user' if not found)
  event := jsonb_set(event, '{claims,user_role}', to_jsonb(COALESCE(user_role, 'user')));

  RETURN event;
END;
$$;

-- Grant execute permission to supabase_auth_admin (required for Auth Hooks)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke public execute (security best practice)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.custom_access_token_hook IS 'Auth Hook that injects user_role claim into JWT tokens. Must be registered in Supabase Dashboard > Auth > Hooks after deployment.';
