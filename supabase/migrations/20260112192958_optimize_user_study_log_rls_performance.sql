-- Optimize user_study_log RLS policies for better performance
-- Fix: Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row
-- Reference: Supabase RLS performance best practices

-- Drop existing policies
DROP POLICY IF EXISTS "Users can select own study logs" ON user_study_log;
DROP POLICY IF EXISTS "Users can insert own study logs" ON user_study_log;
DROP POLICY IF EXISTS "Users can update own study logs" ON user_study_log;

-- Recreate SELECT policy with optimized auth.uid() call
CREATE POLICY "Users can select own study logs"
  ON user_study_log
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Recreate INSERT policy with optimized auth.uid() call
CREATE POLICY "Users can insert own study logs"
  ON user_study_log
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Recreate UPDATE policy with optimized auth.uid() call
CREATE POLICY "Users can update own study logs"
  ON user_study_log
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
