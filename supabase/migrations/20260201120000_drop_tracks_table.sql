-- Migration: Drop deprecated tracks table
-- This table is no longer used after migration to position-based model
-- All functionality moved to user_preferences + path-generator.ts

BEGIN;

-- Drop the tracks table
DROP TABLE IF EXISTS public.tracks CASCADE;

-- Drop related materialized view
DROP MATERIALIZED VIEW IF EXISTS analytics.popular_tracks CASCADE;

-- Drop related function
DROP FUNCTION IF EXISTS analytics.get_popular_tracks CASCADE;

-- Update analytics to no longer reference tracks
COMMENT ON SCHEMA analytics IS 'Analytics schema for position-based model. Tracks table removed in migration.';

COMMIT;