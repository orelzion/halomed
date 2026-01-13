-- Migrate content_cache to use Gemini structured JSON output
-- Replace TEXT columns with JSONB column (Option B)
-- Reference: Gemini API migration plan

ALTER TABLE content_cache 
  DROP COLUMN ai_explanation_he,
  DROP COLUMN ai_deep_dive_he,
  ADD COLUMN ai_explanation_json JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN content_cache.ai_explanation_json IS 
  'Structured JSON output from Gemini API with summary, halakha, opinions array, and expansions array';

-- Add index for JSONB queries (optional but recommended for performance)
CREATE INDEX idx_content_cache_explanation_json ON content_cache USING GIN (ai_explanation_json);
