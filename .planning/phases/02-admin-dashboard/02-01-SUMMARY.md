---
phase: 02-admin-dashboard
plan: 01
subsystem: infra
tags: [next.js, middleware, supabase, typescript, recharts, date-fns, authentication]

# Dependency graph
requires:
  - phase: 01-analytics-foundation
    provides: "Database security layer with is_admin() RPC and analytics views"
provides:
  - "Next.js middleware protecting /admin/* routes (redirects to login)"
  - "Server-side Supabase client factory for Server Components"
  - "TypeScript interfaces for all analytics RPC return types"
  - "Admin layout with header and navigation"
  - "Custom 403 forbidden page"
affects: [02-02, 02-03, admin-ui, analytics-dashboard]

# Tech tracking
tech-stack:
  added: [recharts@3.7.0, date-fns@4.1.0]
  patterns: [server-side-auth, middleware-redirect, admin-route-protection]

key-files:
  created:
    - web/middleware.ts
    - web/lib/supabase/server.ts
    - web/types/analytics.ts
    - web/app/admin/layout.tsx
    - web/app/admin/forbidden.tsx
  modified:
    - web/package.json
    - web/next.config.ts

key-decisions:
  - "Middleware checks authentication only; admin role validation at database level"
  - "Admin dashboard uses LTR direction (English internal tool vs RTL Hebrew app)"
  - "Enabled experimental.authInterrupts for Next.js forbidden() support"

patterns-established:
  - "Server Components use createClient() from lib/supabase/server.ts for cookie-based auth"
  - "Admin routes protected at middleware level with database-level role checks"
  - "TypeScript interfaces match PostgreSQL RPC function return types"

# Metrics
duration: 2min
completed: 2026-01-28
---

# Phase 02 Plan 01: Admin Route Protection Infrastructure Summary

**Next.js middleware with Supabase auth redirecting unauthenticated /admin/* requests, server-side client factory, and TypeScript interfaces for analytics RPC types**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-28T20:50:32Z
- **Completed:** 2026-01-28T20:52:27Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Installed recharts and date-fns for analytics visualization
- Created middleware protecting /admin/* routes with authentication check
- Built server-side Supabase client factory for Server Components
- Defined TypeScript interfaces matching Phase 1 analytics RPC return types
- Created admin layout with header and 403 forbidden page

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and enable authInterrupts** - `80fe043` (chore)
2. **Task 2: Create server-side Supabase client and middleware** - `f5417fe` (feat)
3. **Task 3: Create TypeScript types and admin layout** - `e239ee5` (feat)

## Files Created/Modified
- `web/package.json` - Added recharts@3.7.0 and date-fns@4.1.0
- `web/next.config.ts` - Enabled experimental.authInterrupts for forbidden() function
- `web/middleware.ts` - Route protection redirecting unauthenticated /admin/* to /auth/login
- `web/lib/supabase/server.ts` - Server-side Supabase client factory reading cookies
- `web/types/analytics.ts` - TypeScript interfaces for all Phase 1 analytics RPC types
- `web/app/admin/layout.tsx` - Admin section layout with header (LTR direction)
- `web/app/admin/forbidden.tsx` - Custom 403 page for unauthorized access

## Decisions Made

**1. Two-layer security model**
- Middleware checks authentication (session exists)
- Database-level is_admin() RPC enforces role authorization
- Rationale: Separation of concerns - middleware for authn, database for authz

**2. LTR layout for admin dashboard**
- Main app uses RTL (Hebrew), admin uses LTR (English internal tool)
- Rationale: Admin dashboard is for internal use, English is operational language

**3. Enabled experimental.authInterrupts**
- Required for Next.js forbidden() function in Server Components
- Rationale: Enables proper 403 handling in future UI components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

None - no external service configuration required. Admin role assignment requires manual database update (covered in Phase 1 setup).

## Next Phase Readiness

Ready for Plan 02-02 (Analytics Dashboard UI):
- Route protection in place
- Server-side client available for data fetching
- TypeScript types defined for all analytics data
- Layout structure ready for dashboard components

No blockers.

---
*Phase: 02-admin-dashboard*
*Completed: 2026-01-28*
