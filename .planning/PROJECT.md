# HaLomeid Enhancement: Analytics & Quiz Improvements

## What This Is

Enhancement milestone for HaLomeid (הלומד), an offline-first Torah learning web app. This milestone adds in-house analytics to understand user engagement and improves the weekly quiz mechanism with pedagogically-sound question generation. The app helps religious and traditional users build a consistent daily Mishnah learning habit without overload or guilt.

## Core Value

Users can build a meaningful daily Torah learning habit through clear, calm, consistent study - with tools to understand what's working and test their knowledge effectively.

## Requirements

### Validated

<!-- Existing capabilities confirmed working in production -->

- ✓ Daily learning path with pace-based content unlocking — existing
- ✓ Offline-first sync (RxDB + Supabase) with 14-day rolling window — existing
- ✓ AI-generated explanations from Sefaria commentaries (via Gemini) — existing
- ✓ Weekly quiz generation from learned content — existing
- ✓ Review sessions with spaced repetition — existing
- ✓ Streak tracking (only counts scheduled learning days) — existing
- ✓ User preferences (pace, skip Friday, Israel mode) — existing
- ✓ Anonymous + OAuth authentication (Google, Apple) — existing
- ✓ Dark/light/system theme support — existing
- ✓ Hebrew-only UI with RTL layout — existing
- ✓ PWA with offline capability — existing

### Active

<!-- Current milestone scope -->

- [ ] Admin can view engagement analytics on production deployment
- [ ] Analytics tracks popular tracks, streak drop-off points, quiz completion rates
- [ ] Analytics tracks review session usage and explanation engagement
- [ ] Analytics calculates Active Learning Days (only when content available, excludes Shabbat/holidays)
- [ ] Analytics supports date range filters (last day, week, month)
- [ ] Quiz generation uses pedagogical format (scenario + sevara questions in Hebrew)
- [ ] Quiz generation uses Mishnah text + Halakha commentary as source
- [ ] Weekly quiz selects 1 scenario question per Mishnah learned that week (minimum)
- [ ] Weekly quiz backfills with sevara questions (max 1 per Mishnah) up to 20 total questions
- [ ] Quiz questions follow modern scenario format with relatable characters and situations

### Out of Scope

- User-facing analytics dashboard — deferred to future milestone (TBD)
- Real-time analytics metrics — manual refresh sufficient for admin view
- Analytics in development environment — production only for now
- Social features or leaderboards — not aligned with calm learning approach
- Mobile native apps (Android/iOS) — web PWA sufficient
- Notifications/reminders — deliberately excluded to avoid guilt/pressure

## Context

**Existing System:**
- Next.js 16 web app with offline-first architecture
- RxDB (IndexedDB) syncs bidirectionally with Supabase PostgreSQL
- Edge Functions (Deno) handle content generation, scheduling, quiz creation
- AI explanations via Google Gemini API
- Content sourced from Sefaria API (Mishnah + commentaries)
- PostHog analytics currently installed but confusing/not tailored to learning metrics

**Why This Milestone:**
- PostHog provides generic web metrics, not learning-specific insights
- Need visibility into which features drive engagement (quizzes, reviews, explanations)
- Current quiz mechanism shows all generated questions (40+ per week), overwhelming users
- Quiz questions lack pedagogical structure - not testing application or understanding depth

**User Research:**
- Weekly quizzes are valued but current volume (40+ questions) creates friction
- Need to understand if features like review sessions are being used
- "Active days" metric should respect Jewish calendar (no guilt for days without content)

## Constraints

- **Platform**: Web-only (Next.js PWA) — no native mobile apps in this milestone
- **Language**: Hebrew-only UI — no i18n expansion
- **Auth**: Existing Supabase Auth (anonymous + OAuth) — no new auth methods
- **Database**: Supabase PostgreSQL + RxDB offline-first — maintain existing sync architecture
- **AI Provider**: Google Gemini API — already integrated for explanations
- **Content Source**: Sefaria API — established source for Torah texts
- **Deployment**: Vercel (web) + Supabase (backend) — existing infrastructure
- **Analytics Scope**: Admin-only, production environment — no user-facing stats in this milestone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| In-house analytics vs fix PostHog | PostHog not tailored to learning metrics; want control over what's measured | — Pending |
| Admin-only analytics (no user stats) | Simplifies scope; user-facing stats deferred to future | — Pending |
| 1 scenario + optional sevara per Mishnah | Maintains coverage while preventing overwhelm; 20 question cap manageable | — Pending |
| Quiz generation uses Mishnah + Halakha | More context than source text alone; Halakha provides practical application grounding | — Pending |
| Hebrew quiz content | Matches app language; users are Hebrew readers | — Pending |

---
*Last updated: 2026-01-28 after initialization*
