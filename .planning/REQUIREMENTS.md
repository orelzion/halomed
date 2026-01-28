# Requirements: HaLomeid Enhancement

**Defined:** 2026-01-28
**Core Value:** Users can build meaningful daily Torah learning habit with tools to understand what's working and test knowledge effectively.

## v1 Requirements

### Analytics - Metrics Collection

- [x] **ANLYT-01**: System tracks Active Learning Days (only when content available, excludes Shabbat/holidays)
- [x] **ANLYT-02**: System tracks popular tracks (engagement by track)
- [x] **ANLYT-03**: System tracks streak drop-off points (where users lose momentum)
- [x] **ANLYT-04**: System tracks quiz completion rates (by week, by track)
- [x] **ANLYT-05**: System tracks review session usage frequency
- [x] **ANLYT-06**: System tracks explanation engagement (open rates)

### Analytics - Admin Dashboard

- [ ] **ANLYT-07**: Admin can view analytics dashboard on production deployment
- [ ] **ANLYT-08**: Admin can filter metrics by date range (last day, week, month)
- [ ] **ANLYT-09**: Dashboard displays metrics with charts/visualizations
- [ ] **ANLYT-10**: Dashboard refreshes manually (no real-time updates required)
- [ ] **ANLYT-11**: Only users with admin role can access analytics page

### Analytics - Technical Implementation

- [x] **ANLYT-12**: Analytics uses PostgreSQL materialized views for aggregation
- [x] **ANLYT-13**: Analytics is server-side only (no RxDB sync)
- [x] **ANLYT-14**: Admin access protected via Supabase RLS policies

### Quiz - Generation Format

- [ ] **QUIZ-01**: Quiz generator creates scenario questions in Hebrew (modern situations, relatable characters)
- [ ] **QUIZ-02**: Quiz generator creates sevara questions in Hebrew (logic/reasoning)
- [ ] **QUIZ-03**: Quiz generation uses Mishnah text + Halakha commentary as source
- [ ] **QUIZ-04**: Each question includes explanation for correct answer

### Quiz - Selection Logic

- [ ] **QUIZ-05**: Weekly quiz selects 1 scenario question per Mishnah learned that week
- [ ] **QUIZ-06**: If total scenarios < 20, backfill with sevara questions (max 1 per Mishnah)
- [ ] **QUIZ-07**: If total scenarios >= 20, quiz includes scenarios only

### Quiz - Quality & Accuracy

- [ ] **QUIZ-08**: Generated questions reference source Mishnah text
- [ ] **QUIZ-09**: AI generation uses appropriate temperature for halakhic accuracy
- [ ] **QUIZ-10**: Question generation includes cultural sensitivity for Torah content

## v2 Requirements

### Analytics - Advanced Features

- **ANLYT-15**: User-facing analytics dashboard showing personal stats
- **ANLYT-16**: Real-time analytics metrics (no manual refresh)
- **ANLYT-17**: Analytics available in development environment
- **ANLYT-18**: Concept mastery tracking across related Mishnayot
- **ANLYT-19**: Learning velocity trends over time

### Quiz - Enhanced Features

- **QUIZ-11**: Adaptive difficulty based on past performance
- **QUIZ-12**: Spaced repetition scheduling for review quizzes
- **QUIZ-13**: Collaborative quiz features (study partner mode)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Social features / leaderboards | Creates anxiety and competition, conflicts with "calm learning" philosophy |
| Push notifications / reminders | Deliberately excluded to avoid guilt or pressure |
| Gamification (badges, levels, points) | Risk of extrinsic motivation replacing intrinsic learning value |
| Real-time collaborative learning | High complexity, not aligned with personal study focus |
| Mobile native apps | Web PWA sufficient for MVP, defer to future |
| Multi-language support | Hebrew-only for target audience, defer expansion |
| Video/audio content | Text-based learning is core, multimedia not in scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANLYT-01 | Phase 1 | Complete |
| ANLYT-02 | Phase 1 | Complete |
| ANLYT-03 | Phase 1 | Complete |
| ANLYT-04 | Phase 1 | Complete |
| ANLYT-05 | Phase 1 | Complete |
| ANLYT-06 | Phase 1 | Complete |
| ANLYT-07 | Phase 2 | Pending |
| ANLYT-08 | Phase 2 | Pending |
| ANLYT-09 | Phase 2 | Pending |
| ANLYT-10 | Phase 2 | Pending |
| ANLYT-11 | Phase 2 | Pending |
| ANLYT-12 | Phase 1 | Complete |
| ANLYT-13 | Phase 1 | Complete |
| ANLYT-14 | Phase 1 | Complete |
| QUIZ-01 | Phase 3 | Pending |
| QUIZ-02 | Phase 3 | Pending |
| QUIZ-03 | Phase 3 | Pending |
| QUIZ-04 | Phase 3 | Pending |
| QUIZ-05 | Phase 4 | Pending |
| QUIZ-06 | Phase 4 | Pending |
| QUIZ-07 | Phase 4 | Pending |
| QUIZ-08 | Phase 3 | Pending |
| QUIZ-09 | Phase 3 | Pending |
| QUIZ-10 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after roadmap creation*
