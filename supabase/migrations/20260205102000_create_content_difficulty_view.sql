-- Create content_difficulty view to track quiz performance by content
-- Task: BE-03

DROP MATERIALIZED VIEW IF EXISTS analytics.content_difficulty;

CREATE MATERIALIZED VIEW analytics.content_difficulty AS
WITH quiz_results AS (
  SELECT 
    usl.id,
    usl.user_id,
    usl.content_id,
    usl.study_date,
    usl.completed_at,
    usl.node_type,
    usl.quiz_score,
    usl.is_completed,
    cc.ref_id,
    SPLIT_PART(cc.ref_id, ' ', 1) as tractate,
    -- Try to extract chapter from ref_id (format: "Tractate Chapter:Mishnah")
    SUBSTRING(cc.ref_id FROM ' ([0-9]+):') as chapter
  FROM user_study_log usl
  LEFT JOIN content_cache cc ON usl.content_id = cc.id
  WHERE usl.node_type = 'quiz' 
    AND usl.quiz_score IS NOT NULL
    AND usl.is_completed = true
),
tractate_stats AS (
  SELECT 
    tractate,
    ROUND(AVG(quiz_score)::numeric, 1) as avg_score,
    COUNT(*) as attempt_count,
    SUM(CASE WHEN quiz_score >= 70 THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100 as pass_rate,
    MIN(quiz_score) as min_score,
    MAX(quiz_score) as max_score
  FROM quiz_results
  GROUP BY tractate
),
mishnah_stats AS (
  SELECT 
    ref_id,
    tractate,
    chapter,
    ROUND(AVG(quiz_score)::numeric, 1) as avg_score,
    COUNT(*) as attempt_count,
    SUM(CASE WHEN quiz_score >= 70 THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100 as pass_rate
  FROM quiz_results
  GROUP BY ref_id, tractate, chapter
),
difficulty_ranking AS (
  SELECT 
    tractate,
    avg_score,
    pass_rate,
    NTILE(5) OVER (ORDER BY avg_score ASC) as difficulty_tier
  FROM tractate_stats
)
SELECT 
  m.ref_id,
  m.tractate,
  m.chapter,
  m.avg_score,
  m.attempt_count,
  m.pass_rate,
  t.difficulty_tier,
  CASE t.difficulty_tier
    WHEN 1 THEN 'Very Easy'
    WHEN 2 THEN 'Easy'
    WHEN 3 THEN 'Medium'
    WHEN 4 THEN 'Hard'
    WHEN 5 THEN 'Very Hard'
  END as difficulty_label,
  t.avg_score as tractate_avg_score
FROM mishnah_stats m
JOIN tractate_stats t ON m.tractate = t.tractate
ORDER BY m.pass_rate ASC, m.avg_score ASC;

CREATE INDEX idx_content_difficulty_ref 
ON analytics.content_difficulty (ref_id);

CREATE INDEX idx_content_difficulty_tractate 
ON analytics.content_difficulty (tractate);

CREATE INDEX idx_content_difficulty_difficulty 
ON analytics.content_difficulty (difficulty_tier);

COMMENT ON MATERIALIZED VIEW analytics.content_difficulty IS 
'Tracks quiz performance and difficulty by tractate and individual mishnah. Updated via analytics.refresh_materialized_views()';
