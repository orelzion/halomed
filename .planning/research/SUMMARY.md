# Project Research Summary

**Project:** HaLomeid Analytics & Quiz Improvements
**Domain:** Educational Technology - Torah Learning Application Enhancement
**Researched:** 2026-01-28
**Confidence:** MEDIUM-HIGH

## Executive Summary

HaLomeid is adding two enhancements to its offline-first Torah learning app: an admin analytics dashboard and pedagogically-improved quiz generation. The research reveals that **learning apps succeed when analytics focus on learning outcomes (not vanity metrics) and quizzes test understanding (not memorization)**.

The recommended approach leverages the existing Next.js 16 + Supabase + RxDB stack with minimal new dependencies. Analytics should be **server-side only** (no client sync, admin-only, production environment) using PostgreSQL materialized views and Recharts for visualization. Quiz improvements should implement **pedagogical question selection** (1 scenario + backfill sevara, max 20 total) with enhanced Gemini prompts that ground questions in Halakha commentary.

**Key risks to mitigate:** (1) Vanity metrics that contradict HaLomeid's "calm learning" philosophy, (2) Quiz cognitive overload from excessive questions, (3) AI hallucinations in religious content, (4) Privacy violations from tracking religious study patterns, and (5) Performance degradation from analytics overhead in offline-first architecture. All risks have clear prevention strategies aligned to project constraints.

## Key Findings

### Recommended Stack

The stack additions are minimal and integrate cleanly with existing infrastructure. **Recharts** (120kb, composable React API) is the recommended charting library over alternatives like Tremor or Chart.js due to Next.js compatibility and lighter bundle size. **PostgreSQL materialized views** provide analytics aggregation without separate analytics infrastructure, keeping everything in-house and under control. The existing **Google Gemini API** integration extends to improved quiz generation without adding new AI providers.

**Core technologies:**
- **Recharts ^2.13.x**: React charting for admin dashboard - lightweight, Next.js SSR compatible, active maintenance
- **PostgreSQL Materialized Views**: Pre-aggregated analytics queries - native performance optimization, refresh on schedule
- **Google Gemini API (gemini-3-flash-preview)**: Enhanced quiz generation - already integrated, supports structured JSON output, cost-effective
- **Supabase RLS Policies**: Admin-only access control - existing security model, no new auth mechanism needed
- **date-fns ^4.1.x**: Date range filtering - already available via @hebcal/core, tree-shakeable

**Critical database additions:**
- `quiz_questions.question_type` column (enum: 'scenario' | 'sevara') - enables pedagogical selection
- Materialized views for analytics (daily_active, quiz_completion, review_usage) - performance optimization
- `user_profiles.is_admin` flag - role-based access control for analytics

### Expected Features

Research shows learning app analytics divide into **engagement metrics** (table stakes) vs **learning effectiveness metrics** (differentiators). Quiz systems similarly divide into **knowledge verification** (table stakes) vs **pedagogical scaffolding** (differentiators).

**Must have (table stakes):**
- **Active Learning Days (ALD)** - Days when content available AND user engaged (respects Jewish calendar, excludes Shabbat/holidays). More meaningful than generic DAU for Torah learning.
- **Track completion rate** - Did users finish what they started? Basic but essential learning metric.
- **Quiz scores** - Pass/fail, percentage correct. Users expect basic assessment results.
- **Clear question stems** - Hebrew content, unambiguous phrasing. Minimum quality bar for educational quizzes.
- **Immediate feedback** - Users need to know if they're right. Standard in digital learning.

**Should have (competitive differentiators):**
- **Scenario-based questions** - Apply knowledge to realistic modern situations (e.g., "Reuven borrows Shimon's laptop..."). Tests understanding, not rote memorization.
- **Sevara (reasoning) questions** - Test understanding of logic behind rulings. "Why does the Tanna rule X in case Y but not Z?"
- **Explanation engagement tracking** - Which AI explanations are read/helpful? Informs content quality improvements.
- **Review session usage metrics** - Is spaced repetition feature being used? Validates feature value.
- **Quiz completion rate by content** - Which topics cause drop-off? Identifies confusing areas.

**Defer (v2+):**
- **Concept mastery tracking** - Requires extensive question tagging infrastructure, longitudinal data collection.
- **Spaced repetition scheduling** - Sophisticated algorithm (SM-2, Leitner), needs performance history baseline.
- **Adaptive difficulty** - Requires baseline data on question P-values (percentage answering correctly).
- **Learning velocity trends** - Pace analysis needs multiple weeks of data to be meaningful.

