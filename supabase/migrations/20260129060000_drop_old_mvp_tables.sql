-- Drop old MVP tables that are no longer used
-- OLD model: tracks + user_study_log
-- NEW model: user_preferences + learning_path
--
-- These tables were replaced during the transition from MVP (single-track learning)
-- to the current implementation (multi-pace personalized learning paths with spaced repetition).
--
-- Migration History:
-- - 20260117221632: Created user_preferences table
-- - 20260117221634: Created learning_path table
-- - 20260117221638: Migrated existing users from old to new model
--
-- Current State:
-- - tracks: 0 rows (unused)
-- - user_study_log: 0 rows (unused)
-- - No application code references these tables

-- =============================================================================
-- Drop Old Tables
-- =============================================================================

-- Drop user_study_log first (has foreign keys to tracks and content_cache)
DROP TABLE IF EXISTS public.user_study_log CASCADE;

-- Drop tracks table (no longer needed)
DROP TABLE IF EXISTS public.tracks CASCADE;

-- Note: content_cache is kept as it's still used by the current implementation
-- to store Mishnah source texts and AI explanations referenced by learning_path nodes
