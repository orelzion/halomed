# Architecture Patterns: Analytics & Quiz Integration

**Domain:** Analytics and Quiz System Enhancement for Offline-First Torah Learning App
**Researched:** 2026-01-28
**Confidence:** HIGH (based on existing codebase architecture)

## Executive Summary

The analytics and improved quiz generation features integrate with HaLomeid's existing Next.js + Supabase + RxDB architecture without disrupting the offline-first design. **Analytics is server-side only** (no client sync, admin-only access, production environment), while **quiz generation modifies existing Edge Function logic** to implement pedagogical question selection and improved prompt engineering.

**Key architectural principle:** Analytics sits above the sync layer (server-only), while quiz improvements work within the existing content generation pipeline.

---

## Recommended Architecture

### System Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Web - Next.js 16)                       │
│                                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │  Study Page  │   │  Quiz Page   │   │  Admin Page  │                │
│  │              │   │              │   │  (analytics) │                │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                │
│         │                  │                   │                        │
│         │                  │                   │ (direct API call)      │
│         ▼                  ▼                   │                        │
│  ┌────────────────────────────────────────┐   │                        │
│  │         RxDB (IndexedDB)               │   │                        │
│  │  - learning_path (synced)              │   │                        │
│  │  - quiz_questions (synced)             │   │                        │
│  │  - content_cache (synced)              │   │                        │
│  │  - user_preferences (synced)           │   │                        │
│  └────────────────┬───────────────────────┘   │                        │
│                   │                            │                        │
│                   │ Bidirectional Sync         │                        │
│                   │ (14-day window)            │                        │
└───────────────────┼────────────────────────────┼────────────────────────┘
                    │                            │
                    ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SERVER (Supabase + Edge Functions)                   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    PostgreSQL Database                            │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │  │
│  │  │ learning_path  │  │ quiz_questions │  │ content_cache  │     │  │
│  │  │  (synced)      │  │  (synced)      │  │  (synced)      │     │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘     │  │
│  │  ┌────────────────┐  ┌────────────────┐                         │  │
│  │  │ user_prefs     │  │ tracks         │                         │  │
│  │  │  (synced)      │  │  (synced)      │                         │  │
│  │  └────────────────┘  └────────────────┘                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Edge Functions (Deno)                        │  │
│  │                                                                    │  │
│  │  ┌─────────────────────┐      ┌──────────────────────┐          │  │
│  │  │  generate-quiz      │      │  analytics-metrics   │          │  │
│  │  │  (MODIFIED)         │      │  (NEW - admin only)  │          │  │
│  │  │                     │      │                      │          │  │
│  │  │  - Question select  │      │  - Aggregate metrics │          │  │
│  │  │  - Pedagogical      │      │  - No sync to client │          │  │
│  │  │    prompts          │      │  - Production only   │          │  │
│  │  └─────────────────────┘      └──────────────────────┘          │  │
│  │                                                                    │  │
│  │  ┌─────────────────────┐                                         │  │
│  │  │  Existing Functions │                                         │  │
│  │  │  - generate-path    │                                         │  │
│  │  │  - generate-content │                                         │  │
│  │  │  - ensure-content   │                                         │  │
│  │  └─────────────────────┘                                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              External Services (Called by Edge Functions)         │  │
│  │  ┌─────────────────┐      ┌──────────────────┐                  │  │
│  │  │  Gemini API     │      │  Sefaria API     │                  │  │
│  │  │  (quiz gen)     │      │  (content)       │                  │  │
│  │  └─────────────────┘      └──────────────────┘                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. Analytics System (NEW - Server-Side Only)

**Responsibility:**
- Aggregate engagement metrics across all users
- Provide admin-facing insights into feature usage
- Calculate learning-specific metrics (Active Learning Days, streak patterns, quiz completion)
- Support date range filtering

**Does NOT:**
- Sync to client (RxDB)
- Expose user-specific data to other users
- Track individual user behavior beyond aggregates
- Run in development environment (production only)

**Communicates With:**
- PostgreSQL database (read-only for aggregation)
- Admin page (Next.js API route or server component)

