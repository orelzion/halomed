-- Create learning_path table
-- The generated learning path for each user with nodes (learning, review, quiz)
-- Reference: Plan Section "Data Model Changes", backend.md Section "Database Schema"

-- Create enum for node_type
CREATE TYPE node_type AS ENUM ('learning', 'review', 'quiz');

-- Create learning_path table
CREATE TABLE learning_path (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  node_index INTEGER NOT NULL,
  node_type node_type NOT NULL,
  content_ref TEXT,
  tractate TEXT,
  chapter INTEGER,
  is_divider BOOLEAN DEFAULT FALSE NOT NULL,
  unlock_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  review_of_node_id UUID REFERENCES learning_path(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE learning_path IS 'The generated learning path for each user with nodes (learning, review, quiz)';
COMMENT ON COLUMN learning_path.node_index IS 'Order of this node in the path (0-based or 1-based)';
COMMENT ON COLUMN learning_path.node_type IS 'Type of node: learning (new content), review (spaced repetition), or quiz (optional test)';
COMMENT ON COLUMN learning_path.content_ref IS 'Content reference (e.g., Mishnah_Berakhot.1.1) - null for dividers';
COMMENT ON COLUMN learning_path.is_divider IS 'True if this node is a tractate/chapter divider (visual marker)';
COMMENT ON COLUMN learning_path.unlock_date IS 'Date when this node becomes available (weekday-only logic applies)';
COMMENT ON COLUMN learning_path.completed_at IS 'Timestamp when user completed this node (null if not done)';
COMMENT ON COLUMN learning_path.review_of_node_id IS 'For review nodes: references the original learning node being reviewed';

-- Create indexes for common query patterns
CREATE INDEX idx_learning_path_user_id ON learning_path(user_id);
CREATE INDEX idx_learning_path_unlock_date ON learning_path(unlock_date);
CREATE INDEX idx_learning_path_node_index ON learning_path(user_id, node_index);
CREATE INDEX idx_learning_path_user_unlock ON learning_path(user_id, unlock_date);
CREATE INDEX idx_learning_path_review_of ON learning_path(review_of_node_id) WHERE review_of_node_id IS NOT NULL;

-- Create unique constraint to prevent duplicate nodes for same user at same index
CREATE UNIQUE INDEX idx_learning_path_user_node_unique ON learning_path(user_id, node_index);
