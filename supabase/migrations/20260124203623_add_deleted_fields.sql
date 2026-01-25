-- Add _deleted field to all tables for soft deletes
-- Required for RxDB sync (soft delete support)
-- Reference: Migration Plan Phase 1, Task 1.1

-- Add _deleted to user_study_log
ALTER TABLE user_study_log 
  ADD COLUMN IF NOT EXISTS _deleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Add _deleted to content_cache
ALTER TABLE content_cache 
  ADD COLUMN IF NOT EXISTS _deleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Add _deleted to tracks
ALTER TABLE tracks 
  ADD COLUMN IF NOT EXISTS _deleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Add _deleted to user_preferences
ALTER TABLE user_preferences 
  ADD COLUMN IF NOT EXISTS _deleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Add _deleted to learning_path
ALTER TABLE learning_path 
  ADD COLUMN IF NOT EXISTS _deleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Add _deleted to quiz_questions
ALTER TABLE quiz_questions 
  ADD COLUMN IF NOT EXISTS _deleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_study_log._deleted IS 'Soft delete flag for RxDB sync';
COMMENT ON COLUMN content_cache._deleted IS 'Soft delete flag for RxDB sync';
COMMENT ON COLUMN tracks._deleted IS 'Soft delete flag for RxDB sync';
COMMENT ON COLUMN user_preferences._deleted IS 'Soft delete flag for RxDB sync';
COMMENT ON COLUMN learning_path._deleted IS 'Soft delete flag for RxDB sync';
COMMENT ON COLUMN quiz_questions._deleted IS 'Soft delete flag for RxDB sync';
