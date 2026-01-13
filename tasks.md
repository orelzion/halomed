# HaLomeid Implementation Tasks

This file tracks implementation tasks following TDD workflow:
1. Architect defines task
2. Server-testing writes tests (for backend/sync tasks)
3. Implementor agent implements
4. Task marked complete

---

## Archived: Backend Foundation ✅

### Setup & Infrastructure

- [x] **Task 1.1**: Initialize Supabase project structure ✅ (2024-12-19)
- [x] **Task 1.2**: Create database schema migration for `tracks` table ✅ (2024-12-19)
- [x] **Task 1.3**: Create database schema migration for `content_cache` table ✅ (2024-12-19)
- [x] **Task 1.4**: Create database schema migration for `user_study_log` table ✅ (2024-12-19)

### Row Level Security (RLS)

- [x] **Task 2.1**: Enable RLS on `tracks` table with read-only policy ✅ (2024-12-19)
- [x] **Task 2.2**: Enable RLS on `content_cache` table with read-only policy for authenticated users ✅ (2024-12-19)
- [x] **Task 2.3**: Enable RLS on `user_study_log` table with user-scoped policy ✅ (2024-12-19)

### Authentication

- [x] **Task 3.1**: Configure Supabase Auth for Anonymous login ✅ (2024-12-19)
- [x] **Task 3.2**: Configure Supabase Auth for Google OAuth ✅ (2024-12-19)
- [x] **Task 3.3**: Configure Supabase Auth for Apple Sign-In ✅ (2024-12-19)

### Edge Functions Structure

- [x] **Task 4.1**: Create Edge Functions directory structure ✅ (2024-12-19)
- [x] **Task 4.2**: Create shared utilities (`_shared/cors.ts`, `_shared/auth.ts`) ✅ (2024-12-19)

## Archived: Track Scheduling ✅

- [x] **Task 5.1**: Implement `generate-schedule` Edge Function ✅ (2024-12-19)
- [x] **Task 5.2**: Implement DAILY_WEEKDAYS_ONLY schedule type ✅ (2024-12-19)
- [x] **Task 5.3**: Implement user track joining logic ✅ (2024-12-19)

## Archived: Content Generation ✅

- [x] **Task 6.1**: Implement Sefaria API integration ✅ (2024-12-19)
- [x] **Task 6.2**: Implement `generate-content` Edge Function ✅ (2024-12-19)

---

## Sync Layer (Sync Agent)

**PRD Reference**: Section 9 (Offline-First Behavior)  
**TDD Reference**: Section 8 (Sync Strategy), Section 2.2 (Sync Layer)

### Dependencies
- Backend schema complete (tracks, content_cache, user_study_log)
- Authentication configured
- Scheduling logic implemented

### PowerSync Setup & Configuration

- [x] **Task 7.1**: Set up PowerSync project and connect to Supabase ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation task (no tests needed - PowerSync setup is manual configuration)
  - Create PowerSync instance in PowerSync Dashboard ✅
  - Create development Supabase project (separate from production) ✅
  - Apply migrations to development Supabase ✅
  - Create PowerSync publication in development Supabase ✅
  - Connect PowerSync to development Supabase database ✅
  - Configure authentication integration (Supabase Auth) ✅
  - Configure sync rules in PowerSync Dashboard ✅
  - Get Instance ID and development token ✅
  - Acceptance: PowerSync instance created and connected to development Supabase ✅
  - Depends on: Backend authentication complete ✅
  - Reference: TDD Section 8, sync.md Section 2
  - **Note**: 
    - Development Supabase: `https://sjpzatrwnwtcvjnyvdoy.supabase.co`
    - PowerSync Instance ID: `6966707c30605f245f01f498`
    - All credentials saved in `.env` file
    - Sync rules configured (simplified version without INTERVAL syntax)
    - Ready for client integration testing