**Implementation Pattern:**

```typescript
// Edge Function: analytics-metrics
// Input: { metric_type, date_range: { start, end } }
// Output: Aggregated metrics JSON

async function getEngagementMetrics(dateRange: DateRange) {
  // Direct PostgreSQL queries - NO RxDB sync
  const metrics = {
    active_learning_days: await calculateActiveDays(dateRange),
    quiz_completion_rate: await getQuizCompletionRate(dateRange),
    review_session_usage: await getReviewUsage(dateRange),
    explanation_expansion_rate: await getExpansionRate(dateRange),
    streak_distribution: await getStreakDistribution(dateRange),
    popular_tracks: await getTrackPopularity(dateRange),
  };
  return metrics;
}
```

**Data Sources (Read-Only):**
- `learning_path` - node completion, quiz attempts
- `content_cache` - explanation engagement (indirect via quiz performance)
- `user_preferences` - pace settings, calendar preferences
- `tracks` - track popularity

**Storage:** Computed on-demand, no persistent analytics tables in MVP. Future: materialized views or time-series tables for performance.

---

### 2. Quiz Generation System (MODIFIED - Existing Edge Function)

**Responsibility:**
- Generate pedagogically-structured quiz questions (scenario + sevara format)
- Select questions per Mishnah learned in weekly quiz window
- Apply pedagogical selection logic (1 scenario minimum, optional sevara, max 20 total)
- Store quiz questions in `quiz_questions` table

**Modification Points:**
- **Prompt Engineering:** New prompts for scenario-based questions using Mishnah + Halakha commentary
- **Question Selection Logic:** Filter and select from generated questions per Mishnah
- **Gemini API Call:** Enhanced context (include Halakha commentary from `ai_explanation_json`)

**Communicates With:**
- `content_cache` table (read Mishnah text + `ai_explanation_json.halakha`)
- `learning_path` table (determine which Mishnayot are in weekly quiz window)
- Gemini API (generate questions)
- `quiz_questions` table (write generated questions)

**Existing Function:** `supabase/functions/generate-quiz/index.ts`

**Modification Strategy:**

```typescript
// BEFORE (current implementation):
// - Generate 1-8 questions per Mishnah (variable based on text length)
// - Store all questions with question_index
// - No selection logic

// AFTER (enhanced implementation):
// - Generate 2 question types: scenario (Hebrew: תרחיש) and sevara (Hebrew: סברא)
// - Apply selection logic:
//   1. Select 1 scenario question per Mishnah (minimum)
//   2. Backfill with sevara questions (max 1 per Mishnah) up to 20 total
// - Store selected questions with metadata (question_type field)

interface QuizQuestionWithType extends QuizQuestion {
  question_type: 'scenario' | 'sevara'; // NEW field
}

async function generateQuizQuestionsWithPedagogy(
  sourceText: string,
  explanation: MishnahExplanation,
  apiKey: string
): Promise<QuizQuestionWithType[]> {
  // Generate both question types
  const scenarioQuestion = await generateScenarioQuestion(sourceText, explanation.halakha, apiKey);
  const sevaraQuestion = await generateSevaraQuestion(sourceText, explanation, apiKey);

  return [
    { ...scenarioQuestion, question_type: 'scenario' },
    { ...sevaraQuestion, question_type: 'sevara' },
  ];
}
```

**Database Schema Addition:**

```sql
-- Add question_type column to quiz_questions table
ALTER TABLE quiz_questions
  ADD COLUMN question_type TEXT CHECK (question_type IN ('scenario', 'sevara'));
```

---

### 3. Admin Analytics Page (NEW - Next.js Page)

**Responsibility:**
- Display analytics dashboard (admin-only access)
- Call analytics Edge Function to fetch metrics
- Provide date range selector UI
- Render charts/tables for engagement metrics

**Access Control:**
- Check user role (admin flag in `auth.users` or separate admin table)
- Redirect non-admin users to home page
- Production environment only (hide in development)

**Implementation Pattern:**

