-- Migration: Remove learning_path from RxDB schemas and sync
-- This collection is no longer needed after position-based migration

BEGIN;

-- Remove learning_path from RxDB schema
DELETE FROM rxdb_collections WHERE name = 'learning_path';

-- Update RxDB database schemas to remove learning_path collection reference
UPDATE rxdb_schemas SET 
  jsonb_schema = jsonb_schema::text[] - 'learning_path'
WHERE jsonb_schema::text[] ? 'learning_path';

COMMIT;