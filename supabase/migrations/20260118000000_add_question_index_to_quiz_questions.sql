-- Add question_index column to quiz_questions table
-- Allows multiple questions per content_ref (1-8 questions per Mishna)
-- Reference: User request for multi-question quizzes

-- Add question_index column (nullable initially)
ALTER TABLE quiz_questions
  ADD COLUMN question_index INTEGER;

-- Handle existing data: assign unique question_index values per content_ref
-- For each content_ref, assign sequential indices starting from 0
WITH numbered_questions AS (
  SELECT 
    id,
    content_ref,
    ROW_NUMBER() OVER (PARTITION BY content_ref ORDER BY created_at, id) - 1 AS new_question_index
  FROM quiz_questions
)
UPDATE quiz_questions q
SET question_index = n.new_question_index
FROM numbered_questions n
WHERE q.id = n.id;

-- Make question_index NOT NULL
ALTER TABLE quiz_questions
  ALTER COLUMN question_index SET NOT NULL;

-- Add unique constraint on (content_ref, question_index) to prevent duplicates
CREATE UNIQUE INDEX idx_quiz_questions_content_ref_question_index 
  ON quiz_questions(content_ref, question_index);

-- Update comment
COMMENT ON COLUMN quiz_questions.question_index IS 'Index of this question within the quiz for this content_ref (0-based, up to 7 for max 8 questions)';
