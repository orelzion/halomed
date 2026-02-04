# Architecture

**Analysis Date:** 2026-01-27

## Pattern Overview

**Overall:** Offline-First, Client-Server Synchronization

**Key Characteristics:**
- Supabase (PostgreSQL) as single source of truth for structured data
- RxDB (IndexedDB) as offline-first local database on web platform
- Bidirectional replication with last-write-wins conflict resolution
- Edge Functions (Deno) for server-side scheduling, content generation, and quiz creation
- Pure computation layer (`@shared/lib/path-generator.ts`) for learning path math
- Layered data flow: Browser UI → React hooks → RxDB → Supabase Realtime

## Layers

**Presentation Layer:**
- Purpose: Render UI components and handle user interactions
- Location: `web/components/` and `web/app/`
- Contains: Screen components (PathScreen, StudyScreen, ReviewScreen, QuizScreen), UI primitives (DoneButton, StreakIndicator), layout components (Footer, Header)
- Depends on: React 19, hooks (usePreferences, usePath, useStudyUnit, useReviews), Tailwind CSS
- Used by: Next.js App Router

**Application Logic Layer:**
- Purpose: Manage state, orchestrate data fetching, handle business logic
- Location: `web/lib/hooks/`
- Contains: Custom hooks (useAuth, usePreferences, usePath, useStudyUnit, useCompletion, useStreak, useSchedule)
- Depends on: RxDB database, Supabase client, path-generator pure functions
- Used by: Presentation layer components

**Data Access Layer:**
- Purpose: Abstract database operations, provide reactive data streams
- Location: `web/lib/database/` and `web/lib/sync/`
- Contains: RxDB schemas, database initialization, replication setup, content generation
- Depends on: RxDB, Supabase PostgREST, Edge Functions
- Used by: Application logic hooks

**Sync & Backend Coordination:**
- Purpose: Keep local and remote data synchronized, trigger content generation
- Location: `web/components/providers/SyncProvider.tsx`, `web/lib/sync/`
- Contains: Replication engine, schedule generation orchestration, Yom Tov date sync
- Depends on: RxDB, Supabase Realtime, Edge Functions via API routes
- Used by: Root layout provider

**Edge Function Layer:**
- Purpose: Server-side operations not suitable for client (scheduling, content generation, quiz creation)
- Location: `supabase/functions/`
- Contains: generate-schedule, generate-content, generate-quiz, generate-path, schedule-review, ensure-content
- Depends on: Supabase SDK, PostgreSQL via PostgREST, Sefaria API, Google Gemini API
- Used by: Web API routes and sync orchestration

**Pure Computation Layer:**
- Purpose: Calculate learning path without side effects, works in browser and Deno
- Location: `shared/lib/path-generator.ts`
- Contains: computePath, getTodaysContent, getContentRefsForRange (pace/pace logic, review scheduling, date calculations)
- Depends on: JavaScript primitives only
- Used by: usePath hook, Edge Functions, review scheduling

**Authentication & Authorization:**
- Purpose: Manage user identity and session state
- Location: `web/components/providers/AuthProvider.tsx`, `web/lib/hooks/useAuth.ts`
- Contains: Supabase Auth integration, OAuth handlers (Google, Apple), anonymous auth
- Depends on: Supabase Auth
- Used by: All authenticated screens, sync layer

**Styling & Theming:**
- Purpose: Apply consistent design system across platform
- Location: `web/app/globals.css`, `web/tailwind.config.ts`, `web/components/providers/ThemeProvider.tsx`
- Contains: Desert Oasis color palette, typography (Frank Ruhl Libre, Noto Sans Hebrew), dark/light/system themes
- Depends on: Tailwind CSS, next-themes
- Used by: All components

## Data Flow

**Initial Load Flow:**

1. User visits app → `layout.tsx` renders providers (Theme, Auth, Sync)
2. AuthProvider initializes via `useAuth` hook, checks localStorage for session
3. If no user, redirect to `/login`
4. If user exists, SyncProvider initializes RxDB connection
5. RxDB loads schema definitions from `web/lib/database/schemas.ts`
6. Database.ts creates IndexedDB store and initializes collections
7. SyncProvider calls setupReplication to bind RxDB collections to Supabase
8. Initial replication pulls data within 14-day window
9. ensureContentGenerated triggers content generation for missing pieces
10. syncYomTovDates pulls holiday calendar for streak calculation
11. HomePage renders PathScreen with data from usePath hook

**Study Completion Flow:**

1. User marks content as complete → DoneButton calls `useCompletion().markAsCompleted()`
2. useCompletion updates RxDB directly (immediate feedback)
3. RxDB observes document change and triggers replication push
4. Replication sends update to Supabase via PostgREST
5. Supabase updates user_study_log table
6. Realtime subscription notifies all connected clients
7. Local streaks recalculated from RxDB data by useStreak hook

**Content Rendering Flow:**

1. StudyScreen loads content via `useStudyUnit()` hook
2. useStudyUnit queries RxDB for content_cache document
3. Renders source_text_he and ai_explanation_json from cached document
4. If content missing, trigger content generation via API endpoint
5. Generated content synced back to RxDB via replication
6. Component rerenders with new data

**Schedule Generation Flow:**

