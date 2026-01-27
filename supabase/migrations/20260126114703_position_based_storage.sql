-- Position-based storage migration
-- Replace 18,000 rows per user with a single position field
-- All path data is now computed on-demand from position

-- 1. Add position tracking columns to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS current_content_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS path_start_date DATE DEFAULT CURRENT_DATE;

-- 2. Backfill current_content_index from learning_path completed nodes
-- Count completed learning nodes (not dividers, not quizzes, not reviews)
UPDATE user_preferences up
SET current_content_index = COALESCE((
  SELECT COUNT(*) 
  FROM learning_path lp 
  WHERE lp.user_id = up.user_id 
    AND lp.completed_at IS NOT NULL
    AND lp.node_type = 'learning'
    AND lp.is_divider = false
), 0);

-- 3. Backfill path_start_date from earliest unlock_date
UPDATE user_preferences up
SET path_start_date = COALESCE((
  SELECT MIN(unlock_date)::date 
  FROM learning_path lp 
  WHERE lp.user_id = up.user_id
), CURRENT_DATE);

-- 4. Remove 'one_mishna' pace option - migrate to 'seder_per_year' (middle ground)
-- one_mishna takes 16 years which is unrealistic
-- seder_per_year is ~6 years, a good middle ground
UPDATE user_preferences
SET pace = 'seder_per_year'
WHERE pace = 'one_mishna';

-- Note: New pace options are:
-- - 'one_chapter': ~8 mishnayot/day, ~2 years
-- - 'seder_per_year': 2-4 mishnayot/day (dynamic by seder), ~6 years  
-- - 'two_mishna': 2 mishnayot/day, ~8 years

-- 5. Add comment explaining the new columns
COMMENT ON COLUMN user_preferences.current_content_index IS 
  'Position in the learning sequence (0-based). Increment when completing a mishna/chapter.';
COMMENT ON COLUMN user_preferences.path_start_date IS 
  'Date when user started their learning journey. Used to compute expected progress.';

-- Note: learning_path table will be dropped in a future migration after client code is updated