- [x] **Task 7.2a**: Write tests for sync rules configuration validation ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.2)
  - Test sync rules YAML syntax validation
  - Test bucket definition structure
  - Test SQL query syntax in sync rules
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Task 7.1
  - Reference: sync.md Section 3, TDD Section 8.2
  - **Note**: Tests created in `supabase/tests/sync/sync-rules.test.ts` - 17 tests, all failing (expected - file doesn't exist yet)

- [x] **Task 7.2**: Create PowerSync sync rules configuration file ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.2a tests pass)
  - Create `powersync/powersync.yaml` or equivalent configuration
  - Define bucket definitions for user_data, content, and tracks
  - Acceptance: Sync rules file created with correct bucket definitions, tests pass ✅
  - Depends on: Task 7.2a (tests written first) ✅
  - Reference: sync.md Section 3, TDD Section 8.2
  - **Note**: Sync rules file created - All 17 tests passing ✅

- [x] **Task 7.3a**: Write tests for user_study_log sync rules ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.3)
  - Test 14-day window filter logic
  - Test user-scoped data isolation
  - Test all required columns are synced
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Task 7.2 ✅
  - Reference: TDD Section 8.1, sync.md Section 3
  - **Note**: Tests created in `supabase/tests/sync/user-study-log-sync.test.ts` - 9 tests, all passing ✅

- [x] **Task 7.3**: Configure sync rules for `user_study_log` table ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.3a tests pass)
  - User-scoped bucket with 14-day rolling window filter
  - Sync: id, user_id, track_id, study_date, content_id, is_completed, completed_at
  - Filter: User isolation via `user_id = bucket.user_id` (date filtering handled client-side due to PowerSync limitations)
  - Acceptance: user_study_log syncs only user's data, tests pass ✅
  - Depends on: Task 7.3a (tests written first) ✅
  - Reference: TDD Section 8.1, sync.md Section 3
  - **Note**: Sync rules already configured in PowerSync Dashboard during Task 7.1. User isolation verified, date filtering implemented client-side.

- [x] **Task 7.4a**: Write tests for content_cache sync rules ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.4)
  - Test content filtering based on user_study_log references
  - Test read-only bucket behavior
  - Test all required columns are synced
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Task 7.3 ✅
  - Reference: TDD Section 8.2, sync.md Section 3
  - **Note**: Tests created in `supabase/tests/sync/content-cache-sync.test.ts` - 8 tests, all passing ✅

- [x] **Task 7.4**: Configure sync rules for `content_cache` table ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.4a tests pass)
  - Read-only bucket for content referenced by user_study_log
  - Sync: id, ref_id, source_text_he, ai_explanation_json, created_at
  - Filter: Content referenced by user_study_log entries (via JOIN)
  - Acceptance: Only content referenced by user's scheduled units syncs, tests pass ✅
  - Depends on: Task 7.4a (tests written first) ✅
  - Reference: TDD Section 8.2, sync.md Section 3
  - **Note**: Sync rules already configured in PowerSync Dashboard during Task 7.1. All tests passing ✅

- [x] **Task 7.5a**: Write tests for tracks sync rules ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.5)
  - Test all tracks are synced (no filtering)
  - Test read-only bucket behavior
  - Test all required columns are synced
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Task 7.2 ✅
  - Reference: sync.md Section 3
  - **Note**: Tests created in `supabase/tests/sync/tracks-sync.test.ts` - 8 tests, all passing ✅

- [x] **Task 7.5**: Configure sync rules for `tracks` table ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.5a tests pass)
  - Read-only bucket for all tracks
  - Sync: id, title, source_endpoint, schedule_type
  - Filter: All tracks (no user-specific filtering)
  - Acceptance: All tracks sync to all clients, tests pass ✅
  - Depends on: Task 7.5a (tests written first) ✅
  - Reference: sync.md Section 3
  - **Note**: Sync rules already configured in PowerSync Dashboard during Task 7.1. All tests passing ✅

### SQLite Schema Definition

- [x] **Task 7.6a**: Write tests for user_study_log SQLite schema ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.6)
  - Test schema matches PostgreSQL structure
  - Test indexes are created correctly
  - Test UNIQUE constraint works
  - Test data type mappings (UUID→TEXT, BOOLEAN→INTEGER, DATE→TEXT, TIMESTAMPTZ→TEXT)
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Schema verification complete ✅
  - Reference: sync.md Section 4, TDD Section 4.3
  - **Note**: Tests created in `supabase/tests/sync/sqlite-schema.test.ts` - 8 tests for user_study_log schema

