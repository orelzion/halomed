-- Add 'seder_per_year' pace option to enum
-- This must be in a separate migration from using the value

ALTER TYPE pace_type ADD VALUE IF NOT EXISTS 'seder_per_year';
