-- Check if JWT has user_role claim
SELECT 
  auth.uid() as user_id,
  auth.jwt() ->> 'user_role' as user_role_from_jwt,
  public.is_admin() as is_admin_result;
