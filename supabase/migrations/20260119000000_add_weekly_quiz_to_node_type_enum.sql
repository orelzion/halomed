-- Add 'weekly_quiz' to node_type enum
-- Weekly quizzes are scheduled on Fridays and cover all content learned that week

ALTER TYPE node_type ADD VALUE 'weekly_quiz';

-- Update comment to reflect new node type
COMMENT ON COLUMN learning_path.node_type IS 'Type of node: learning (new content), review (spaced repetition), quiz (individual quiz), or weekly_quiz (Friday weekly quiz covering week content)';
