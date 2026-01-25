-- Add all tables to Supabase Realtime publication
-- Required for RxDB Supabase plugin to receive real-time updates
-- Reference: Migration Plan Phase 1, Task 1.3

-- Ensure supabase_realtime publication exists (created by Supabase by default)
-- If it doesn't exist, Supabase will create it, but we'll handle it gracefully

-- Add tables to Realtime publication
-- Note: ALTER PUBLICATION doesn't support IF NOT EXISTS, so we use DO blocks to handle errors gracefully
DO $$
BEGIN
  -- Add user_study_log
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_study_log;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication, ignore
    NULL;
  END;

  -- Add content_cache
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE content_cache;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Add tracks
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE tracks;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Add user_preferences
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Add learning_path
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE learning_path;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Add quiz_questions
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE quiz_questions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Verify tables are in publication (for manual verification)
-- You can check with: 
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
