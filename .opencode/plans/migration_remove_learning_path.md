# Migration Plan: Remove learning_path Table and Move to user_preferences

## Overview

This migration removes the `learning_path` table completely and moves quiz/review track preferences to `user_preferences`, following the existing position-based model pattern.

## Current State Analysis

### What We're Removing
- **`learning_path` table**: 221,142 rows across all users
- **Pre-computed path model**: Static nodes for learning, review, and quiz
- **Replication**: Already disabled in `/web/lib/sync/replication.ts`

### What We're Keeping/Enhancing
- **`user_preferences.current_content_index`**: Position-based learning progress
- **`user_preferences.review_intensity`**: Review scheduling preferences  
- **Analytics**: Need to rewrite queries to use position-based calculations

## Migration Strategy

### Phase 1: Add Quiz/Review Tracking to user_preferences

#### 1.1 Add Quiz Progress Tracking
```sql
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS quiz_progress JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_quiz_date DATE,
ADD COLUMN IF NOT EXISTS quiz_streak INTEGER DEFAULT 0;

COMMENT ON COLUMN user_preferences.quiz_progress IS 
  'JSONB tracking quiz completion: {"total_completed": 15, "last_completed": "2026-01-30", "current_week_completed": true}';
COMMENT ON COLUMN user_preferences.last_quiz_date IS 
  'Date of the most recently completed quiz';
COMMENT ON COLUMN user_preferences.quiz_streak IS 
  'Consecutive weeks with completed quiz';
```

#### 1.2 Add Review Progress Tracking
```sql
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS review_progress JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_review_date DATE,
ADD COLUMN IF NOT EXISTS review_sessions_completed INTEGER DEFAULT 0;

COMMENT ON COLUMN user_preferences.review_progress IS 
  'JSONB tracking review sessions: {"total_sessions": 23, "items_reviewed": 45, "average_score": 0.85}';
COMMENT ON COLUMN user_preferences.last_review_date IS 
  'Date of the most recently completed review session';
COMMENT ON COLUMN user_preferences.review_sessions_completed IS 
  'Total number of review sessions completed';
```

### Phase 2: Backfill Data from learning_path

#### 2.1 Backfill Quiz Data
```sql
-- Aggregate quiz completion data from learning_path
UPDATE user_preferences up
SET 
  quiz_progress = jsonb_build_object(
    'total_completed', quiz_counts.completed_count,
    'last_completed', quiz_counts.last_completed_date,
    'current_week_completed', CASE 
      WHEN EXISTS (
        SELECT 1 FROM learning_path lp2 
        WHERE lp2.user_id = up.user_id 
          AND lp2.node_type = 'weekly_quiz'
          AND lp2.unlock_date >= date_trunc('week', CURRENT_DATE)
          AND lp2.completed_at IS NOT NULL
      ) THEN true ELSE false END
  ),
  last_quiz_date = quiz_counts.last_completed_date::date,
  quiz_streak = calculate_quiz_streak(up.user_id)
FROM (
  SELECT 
    user_id,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_count,
    MAX(completed_at)::date as last_completed_date
  FROM learning_path 
  WHERE node_type = 'weekly_quiz'
  GROUP BY user_id
) quiz_counts
WHERE up.user_id = quiz_counts.user_id;
```

#### 2.2 Backfill Review Data  
```sql
-- Aggregate review session data from learning_path
UPDATE user_preferences up
SET
  review_progress = jsonb_build_object(
    'total_sessions', review_counts.session_count,
    'items_reviewed', review_counts.total_items,
    'average_score', COALESCE(review_counts.avg_score, 0.0)
  ),
  last_review_date = review_counts.last_completed_date::date,
  review_sessions_completed = review_counts.session_count
FROM (
  SELECT 
    user_id,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as session_count,
    COALESCE(SUM(review_count), 0) as total_items,
    AVG(CASE WHEN review_count > 0 THEN review_count::float END) as avg_score,
    MAX(completed_at)::date as last_completed_date
  FROM learning_path 
  WHERE node_type = 'review' OR node_type = 'review_session'
  GROUP BY user_id
) review_counts
WHERE up.user_id = review_counts.user_id;
```