**Anti-features (explicitly avoid):**
- **Leaderboards / social comparison** - Creates anxiety, undermines intrinsic Torah learning motivation.
- **Perfect streak enforcement** - Guilt-inducing, ignores valid breaks (illness, travel, holidays).
- **Real-time drop-off alerts** - Creates enforcement pressure, counter to "calm" value proposition.
- **Individual user tracking for admins** - Privacy violation, aggregate cohorts sufficient for product decisions.

### Architecture Approach

The analytics and quiz enhancements integrate with HaLomeid's existing Next.js + Supabase + RxDB architecture without disrupting offline-first design. **Analytics sits above the sync layer** (server-only, no RxDB involvement), while **quiz improvements work within existing content generation pipeline** (modify `generate-quiz` Edge Function prompts and selection logic).

**Major components:**

1. **Analytics System (NEW - Server-Side Only)**
   - Responsibility: Aggregate engagement metrics, provide admin-facing insights, calculate learning-specific metrics (Active Learning Days, streak patterns, quiz completion)
   - Does NOT: Sync to client (RxDB), expose user-specific data to other users, run in development
   - Implementation: Edge Function (`analytics-metrics`) runs PostgreSQL aggregation queries, admin page (Next.js server component) displays via Recharts

2. **Quiz Generation System (MODIFIED - Existing Edge Function)**
   - Responsibility: Generate pedagogically-structured questions (scenario + sevara), select questions per Mishnah learned, apply selection logic (1 scenario minimum, optional sevara, max 20 total)
   - Modification: Enhanced Gemini prompts (include Halakha commentary), pedagogical selection algorithm (filter by question_type), store with type metadata
   - Integration: Reads `content_cache.ai_explanation_json.halakha`, writes to `quiz_questions` with new `question_type` column

3. **Admin Analytics Page (NEW - Next.js Page)**
   - Responsibility: Display analytics dashboard (admin-only), call analytics Edge Function, provide date range selector, render charts
   - Access Control: Check user role (admin flag), redirect non-admin to home, production environment only
   - Pattern: Server Component fetches data, no client-side state, SSR with optional manual refresh

### Critical Pitfalls

Research identified 12 pitfalls across three severity levels. These five are critical threats to project success:

1. **Vanity Metrics That Drive Wrong Behavior**
   - Risk: Analytics showing DAU/MAU instead of learning outcomes drives product decisions that optimize for engagement theater rather than learning effectiveness
   - Prevention: Define learning-specific metrics upfront (Active Learning Days, concept mastery, retrieval strength), exclude guilt-inducing metrics (streak comparisons, "you're behind" messaging), keep analytics admin-only in MVP

2. **Privacy Violations in Religious Content Tracking**
   - Risk: Tracking which Torah sections users read reveals personal religious observance levels - deeply private information many users won't consent to sharing
   - Prevention: Minimize data collection (track content engagement in aggregate, not per-user-per-content), anonymize analytics (show "Track popularity" not "User X's choices"), explicit consent boundaries, short retention limits (90 days)

3. **Quiz Cognitive Overload (Volume Problem)**
   - Risk: Current implementation generates 40+ questions per weekly quiz, turning learning into overwhelming chore
   - Prevention: Cap at 20 questions maximum, pedagogical selection (1 scenario per Mishnah required, backfill sevara up to max), progressive disclosure (show in batches), quality over quantity

4. **AI Hallucinations in Quiz Content**
   - Risk: Gemini generates factually incorrect or halakhically inaccurate quiz questions - especially dangerous in religious educational context where trust is paramount
   - Prevention: Lower temperature (0.2-0.4 vs current 0.7), ground questions in source material (include Halakha from ai_explanation_json), validation layer (check answers against Sefaria), avoid disputed rulings, human review pipeline post-MVP

5. **Performance Degradation from Analytics Overhead**
   - Risk: Analytics tracking adds latency to user interactions in offline-first architecture - blocks UI, consumes sync bandwidth, drains battery
   - Prevention: Async non-blocking analytics (fire-and-forget, UI never waits), batch and debounce (queue locally, send on interval), offline-first queueing (IndexedDB storage when offline), performance budgets (max 50ms latency per interaction)

## Implications for Roadmap

Based on research, suggested phase structure addresses dependencies and risk mitigation:

### Phase 1: Analytics Foundation (Database + Edge Function)
**Rationale:** Analytics is independent of quiz changes, can be built and tested separately. Establishes data layer that Phase 2 quiz improvements will be measured against.

