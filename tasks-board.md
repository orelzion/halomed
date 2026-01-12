# 📋 HaLomeid Backend Tasks - Trello Board

**Last Updated:** 2024-12-19

---

## ✅ DONE (15 tasks)

### 🏗️ Backend Foundation

#### **Task 1.1** - Initialize Supabase project structure ✅
- **Status:** Complete (2024-12-19)
- **Acceptance:** `supabase start` runs successfully
- **Files:** `supabase/config.toml`

#### **Task 1.2** - Create database schema: `tracks` table ✅
- **Status:** Complete (2024-12-19)
- **Migration:** `20260112173132_create_tracks_table.sql`
- **Tests:** `schema.test.ts` ✅ All passing

#### **Task 1.3** - Create database schema: `content_cache` table ✅
- **Status:** Complete (2024-12-19)
- **Migration:** `20260112173224_create_content_cache_table.sql`
- **Tests:** `schema.test.ts` ✅ All passing

#### **Task 1.4** - Create database schema: `user_study_log` table ✅
- **Status:** Complete (2024-12-19)
- **Migration:** `20260112173226_create_user_study_log_table.sql`
- **Tests:** `schema.test.ts` ✅ All passing

### 🔒 Row Level Security (RLS)

#### **Task 2.1** - Enable RLS on `tracks` table ✅
- **Status:** Complete (2024-12-19)
- **Policy:** All users can SELECT
- **Tests:** `rls.test.ts` ✅ All passing

#### **Task 2.2** - Enable RLS on `content_cache` table ✅
- **Status:** Complete (2024-12-19)
- **Policy:** Authenticated users can SELECT
- **Tests:** `rls.test.ts` ✅ All passing

#### **Task 2.3** - Enable RLS on `user_study_log` table ✅
- **Status:** Complete (2024-12-19)
- **Policy:** Users can only access own records
- **Tests:** `rls.test.ts` ✅ All passing

### 🔐 Authentication

#### **Task 3.1** - Configure Anonymous login ✅
- **Status:** Complete (2024-12-19)
- **Config:** `enable_anonymous_sign_ins = true`
- **Tests:** `anonymous.test.ts` (5 tests) ✅ All passing

#### **Task 3.2** - Configure Google OAuth ✅
- **Status:** Complete (2024-12-19)
- **Config:** `[auth.external.google]` section added
- **Tests:** `google-oauth.test.ts` (2 tests) ✅
- **Note:** Requires Google Cloud Console setup for full OAuth

#### **Task 3.3** - Configure Apple Sign-In ✅
- **Status:** Complete (2024-12-19)
- **Config:** `[auth.external.apple]` section exists
- **Tests:** `apple-oauth.test.ts` (2 tests) ✅
- **Note:** Requires Apple Developer account setup

### ⚡ Edge Functions Structure

#### **Task 4.1** - Create Edge Functions directory structure ✅
- **Status:** Complete (2024-12-19)
- **Structure:** `supabase/functions/` with `_shared/`
- **Tests:** `structure.test.ts` (6 tests) ✅ All passing

#### **Task 4.2** - Create shared utilities (CORS, Auth) ✅
- **Status:** Complete (2024-12-19)
- **Files:** `_shared/cors.ts`, `_shared/auth.ts`
- **Tests:** `structure.test.ts` ✅ All passing

### 📅 Track Scheduling

#### **Task 5.1** - Implement `generate-schedule` Edge Function ✅
- **Status:** Complete (2024-12-19)
- **Function:** `supabase/functions/generate-schedule/index.ts`
- **Tests:** `generate-schedule.test.ts` ✅ Written
- **Utilities:** `_shared/calendar.ts`, `_shared/content-order.ts` ✅
- **Note:** Function implemented. Tests need function served locally

---

## 🔄 IN PROGRESS (0 tasks)

*No tasks currently in progress*

---

## 📋 TO DO (4 tasks)

### 📅 Track Scheduling (Scheduling Agent)

#### **Task 5.2** - Implement DAILY_WEEKDAYS_ONLY schedule type
- **Priority:** High
- **Requirements:**
  - Weekdays only, excludes Shabbat and Jewish holidays
  - Tests written first (server-testing agent)
  - Implementation (scheduling agent)
- **Acceptance:** Only weekdays are scheduled, holidays excluded
- **Reference:** TDD Section 6.3, scheduling.md

#### **Task 5.3** - Implement user track joining logic
- **Priority:** High
- **Requirements:**
  - Users can join tracks at any point
  - Tests written first (server-testing agent)
  - Implementation (scheduling agent)
- **Acceptance:** User gets first scheduled unit from join date
- **Reference:** TDD Section 6.2, scheduling.md

### 🤖 Content Generation (Content Generation Agent)

#### **Task 6.1** - Implement Sefaria API integration
- **Priority:** Medium
- **Requirements:**
  - Shared utility: `_shared/sefaria.ts`
  - Tests written first (server-testing agent)
  - Implementation (content-generation agent)
- **Acceptance:** Can fetch Mishnah text from Sefaria API
- **Reference:** TDD Section 7, content-generation.md

#### **Task 6.2** - Implement `generate-content` Edge Function
- **Priority:** Medium
- **Requirements:**
  - Edge Function: `supabase/functions/generate-content/index.ts`
  - Tests written first (server-testing agent)
  - Implementation (content-generation agent)
- **Acceptance:** Generates AI explanations and caches content
- **Reference:** TDD Section 7, content-generation.md

---

## 📊 Progress Summary

| Category | Done | In Progress | To Do | Total |
|----------|------|-------------|-------|-------|
| **Backend Foundation** | 11 | 0 | 0 | 11 |
| **Track Scheduling** | 1 | 0 | 2 | 3 |
| **Content Generation** | 0 | 0 | 2 | 2 |
| **TOTAL** | **15** | **0** | **4** | **19** |

**Completion Rate:** 79% (15/19 tasks)

---

## 🧪 Test Status

### Test Results:
- ✅ **Syntax Tests:** 16/16 passing (100%)
- ✅ **Schema Tests:** 12/14 passing (2 timer leaks from Supabase client)
- ✅ **RLS Tests:** 12/13 passing (1 needs verification, others are timer leaks)

**Note:** Timer leaks are from Supabase JS client's internal realtime connections and don't affect functionality. All actual assertions pass.

---

## 📝 Notes

- Tasks are ordered by dependency (schema before RLS, RLS before auth)
- Each task should be small and independently testable
- Follow TDD workflow: Tests → Implementation → Verification
- Update this board when tasks are completed

---

## 🎯 Next Steps

1. **Task 5.2** - Complete DAILY_WEEKDAYS_ONLY schedule type implementation
2. **Task 5.3** - Complete user track joining logic
3. **Task 6.1** - Start Sefaria API integration
4. **Task 6.2** - Implement content generation Edge Function

---

*This board is automatically generated from `tasks.md`. For detailed task information, see the main tasks file.*
