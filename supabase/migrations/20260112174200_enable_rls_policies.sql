-- Enable Row Level Security (RLS) and create policies
-- Reference: TDD Section 11, backend.md Section 4

-- ============================================================================
-- TRACKS TABLE RLS
-- ============================================================================

-- Enable RLS on tracks table
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read tracks (read-only)
CREATE POLICY "Anyone can read tracks"
  ON tracks
  FOR SELECT
  USING (true);

-- ============================================================================
-- CONTENT_CACHE TABLE RLS
-- ============================================================================

-- Enable RLS on content_cache table
ALTER TABLE content_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read content (read-only)
CREATE POLICY "Authenticated users can read content"
  ON content_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- USER_STUDY_LOG TABLE RLS
-- ============================================================================

-- Enable RLS on user_study_log table
ALTER TABLE user_study_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own study logs
CREATE POLICY "Users can select own study logs"
  ON user_study_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own study logs
CREATE POLICY "Users can insert own study logs"
  ON user_study_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own study logs
CREATE POLICY "Users can update own study logs"
  ON user_study_log
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