### Phase 3: Update Analytics Views

#### 3.1 Rewrite Analytics Queries
Replace all `learning_path` queries with position-based calculations:

```sql
-- Old: Count completed quiz nodes from learning_path
SELECT COUNT(*) FILTER (WHERE completed_at IS NOT NULL)
FROM learning_path 
WHERE node_type = 'weekly_quiz' AND unlock_date >= CURRENT_DATE - 30;

-- New: Use user_preferences quiz tracking
SELECT COUNT(*) 
FROM user_preferences 
WHERE last_quiz_date >= CURRENT_DATE - 30;
```

#### 3.2 Update Materialized Views
```sql
-- Updated summary_stats view
CREATE OR REPLACE MATERIALIZED VIEW analytics.summary_stats AS
SELECT
  -- User counts (unchanged)
  (SELECT COUNT(*) FROM user_preferences) as total_users,
  (SELECT COUNT(*) FROM user_preferences
   WHERE last_study_date >= CURRENT_DATE - 7) as active_users_7d,
  (SELECT COUNT(*) FROM user_preferences
   WHERE last_study_date >= CURRENT_DATE - 30) as active_users_30d,

  -- Learning completion rate (position-based)
  (SELECT ROUND(
    AVG(CASE 
      WHEN current_content_index > 0 THEN 
        current_content_index::NUMERIC / GREATEST(current_content_index + expected_remaining, 1) * 100
      ELSE 0
    END), 2)
   FROM user_preferences
   WHERE last_study_date >= CURRENT_DATE - 30) as completion_rate_30d,

  -- Quiz completion rate (new)
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE last_quiz_date >= CURRENT_DATE - 30)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2)
   FROM user_preferences
   WHERE last_study_date >= CURRENT_DATE - 30) as quiz_completion_rate_30d,

  -- Review completion rate (new)  
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE last_review_date >= CURRENT_DATE - 30)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2)
   FROM user_preferences
   WHERE last_study_date >= CURRENT_DATE - 30) as review_completion_rate_30d,

  NOW() as refreshed_at;
```

### Phase 4: Update Edge Functions

#### 4.1 Functions to Remove/Update
- **`generate-path`**: Remove learning_path dependencies, use position-based generation
- **`schedule-review`**: Update to use user_preferences.review_progress
- **`export-user-data`**: Remove learning_path export, include new quiz/review fields
- **`delete-account`**: Remove learning_path cleanup (no longer needed)
- **`update-preferences`**: No changes needed

#### 4.2 Position-Based Path Generation
Update `generate-path` to compute path dynamically:
```typescript
// Instead of querying learning_path table
const currentProgress = userPrefs.current_content_index;
const reviewIntensity = userPrefs.review_intensity;
const lastQuizDate = userPrefs.last_quiz_date;

// Generate today's content on-demand
const todayContent = generateContentForDate({
  currentPosition: currentProgress,
  pace: userPrefs.pace,
  includeReview: shouldIncludeReview(lastReviewDate, reviewIntensity),
  includeQuiz: shouldIncludeQuiz(lastQuizDate)
});
```

### Phase 5: Frontend Cleanup

#### 5.1 Remove RxDB Collection
- Remove `learningPathSchema` from `/web/lib/database/schemas.ts`
- Remove collection initialization from `/web/lib/database/database.ts`
- Remove from `DatabaseCollections` interface

#### 5.2 Update Component Logic
- **QuizScreen.tsx**: Update completion tracking to use user_preferences
- **ReviewScreen.tsx**: Update completion tracking to use user_preferences  
- **PathScreen.tsx**: Remove learning_path count check
- **Study Path Page**: Remove backwards compatibility code

#### 5.3 Update Hooks
- **usePath.ts**: Rewrite to compute path position-based
- Remove all `db.learning_path` queries

### Phase 6: Database Cleanup

