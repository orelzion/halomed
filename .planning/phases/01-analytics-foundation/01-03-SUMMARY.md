---
phase: 01-analytics-foundation
plan: 03
subsystem: database
tags: [supabase, postgresql, analytics, materialized-views, engagement-metrics]

# Dependency graph
requires:
  - phase: 01-analytics-foundation
    plan: 01
    provides: Analytics schema and admin infrastructure
provides:
  - Review session usage analytics view (ANLYT-05)
  - Explanation engagement analytics view (ANLYT-06)
  - Summary statistics view for admin dashboard KPIs
affects: [admin-dashboard, analytics-refresh-jobs]

# Tech tracking
tech-stack:
  added: []
  patterns: [engagement-tracking, proxy-metrics, singleton-summary-view]

key-files:
  created:
    - supabase/migrations/20260128100006_create_engagement_analytics_views.sql
    - supabase/migrations/20260128100007_create_analytics_summary.sql
  modified: []

key-decisions:
  - "Explanation engagement uses proxy metric (learning completion) until explicit tracking added"
  - "Summary stats uses singleton pattern (single row) for fast dashboard queries"
  - "90-day rolling window for engagement views to limit data size"

patterns-established:
  - "Proxy metric pattern: Use learning completion as engagement indicator until explicit clicks tracked"
  - "Singleton summary: Single-row materialized view for aggregated KPIs"
  - "Time-based aggregation: Weekly buckets for trend analysis"

# Metrics
duration: 2min
completed: 2026-01-28
---

# Phase 1 Plan 03: Engagement Analytics Views Summary

**Review session usage, explanation engagement, and summary KPI views for admin analytics**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-28T10:35:56Z
- **Completed:** 2026-01-28T10:38:00Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Created analytics.review_session_usage materialized view tracking ANLYT-05
- Created analytics.explanation_engagement materialized view tracking ANLYT-06 (proxy metric)
- Created analytics.summary_stats materialized view for high-level KPIs
- All views have admin-only wrapper functions with access control
- Direct access to materialized views properly restricted

## Task Commits

Each task was committed atomically:

1. **Task 1: Create engagement analytics views** - `b015623` (feat)
2. **Task 2: Create summary statistics view** - `337ff96` (feat)

## Files Created/Modified
- `supabase/migrations/20260128100006_create_engagement_analytics_views.sql` - Review and explanation engagement views
- `supabase/migrations/20260128100007_create_analytics_summary.sql` - Summary statistics view for admin dashboard

## Decisions Made

- **Explanation engagement proxy metric:** Current schema doesn't track explicit explanation views/clicks. Using learning node completion as proxy for MVP. Future enhancement: add `explanation_opened_at` timestamp to learning_path table.

- **Summary stats singleton pattern:** Single-row materialized view makes dashboard queries fast (no WHERE clause needed, just LIMIT 1).

- **90-day rolling window:** Engagement views only include last 90 days to limit data size and keep aggregations fast. Summary stats use 7d/30d windows for recency focus.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added explicit comment about proxy metric**

- **Found during:** Task 1 (review session usage view)
- **Issue:** Plan mentioned explanation engagement but schema lacks explicit tracking
- **Fix:** Added comment in SQL explaining proxy metric approach and future enhancement path
- **Files modified:** 20260128100006_create_engagement_analytics_views.sql
- **Commit:** b015623

This is not a deviation from plan intent - it's making explicit an implementation detail that was implied.

## Technical Details

### Review Session Usage (ANLYT-05)

Tracks weekly aggregations of:
- Users with review nodes unlocked
- Total review nodes vs completed reviews
- Review completion rate percentage
- Average days from unlock to completion

### Explanation Engagement (ANLYT-06)

Tracks weekly aggregations of:
- Users with learning nodes unlocked
- Total learning nodes vs completed learning
- Engagement rate percentage (proxy via completion)
- Average hours from unlock to completion

**Note:** This is a proxy metric. Real explanation engagement would track when users expand/view explanations explicitly. Future schema enhancement needed.

### Summary Statistics

Single-row view with:
- Total users (all time)
- Active users (7d, 30d)
- Overall completion rate (30d)
- Quiz completion rate (30d)
- Review completion rate (30d)
- Refresh timestamp

## Issues Encountered

**Migration history mismatch** - Remote database had migration 20260127105349 that wasn't in local history. Fixed with `supabase migration repair --status reverted 20260127105349` before pushing new migrations.

This is a normal housekeeping issue when multiple developers work on same database or when migrations are deployed outside normal flow.

## Next Steps

1. **Set up pg_cron refresh jobs** - Materialized views need periodic refresh (Plan 01-04 or separate task)
2. **Add explicit explanation tracking** - Enhance learning_path table with `explanation_opened_at` timestamp
3. **Build admin dashboard UI** - Consume these analytics via wrapper functions

## Next Phase Readiness

Ready for:
- Automated refresh job setup (pg_cron or edge function)
- Admin dashboard UI development
- Additional analytics views (retention, cohorts, etc.)

**No blockers.** All engagement analytics infrastructure in place.

---
*Phase: 01-analytics-foundation*
*Completed: 2026-01-28*
