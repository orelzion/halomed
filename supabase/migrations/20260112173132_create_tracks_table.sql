-- Create tracks table
-- Defines learning tracks with their scheduling rules
-- Reference: TDD Section 4.1, backend.md Section 3

CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_endpoint TEXT DEFAULT 'https://www.sefaria.org/api/',
  schedule_type TEXT NOT NULL
  -- MVP: 'DAILY_WEEKDAYS_ONLY'
);

-- Add comment for documentation
COMMENT ON TABLE tracks IS 'Defines learning tracks with their scheduling rules';
COMMENT ON COLUMN tracks.schedule_type IS 'Schedule type: DAILY_WEEKDAYS_ONLY for MVP';
