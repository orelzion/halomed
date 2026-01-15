-- SQLite schema for content_cache table
-- Matches PostgreSQL schema from TDD Section 4.2
-- Reference: sync.md Section 4, TDD Section 8

-- Data type mappings:
-- PostgreSQL UUID → SQLite TEXT
-- PostgreSQL TEXT → SQLite TEXT
-- PostgreSQL JSONB → SQLite TEXT (stored as JSON string)
-- PostgreSQL TIMESTAMPTZ → SQLite TEXT (ISO 8601 format)

CREATE TABLE content_cache (
  id TEXT PRIMARY KEY NOT NULL,
  ref_id TEXT UNIQUE NOT NULL,
  source_text_he TEXT NOT NULL,
  ai_explanation_json TEXT NOT NULL,
  he_ref TEXT,
  created_at TEXT
);