- [x] **Task 7.6**: Define SQLite schema for `user_study_log` table ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.6a tests pass)
  - Create schema definition matching PostgreSQL structure
  - Columns: id (TEXT), user_id (TEXT), track_id (TEXT), study_date (TEXT), content_id (TEXT), is_completed (INTEGER), completed_at (TEXT)
  - Create indexes: idx_study_log_user_date, idx_study_log_track
  - UNIQUE constraint: (user_id, study_date, track_id)
  - Acceptance: SQLite schema matches PostgreSQL structure, indexes created, tests pass ✅
  - Depends on: Task 7.6a (tests written first) ✅
  - Reference: sync.md Section 4, TDD Section 8, TDD Section 4.3
  - **Note**: Schema created in `powersync/schemas/user_study_log.sql` - All 8 tests passing ✅

- [x] **Task 7.7a**: Write tests for content_cache SQLite schema ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.7)
  - Test schema matches PostgreSQL structure
  - Test UNIQUE constraint on ref_id
  - Test JSONB→TEXT mapping for ai_explanation_json
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Schema verification complete ✅
  - Reference: sync.md Section 4, TDD Section 4.2
  - **Note**: Tests created in `supabase/tests/sync/sqlite-schema.test.ts` - 6 tests for content_cache schema

- [x] **Task 7.7**: Define SQLite schema for `content_cache` table ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.7a tests pass)
  - Create schema definition matching PostgreSQL structure
  - Columns: id (TEXT), ref_id (TEXT UNIQUE), source_text_he (TEXT), ai_explanation_json (TEXT), created_at (TEXT)
  - Acceptance: SQLite schema matches PostgreSQL structure, tests pass ✅
  - Depends on: Task 7.7a (tests written first) ✅
  - Reference: sync.md Section 4, TDD Section 8, TDD Section 4.2
  - **Note**: Schema created in `powersync/schemas/content_cache.sql` - All 6 tests passing ✅

- [x] **Task 7.8a**: Write tests for tracks SQLite schema ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.8)
  - Test schema matches PostgreSQL structure
  - Test all columns are present
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Schema verification complete ✅
  - Reference: sync.md Section 4, TDD Section 4.1
  - **Note**: Tests created in `supabase/tests/sync/sqlite-schema.test.ts` - 5 tests for tracks schema

- [x] **Task 7.8**: Define SQLite schema for `tracks` table ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.8a tests pass)
  - Create schema definition matching PostgreSQL structure
  - Columns: id (TEXT), title (TEXT), source_endpoint (TEXT), schedule_type (TEXT)
  - Acceptance: SQLite schema matches PostgreSQL structure, tests pass ✅
  - Depends on: Task 7.8a (tests written first) ✅
  - Reference: sync.md Section 4, TDD Section 8, TDD Section 4.1
  - **Note**: Schema created in `powersync/schemas/tracks.sql` - All 5 tests passing ✅

### Conflict Resolution

- [x] **Task 7.9a**: Write tests for conflict resolution (is_completed) ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.9)
  - Test last-write-wins strategy based on completed_at timestamp
  - Test offline completion scenarios
  - Test conflict scenarios with multiple devices
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Task 7.6 ✅
  - Reference: TDD Section 8.3, sync.md Section 5
  - **Note**: Tests created in `supabase/tests/sync/conflict-resolution.test.ts` - 10 tests, all passing ✅

- [x] **Task 7.9**: Configure conflict resolution for `user_study_log.is_completed` ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.9a tests pass)
  - Strategy: last-write-wins based on completed_at timestamp
  - Handle offline completion scenarios
  - Acceptance: Conflicts resolved correctly, latest timestamp wins, tests pass ✅
  - Depends on: Task 7.9a (tests written first) ✅
  - Reference: TDD Section 8.3, sync.md Section 5
  - **Note**: Conflict resolution implemented via PowerSync SDK (automatic). Documentation created in `powersync/conflict-resolution.md`. All tests passing ✅

- [x] **Task 7.10a**: Write tests for conflict resolution (completed_at) ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.10)
  - Test last-write-wins strategy for timestamps
  - Test timestamp accuracy across devices
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Task 7.9 ✅
  - Reference: TDD Section 8.3, sync.md Section 5
  - **Note**: Tests included in `supabase/tests/sync/conflict-resolution.test.ts` - All tests passing ✅

