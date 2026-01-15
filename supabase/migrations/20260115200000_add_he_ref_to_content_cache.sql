-- Add he_ref column to content_cache table
-- Stores Hebrew reference from Sefaria API (heRef field)
-- Reference: User request to use Sefaria's heRef for displaying Hebrew titles

ALTER TABLE content_cache
ADD COLUMN he_ref TEXT;

COMMENT ON COLUMN content_cache.he_ref IS 'Hebrew reference from Sefaria API (heRef field) - used for displaying Hebrew titles in schedule';

-- Create index for faster lookups
CREATE INDEX idx_content_cache_he_ref ON content_cache(he_ref) WHERE he_ref IS NOT NULL;
