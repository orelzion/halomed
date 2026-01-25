-- Ensure updated_at triggers exist for all tables
-- Required for RxDB sync (tracks changes via updated_at)
-- Reference: Migration Plan Phase 1, Task 1.2

-- Create generic function to update updated_at (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at to user_study_log if it doesn't exist
ALTER TABLE user_study_log 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Create trigger for user_study_log
DROP TRIGGER IF EXISTS update_user_study_log_updated_at ON user_study_log;
CREATE TRIGGER update_user_study_log_updated_at
  BEFORE UPDATE ON user_study_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at to content_cache if it doesn't exist
ALTER TABLE content_cache 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Create trigger for content_cache
DROP TRIGGER IF EXISTS update_content_cache_updated_at ON content_cache;
CREATE TRIGGER update_content_cache_updated_at
  BEFORE UPDATE ON content_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at to tracks if it doesn't exist
ALTER TABLE tracks 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Create trigger for tracks
DROP TRIGGER IF EXISTS update_tracks_updated_at ON tracks;
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- user_preferences already has updated_at and trigger (from 20260117221632_create_user_preferences_table.sql)
-- Verify it uses the generic function
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at to learning_path if it doesn't exist
ALTER TABLE learning_path 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Create trigger for learning_path
DROP TRIGGER IF EXISTS update_learning_path_updated_at ON learning_path;
CREATE TRIGGER update_learning_path_updated_at
  BEFORE UPDATE ON learning_path
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at to quiz_questions if it doesn't exist
ALTER TABLE quiz_questions 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Create trigger for quiz_questions
DROP TRIGGER IF EXISTS update_quiz_questions_updated_at ON quiz_questions;
CREATE TRIGGER update_quiz_questions_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN user_study_log.updated_at IS 'Auto-updated timestamp for RxDB sync';
COMMENT ON COLUMN content_cache.updated_at IS 'Auto-updated timestamp for RxDB sync';
COMMENT ON COLUMN tracks.updated_at IS 'Auto-updated timestamp for RxDB sync';
COMMENT ON COLUMN learning_path.updated_at IS 'Auto-updated timestamp for RxDB sync';
COMMENT ON COLUMN quiz_questions.updated_at IS 'Auto-updated timestamp for RxDB sync';