**Delivers:**
- PostgreSQL functions for metric aggregation (Active Learning Days, quiz completion rate, review usage)
- `user_profiles` table with `is_admin` flag (or user metadata approach)
- `analytics-metrics` Edge Function (server-side aggregation, no client sync)
- Materialized views for performance (optional, if needed for scale)

**Addresses:**
- Table stakes metrics: Completion rate, time spent, quiz scores
- Differentiator metrics: Active Learning Days (excludes Shabbat/holidays), review session usage

**Avoids:**
- Pitfall 1 (vanity metrics) by defining learning-specific metrics upfront
- Pitfall 2 (privacy violations) by designing anonymized aggregation layer
- Pitfall 5 (performance degradation) by keeping analytics server-side only

**Research Flag:** LOW - PostgreSQL materialized views are well-documented, standard analytics patterns. No phase-specific research needed.

---

### Phase 2: Admin Dashboard (UI + Charts)
**Rationale:** Depends on Phase 1 data layer. Provides visibility into engagement patterns before making quiz changes.

**Delivers:**
- `/admin/analytics` Next.js page with auth middleware (role check, redirect non-admin)
- Recharts integration (line/bar charts for key metrics)
- Date range filtering (last day/week/month views)
- Jewish calendar context display (Shabbat, holidays marked)
- Install dependencies: recharts ^2.13.0, date-fns ^4.1.0

**Addresses:**
- Table stakes: Basic engagement dashboard
- Differentiator: Learning-specific metrics visualization (Active Learning Days, not generic DAU)

**Avoids:**
- Pitfall 1 (vanity metrics) by focusing dashboard on learning outcomes
- Pitfall 7 (analytics misinterpretation) by including Jewish calendar context
- Pitfall 10 (dashboard overload) by starting with 5-7 key metrics only

**Research Flag:** LOW - Recharts + Next.js integration is well-documented. Standard Server Component patterns.

---

### Phase 3: Quiz Schema + Question Type Column
**Rationale:** Database schema change required before quiz generation improvements. Small, low-risk migration that enables Phase 4.

**Delivers:**
- Add `question_type` column to `quiz_questions` table (enum: 'scenario' | 'sevara')
- Create index on `(content_ref, question_type)` for efficient filtering
- Backfill existing questions as 'sevara' (default) or leave null
- Migration script + rollback plan

**Addresses:**
- Prerequisite for pedagogical question selection
- Enables filtering by question type in quiz selection logic

**Avoids:**
- Pitfall 6 (question quality varies) by enabling intelligent selection based on type

**Research Flag:** LOW - Standard database migration. No phase-specific research needed.

---

### Phase 4: Quiz Prompt Engineering (Scenario + Sevara)
**Rationale:** Depends on Phase 3 schema. This is the highest-risk phase due to AI quality concerns - requires careful prompt design and testing.

**Delivers:**
- Enhanced Gemini prompts in `_shared/gemini.ts`:
  - Scenario question prompt (Hebrew: תרחיש) - modern situation applying Mishnah ruling
  - Sevara question prompt (Hebrew: סברא) - reasoning/logic behind ruling
- Include Halakha commentary from `ai_explanation_json.halakha` in prompt context
- Lower temperature to 0.2-0.4 (from current 0.7) for consistency
- Cultural guidelines in prompt (kosher examples, Hebrew names, gender-appropriate scenarios)

**Addresses:**
- Differentiator features: Scenario-based questions, sevara (reasoning) questions
- Improved pedagogical depth (understanding vs memorization)

**Avoids:**
- Pitfall 4 (AI hallucinations) by grounding in source material, lower temperature
- Pitfall 8 (cultural insensitivity) by including guidelines in prompt
- Pitfall 11 (brief explanations) by requiring 2-3 sentence answer explanations

**Research Flag:** HIGH - Prompt engineering requires iteration and quality validation. Plan to:
- Generate 50+ sample questions for manual review
- Test with stakeholders (rabbi/educator for halakhic accuracy, users for scenario relevance)
- Iterate on prompt based on feedback
- Monitor first 2-3 weeks of generated questions closely

---

### Phase 5: Quiz Selection Logic (20 Question Cap)
**Rationale:** Depends on Phase 4 question generation. Implements pedagogical selection algorithm to address current 40+ question problem.

**Delivers:**
- Modify `generate-quiz/index.ts` Edge Function:
  - Selection algorithm: 1 scenario per Mishnah (minimum coverage)
  - Backfill with sevara questions (max 1 per Mishnah) up to 20 total
  - Store selected questions only (not all generated)
  - Shuffle to avoid predictable order
- Update quiz page to respect 20 question limit

