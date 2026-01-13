-- Change ai_deep_dive_json from JSONB to TEXT (Markdown)
-- Reference: content-generation.md - deep dive is now Markdown text

ALTER TABLE content_cache 
  DROP COLUMN ai_deep_dive_json,
  ADD COLUMN ai_deep_dive_he TEXT;

COMMENT ON COLUMN content_cache.ai_deep_dive_he IS 'Summary of Commentaries - Markdown text presenting multiple interpretive approaches';
