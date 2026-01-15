-- Add start_date to tracks for scheduling
-- Allows tracks to start on a specific date (e.g. today)

ALTER TABLE tracks
  ADD COLUMN start_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Ensure existing rows have a start_date
UPDATE tracks
  SET start_date = CURRENT_DATE
  WHERE start_date IS NULL;
