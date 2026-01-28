-- Create analytics schema
-- This schema contains admin-only aggregated metrics and views
-- Kept separate from public schema for security and organization
-- Reference: Phase 1 Analytics Foundation, ANLYT-13

CREATE SCHEMA IF NOT EXISTS analytics;

-- Add comment for documentation
COMMENT ON SCHEMA analytics IS 'Admin-only analytics schema for aggregated metrics and views. Not included in realtime publication.';