```typescript
// app/admin/analytics/page.tsx (Server Component)
import { createServerClient } from '@/lib/supabase/server';

export default async function AdminAnalyticsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check admin access
  if (!user || !isAdmin(user.id)) {
    redirect('/');
  }

  // Fetch analytics via Edge Function
  const metrics = await fetchAnalytics({
    dateRange: { start: '2026-01-01', end: '2026-01-28' }
  });

  return <AnalyticsDashboard metrics={metrics} />;
}
```

**Communicates With:**
- `analytics-metrics` Edge Function (via Supabase client)
- Supabase Auth (user role verification)

---

### 4. Existing Components (UNCHANGED)

**RxDB Sync Layer:**
- Continues to sync `learning_path`, `quiz_questions`, `content_cache`, `user_preferences`
- No analytics data synced to client
- Quiz questions synced as before (14-day window)

**Client-Side Hooks:**
- `useReviews`, `usePath`, `useStudyUnit`, `useCompletion` - NO changes
- Quiz page reads from synced `quiz_questions` table via RxDB

**Content Generation:**
- `generate-content` Edge Function - NO changes
- `generate-path` Edge Function - NO changes
- `ensure-content` Edge Function - NO changes

---

## Data Flow

### Analytics Collection and Display

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Analytics Data Flow                             │
└─────────────────────────────────────────────────────────────────────┘

1. User Actions (Study, Quiz, Review)
   │
   ▼
2. Client writes to RxDB
   │
   ▼
3. RxDB syncs to Supabase (bidirectional, existing)
   │
   ▼
4. Data lands in PostgreSQL tables:
   - learning_path (node completions)
   - quiz_questions (via generate-quiz)
   - content_cache (explanations)
   │
   ▼
5. Admin opens /admin/analytics page
   │
   ▼
6. Server Component checks admin access
   │
   ▼
7. Calls analytics-metrics Edge Function
   │
   ▼
8. Edge Function runs PostgreSQL aggregation queries
   │
   ▼
9. Returns JSON metrics to admin page
   │
   ▼
10. Admin page renders dashboard

**No sync to client - Server-side only**
```

### Quiz Generation Pipeline (Enhanced)

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Quiz Generation Data Flow                          │
└─────────────────────────────────────────────────────────────────────┘

1. User completes learning path node (Mishnah study)
   │
   ▼
2. Client updates learning_path.completed_at via RxDB
   │
   ▼
3. RxDB syncs to Supabase
   │
   ▼
4. Weekly quiz node unlocks (unlock_date reached)
   │
   ▼
5. Client loads quiz page, checks if quiz_questions exist
   │
   ▼
6. If missing, client calls generate-quiz Edge Function
   │
   ├─▶ Input: { content_refs: [...] } (all Mishnayot in week)
   │
   ▼
7. Edge Function iterates each content_ref:
   │
   ├─▶ Fetch from content_cache (source_text_he, ai_explanation_json)
   │
   ├─▶ Extract halakha commentary from ai_explanation_json.halakha
   │
   ├─▶ Call Gemini API with pedagogical prompts:
   │   - Scenario question (תרחיש): Modern situation applying Mishnah ruling
   │   - Sevara question (סברא): Reasoning/logic behind the ruling
   │
   ├─▶ Gemini returns 2 questions (1 scenario, 1 sevara)
   │
   ├─▶ Store both with question_type metadata
   │
   ▼
8. Selection Logic (server-side):
   │
   ├─▶ For each Mishnah: select 1 scenario question (minimum)
   │
   ├─▶ Backfill with sevara questions (max 1 per Mishnah)
   │
   ├─▶ Cap at 20 total questions
   │
   ▼
9. Insert selected questions into quiz_questions table
   │
   ▼
10. RxDB syncs quiz_questions to client (14-day window)
   │
   ▼
11. Quiz page displays selected questions

**Key Change:** Selection logic runs server-side during generation,
not at quiz display time.
```

---

## Patterns to Follow

### Pattern 1: Server-Side Analytics Aggregation

**What:** Compute analytics metrics on-demand via PostgreSQL queries, not materialized tables.