1. SyncProvider runs on app load and visibility changes
2. generateSchedule() checks if sync needed (date changed, stale)
3. Fetches all tracks from Supabase
4. For each track, calls POST /api/generate-schedule
5. API route validates JWT and calls Edge Function with service role key
6. Edge Function computes next 14 days of content assignments
7. Creates user_study_log rows if missing
8. Ensures content_cache populated for each content reference
9. Replication pulls new rows into RxDB
10. UI updates to show new unlocked study units

**State Management:**

- Persistent state (tracks, user_study_log, content_cache): RxDB + Supabase
- Session state (current user): React context (AuthContext)
- Sync status: React context (SyncContext)
- Preferences (pace, review intensity): RxDB user_preferences + React context via usePreferences
- Derived state (streak, path): Computed on-demand from RxDB queries (useStreak, usePath)
- UI state (theme, visibility): React local state + localStorage

## Key Abstractions

**RxDatabase:**
- Purpose: Unified local database with offline capability
- Examples: `web/lib/database/database.ts`, `web/components/providers/SyncProvider.tsx`
- Pattern: Singleton instance initialized on app load, stored in React context, accessed via useSync hook

**ReplicationState:**
- Purpose: Manage bidirectional sync between RxDB and Supabase
- Examples: `web/lib/sync/replication.ts` (setupReplication function)
- Pattern: One replication per collection, tracked in refs, can be manually triggered via triggerSync()

**PathNode:**
- Purpose: Represent a single learning unit in user's path
- Examples: `usePath.ts`, `shared/lib/path-generator.ts`
- Pattern: Immutable computed objects derived from position and pace preferences

**ContentCache:**
- Purpose: Deduplicated content shared across all users
- Examples: `web/lib/database/schemas.ts` (ContentCacheDoc)
- Pattern: ref_id (Sefaria reference) is unique key, ai_explanation_json contains structured AI output

**UserPreferences:**
- Purpose: User settings that drive path computation
- Examples: `web/lib/database/schemas.ts` (UserPreferencesDoc)
- Pattern: Single document per user, synced bidirectionally, includes skip_friday, israel_mode, yom_tov_dates

## Entry Points

**Web App Entry:**
- Location: `web/app/layout.tsx`
- Triggers: Browser navigation to halomed.vercel.app
- Responsibilities: Initialize providers (Theme, Auth, Sync), wrap all routes with context

**Home Page:**
- Location: `web/app/page.tsx`
- Triggers: Authenticated user visits /
- Responsibilities: Check preferences exist, redirect to /onboarding if new user, render PathScreen

**Study Page:**
- Location: `web/app/study/[trackId]/page.tsx`
- Triggers: User clicks to study today's content (legacy schedule-based)
- Responsibilities: Load content for track, render StudyScreen with completion button

**Path Study Page:**
- Location: `web/app/study/path/[nodeId]/page.tsx`
- Triggers: User clicks a learning node in path
- Responsibilities: Load content for node, render StudyScreen, update path progress

**Review Page:**
- Location: `web/app/review/page.tsx`
- Triggers: User unlocks review session node
- Responsibilities: Query review items, render ReviewScreen with content rotation

**Quiz Page:**
- Location: `web/app/quiz/[nodeId]/page.tsx`
- Triggers: User unlocks weekly quiz node
- Responsibilities: Load quiz questions, render QuizScreen, record answers

**API Routes (Next.js):**
- Location: `web/app/api/[function]/route.ts`
- Purpose: Authenticate user and proxy calls to Supabase Edge Functions
- Examples: generate-schedule, generate-content, generate-quiz, ensure-content, calculate-yom-tov

## Error Handling

**Strategy:** Resilient fallback with user feedback

**Patterns:**

- **Network Errors:** App continues with locally cached data. SyncIndicator shows connection status. Manual sync available via pull-to-refresh.
- **Content Missing:** If content not in cache, trigger async generation via ensure-content API. Show skeleton UI while loading.
- **Sync Failures:** Log error, retry on next sync trigger (date change, manual refresh, return to focus). Fallback upsert function creates basic user_study_log entries if Edge Function fails.
- **RxDB Errors:** Caught in SyncProvider connect() and setError(). App continues with offline mode. Users can still study cached content.
- **Authentication Errors:** Redirected to /login. Session token validated on each API route via JWT verification.

## Cross-Cutting Concerns

**Logging:**
- Browser: `console.log` with [prefixes] like `[Sync]`, `[RxDB]`, `[Replication]`
- Server: PostHog event tracking via `posthog-node` and `posthog-js`
- Edge Functions: Deno console logging

**Validation:**
- Frontend: Content validation via `lib/utils/content-validation.ts`
- Backend: Zod schemas in shared code (future), database constraints via Postgres

**Authentication:**
- Supabase Auth handles user session
- JWT tokens validated on API routes before calling Edge Functions
- Service role key kept server-side, never exposed to client
- RLS policies enforce user_id isolation on database rows

**Internationalization:**
- Hebrew-only MVP via next-i18next
- All user-facing strings use i18n key lookups, never hardcoded
- Content from Sefaria API and AI stored with `_he` suffix

**Date Handling:**
- All dates stored as YYYY-MM-DD (DATE type in Postgres)
- Interpreted in device's local timezone (Israel for MVP)
- 14-day sync window applied at query level
- Yom Tov dates pre-computed and cached in user_preferences

**Offline Support:**
- PWA with Serwist service worker
- IndexedDB via RxDB stores all synced data
- Replication paused when offline, resumes when online
- All UI operations work fully offline with local data