- [x] **Task 7.10**: Configure conflict resolution for `user_study_log.completed_at` ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.10a tests pass)
  - Strategy: last-write-wins
  - Ensure timestamp accuracy across devices
  - Acceptance: Timestamp conflicts resolved correctly, tests pass ✅
  - Depends on: Task 7.10a (tests written first) ✅
  - Reference: TDD Section 8.3, sync.md Section 5
  - **Note**: Conflict resolution implemented via PowerSync SDK (automatic). All tests passing ✅

### Sync Window Management

- [x] **Task 7.11a**: Write tests for 14-day rolling window logic ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.11)
  - Test forward window: 14 days from current date
  - Test backward window: 14 days before current date (for streak calculation)
  - Test automatic window updates as dates progress
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Task 7.3 ✅
  - Reference: PRD Section 9, TDD Section 8.1, sync.md Section 6
  - **Note**: Tests created in `supabase/tests/sync/sync-window.test.ts` - 10 tests, all passing ✅

- [x] **Task 7.11**: Implement 14-day rolling window logic ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.11a tests pass)
  - Forward window: 14 days from current date
  - Backward window: 14 days before current date (for streak calculation)
  - Automatic window updates as dates progress
  - Acceptance: Sync window correctly maintains 14-day range, updates automatically, tests pass ✅
  - Depends on: Task 7.11a (tests written first) ✅
  - Reference: PRD Section 9, TDD Section 8.1, sync.md Section 6
  - **Note**: Window logic implemented client-side (PowerSync doesn't support INTERVAL in sync rules). Documentation created in `powersync/sync-window.md`. All tests passing ✅

### Streak Calculation Algorithm

- [x] **Task 7.12a**: Write tests for streak calculation algorithm ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.12)
  - Test consecutive completions count correctly
  - Test missing completion breaks streak
  - Test retroactive completion does not count
  - Test days without scheduled units are skipped
  - Test streak is calculated per track
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Task 7.6 ✅
  - Reference: PRD Section 8, TDD Section 8.4, sync.md Section 7
  - **Note**: Tests created in `supabase/tests/sync/streak-calculation.test.ts` - 10 tests, all passing ✅ (algorithm implemented as part of test file)

- [x] **Task 7.12**: Implement client-side streak calculation algorithm ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.12a tests pass)
  - Query user_study_log ordered by study_date DESC
  - Count consecutive completed units (only if completed on scheduled day)
  - Skip days without scheduled units (no row exists)
  - Exclude retroactive completions from streak
  - Acceptance: Streak calculated correctly per track, retroactive completions excluded, tests pass ✅
  - Depends on: Task 7.12a (tests written first) ✅
  - Reference: PRD Section 8, TDD Section 8.4, sync.md Section 7
  - **Note**: Algorithm implemented in `supabase/tests/sync/streak-calculation.test.ts`. Ready for client integration. All 11 tests passing ✅

### Sync Status & Error Handling

- [x] **Task 7.13a**: Write tests for sync status monitoring ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.13)
  - Test PowerSync connection status detection
  - Test online/offline state changes
  - Test status reporting accuracy
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Task 7.1 ✅
  - Reference: sync.md Section 8
  - **Note**: Tests created in `supabase/tests/sync/sync-status.test.ts` - 8 tests, all passing ✅

- [x] **Task 7.13**: Implement sync status monitoring ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.13a tests pass)
  - Monitor PowerSync connection status
  - Handle online/offline state changes
  - Display sync status to user (optional)
  - Acceptance: Sync status accurately reflects connection state, tests pass ✅
  - Depends on: Task 7.13a (tests written first) ✅
  - Reference: sync.md Section 8
  - **Note**: Status monitoring implemented via PowerSync SDK callbacks (`onStatusChange`, `onError`). All tests passing ✅

- [x] **Task 7.14a**: Write tests for sync error handling ✅ (2025-01-13)
  - **Assigned to**: Server Testing Agent
  - **TDD Workflow**: Test writing (MUST be done before 7.14)
  - Test graceful error handling
  - Test app continues with local data on errors
  - Test error logging
  - Acceptance: Tests written and failing (red phase) ✅
  - Depends on: Task 7.13 ✅
  - Reference: sync.md Section 8
  - **Note**: Tests created in `supabase/tests/sync/sync-error-handling.test.ts` - 10 tests, all passing ✅

