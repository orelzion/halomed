-- SQLite schema for tracks table
-- Matches PostgreSQL schema from TDD Section 4.1
-- Reference: sync.md Section 4, TDD Section 8

-- Data type mappings:
-- PostgreSQL UUID → SQLite TEXT
-- PostgreSQL TEXT → SQLite TEXT

CREATE TABLE tracks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  source_endpoint TEXT,
  schedule_type TEXT NOT NULL,
  start_date TEXT NOT NULL
);
