-- SQLite schema for user_study_log table
-- Matches PostgreSQL schema from TDD Section 4.3
-- Reference: sync.md Section 4, TDD Section 8

-- Data type mappings:
-- PostgreSQL UUID → SQLite TEXT
-- PostgreSQL DATE → SQLite TEXT
-- PostgreSQL BOOLEAN → SQLite INTEGER (0 = false, 1 = true)
-- PostgreSQL TIMESTAMPTZ → SQLite TEXT (ISO 8601 format)

CREATE TABLE user_study_log (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  study_date TEXT NOT NULL,
  content_id TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  UNIQUE(user_id, study_date, track_id)
);

-- Indexes for common query patterns
-- Reference: sync.md Section 4, TDD Section 8.4 (streak calculation)
CREATE INDEX idx_study_log_user_date ON user_study_log(user_id, study_date);
CREATE INDEX idx_study_log_track ON user_study_log(track_id);
