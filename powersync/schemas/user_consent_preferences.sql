-- SQLite schema for user_consent_preferences table
-- Matches PostgreSQL schema from migration 20260120132512_create_user_consent_preferences.sql
-- Reference: sync.md Section 4, TDD Section 8

-- Data type mappings:
-- PostgreSQL UUID → SQLite TEXT
-- PostgreSQL BOOLEAN → SQLite INTEGER (0 = false, 1 = true)
-- PostgreSQL TEXT → SQLite TEXT
-- PostgreSQL TIMESTAMPTZ → SQLite TEXT (ISO 8601 format)

CREATE TABLE IF NOT EXISTS user_consent_preferences (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL UNIQUE,
    analytics_consent INTEGER NOT NULL DEFAULT 0,
    marketing_consent INTEGER NOT NULL DEFAULT 0,
    functional_consent INTEGER NOT NULL DEFAULT 0,
    consent_timestamp TEXT NOT NULL,
    consent_version TEXT NOT NULL DEFAULT '1.0',
    ip_country TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_consent_preferences_user_id ON user_consent_preferences(user_id);
