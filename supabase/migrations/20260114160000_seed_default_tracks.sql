-- Seed default learning tracks
-- Adds a default Mishna track starting immediately (no start_date column in schema)

INSERT INTO tracks (id, title, source_endpoint, schedule_type, start_date)
VALUES (
  gen_random_uuid(),
  'משנה יומית',
  'https://www.sefaria.org/api/',
  'DAILY_WEEKDAYS_ONLY',
  CURRENT_DATE
);
