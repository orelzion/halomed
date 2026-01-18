-- SQLite schema for user_preferences table
-- Matches PostgreSQL schema from Plan Section "Data Model Changes"
-- Reference: sync.md Section 4, TDD Section 8

-- Data type mappings:
-- PostgreSQL UUID → SQLite TEXT
-- PostgreSQL ENUM → SQLite TEXT
-- PostgreSQL INTEGER → SQLite INTEGER
-- PostgreSQL DATE → SQLite TEXT
-- PostgreSQL TIMESTAMPTZ → SQLite TEXT (ISO 8601 format)

CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  pace TEXT NOT NULL, -- 'one_mishna', 'two_mishna', 'one_chapter'
  review_intensity TEXT NOT NULL, -- 'none', 'light', 'medium', 'intensive'
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_study_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Index on user_id for faster lookups
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
