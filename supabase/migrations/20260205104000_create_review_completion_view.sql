-- Create review_completion view to track actual review usage vs setting
-- Task: BE-06

DROP MATERIALIZED VIEW IF EXISTS analytics.review_completion;

CREATE MATERIALIZED VIEW analytics.review_completion AS
WITH review_settings AS (
  SELECT 
    user_id,
    review_intensity,
    pace,
    streak_count,
    current_position
  FROM user_preferences
),
scheduled_reviews AS (
  SELECT 
    usl.user_id,
    COUNT(*) as total_reviews_scheduled
  FROM user_study_log usl
  WHERE usl.node_type = 'review'
  GROUP BY usl.user_id
),
completed_reviews AS (
  SELECT 
    user_id,
    COUNT(*) as reviews_completed
  FROM user_study_log usl
  WHERE usl.node_type = 'review' AND usl.is_completed = true
  GROUP BY usl.user_id
),
review_by_intensity AS (
  SELECT 
    rs.review_intensity,
    COUNT(DISTINCT rs.user_id) as total_users,
    COALESCE(SUM(sr.total_reviews_scheduled), 0) as total_reviews_scheduled,
    COALESCE(SUM(cr.reviews_completed), 0) as total_reviews_completed,
    ROUND(
      COALESCE(SUM(cr.reviews_completed), 0)::numeric / 
      NULLIF(SUM(sr.total_reviews_scheduled), 0) * 100, 1
    ) as overall_completion_rate
  FROM review_settings rs
  LEFT JOIN scheduled_reviews sr ON rs.user_id = sr.user_id
  LEFT JOIN completed_reviews cr ON rs.user_id = cr.user_id
  GROUP BY rs.review_intensity
),
user_review_stats AS (
  SELECT 
    rs.user_id,
    rs.review_intensity,
    rs.pace,
    sr.total_reviews_scheduled,
    COALESCE(cr.reviews_completed, 0) as reviews_completed,
    ROUND(
      COALESCE(cr.reviews_completed, 0)::numeric / 
      NULLIF(sr.total_reviews_scheduled, 0) * 100, 1
    ) as completion_rate,
    CASE 
      WHEN sr.total_reviews_scheduled = 0 THEN 'no_reviews'
      WHEN COALESCE(cr.reviews_completed, 0) / sr.total_reviews_scheduled >= 0.8 THEN 'high_usage'
      WHEN COALESCE(cr.reviews_completed, 0) / sr.total_reviews_scheduled >= 0.5 THEN 'medium_usage'
      WHEN COALESCE(cr.reviews_completed, 0) / sr.total_reviews_scheduled > 0 THEN 'low_usage'
      ELSE 'no_completion'
    END as usage_category
  FROM review_settings rs
  LEFT JOIN scheduled_reviews sr ON rs.user_id = sr.user_id
  LEFT JOIN completed_reviews cr ON rs.user_id = cr.user_id
)
SELECT 
  review_intensity,
  total_users,
  total_reviews_scheduled,
  total_reviews_completed,
  overall_completion_rate
FROM review_by_intensity
ORDER BY 
  CASE review_intensity
    WHEN 'none' THEN 1
    WHEN 'light' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'intensive' THEN 4
  END;

-- Create index for faster queries
CREATE INDEX idx_review_completion_intensity 
ON analytics.review_completion (review_intensity);

COMMENT ON MATERIALIZED VIEW analytics.review_completion IS 
'Tracks actual review completion rates by review intensity setting. Updated via analytics.refresh_materialized_views()';
