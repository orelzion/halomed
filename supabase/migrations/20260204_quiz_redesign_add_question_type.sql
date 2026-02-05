-- Migration: Quiz Schema Update
-- Adds question_type column and updates answer index constraints
-- Rename correct_answer to correct_answer_index

-- 1. Truncate existing quiz questions (clean slate for new schema)
TRUNCATE TABLE quiz_questions CASCADE;

-- 2. Rename column: correct_answer -> correct_answer_index
ALTER TABLE quiz_questions
RENAME COLUMN correct_answer TO correct_answer_index;

-- 3. Drop existing answer range constraint (will recreate with updated range)
ALTER TABLE quiz_questions
DROP CONSTRAINT IF EXISTS check_correct_answer_range;

-- 4. Add new column: question_type with CHECK constraint
ALTER TABLE quiz_questions
ADD COLUMN question_type TEXT NOT NULL DEFAULT 'halacha';

ALTER TABLE quiz_questions
ADD CONSTRAINT check_question_type
CHECK (question_type IN ('halacha', 'sevara'));

-- 5. Add new answer index constraint (0-3 range)
ALTER TABLE quiz_questions
ADD CONSTRAINT check_correct_answer_index_range
CHECK (correct_answer_index >= 0 AND correct_answer_index < 4);

-- 6. Update table comment to reflect new schema
COMMENT ON TABLE quiz_questions IS '
Quiz questions with enhanced schema for question categorization.

Schema:
- id: UUID primary key
- content_ref: Reference to source content
- question_index: Order of question within content
- question_type: Type of question (''halacha'' or ''sevara'')
- question_text: The question text
- options: JSONB array of 4 answer options
- correct_answer_index: Index of correct answer (0-3)
- explanation: Explanation for the correct answer
- created_at: Creation timestamp
- updated_at: Last update timestamp
- _deleted: Soft delete flag
';

-- 7. Update column comments
COMMENT ON COLUMN quiz_questions.question_type IS 'Type of question: ''halacha'' (halachic ruling) or ''sevara'' (logical reasoning)';
COMMENT ON COLUMN quiz_questions.correct_answer_index IS 'Index of the correct answer option (0-3)';