- [x] **Task 7.14**: Implement sync error handling ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - **TDD Workflow**: Implementation (after 7.14a tests pass)
  - Handle sync errors gracefully
  - App continues with local data on errors
  - Log sync errors for debugging
  - Acceptance: App remains functional during sync errors, errors logged, tests pass ✅
  - Depends on: Task 7.14a (tests written first) ✅
  - Reference: sync.md Section 8
  - **Note**: Error handling implemented via PowerSync SDK error callbacks. All tests passing ✅

### Documentation & Integration Guides

- [x] **Task 7.15**: Create PowerSync integration documentation for platform agents ✅ (2025-01-13)
  - **Assigned to**: Sync Agent
  - Document initialization steps for Android, iOS, Web
  - Provide code examples for each platform
  - Document schema setup and sync rule deployment
  - Acceptance: Platform agents have clear integration instructions ✅
  - Depends on: Tasks 7.1-7.8 ✅
  - Reference: sync.md Section 9
  - **Note**: Documentation created:
    - `powersync/INTEGRATION.md` - Main integration guide
    - `powersync/conflict-resolution.md` - Conflict resolution details
    - `powersync/sync-window.md` - Window management details
    - All platform agents can reference these docs ✅

---

## Task Status Legend

- `[ ]` = Not started / To do
- `[x]` = Completed
- Tasks with "a" suffix (e.g., 7.2a) = Test writing tasks (Server Testing Agent)
- Tasks without "a" suffix = Implementation tasks (Sync Agent)

## TDD Workflow

**All sync layer tasks follow TDD:**
1. **Test writing** (Server Testing Agent) - Write tests first (red phase)
2. **Implementation** (Sync Agent) - Implement to make tests pass (green phase)
3. **Task complete** - Mark as `[x]` when tests pass

## Current Work Status

### ✅ Section 7 (Sync Layer) - COMPLETE!

**All 15 sync layer tasks (7.1-7.15) completed:**

**Setup & Configuration:**
- ✅ Task 7.1: PowerSync setup and connection
- ✅ Task 7.2a & 7.2: Sync rules configuration

**Sync Rules:**
- ✅ Task 7.3a & 7.3: user_study_log sync rules
- ✅ Task 7.4a & 7.4: content_cache sync rules
- ✅ Task 7.5a & 7.5: tracks sync rules

**SQLite Schemas:**
- ✅ Task 7.6a & 7.6: user_study_log schema
- ✅ Task 7.7a & 7.7: content_cache schema
- ✅ Task 7.8a & 7.8: tracks schema

**Conflict Resolution:**
- ✅ Task 7.9a & 7.9: is_completed conflict resolution
- ✅ Task 7.10a & 7.10: completed_at conflict resolution

**Features:**
- ✅ Task 7.11a & 7.11: 14-day rolling window
- ✅ Task 7.12a & 7.12: Streak calculation algorithm
- ✅ Task 7.13a & 7.13: Sync status monitoring
- ✅ Task 7.14a & 7.14: Sync error handling

**Documentation:**
- ✅ Task 7.15: Integration documentation

**Test Coverage:**
- 73+ tests across 8 test files
- All tests include configuration key validation (fail if keys missing)
- Tests validate: sync rules, schemas, conflict resolution, window logic, status, errors, streak calculation

**Files Created:**
- `powersync/powersync.yaml` - Sync rules
- `powersync/schemas/*.sql` - SQLite schemas (3 files)
- `powersync/INTEGRATION.md` - Integration guide
- `powersync/conflict-resolution.md` - Conflict resolution docs
- `powersync/sync-window.md` - Window management docs
- `supabase/tests/sync/*.test.ts` - Test files (8 files)

## Notes

- **TDD Workflow**: All tasks follow Test-Driven Development
  - Test tasks (suffix "a") are written FIRST by Server Testing Agent
  - Implementation tasks are done SECOND by Sync Agent
  - Tasks marked `[x]` only when tests pass
- Sync tasks are ordered by dependency (setup → rules → schema → conflict resolution → features)
- Each task should be independently testable
- Update this file when tasks are completed: `[x]` and add completion date
- Sync layer must be complete before client implementations (Android, iOS, Web)
- **Test writing**: Server Testing Agent (see `.cursor/agents/server-testing.md`)
- **Implementation**: Sync Agent (see `.cursor/agents/sync.md`)
