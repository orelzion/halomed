-- SQLite schema for learning_path table
-- Matches PostgreSQL schema from Plan Section "Data Model Changes"
-- Reference: sync.md Section 4, TDD Section 8

-- Data type mappings:
-- PostgreSQL UUID → SQLite TEXT
-- PostgreSQL INTEGER → SQLite INTEGER
-- PostgreSQL ENUM → SQLite TEXT
-- PostgreSQL TEXT → SQLite TEXT
-- PostgreSQL BOOLEAN → SQLite INTEGER (0 = false, 1 = true)
-- PostgreSQL DATE → SQLite TEXT
-- PostgreSQL TIMESTAMPTZ → SQLite TEXT (ISO 8601 format)

CREATE TABLE learning_path (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  node_index INTEGER NOT NULL,
  node_type TEXT NOT NULL, -- 'learning', 'review', 'quiz'
  content_ref TEXT,
  tractate TEXT,
  chapter INTEGER,
  is_divider INTEGER NOT NULL DEFAULT 0,
  unlock_date TEXT NOT NULL,
  completed_at TEXT,
  review_of_node_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, node_index)
);

-- Indexes for common query patterns
CREATE INDEX idx_learning_path_user_id ON learning_path(user_id);
CREATE INDEX idx_learning_path_unlock_date ON learning_path(unlock_date);
CREATE INDEX idx_learning_path_node_index ON learning_path(user_id, node_index);
CREATE INDEX idx_learning_path_user_unlock ON learning_path(user_id, unlock_date);
CREATE INDEX idx_learning_path_review_of ON learning_path(review_of_node_id) WHERE review_of_node_id IS NOT NULL;
