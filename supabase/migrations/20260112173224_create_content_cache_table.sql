-- Create content_cache table
-- Deduplicated content shared across all users
-- Reference: TDD Section 4.2, backend.md Section 3

CREATE TABLE content_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL,
  source_text_he TEXT NOT NULL,
  ai_explanation_he TEXT NOT NULL,
  ai_deep_dive_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE content_cache IS 'Deduplicated content shared across all users';
COMMENT ON COLUMN content_cache.ref_id IS 'Unique identifier for this specific content item';
COMMENT ON COLUMN content_cache.source_text_he IS 'Source text (Mishnah) - displayed bold and visually dominant';
COMMENT ON COLUMN content_cache.ai_explanation_he IS 'Clear Explanation - one coherent interpretation based on classical commentaries';
COMMENT ON COLUMN content_cache.ai_deep_dive_json IS 'Summary of Commentaries - expandable section presenting multiple interpretive approaches';

-- Create index on ref_id for faster lookups (UNIQUE constraint already creates an index, but explicit is clearer)
CREATE INDEX idx_content_cache_ref_id ON content_cache(ref_id);