#### 6.1 Drop Table and Dependencies
```sql
-- Drop foreign key constraints
ALTER TABLE learning_path DROP CONSTRAINT IF EXISTS learning_path_review_of_node_id_fkey;

-- Drop indexes
DROP INDEX IF EXISTS idx_learning_path_user_id;
DROP INDEX IF EXISTS idx_learning_path_user_unlock;
DROP INDEX IF EXISTS idx_learning_path_user_node_unique;
DROP INDEX IF EXISTS idx_learning_path_review_of;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view own learning path" ON learning_path;
DROP POLICY IF EXISTS "Users can insert own learning path" ON learning_path;
DROP POLICY IF EXISTS "Users can update own learning path" ON learning_path;

-- Drop the table
DROP TABLE IF EXISTS learning_path CASCADE;

-- Drop migrations (optional - keeps migration history clean)
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN ('20260117221634', '20260117221635');
```

#### 6.2 Clean Up Migration History
```sql
-- Mark learning_path migrations as deprecated
COMMENT ON MIGRATION 20260117221634 IS 'DEPRECATED: learning_path table removed in migration 20260131_remove_learning_path.sql';
COMMENT ON MIGRATION 20260117221635 IS 'DEPRECATED: learning_path RLS policies removed';
```

## Implementation Order

### Critical Path (Execute in Order)
1. **Phase 1**: Add new columns to user_preferences (safe, additive)
2. **Phase 2**: Backfill data from learning_path (data preservation)
3. **Phase 3**: Update analytics views (query rewriting)
4. **Phase 4**: Update Edge Functions (logic changes)
5. **Phase 5**: Frontend cleanup (code changes)
6. **Phase 6**: Remove learning_path table (destructive, final step)

### Rollback Strategy
- Keep migration scripts reversible for first 3 phases
- Take database backup before Phase 6
- Test on development branch first

## Testing Requirements

### Database Tests
- Verify data migration accuracy (compare old vs new analytics)
- Test position-based calculations match pre-computed path
- Performance test new analytics queries

### Integration Tests  
- Test quiz completion tracking
- Test review session tracking  
- Test analytics dashboard accuracy
- Test edge function updates

### E2E Tests
- Full user journey: onboarding → study → quiz → review → analytics
- Offline sync behavior with new structure
- Cross-platform consistency (web → future mobile)

## Benefits of This Migration

### Performance Improvements
- **Storage**: From 18,000+ rows per user to 1 row per user
- **Sync**: No more learning_path replication (already disabled)
- **Queries**: Simple position-based calculations vs complex path joins

### Code Simplification
- **Frontend**: Remove complex path management logic
- **Backend**: Simpler edge functions, no path regeneration
- **Analytics**: More intuitive user-centric queries

### Architecture Alignment
- **Position-based model**: Already implemented for learning progress
- **User preferences**: Single source of truth for all progress
- **Offline-first**: Cleaner sync with less data

## Risks and Mitigations

### Data Loss Risk
- **Risk**: Incomplete backfill of quiz/review data
- **Mitigation**: Validate data counts before/after migration, backup table

### Performance Risk  
- **Risk**: Position-based calculations slower than pre-computed path
- **Mitigation**: Add computed columns, materialized views for analytics

### Feature Risk
- **Risk**: Breaking analytics or quiz/review functionality
- **Mitigation**: Comprehensive testing, gradual rollout with feature flags

## Timeline Estimate

- **Phase 1-2**: 1-2 days (database changes)
- **Phase 3**: 1 day (analytics updates)
- **Phase 4**: 2-3 days (edge functions)
- **Phase 5**: 3-4 days (frontend cleanup)  
- **Phase 6**: 0.5 days (cleanup, rollback window)

**Total**: 7-10 days development + 2-3 days testing = **2 weeks**

## Success Criteria

1. ✅ All learning_path data migrated to user_preferences
2. ✅ Analytics queries return same results
3. ✅ Quiz and review functionality unchanged
4. ✅ Performance improved or maintained
5. ✅ Frontend code simplified
6. ✅ No data loss in migration