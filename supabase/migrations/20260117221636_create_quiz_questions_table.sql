-- Create quiz_questions table
-- Generated quiz questions for testing user retention
-- Reference: Plan Section "Data Model Changes", backend.md Section "Database Schema"

-- Create quiz_questions table
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_ref TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE quiz_questions IS 'Generated quiz questions for testing user retention';
COMMENT ON COLUMN quiz_questions.content_ref IS 'Content reference this quiz question is about (e.g., Mishnah_Berakhot.1.1)';
COMMENT ON COLUMN quiz_questions.question_text IS 'The quiz question text';
COMMENT ON COLUMN quiz_questions.options IS 'JSONB array of answer options (typically 4 options)';
COMMENT ON COLUMN quiz_questions.correct_answer IS 'Index of the correct answer in the options array (0-based)';
COMMENT ON COLUMN quiz_questions.explanation IS 'Explanation shown after user answers';

-- Create index on content_ref for faster lookups
CREATE INDEX idx_quiz_questions_content_ref ON quiz_questions(content_ref);

-- Add constraint to ensure correct_answer is valid (0-3 for 4 options)
-- Note: This is a basic check; actual validation should be in application logic
ALTER TABLE quiz_questions
  ADD CONSTRAINT check_correct_answer_range CHECK (correct_answer >= 0 AND correct_answer < 10);
