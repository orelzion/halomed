-- Enable Row Level Security (RLS) for quiz_questions table
-- Read-only for all authenticated users (shared quiz questions)
-- Reference: TDD Section 11, backend.md Section 4

-- Enable RLS on quiz_questions table
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read quiz questions (read-only)
CREATE POLICY "Authenticated users can read quiz questions"
  ON quiz_questions
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: No INSERT/UPDATE/DELETE policies - quiz questions are generated server-side only
-- Only service role or Edge Functions should be able to insert/update quiz questions
