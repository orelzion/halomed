-- Migration: Backfill completion data from learning_path to user_preferences
-- Task 1.2: Extract completed quiz and review dates from learning_path table
-- and populate the new user_preferences columns

-- First, ensure the new columns exist (Task 1.1)
DO $$
BEGIN
    -- Add quiz_completion_dates column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
          AND column_name = 'quiz_completion_dates'
    ) THEN
        ALTER TABLE user_preferences 
        ADD COLUMN quiz_completion_dates TEXT[] DEFAULT '{}',
        ADD COLUMN review_completion_dates TEXT[] DEFAULT '{}';
        
        -- Added quiz_completion_dates and review_completion_dates columns to user_preferences
    END IF;
END $$;

-- Backfill quiz completion data from learning_path
-- Extract dates where node_type = 'weekly_quiz' and completed_at IS NOT NULL
-- Group by user_id and convert to sorted arrays of YYYY-MM-DD strings
UPDATE user_preferences up
SET quiz_completion_dates = subquery.quiz_dates
FROM (
    SELECT 
        user_id, 
        ARRAY_AGG(completion_date::text ORDER BY completion_date) as quiz_dates
    FROM (
        SELECT DISTINCT user_id, DATE(completed_at) as completion_date
        FROM learning_path 
        WHERE node_type = 'weekly_quiz' 
          AND completed_at IS NOT NULL
          AND _deleted = false
    ) distinct_dates
    GROUP BY user_id
) subquery
WHERE up.user_id = subquery.user_id
  AND up.quiz_completion_dates IS DISTINCT FROM subquery.quiz_dates::text[];

-- Backfill review completion data from learning_path  
-- Extract dates where node_type IN ('review', 'review_session') and completed_at IS NOT NULL
-- Group by user_id and convert to sorted arrays of YYYY-MM-DD strings
UPDATE user_preferences up
SET review_completion_dates = subquery.review_dates
FROM (
    SELECT 
        user_id,
        ARRAY_AGG(completion_date::text ORDER BY completion_date) as review_dates  
    FROM (
        SELECT DISTINCT user_id, DATE(completed_at) as completion_date
        FROM learning_path 
        WHERE node_type IN ('review', 'review_session')
          AND completed_at IS NOT NULL
          AND _deleted = false
    ) distinct_dates
    GROUP BY user_id
) subquery
WHERE up.user_id = subquery.user_id
  AND up.review_completion_dates IS DISTINCT FROM subquery.review_dates::text[];

-- Log migration completion and statistics
DO $$
DECLARE
    quiz_users_count INTEGER;
    review_users_count INTEGER;
    total_users INTEGER;
BEGIN
    -- Count users with quiz completion data
    SELECT COUNT(*) INTO quiz_users_count
    FROM user_preferences 
    WHERE cardinality(quiz_completion_dates) > 0;
    
    -- Count users with review completion data
    SELECT COUNT(*) INTO review_users_count
    FROM user_preferences 
    WHERE cardinality(review_completion_dates) > 0;
    
    -- Total users in preferences table
    SELECT COUNT(*) INTO total_users
    FROM user_preferences;
    
    -- === Backfill Migration Completed ===
    -- Total users in user_preferences: total_users
    -- Users with quiz completion dates: quiz_users_count  
    -- Users with review completion dates: review_users_count
    -- ===================================
END $$;

-- Validate the backfill operation
-- Check for any NULL completion dates that should have been populated
DO $$
DECLARE
    missed_quiz_count INTEGER;
    missed_review_count INTEGER;
BEGIN
    -- Check for quiz completions that might have been missed
    SELECT COUNT(DISTINCT lp.user_id) INTO missed_quiz_count
    FROM learning_path lp
    LEFT JOIN user_preferences up ON lp.user_id = up.user_id
    WHERE lp.node_type = 'weekly_quiz'
      AND lp.completed_at IS NOT NULL
      AND lp._deleted = false
      AND (up.quiz_completion_dates IS NULL OR cardinality(up.quiz_completion_dates) = 0);
    
    -- Check for review completions that might have been missed  
    SELECT COUNT(DISTINCT lp.user_id) INTO missed_review_count
    FROM learning_path lp
    LEFT JOIN user_preferences up ON lp.user_id = up.user_id
    WHERE lp.node_type IN ('review', 'review_session')
      AND lp.completed_at IS NOT NULL
      AND lp._deleted = false
      AND (up.review_completion_dates IS NULL OR cardinality(up.review_completion_dates) = 0);
    
    IF missed_quiz_count > 0 OR missed_review_count > 0 THEN
        -- === Validation Warnings ===
        -- Users with quiz completions but empty quiz_completion_dates: missed_quiz_count
        -- Users with review completions but empty review_completion_dates: missed_review_count
        -- ===========================
    ELSE
        -- Validation passed: No completion data missed
    END IF;
END $$;

-- Add indexes for better query performance on the new array columns
CREATE INDEX IF NOT EXISTS idx_user_preferences_quiz_completion_dates 
ON user_preferences USING GIN (quiz_completion_dates);

CREATE INDEX IF NOT EXISTS idx_user_preferences_review_completion_dates 
ON user_preferences USING GIN (review_completion_dates);

-- Migration complete: Added performance indexes for completion date arrays

-- Sample verification query (commented out - for manual verification)
/*
SELECT 
    up.user_id,
    cardinality(up.quiz_completion_dates) as quiz_count,
    cardinality(up.review_completion_dates) as review_count,
    up.quiz_completion_dates as sample_quiz_dates,
    up.review_completion_dates as sample_review_dates
FROM user_preferences up
WHERE cardinality(up.quiz_completion_dates) > 0 
   OR cardinality(up.review_completion_dates) > 0
ORDER BY up.user_id
LIMIT 5;
*/