# Roadmap: HaLomeid Analytics & Quiz Improvements

## Overview

This milestone enhances HaLomeid with in-house analytics to understand user engagement and pedagogically-improved quiz generation. The roadmap delivers in four phases: analytics foundation (metrics + database), admin dashboard (visualization + access control), quiz generation improvements (scenario/sevara prompts + quality), and quiz selection logic (20-question cap + pedagogical filtering). Every phase produces measurable user-facing value aligned to calm, consistent learning without overwhelm.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Analytics Foundation** - Database layer + metrics collection infrastructure
- [ ] **Phase 2: Admin Dashboard** - Visualization + access control for engagement insights
- [ ] **Phase 3: Quiz Generation** - Enhanced prompts with scenario/sevara questions
- [ ] **Phase 4: Quiz Selection** - Pedagogical filtering + 20-question cap

## Phase Details

### Phase 1: Analytics Foundation
**Goal**: Admin can query learning-specific engagement metrics from production database
**Depends on**: Nothing (first phase)
**Requirements**: ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04, ANLYT-05, ANLYT-06, ANLYT-12, ANLYT-13, ANLYT-14
**Success Criteria** (what must be TRUE):
  1. System calculates Active Learning Days (excludes Shabbat/holidays, only counts when content available)
  2. System tracks popular tracks, streak drop-off points, and quiz completion rates
  3. System tracks review session usage and explanation engagement
  4. Analytics data aggregates correctly via PostgreSQL functions (no RxDB sync)
  5. Admin role enforcement works via Supabase RLS policies
**Plans**: TBD

Plans:
- [ ] 01-01: TBD during planning

### Phase 2: Admin Dashboard
**Goal**: Admin can view engagement analytics through web-based dashboard on production deployment
**Depends on**: Phase 1
**Requirements**: ANLYT-07, ANLYT-08, ANLYT-09, ANLYT-10, ANLYT-11
**Success Criteria** (what must be TRUE):
  1. Admin can access /admin/analytics page (non-admin users redirected)
  2. Dashboard displays metrics with charts (popular tracks, streak patterns, quiz completion)
  3. Admin can filter metrics by date range (last day, week, month)
  4. Dashboard refreshes manually (no real-time updates required)
  5. Only users with admin role can view analytics page
**Plans**: TBD

Plans:
- [ ] 02-01: TBD during planning

### Phase 3: Quiz Generation
**Goal**: System generates pedagogically-structured quiz questions in Hebrew with scenario and sevara types
**Depends on**: Phase 2
**Requirements**: QUIZ-01, QUIZ-02, QUIZ-03, QUIZ-04, QUIZ-08, QUIZ-09, QUIZ-10
**Success Criteria** (what must be TRUE):
  1. Quiz generator creates scenario questions (modern situations, relatable characters) in Hebrew
  2. Quiz generator creates sevara questions (logic/reasoning) in Hebrew
  3. Generated questions reference Mishnah text + Halakha commentary
  4. Each question includes explanation for correct answer
  5. Questions follow cultural sensitivity guidelines for Torah content
**Plans**: TBD

Plans:
- [ ] 03-01: TBD during planning

### Phase 4: Quiz Selection
**Goal**: Weekly quiz contains exactly 1 scenario per Mishnah (max 20 questions total) instead of 40+ overwhelming questions
**Depends on**: Phase 3
**Requirements**: QUIZ-05, QUIZ-06, QUIZ-07
**Success Criteria** (what must be TRUE):
  1. Weekly quiz selects 1 scenario question per Mishnah learned that week
  2. If scenarios < 20, system backfills with sevara questions (max 1 per Mishnah)
  3. If scenarios >= 20, quiz includes scenarios only (no sevara)
  4. Weekly quiz never exceeds 20 questions total
  5. User sees reduced quiz volume (20 max instead of 40+)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Analytics Foundation | 0/TBD | Not started | - |
| 2. Admin Dashboard | 0/TBD | Not started | - |
| 3. Quiz Generation | 0/TBD | Not started | - |
| 4. Quiz Selection | 0/TBD | Not started | - |