**Addresses:**
- Critical issue: Reduce weekly quiz from 40+ questions to manageable 20 max
- Table stakes: Appropriate difficulty (60-80% correct rate target)

**Avoids:**
- Pitfall 3 (quiz cognitive overload) by capping at 20 questions with smart selection
- Pitfall 6 (quality varies by length) by using pedagogical criteria, not text length

**Research Flag:** LOW - Selection algorithm is straightforward business logic. Standard patterns.

---

### Phase 6: Integration Testing + Monitoring
**Rationale:** Validates both systems (analytics + quiz) working together end-to-end.

**Delivers:**
- End-to-end flow test: User completes learning → quiz generated → user completes quiz → admin views analytics
- Performance testing: Analytics queries <1s, quiz generation <10s, offline sync verified
- Gemini API cost monitoring (new prompts are longer, track spend)
- User acceptance testing: Deploy to staging, gather feedback on quiz quality
- Production rollout plan with gradual rollout (test with admin users first)

**Addresses:**
- Validates table stakes and differentiators working as designed
- Establishes baseline metrics for post-launch iteration

**Avoids:**
- Pitfall 5 (performance degradation) by monitoring latency and setting performance budgets
- Pitfall 12 (inconsistent event naming) by validating analytics schema consistency

**Research Flag:** LOW - Standard integration testing practices.

---

### Phase Ordering Rationale

**Why this order:**
1. **Analytics before quiz changes** - Establish measurement baseline before making product changes. Can't evaluate quiz improvements without analytics to measure completion rates.
2. **Database schema early** - Enables quiz generation work to proceed in parallel after Phase 3. Low-risk migration that unblocks higher-risk prompt engineering.
3. **Prompt engineering before selection** - Generate quality questions first, then optimize selection. Can't select well if generated questions aren't good.
4. **Integration testing last** - Validates full system once both subsystems (analytics + quiz) are built.

**How this avoids pitfalls:**
- Phases 1-2 build analytics infrastructure that prevents Pitfall 1 (vanity metrics) and Pitfall 2 (privacy) by design
- Phase 3 is low-risk enabler that prevents blocking Phase 4-5
- Phase 4 addresses Pitfall 4 (hallucinations) and Pitfall 8 (cultural sensitivity) with focused effort on prompt quality
- Phase 5 solves Pitfall 3 (cognitive overload) with smart selection
- Phase 6 catches Pitfall 5 (performance) before production rollout

**Parallelization opportunities:**
- After Phase 3, Phases 4-5 can partially overlap (prompt development while selection logic is designed)
- Phase 2 dashboard development can partially overlap with Phase 3 schema migration
- However, testing should be sequential to avoid debugging complexity

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 4 (Prompt Engineering):** HIGH research need - Prompt quality for religious content requires domain expertise. Plan to allocate time for:
  - Iteration on prompt structure with example outputs
  - Validation with rabbi/educator stakeholders
  - Cultural sensitivity review (Orthodox norms, halakhic accuracy)
  - Hebrew language quality assessment by native speakers

- **Phase 6 (Performance Testing):** MEDIUM research need - Offline-first analytics patterns less documented. Plan to:
  - Prototype IndexedDB queueing for analytics events
  - Test batching strategies under various network conditions
  - Validate RxDB sync behavior with analytics overhead

Phases with standard patterns (skip research-phase):

- **Phase 1 (Analytics Foundation):** PostgreSQL materialized views are well-documented, standard analytics aggregation patterns
- **Phase 2 (Admin Dashboard):** Recharts + Next.js Server Components have extensive documentation and examples
- **Phase 3 (Quiz Schema):** Standard database migration, low complexity
- **Phase 5 (Quiz Selection):** Straightforward business logic, no novel patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Recharts well-established for Next.js, PostgreSQL materialized views are standard, Gemini already integrated |
| Features | MEDIUM-HIGH | Learning analytics patterns well-documented in EdTech, table stakes vs differentiators clear. Specific to HaLomeid context reduces confidence slightly. |
| Architecture | HIGH | Integration points with existing codebase clearly defined, offline-first constraints preserved, server-side analytics approach proven |
| Pitfalls | HIGH | Generic learning app pitfalls well-established, project-specific risks (Torah content, offline-first) clearly identified with prevention strategies |

**Overall confidence:** MEDIUM-HIGH

