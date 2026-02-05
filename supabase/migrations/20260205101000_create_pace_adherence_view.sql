-- Create pace_adherence view to track user progress vs expected
-- Task: BE-02

DROP MATERIALIZED VIEW IF EXISTS analytics.pace_adherence;

CREATE MATERIALIZED VIEW analytics.pace_adherence AS
WITH user_progress AS (
  SELECT 
    up.id,
    up.user_id,
    up.pace,
    up.start_date,
    up.current_position,
    up.streak_count,
    -- Calculate business days since start date
    (
      SELECT COUNT(*)::integer 
      FROM generate_series(up.start_date, CURRENT_DATE, '1 day'::interval) d
      WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)  -- Exclude Saturday (0) and Sunday (6)
        AND d <= CURRENT_DATE
    ) as business_days_elapsed,
    -- Expected position based on pace and business days
    CASE up.pace
      WHEN 'TWO_MISHNAYOT' THEN 
        (
          SELECT COUNT(*)::integer 
          FROM generate_series(up.start_date, CURRENT_DATE, '1 day'::interval) d
          WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
            AND d <= CURRENT_DATE
        ) * 2
      WHEN 'ONE_CHAPTER' THEN 
        FLOOR(
          (
            SELECT COUNT(*)::numeric 
            FROM generate_series(up.start_date, CURRENT_DATE, '1 day'::interval) d
            WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
              AND d <= CURRENT_DATE
          ) / 3
        )  -- ~1 chapter per 3 business days
      WHEN 'SEDER_PER_YEAR' THEN 
        FLOOR(
          (
            SELECT COUNT(*)::numeric 
            FROM generate_series(up.start_date, CURRENT_DATE, '1 day'::interval) d
            WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
              AND d <= CURRENT_DATE
          ) / 52
        )  -- ~1 seders per year
      ELSE up.current_position
    END as expected_position
  FROM user_preferences up
)
SELECT
  user_id,
  pace,
  current_position,
  expected_position,
  COALESCE(expected_position - current_position, 0) as days_behind,
  CASE 
    WHEN current_position >= COALESCE(expected_position, 0) THEN 'on_pace'
    WHEN COALESCE(expected_position - current_position, 0) <= 7 THEN 'behind_1_7'
    ELSE 'behind_7_plus'
  END as pace_status,
  streak_count,
  start_date,
  business_days_elapsed
FROM user_progress;

CREATE INDEX idx_pace_adherence_status 
ON analytics.pace_adherence (pace_status);

CREATE INDEX idx_pace_adherence_user 
ON analytics.pace_adherence (user_id);

COMMENT ON MATERIALIZED VIEW analytics.pace_adherence IS 
'Tracks whether users are keeping pace with their chosen learning speed. Updated via analytics.refresh_materialized_views()';
