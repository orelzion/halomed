-- Seed default learning tracks
-- Adds a default Mishna track

INSERT INTO tracks (id, title, source_endpoint, schedule_type)
VALUES (
  gen_random_uuid(),
  'משנה יומית',
  'https://www.sefaria.org/api/',
  'DAILY_WEEKDAYS_ONLY'
);
