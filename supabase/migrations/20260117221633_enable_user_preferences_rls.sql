-- Enable Row Level Security (RLS) for user_preferences table
-- Users can only access their own preferences
-- Reference: TDD Section 11, backend.md Section 4

-- Enable RLS on user_preferences table
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own preferences
CREATE POLICY "Users can select own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own preferences
CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
