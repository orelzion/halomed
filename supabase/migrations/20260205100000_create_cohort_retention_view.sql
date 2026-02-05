-- Create cohort_retention materialized view for tracking weekly retention by cohort
-- Task: BE-01

-- Drop if exists for clean recreation
DROP MATERIALIZED VIEW IF EXISTS analytics.cohort_retention;

CREATE MATERIALIZED VIEW analytics.cohort_retention AS
WITH cohorts AS (
  SELECT 
    id as user_id,
    DATE_TRUNC('month', created_at) as cohort_month
  FROM auth.users
),
weekly_activity AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', study_date) as activity_week
  FROM user_study_log
  WHERE is_completed = true
  GROUP BY user_id, DATE_TRUNC('week', study_date)
),
cohort_sizes AS (
  SELECT cohort_month, COUNT(*) as cohort_size
  FROM cohorts
  GROUP BY cohort_month
)
SELECT 
  c.cohort_month::text as cohort_month,
  EXTRACT(WEEK FROM age(a.activity_week, c.cohort_month))::integer as weeks_since_signup,
  COUNT(DISTINCT a.user_id) as active_users,
  cs.cohort_size,
  ROUND(COUNT(DISTINCT a.user_id)::numeric / cs.cohort_size * 100, 1) as retention_pct
FROM cohorts c
LEFT JOIN weekly_activity a ON c.user_id = a.user_id
  AND a.activity_week >= c.cohort_month
JOIN cohort_sizes cs ON c.cohort_month = cs.cohort_month
GROUP BY c.cohort_month, EXTRACT(WEEK FROM age(a.activity_week, c.cohort_month)), cs.cohort_size
ORDER BY c.cohort_month DESC, weeks_since_signup ASC;

-- Create index for faster queries
CREATE UNIQUE INDEX idx_cohort_retention_unique 
ON analytics.cohort_retention (cohort_month, weeks_since_signup);

CREATE INDEX idx_cohort_retention_cohort 
ON analytics.cohort_retention (cohort_month DESC);

COMMENT ON MATERIALIZED VIEW analytics.cohort_retention IS 
'Tracks retention rates by cohort (month) over weeks since signup. Updated via analytics.refresh_materialized_views()';
