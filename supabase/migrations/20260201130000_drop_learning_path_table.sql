-- Migration: Drop learning_path table (Final cleanup)
-- This table has been fully migrated to position-based model
-- All functionality moved to user_preferences + path-generator.ts

BEGIN;

-- Drop learning_path table
DROP TABLE IF EXISTS public.learning_path CASCADE;

-- Update schema comment to reflect removal
COMMENT ON SCHEMA public IS 
  'Database schema for position-based learning model. 
  Learning path now generated dynamically by path-generator.ts 
  using user_preferences.current_content_index and completion date arrays.
  Learning path table removed after successful migration.';

COMMIT;