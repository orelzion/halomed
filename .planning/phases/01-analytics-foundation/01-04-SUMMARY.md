---
phase: 01-analytics-foundation
plan: 04
subsystem: database
tags: [supabase, postgresql, pg_cron, automation, materialized-views]

# Dependency graph
requires:
  - phase: 01-analytics-foundation
    plan: 02
    provides: Core analytics materialized views with unique indexes
  - phase: 01-analytics-foundation
    plan: 03
    provides: Engagement analytics views
provides:
  - Automated refresh of all 7 analytics materialized views every 30 minutes
  - Manual refresh capability for admins
  - Cron job monitoring and health check functions
affects: [admin-dashboard, analytics-monitoring]

# Tech tracking
tech-stack:
  added: [pg_cron]
  patterns: [cron-based-automation, health-monitoring, admin-operations]

key-files:
  created:
    - supabase/migrations/20260128100008_create_analytics_cron.sql
    - supabase/migrations/20260128100009_populate_analytics_views.sql
  modified: []

key-decisions:
  - "pg_cron scheduled for 30-minute intervals balances freshness with database load"
  - "CONCURRENT refresh prevents blocking reads during refresh operations"
  - "Manual refresh function allows admins to trigger immediate updates when needed"
  - "Health check function provides monitoring visibility into view state"

patterns-established:
  - "Cron automation pattern: refresh_all_views() + cron.schedule + manual_refresh()"
  - "Health monitoring pattern: health_check() returns row counts and freshness"
  - "Admin operations pattern: wrapper functions with is_admin() checks"

# Metrics
duration: 2min
completed: 2026-01-28
---

# Phase 1 Plan 04: Analytics Cron Jobs Summary

**Automated refresh of all analytics materialized views using pg_cron with 30-minute schedule, plus admin monitoring capabilities**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-28T10:43:05Z
- **Completed:** 2026-01-28T10:45:34Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Enabled pg_cron extension for PostgreSQL job scheduling
- Created analytics.refresh_all_views() to refresh all 7 materialized views
- Scheduled cron job 'refresh-analytics-views' to run every 30 minutes
- Added analytics.manual_refresh() for admin-triggered immediate refresh
- Created analytics.get_cron_job_status() for monitoring cron execution
- Added analytics.health_check() for view status monitoring
- Performed initial population of all analytics views
- All refreshes use CONCURRENTLY to avoid blocking reads

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pg_cron job for materialized view refresh** - `14d300a` (feat)
2. **Task 2: Add initial view population and verification** - `6ba3cd7` (feat)

## Files Created/Modified
- `supabase/migrations/20260128100008_create_analytics_cron.sql` - pg_cron job, refresh functions, monitoring
- `supabase/migrations/20260128100009_populate_analytics_views.sql` - Initial population, health check, verification

## Decisions Made

**30-minute refresh interval:**
- Balances data freshness with database load
- More frequent than hourly, less aggressive than every 10 minutes
- Can be adjusted later based on actual usage patterns
- Admin can manually trigger refresh if immediate update needed

**CONCURRENT refresh strategy:**
- All views have unique indexes (created in plans 01-02 and 01-03)
- REFRESH MATERIALIZED VIEW CONCURRENTLY prevents blocking reads
- Essential for production where admins may query views during refresh
- Slightly slower than non-concurrent but worth the trade-off

**Admin-only manual refresh:**
- Allows immediate refresh without waiting for cron schedule
- Useful after data corrections or when preparing for analysis
- Access controlled via is_admin() check
- Rate limiting should be added in application layer if needed

**Health check monitoring:**
- Provides visibility into view state (row counts, freshness)
- Helps debug refresh issues or data problems
- Admin-only access maintains security
- Single function call returns status of all 7 views

## Technical Details

### Functions Created

1. **analytics.refresh_all_views()** - Core refresh function
   - Refreshes all 7 materialized views in dependency order
   - Uses REFRESH MATERIALIZED VIEW CONCURRENTLY
   - Called by cron job every 30 minutes
   - Can be invoked directly (used by manual_refresh)

2. **analytics.manual_refresh()** - Admin-triggered refresh
   - Checks is_admin() before allowing execution
   - Calls refresh_all_views() internally
   - Returns timestamp of refresh completion
   - Granted to authenticated users (admin check inside)

3. **analytics.get_cron_job_status()** - Cron monitoring
   - Returns job metadata (schedule, command, last run, status)
   - Queries cron.job and cron.job_run_details
   - Admin-only access
   - Useful for debugging if refresh stops working

4. **analytics.health_check()** - View status monitoring
   - Returns row counts for all 7 views
   - Includes refreshed_at timestamp from summary_stats
   - Admin-only access
   - Quick way to verify all views are populated

### Cron Job Details

- **Job name:** refresh-analytics-views
- **Schedule:** */30 * * * * (every 30 minutes)
- **Command:** SELECT analytics.refresh_all_views()
- **Timezone:** UTC (Supabase default)

### Views Refreshed (in order)

1. analytics.active_learning_days
2. analytics.popular_tracks
3. analytics.streak_dropoffs
4. analytics.quiz_completion_rates
5. analytics.review_session_usage
6. analytics.explanation_engagement
7. analytics.summary_stats

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both migrations created successfully and committed without issues.

## User Setup Required

**IMPORTANT:** After deploying these migrations, the Auth Hook must be registered in Supabase Dashboard:

1. Go to **Supabase Dashboard > Authentication > Hooks**
2. Click **Add Hook**
3. Select event: **custom_access_token**
4. Select function: **custom_access_token_hook** (from migration 20260128100002)
5. **Enable** the hook

Without this hook, the `is_admin()` function will not work correctly, and admin users won't be able to:
- Call manual_refresh()
- View cron_job_status()
- Run health_check()
- Access any analytics data via wrapper functions

This is a one-time setup that was mentioned in Plan 01-01 but needs to be completed before analytics functions work.

## Next Phase Readiness

**Phase 1 Analytics Foundation is now complete** with:
- Analytics schema and admin infrastructure (01-01)
- Core analytics materialized views (01-02)
- Engagement analytics views (01-03)
- Automated refresh and monitoring (01-04)

**Ready for:**
- Admin dashboard UI development (next phase)
- Analytics visualization and reporting
- Real-time monitoring via health_check()
- Data-driven product decisions

**Next steps:**
1. Register Auth Hook in Supabase Dashboard (required)
2. Test manual_refresh() and health_check() functions
3. Verify cron job runs successfully (check after 30 minutes)
4. Build admin dashboard UI to consume analytics data

**No blockers.** All analytics infrastructure complete and ready for use.

---
*Phase: 01-analytics-foundation*
*Completed: 2026-01-28*
