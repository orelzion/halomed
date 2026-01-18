-- SQLite schema for quiz_questions table
-- Matches PostgreSQL schema from Plan Section "Data Model Changes"
-- Reference: sync.md Section 4, TDD Section 8

-- Data type mappings:
-- PostgreSQL UUID → SQLite TEXT
-- PostgreSQL TEXT → SQLite TEXT
-- PostgreSQL JSONB → SQLite TEXT (stored as JSON string)
-- PostgreSQL INTEGER → SQLite INTEGER
-- PostgreSQL TIMESTAMPTZ → SQLite TEXT (ISO 8601 format)

CREATE TABLE quiz_questions (
  id TEXT PRIMARY KEY NOT NULL,
  content_ref TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT NOT NULL, -- JSONB stored as JSON string
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  created_at TEXT NOT NULL
);

-- Index on content_ref for faster lookups
CREATE INDEX idx_quiz_questions_content_ref ON quiz_questions(content_ref);
