-- Migration: Clean up deprecated tracks-related functions
-- Remove functions that referenced the deleted tracks table

BEGIN;

-- Drop schedule generation function that used tracks table
DROP FUNCTION IF EXISTS public.generate_schedule CASCADE;

-- Update generate-path route to note no longer uses tracks
COMMENT ON FUNCTION public.generate-path IS 
  'Position-based path generation - no longer uses tracks table';

COMMIT;