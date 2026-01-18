-- Enable Row Level Security (RLS) for learning_path table
-- Users can only access their own learning path
-- Reference: TDD Section 11, backend.md Section 4

-- Enable RLS on learning_path table
ALTER TABLE learning_path ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own learning path
CREATE POLICY "Users can select own learning path"
  ON learning_path
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own learning path nodes
CREATE POLICY "Users can insert own learning path"
  ON learning_path
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own learning path nodes
CREATE POLICY "Users can update own learning path"
  ON learning_path
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
