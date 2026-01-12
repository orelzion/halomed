-- Fix content_cache RLS policy to ensure anonymous users are blocked
-- Reference: TDD Section 11, backend.md Section 4

-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can read content" ON content_cache;

-- Recreate policy with explicit role check
-- This ensures only authenticated users can read
CREATE POLICY "Authenticated users can read content"
  ON content_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: When RLS is enabled and no policy matches (e.g., anonymous users),
-- Supabase returns empty results, not an error. This is expected behavior.
