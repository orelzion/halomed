-- Add Quiz/Review Completion Tracking to user_preferences
-- Task 1.1: Add completion tracking arrays instead of individual learning_path records
-- This is Phase 1 of migrating from learning_path table to position-based model
-- Reference: Migration Plan Task 1.1

-- Add quiz_completion_dates array to track weekly quiz completions
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS quiz_completion_dates TEXT[] DEFAULT '{}';

-- Add review_completion_dates array to track review session completions
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS review_completion_dates TEXT[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.quiz_completion_dates IS 
  'Array of dates when weekly quizzes were completed (YYYY-MM-DD format)';
COMMENT ON COLUMN user_preferences.review_completion_dates IS 
  'Array of dates when review sessions were completed (YYYY-MM-DD format)';

-- Create index on quiz_completion_dates for faster querying
CREATE INDEX IF NOT EXISTS idx_user_preferences_quiz_completion_dates 
  ON user_preferences USING GIN(quiz_completion_dates);

-- Create index on review_completion_dates for faster querying
CREATE INDEX IF NOT EXISTS idx_user_preferences_review_completion_dates 
  ON user_preferences USING GIN(review_completion_dates);

-- Notes:
-- - Columns use TEXT arrays for date strings in YYYY-MM-DD format
-- - Default is empty array '{}' to avoid NULL values
-- - GIN indexes enable efficient array operations and lookups
-- - Data will be backfilled from learning_path table in Task 1.2
-- - This enables removing learning_path table completely in future phases