Research is based on solid educational technology principles (cognitive load theory, retrieval practice, transfer of learning) and well-documented technical patterns (PostgreSQL analytics, React charting, LLM prompt engineering). Confidence reduced slightly by:
- Prompt engineering quality is inherently iterative (can't guarantee first-pass success)
- Cultural sensitivity in AI-generated Hebrew content needs native speaker validation
- Active Learning Days calculation logic specific to Jewish calendar (novel metric, not generic)

### Gaps to Address

**During Phase 4 (Prompt Engineering):**
- **Hebrew language quality:** AI-generated Hebrew naturalness requires native speaker review. Plan to establish review pipeline with stakeholders.
- **Halakhic accuracy:** Quiz questions must be validated by rabbi/educator for religious correctness. Plan stakeholder involvement in prompt iteration.
- **Scenario relevance:** Modern situations must resonate with religious/traditional users. Plan user testing with target demographic.

**During Phase 6 (Integration Testing):**
- **Gemini API cost tracking:** New prompts are longer (include Halakha commentary), cost may increase. Monitor spend and optimize if needed.
- **Materialized view refresh timing:** Optimal refresh schedule (nightly? hourly?) depends on admin usage patterns. Start conservative, adjust based on actual use.
- **Analytics performance at scale:** On-demand aggregation acceptable for MVP (100-10K users), but plan to transition to materialized views if queries slow down.

**Post-MVP validation needs:**
- **Optimal quiz question count:** Is 20 the right max, or should it be 15? 25? Collect behavioral data (completion rates, user feedback) to refine.
- **Scenario vs sevara ratio:** Currently 1 scenario + backfill sevara. Analyze quiz performance by question type to optimize ratio.
- **Active Learning Days accuracy:** Validate ALD calculation matches user perception of "days I could have learned but didn't."

## Sources

### Primary (HIGH confidence)

**Existing Codebase:**
- `/Users/orelzion/git/halomed/docs/halomed_prd.md` - Core value proposition ("calm, consistent learning without guilt"), target users (religious/traditional)
- `/Users/orelzion/git/halomed/docs/halomed_tdd.md` - Technical architecture (Next.js 16, Supabase, RxDB), database schema, sync strategy
- `/Users/orelzion/git/halomed/.planning/PROJECT.md` - Current milestone scope, known issues (40+ quiz questions problem)
- `/Users/orelzion/git/halomed/supabase/functions/generate-quiz/index.ts` - Current quiz generation implementation
- `/Users/orelzion/git/halomed/supabase/functions/_shared/gemini.ts` - Gemini API integration (temperature 0.7)
- `/Users/orelzion/git/halomed/web/lib/database/database.ts` - RxDB collections and sync configuration

**Training Knowledge (Educational Technology):**
- Learning analytics frameworks - standard metrics (completion rate, retention, engagement depth)
- Cognitive Load Theory (Sweller, 1988) - intrinsic/extraneous/germane load
- Testing Effect / Retrieval Practice (Roediger & Karpicke, 2006) - quizzing strengthens memory
- Transfer of Learning principles - application-based assessment
- Bloom's Taxonomy - levels of understanding (recall → application → analysis)

**Training Knowledge (Technical Patterns):**
- PostgreSQL materialized views for analytics aggregation (standard pattern, native feature)
- Recharts React charting library (popular for Next.js projects, training data through Jan 2025)
- LLM prompt engineering patterns (structured output, temperature control, few-shot learning)
- Offline-first architecture patterns (IndexedDB queueing, sync strategies)

### Secondary (MEDIUM confidence)

**Technology Recommendations:**
- Recharts bundle size (120kb, 40kb gzipped) - based on training data, may have changed
- date-fns v4 API - assumed backward compatible, verify during implementation
- Gemini pricing ($0.075/$0.30 per 1M tokens) - based on training data, verify current rates

**Pedagogical Patterns:**
- Optimal quiz length (20 questions = 10-15 minutes) - based on general EdTech guidance, not Torah-specific
- Question difficulty target (60-80% correct rate) - educational psychology best practice
- Scenario-based assessment effectiveness - established in medical/legal education, applied to Torah learning

### Tertiary (LOW confidence, needs validation)

**Project-Specific Assumptions:**
- Active Learning Days metric naming and calculation approach - novel metric, not found in existing literature
- Cultural sensitivity guidelines for AI-generated Torah content - extrapolated from general religious content best practices
- Supabase pg_cron availability - assumed available, verify during Phase 1 implementation
- Admin role storage approach - chose separate table over user metadata, validate with team

---

**Research completed:** 2026-01-28
**Ready for roadmap:** Yes

**Next steps:**
1. Roadmapper agent will use this summary to structure detailed phase plans
2. Phase 4 (Prompt Engineering) flagged for additional research and stakeholder involvement
3. Implementation should validate assumptions (quiz length, ALD calculation) with behavioral data
