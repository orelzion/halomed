# Codebase Concerns

**Analysis Date:** 2026-01-27

## Accessibility Issues

**WCAG 2.1 Contrast Failure - Accent Color on Light Background:**
- Issue: Accent color (#D4A373) on light background (#FEFAE0) has insufficient contrast ratio of 2.15:1, failing WCAG AA for large text (minimum 3:1 required)
- Files: `web/app/globals.css` (lines 41-61 document the issue)
- Impact: Text or UI elements using accent color on light backgrounds will be unreadable for users with low vision or color blindness
- Fix approach: Use darker accent variant (#B8865A) for text on light backgrounds, or use accent as background with white text. Apply to interactive elements like buttons, links, and focus states on light theme

## Component Complexity & Maintenance Risk

**PathScreen - Oversized Component (888 lines):**
- Files: `web/components/screens/PathScreen.tsx`
- Why fragile: Component handles multiple concerns - node rendering, path generation, content generation, and interactive state management in a single file. Contains complex conditional rendering logic for different node types and state combinations
- Safe modification: Consider extracting node rendering logic into separate `PathNode` component, path generation into custom hook, and creating dedicated components for quiz/review/learning node rendering
- Test coverage: No unit tests; E2E coverage unclear

**QuizScreen - Large Complex Logic (551 lines):**
- Files: `web/components/screens/QuizScreen.tsx`
- Why fragile: Combines quiz loading, weekly quiz date parsing, question formatting, and answer tracking in single component. Week range calculation logic (lines 34-71) is complex and critical for correctness
- Safe modification: Extract week range calculation into utility function with dedicated tests, move quiz data loading to custom hook, separate quiz UI from state management
- Test coverage: No dedicated unit tests for date parsing logic

**ReviewScreen - Content Generation Logic (391 lines):**
- Files: `web/components/screens/ReviewScreen.tsx`
- Why fragile: Handles both content loading from local cache and API-based generation with complex error states, loading states, and generation polling
- Safe modification: Move content loading logic to custom hook (similar pattern exists in other screens), create separate content generation manager
- Test coverage: No unit tests for content generation flow

## Data Consistency & Migration Concerns

**PowerSync to RxDB Migration - Runtime Fragility:**
- Issue: Migration uses `eval()` for dynamic imports to avoid build-time analysis (line 34 in `powersync-to-rxdb.ts`). This pattern is difficult to debug and may fail silently if module structure changes
- Files: `web/lib/migration/powersync-to-rxdb.ts` (lines 18-47)
- Impact: Migration could fail without clear error messages. User data from PowerSync could be lost if migration doesn't detect or handle edge cases properly
- Fix approach: Consider persisting migration status/logs to localStorage to track which users have been migrated. Add more explicit error logging and failure recovery

**Schema Version Mismatches - Evolution Risk:**
- Issue: RxDB schemas have versions (userPreferencesSchema v1, learningPathSchema v1) but no automated migration handlers defined for version upgrades
- Files: `web/lib/database/schemas.ts` (versions at lines 159, 186)
- Impact: If schema needs another version bump, there's no clear migration path. RxDB migration handler in `database.ts` (lines 90-105) only migrates user_preferences and is hardcoded
- Fix approach: Create generic schema migration framework that handles all collections, not just user_preferences

## Error Handling & Recovery Gaps

**Silent Failures in Content Generation:**
- Issue: Content generation failures don't always surface to user. In ReviewScreen (lines 142, 194), generation errors are logged but user sees loading state indefinitely
- Files: `web/components/screens/ReviewScreen.tsx` (lines 86-202)
- Impact: Users may wait indefinitely for content that can't be generated due to API failure or rate limiting
- Fix approach: Implement explicit timeout (currently missing), show user-facing error message after retry attempts exhausted, provide fallback to placeholder content

**API Error Parsing Inconsistency:**
- Issue: Error handling varies across API routes. `ensure-content` (lines 46-56) has try-catch for JSON parsing, but `schedule-review` and others don't consistently handle non-JSON response bodies
- Files: `web/app/api/ensure-content/route.ts`, `web/app/api/schedule-review/route.ts`, others
- Impact: Non-JSON error responses could cause unhandled exceptions or cryptic error messages
- Fix approach: Create middleware or utility for consistent error response parsing across all API routes

**Missing Validation on Parsed JSON:**
- Issue: After parsing JSON from responses or localStorage (e.g., `JSON.parse(content.ai_explanation_json)` in `useStudyUnit.ts` line 91), no validation of structure occurs
- Files: `web/lib/hooks/useStudyUnit.ts` (line 91), `web/lib/hooks/usePathStudyUnit.ts` (line 53), similar patterns throughout
- Impact: Malformed JSON data from backend could crash components silently
- Fix approach: Add Zod validation after JSON parsing to ensure ai_explanation_json matches expected structure

## Performance Concerns

**Excessive Console Logging in Production:**
- Issue: Many console.log statements left in components with debug prefixes like `[ReviewScreen]`, `[PathScreen]`, `[Migration]`
- Files: Found in 40+ console.log calls across screens and providers (see grep results)
- Impact: Console noise makes it hard to debug real issues. Can impact performance on older devices (console operations are blocking)
- Fix approach: Remove all debug logging or wrap in development-only check (e.g., `if (process.env.NODE_ENV === 'development')`)

**Unoptimized Subscriptions in Hooks:**
- Issue: Several hooks set up multiple subscriptions without unsubscribe in all code paths. Pattern in `useStudyUnit.ts` (lines 133-165) subscribes to three queries but cleanup only happens in return statement
- Files: `web/lib/hooks/useStudyUnit.ts`, `web/lib/hooks/useStreak.ts`, `web/lib/hooks/useTracks.ts`
- Impact: Memory leaks if component unmounts during async operations or if isMounted flag is set but subscription references are lost
- Fix approach: Use `useEffect` cleanup consistently, consider creating `useRxDBSubscription` wrapper hook

**PathScreen Animation Performance:**
- Issue: PathScreen uses `animate-pulse` class on current node and multiple Framer Motion animations. With many nodes (200+ learning nodes), rendering could be expensive
- Files: `web/components/screens/PathScreen.tsx` (line 783, animation usage throughout)
- Impact: Potential jank or frame drops on lower-end devices during scrolling
- Fix approach: Virtualize node list if >50 nodes, use CSS containment, lazy-animate off-screen nodes

## Offline-First Sync Fragility

**14-Day Sync Window - Hard-coded Boundaries:**
- Issue: Replication uses `getDateWindow()` to fetch 14-day rolling window, but if user is offline for 15+ days, they lose access to older data without warning
- Files: `web/lib/sync/replication.ts` (lines 46, 116-122)
- Impact: Data appears deleted but is only outside sync window. If user stored important historical data (study logs, notes), it becomes inaccessible
- Fix approach: Persist data beyond 14-day window locally (mark synced/unsynced), add UI warning when approaching data loss, allow user-configured retention window

**Replication Checkpoint Integrity:**
- Issue: Replication uses `id` field for checkpoint ordering (line 123), but relies on Supabase ordering. If backend doesn't guarantee ID ordering matches creation order, sync could miss updates
- Files: `web/lib/sync/replication.ts` (lines 126-128)
- Impact: Data loss during replication if checkpoint logic fails
- Fix approach: Use explicit timestamp-based checkpointing instead of ID-based, verify checkpoint consistency with backend

**Race Condition in Schedule Generation:**
- Issue: `SyncProvider.tsx` uses boolean flag `isSyncingScheduleRef` to prevent concurrent generation, but flag is never reset if fetch promise hangs indefinitely
- Files: `web/components/providers/SyncProvider.tsx` (line 104, flag set at 179-180, never reset if hung)
- Impact: If schedule generation request hangs, flag stays true and app never generates schedules again until restart
- Fix approach: Use timeout/AbortController for fetch requests, reset flag in finally block

## Test Coverage Gaps

**No Unit Tests for Critical Logic:**
- Missing test coverage:
  - Content generation flow (ReviewScreen, StudyScreen)
  - Weekly quiz date parsing logic (QuizScreen, PathScreen)
  - Streak calculation logic
  - Sync window filtering
  - Migration data conversion
- Impact: Bugs in these areas won't be caught until production
- Priority: High - these are core business logic paths

**No E2E Tests for Offline Scenarios:**
- Issue: Tests directory mentioned in docs (`tests/maestro`) but no visible offline/sync tests
- Impact: Can't verify offline behavior works correctly
- Fix approach: Add Maestro E2E tests for offline study, sync recovery, and data loss scenarios

**No Validation Tests for API Responses:**
- Issue: No tests verify API responses match expected schema
- Impact: Backend schema changes could break frontend without warning
- Fix approach: Add response validation tests using Zod schemas

## Security & Data Validation

**Type Safety: `any` Usage in Key Areas:**
- Issue: While explicit `any` is avoided, interfaces use loosely typed fields: `ExplanationData` in `useStudyUnit.ts` (line 16), `QuizQuestion` in `QuizScreen.tsx` (line 12) lack strict field validation
- Files: `web/lib/hooks/useStudyUnit.ts`, `web/components/screens/QuizScreen.tsx`
- Impact: Runtime type mismatches could cause crashes or security issues if data structure changes
- Fix approach: Define strict Zod schemas for all API responses and data structures

**Service Role Key Exposure:**
- Issue: `SUPABASE_SERVICE_ROLE_KEY` is used in API route (ensure-content), which is correct, but other API routes might need to verify they don't accidentally expose this in responses
- Files: `web/app/api/` routes
- Impact: If any API returns full error details from Edge Functions, service key could leak
- Fix approach: Audit all Edge Function error handling, ensure service errors are never returned to client

**CORS & Authentication Bypass:**
- Issue: Service role key validation only in specific routes. If new routes are added that interact with backend, easy to forget auth checks
- Files: All API routes should validate Bearer token
- Impact: Unauthorized access to protected Edge Functions possible if new routes miss auth
- Fix approach: Create middleware that enforces authentication on all /api routes by default

## Dependencies & Build Concerns

**RxDB Version - Potential Instability:**
- Issue: Using RxDB ^15.39.0 which is relatively recent. Schema migrations and replication API could have breaking changes in patch versions
- Files: `web/package.json` (line 27)
- Impact: npm update could silently break database functionality
- Fix approach: Pin RxDB to specific version, test thoroughly before upgrading minor/patch versions

**Polyfill System - Webpack Configuration:**
- Issue: Custom polyfill file (`web/lib/database/polyfill.ts`) is imported to work around webpack issues. Build config is fragile
- Files: `web/next.config.ts`, `web/lib/database/polyfill.ts`, `web/components/providers/SyncProvider.tsx` (line 4)
- Impact: If webpack configuration changes, database initialization could fail
- Fix approach: Document why this polyfill is needed, consider migrating to Next.js edge runtime instead of Node runtime for database

## Data Structure & Consistency Issues

**Content Cache Null Fields - Unpredictable State:**
- Issue: `ContentCacheDoc.he_ref` is optional, but used in display logic without null checks in some places
- Files: `web/lib/utils/date-format.ts` (line 89), various display components
- Impact: UI could show `undefined` or fail to render references
- Fix approach: Guarantee `he_ref` is always populated or handle null explicitly everywhere

**Learning Path Node Types - Incomplete Enumeration:**
- Issue: `node_type` can be 'learn', 'review_session', 'quiz', 'weekly_quiz', but schema doesn't enforce enum validation
- Files: `web/lib/database/schemas.ts` (line 72)
- Impact: Invalid node types could be created, causing rendering logic to fail
- Fix approach: Add Zod enum validation, validate on write to Supabase with CHECK constraint

**Boolean-as-Integer Storage - Type Confusion Risk:**
- Issue: RxDB stores booleans as integers (0/1) in replication layer to match SQLite, then converts back. Bidirectional conversion at lines 52-56, 91-95 of `replication.ts`
- Files: `web/lib/sync/replication.ts`
- Impact: If conversion fails silently, completion state or dividers could have wrong type, causing comparison bugs
- Fix approach: Use dedicated type guards, add validation after conversion

## Untested Edge Cases

**Week Boundary Quiz Generation:**
- Issue: Weekly quiz date parsing (QuizScreen lines 34-71) has complex logic for calculating week range based on day of week (5 = Friday, 4 = Thursday)
- Problem: Edge cases at week boundaries, Fridays vs Thursdays, DST transitions not tested
- Impact: Users could get wrong quiz content or quizzes on wrong dates

**Incomplete Content Fallback:**
- Issue: If content generation fails and placeholder is shown, no clear distinction between "loading" and "error" states
- Impact: User might think content will appear if they wait

**Multiple Track Sync Race Conditions:**
- Issue: `SyncProvider.generateScheduleForTracks()` generates schedule sequentially but UI could be updating in parallel from user interactions
- Impact: Race conditions if user changes preferences during schedule generation

---

*Concerns audit: 2026-01-27*