**When:** Admin requests analytics dashboard, small user base (<10K users).

**Why:** Simpler implementation, no need to maintain separate analytics tables or background jobs.

**Example:**

```typescript
// Edge Function: analytics-metrics
async function calculateActiveDays(dateRange: DateRange): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_active_days', {
    start_date: dateRange.start,
    end_date: dateRange.end,
  });

  return data?.active_days || 0;
}

// PostgreSQL function
CREATE OR REPLACE FUNCTION calculate_active_days(start_date DATE, end_date DATE)
RETURNS TABLE(active_days INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(DISTINCT study_date)::INTEGER
  FROM learning_path
  WHERE unlock_date BETWEEN start_date AND end_date
    AND node_type = 'learning'
    AND completed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
```

**Tradeoff:** Slower for large datasets (>100K users), but acceptable for admin-only access.

---

### Pattern 2: Pedagogical Prompt Engineering

**What:** Structure Gemini API prompts to generate specific question types with pedagogical intent.

**When:** Generating quiz questions for retention testing.

**Why:** Generic questions test recall; structured questions test understanding and application.

**Example:**

```typescript
// Scenario question prompt (Hebrew)
const scenarioPrompt = `
צור שאלת תרחיש (scenario question) בעברית על המשנה הבאה.

טקסט המשנה:
${sourceText}

הלכה מעשית:
${explanation.halakha}

הנחיות:
1. תאר מצב מודרני וריאליסטי שבו ההלכה מהמשנה רלוונטית
2. השתמש בדמויות בעלות שמות עבריים (דוד, שרה, וכו')
3. שאל איך ההלכה חלה על המצב
4. 4 אפשרויות תשובה, אחת נכונה לפי המשנה
5. הסבר קצר מדוע התשובה נכונה

דוגמה לפורמט:
"שרה מארגנת ארוחת שבת ורוצה לדעת [שאלה הלכתית]..."
`;

// Sevara question prompt (Hebrew)
const sevaraPrompt = `
צור שאלת סברא (reasoning question) בעברית על המשנה הבאה.

טקסט המשנה:
${sourceText}

הסבר:
${JSON.stringify(explanation, null, 2)}

הנחיות:
1. בדוק הבנה של ההיגיון/סברא מאחורי הדין
2. שאל "למה" או "מה הסיבה" ולא רק "מה הדין"
3. 4 אפשרויות תשובה, אחת נכונה
4. הסבר את ההיגיון בתשובה
`;
```

**Tradeoff:** More complex prompts = higher token usage, but significantly better pedagogical value.

---

### Pattern 3: Question Selection over Generation Volume

**What:** Generate multiple questions, select subset based on pedagogical rules.

**When:** Creating weekly quiz from learned Mishnayot.

**Why:** Prevents overwhelm (40+ questions), ensures coverage (1 per Mishnah minimum).

**Example:**

```typescript
// Selection algorithm
function selectQuizQuestions(
  mishnaQuestions: Map<string, QuizQuestionWithType[]>
): QuizQuestionWithType[] {
  const selected: QuizQuestionWithType[] = [];

  // Phase 1: Select 1 scenario question per Mishnah (minimum coverage)
  for (const [contentRef, questions] of mishnaQuestions) {
    const scenarioQuestions = questions.filter(q => q.question_type === 'scenario');
    if (scenarioQuestions.length > 0) {
      selected.push(scenarioQuestions[0]); // Take first scenario question
    }
  }

  // Phase 2: Backfill with sevara questions (max 1 per Mishnah)
  if (selected.length < 20) {
    for (const [contentRef, questions] of mishnaQuestions) {
      if (selected.length >= 20) break;

      const sevaraQuestions = questions.filter(q => q.question_type === 'sevara');
      if (sevaraQuestions.length > 0) {
        selected.push(sevaraQuestions[0]); // Add first sevara question
      }
    }
  }

  return selected.slice(0, 20); // Cap at 20
}
```

**Tradeoff:** Generates more questions than displayed, but ensures quality over quantity.

---

### Pattern 4: Admin-Only Route Protection

**What:** Protect `/admin/*` routes with server-side authentication and role checks.

**When:** Implementing analytics dashboard or other admin features.

**Why:** Client-side checks are bypassable; server-side enforcement is secure.

**Example:**

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin')) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check admin role (stored in user metadata or separate table)
    const { data: admin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!admin) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
}
```

**Tradeoff:** Adds latency to admin pages, but security is non-negotiable.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Syncing Analytics to RxDB

**What goes wrong:** Adding analytics data to RxDB collections for client-side display.

**Why bad:**
- Exposes aggregate metrics to all users (privacy concern)
- Wastes client storage (analytics irrelevant to most users)
- Complicates sync logic (analytics doesn't fit 14-day window model)
- Increases bundle size (chart libraries for non-admin users)

**Instead:** Server-side only, direct PostgreSQL queries, admin page with SSR.

---

### Anti-Pattern 2: Real-Time Analytics

**What goes wrong:** Using Supabase Realtime to stream analytics updates to admin dashboard.

**Why bad:**
- Unnecessary complexity for low-traffic admin page
- Real-time updates not required (manual refresh sufficient)
- Increases database load (continuous subscriptions)

**Instead:** Server Component fetches on page load, add manual refresh button if needed.

---

### Anti-Pattern 3: Client-Side Quiz Selection

**What goes wrong:** Generating all questions, selecting subset on client during quiz display.

**Why bad:**
- Wastes sync bandwidth (downloading unused questions)
- Selection logic duplicated across clients
- Client sees rejected questions (confusing if debugging)

**Instead:** Server-side selection during generation, only selected questions synced.

---

### Anti-Pattern 4: Generic Quiz Prompts

**What goes wrong:** Using simple prompts like "Create a quiz question about this Mishnah."

**Why bad:**
- Gemini generates recall-only questions ("What does the Mishnah say about X?")
- Misses pedagogical depth (application, reasoning)
- No structure for review (all questions feel the same)

**Instead:** Explicit pedagogical prompts with scenario/sevara distinction and Hebrew examples.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Analytics Aggregation** | On-demand queries (<100ms) | On-demand queries (<1s) | Materialized views + background jobs |
| **Quiz Generation** | Edge Function per user | Edge Function per user | Batch generation via cron, pre-generate questions |
| **Admin Dashboard** | SSR on every visit | SSR with caching (5min TTL) | Separate analytics DB (ClickHouse, TimescaleDB) |
| **Question Storage** | All questions in `quiz_questions` | All questions in `quiz_questions` | Partition by date, archive old questions |

**Current Recommendation:** On-demand aggregation (100-10K users), transition to materialized views at 10K+.

---

## Integration with Existing Architecture

### Offline-First Constraints Preserved

**Analytics does NOT interfere with offline-first:**
- No analytics data synced to RxDB
- User actions (study, quiz, review) sync as before
- Admin dashboard requires network (acceptable for admin-only feature)

**Quiz improvements enhance offline experience:**
- Fewer questions per quiz = smaller RxDB storage footprint
- Selection happens server-side during sync, not at display time
- Client still caches quiz questions in 14-day window

### Edge Function Ecosystem

**New Function:**
- `analytics-metrics` - Aggregates metrics from PostgreSQL

**Modified Function:**
- `generate-quiz` - Enhanced prompts, selection logic, question_type field

**Unchanged Functions:**
- `generate-path` - Still creates learning_path nodes
- `generate-content` - Still fetches Mishnah + generates explanations
- `ensure-content` - Still validates content cache
- `generate-schedule` (legacy, replaced by `generate-path`) - Unchanged

### Database Schema Changes

**New Columns:**
- `quiz_questions.question_type` (TEXT, CHECK constraint for 'scenario'/'sevara')

**New Tables (Future Consideration):**
- `admin_users` - Maps user_id to admin role
- `analytics_snapshots` - Materialized analytics for performance (if needed at scale)

**No Changes:**
- `learning_path`, `content_cache`, `user_preferences`, `tracks` - schemas unchanged

---

## Build Order (Dependency Graph)

Suggested implementation order based on component dependencies:

### Phase 1: Analytics Foundation
1. **Database Setup**
   - Create PostgreSQL functions for metric aggregation
   - Add `admin_users` table (or user metadata field)

2. **Edge Function**
   - Implement `analytics-metrics` Edge Function
   - Test with mock data

3. **Admin Page**
   - Create `/admin/analytics` page with auth checks
   - Basic UI with date range selector
   - Call analytics Edge Function and display results

**Why First:** Analytics is independent of quiz changes, can be built and tested separately.

---

### Phase 2: Quiz Improvements
1. **Database Migration**
   - Add `question_type` column to `quiz_questions`
   - Backfill existing questions as 'scenario' (or null)

2. **Prompt Engineering**
   - Write pedagogical prompts in `_shared/gemini.ts`
   - Test prompts with Gemini API (manual testing)

3. **Edge Function Modification**
   - Update `generate-quiz/index.ts`:
     - Generate scenario + sevara questions
     - Implement selection logic
     - Store with `question_type` metadata

4. **Client Testing**
   - Verify quiz page displays selected questions
   - Test offline sync (questions within 14-day window)

**Why Second:** Depends on Phase 1 analytics being testable (to verify quiz completion rates).

---

### Phase 3: Integration Testing
1. **End-to-End Flow**
   - User completes weekly learning → quiz node unlocks
   - Quiz questions generated with new logic
   - User answers quiz → completion tracked
   - Admin views quiz completion rate in analytics

2. **Performance Testing**
   - Verify analytics queries <1s for current user base
   - Monitor Gemini API costs (new prompts are longer)

**Why Last:** Validates both systems working together.

---

## Success Metrics (How to Validate Architecture)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Analytics Page Load Time** | <2s | Chrome DevTools Network tab |
| **Analytics Query Performance** | <1s per metric | PostgreSQL EXPLAIN ANALYZE |
| **Quiz Generation Time** | <10s for 20 questions | Edge Function logs |
| **Offline Quiz Access** | 100% within 14-day window | RxDB sync verification |
| **Admin Auth Enforcement** | 0 bypasses | Security audit (manual testing) |
| **Question Quality** | Pedagogically structured | Manual review of generated questions |

---

## Open Questions for Implementation

1. **Admin Role Storage:** Store admin flag in `auth.users.user_metadata` or separate `admin_users` table?
   - Recommendation: Separate table for better auditability and RLS control.

2. **Analytics Caching:** Cache analytics results on server (e.g., 5-minute TTL)?
   - Recommendation: No caching for MVP (low traffic), add if admin page becomes slow.

3. **Question Type Distribution:** Always generate 1 scenario + 1 sevara per Mishnah, or vary by text length?
   - Recommendation: Fixed (1+1) for consistency, easier to reason about selection logic.

4. **Historical Analytics:** Show trends over time, or point-in-time snapshots?
   - Recommendation: Point-in-time for MVP, add time-series charts later.

5. **Production-Only Enforcement:** Hard-code environment check, or feature flag?
   - Recommendation: Environment variable check (`VERCEL_ENV === 'production'`), simple and effective.

---

## References

**Existing Codebase:**
- `/Users/orelzion/git/halomed/docs/halomed_tdd.md` - Database schema, sync strategy
- `/Users/orelzion/git/halomed/supabase/functions/generate-quiz/index.ts` - Current quiz generation
- `/Users/orelzion/git/halomed/supabase/functions/_shared/gemini.ts` - Gemini API integration
- `/Users/orelzion/git/halomed/web/lib/database/database.ts` - RxDB collections
- `/Users/orelzion/git/halomed/.claude/agents/sync.md` - Sync patterns

**Architectural Decisions:**
- Offline-first preserved: Analytics server-only, no client sync
- Quiz selection server-side: Prevents client-side complexity
- Admin-only access: Middleware enforcement, production environment

**Confidence Level:** HIGH - Based on thorough codebase review, existing patterns clearly defined.
