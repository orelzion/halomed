# Technology Stack: Analytics & Quiz Improvements

**Project:** HaLomeid Enhancement - Analytics & Quiz Generation
**Researched:** 2026-01-28
**Context:** Adding admin analytics dashboard and pedagogical quiz generation to existing Next.js 16 + Supabase app

---

## Executive Summary

This milestone adds two distinct capabilities to the existing HaLomeid app:

1. **In-house analytics dashboard** (admin-only) for learning engagement metrics
2. **Enhanced quiz generation** with pedagogical scenario + sevara question format

The recommended stack leverages existing infrastructure (Next.js 16, Supabase PostgreSQL, Google Gemini API) while adding minimal dependencies for charting and data visualization.

**Key Principle:** Prefer PostgreSQL materialized views + simple React charting over complex analytics platforms. This keeps analytics in-house, minimizes external dependencies, and provides full control over metrics definitions.

---

## Recommended Stack

### Analytics Dashboard

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Recharts** | ^2.13.x | React charting library | Lightweight (120kb), composable API, works well with Next.js SSR, active maintenance, no external dependencies |
| **PostgreSQL Materialized Views** | (built-in) | Pre-aggregated analytics queries | Native performance optimization, refresh on schedule, avoids runtime aggregation costs |
| **Supabase RLS Policies** | (built-in) | Admin-only access control | Already in use, consistent security model, no new auth mechanism needed |
| **date-fns** | ^4.1.x | Date range filtering | Already used in project (via @hebcal/core dependency), consistent API, tree-shakeable |

**Confidence:** HIGH
**Rationale:** These are established, well-documented libraries that integrate cleanly with the existing stack. Recharts is the most popular React charting library with Next.js compatibility. PostgreSQL materialized views are a standard approach for analytics aggregation.

---

### Quiz Generation (Prompt Engineering)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Google Gemini API** | gemini-3-flash-preview | LLM for quiz generation | Already integrated, supports structured JSON output with schemas, cost-effective ($0.075/$0.30 per 1M tokens) |
| **Gemini JSON Schema** | (built-in) | Structured quiz output | Ensures consistent question format, validates structure at generation time, reduces parsing errors |

**Confidence:** HIGH (Gemini integration), MEDIUM (prompt patterns)
**Rationale:** Gemini is already integrated and proven. The prompt engineering patterns for pedagogical questions are based on educational best practices but will require iteration to achieve desired quality.

---

### Database Schema Additions

| Table/View | Purpose | Rationale |
|------------|---------|-----------|
| **analytics_daily_active** (materialized view) | Active Learning Days calculation | Pre-aggregate daily active users, respect Jewish calendar exclusions |
| **analytics_quiz_completion** (materialized view) | Quiz engagement metrics | Track quiz starts, completions, scores, question-level analytics |
| **analytics_review_usage** (materialized view) | Review session metrics | Track review engagement, completion rates |
| **analytics_explanation_engagement** (materialized view) | Explanation interaction | Track which explanations are read, expanded, time spent |
| **quiz_questions.question_type** (new column) | Distinguish scenario vs sevara | Enable smart selection (1 scenario/Mishnah, backfill sevara) |

**Confidence:** HIGH
**Rationale:** Materialized views are a PostgreSQL-native pattern for analytics. Adding `question_type` column is minimal schema change with clear purpose.

---

## Analytics Architecture

### Data Flow

```
User Actions (PostHog events)
    ↓
Supabase tables (learning_path, quiz_questions, user_study_log)
    ↓
Materialized Views (refresh nightly via pg_cron)
    ↓
Admin Dashboard (Next.js page with Recharts)
```

### Query Pattern

**Direct Queries** (for simple metrics):
- Current streak distribution
- Popular tracks (by user count)
- Recent quiz completion rate

**Materialized Views** (for complex aggregations):
- Active Learning Days (requires Jewish calendar logic)
- Quiz question performance (per-question analytics)
- Weekly engagement trends

**Refresh Strategy:**
```sql
-- Refresh materialized views nightly (off-peak)
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_active;
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_quiz_completion;
```

**Confidence:** HIGH
**Source:** PostgreSQL materialized views documentation, standard analytics patterns

---

## Alternatives Considered

### Analytics Dashboard

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Charting | Recharts | Tremor | Tremor is beautiful but opinionated (Tailwind-only), heavier bundle (180kb), less composable for custom metrics |
| Charting | Recharts | Chart.js (react-chartjs-2) | Chart.js is canvas-based (harder to customize), imperative API (less React-friendly), larger bundle |
| Charting | Recharts | Victory | Victory is powerful but larger bundle (200kb+), more complex API, overkill for simple bar/line charts |
| Charting | Recharts | Nivo | Nivo is comprehensive but heavyweight (300kb+), D3-based (steeper learning curve), unnecessary complexity |
| Data Layer | PostgreSQL Materialized Views | Real-time aggregation | Real-time adds complexity, not needed for admin dashboard (manual refresh acceptable) |
| Data Layer | PostgreSQL Materialized Views | Separate analytics DB (ClickHouse, TimescaleDB) | Overkill for admin-only analytics, adds infrastructure complexity, data duplication concerns |
| Analytics Platform | In-house | Fix PostHog | PostHog is generic web analytics, doesn't understand learning metrics (Active Learning Days, streak logic), limited customization |
| Analytics Platform | In-house | Plausible/Fathom | Privacy-focused analytics are generic, not learning-specific, no custom metric definitions |

**Confidence:** MEDIUM
**Rationale:** Recharts is widely recommended for Next.js projects based on my training data. Alternative charting libraries have clear tradeoffs (bundle size, API complexity, maintenance). However, I cannot verify current versions or recent changes without web access.

---

### Quiz Generation

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| LLM Provider | Google Gemini | OpenAI GPT-4 | Already using Gemini, cost-effective, structured output support, no vendor lock-in concerns |
| LLM Provider | Google Gemini | Anthropic Claude | Claude excellent for reasoning but not integrated, higher cost, requires new API setup |
| Prompt Pattern | Scenario + Sevara | Generic MCQ | Generic questions test recall, not understanding or application (pedagogically weaker) |
| Question Source | Mishnah + Halakha | Mishnah only | Halakha provides practical application context, richer question generation material |

**Confidence:** HIGH (Gemini choice), MEDIUM (prompt patterns)
**Rationale:** Gemini is already integrated and proven in production for explanation generation. The pedagogical question format (scenario + sevara) is based on educational assessment principles.

---

## Installation

### New Dependencies

```bash
# Analytics charting
npm install recharts@^2.13.0

# Date utilities (already available via @hebcal/core, but explicit if needed)
npm install date-fns@^4.1.0
```

**No additional server-side dependencies needed.**
Analytics uses existing Supabase client and PostgreSQL features.

**Confidence:** HIGH
**Note:** Versions based on training data (January 2025 cutoff). Verify latest stable versions before installation.

---

## Database Schema Changes

### Add question_type to quiz_questions

```sql
-- Add question_type enum
CREATE TYPE question_type AS ENUM ('scenario', 'sevara');

-- Add column to existing quiz_questions table
ALTER TABLE quiz_questions
ADD COLUMN question_type question_type NOT NULL DEFAULT 'sevara';

-- Create index for efficient filtering
CREATE INDEX idx_quiz_questions_type
ON quiz_questions(content_ref, question_type);
```

### Create Analytics Materialized Views

```sql
-- Active Learning Days (respects Jewish calendar)
CREATE MATERIALIZED VIEW analytics_daily_active AS
SELECT
  DATE(completed_at) as activity_date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as completions
FROM learning_path
WHERE completed_at IS NOT NULL
  AND node_type = 'learning'
GROUP BY DATE(completed_at)
ORDER BY activity_date DESC;

CREATE UNIQUE INDEX idx_analytics_daily_active
ON analytics_daily_active(activity_date);

-- Quiz completion metrics
CREATE MATERIALIZED VIEW analytics_quiz_completion AS
SELECT
  DATE(lp.completed_at) as quiz_date,
  COUNT(DISTINCT lp.user_id) as users_attempted,
  COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN lp.user_id END) as users_completed,
  AVG(CASE WHEN lp.completed_at IS NOT NULL THEN 1.0 ELSE 0.0 END) as completion_rate
FROM learning_path lp
WHERE lp.node_type = 'quiz'
GROUP BY DATE(lp.completed_at)
ORDER BY quiz_date DESC;

CREATE UNIQUE INDEX idx_analytics_quiz_completion
ON analytics_quiz_completion(quiz_date);

-- Explanation engagement (requires new events from PostHog or direct tracking)
-- Placeholder: Will need to track explanation expansions, time spent
CREATE TABLE explanation_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content_cache(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'expanded_opinions', 'expanded_expansions', 'read_time'
  interaction_value JSONB, -- Duration for read_time, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_explanation_interactions_user
ON explanation_interactions(user_id, created_at);
```

### Enable pg_cron for View Refresh

```sql
-- Refresh materialized views nightly at 2 AM UTC
SELECT cron.schedule(
  'refresh-analytics-views',
  '0 2 * * *',
  $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_active;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_quiz_completion;
  $$
);
```

**Confidence:** HIGH
**Note:** Supabase may require pg_cron extension to be enabled. Check Supabase documentation for cron job support.

---

## Prompt Engineering for Quiz Generation

### Current Prompt (Generic MCQ)

The current implementation in `supabase/functions/_shared/gemini.ts` generates generic multiple-choice questions without pedagogical structure.

### Enhanced Prompt (Scenario + Sevara)

```typescript
// Example prompt structure for scenario question
const scenarioPrompt = `
צור שאלת תרחיש (scenario question) בעברית המבוססת על המשנה הבאה.

טקסט המשנה:
${sourceText}

הלכה למעשה:
${explanation.halakha}

דרישות לשאלת תרחיש:
1. תאר מצב מציאותי ויומיומי שבו ההלכה/העקרון מהמשנה רלוונטית
2. השתמש בדמויות מודרניות וניתנות להזדהות (שמות עבריים כמו: דוד, שרה, רחל, יוסי)
3. הצג דילמה או שאלה שדורשת הבנה של העקרון, לא רק זכירה
4. 4 אפשרויות תשובה - אחת נכונה על פי ההלכה, 3 טעויות סבירות
5. הסבר קצר המציין את העקרון הרלוונטי מהמשנה

דוגמה לפורמט:
שאלה: "דוד ושרה מארגנים ארוחת ערב. דוד שאל את שרה אם..."
אפשרויות: [4 תשובות בהקשר התרחיש]
הסבר: "על פי המשנה, העקרון הוא..."
`;

// Example prompt structure for sevara (reasoning) question
const sevaraPrompt = `
צור שאלת סברא (reasoning question) בעברית המבוססת על המשנה הבאה.

טקסט המשנה:
${sourceText}

דעות החכמים:
${JSON.stringify(explanation.opinions, null, 2)}

דרישות לשאלת סברא:
1. שאל על הנימוק/הסברה מאחורי הדין או ההלכה
2. בדוק הבנה של "למה" ולא רק "מה"
3. אם יש מחלוקת - שאל על הבסיס המושגי להבדל בין הדעות
4. 4 אפשרויות תשובה - אחת משקפת את הסברה הנכונה, 3 הסחות דעת
5. הסבר קצר המפרט את הסברה

דוגמה לפורמט:
שאלה: "מדוע החכמים קבעו ש...?"
אפשרויות: [4 נימוקים אפשריים]
הסבר: "הסברה המרכזית היא..."
`;
```

### Smart Selection Algorithm

```typescript
// Select quiz questions for weekly quiz
interface QuizSelectionParams {
  mishnaLearned: string[]; // List of content_refs learned this week
  maxQuestions: number; // Default: 20
}

async function selectWeeklyQuizQuestions(
  params: QuizSelectionParams
): Promise<QuizQuestion[]> {
  const { mishnaLearned, maxQuestions = 20 } = params;

  // Step 1: Select 1 scenario question per Mishnah (priority)
  const scenarioQuestions = await supabase
    .from('quiz_questions')
    .select('*')
    .in('content_ref', mishnaLearned)
    .eq('question_type', 'scenario')
    .order('question_index') // Prefer first scenario question
    .limit(mishnaLearned.length); // Max 1 per Mishnah

  const selectedQuestions = scenarioQuestions.data || [];
  const remainingSlots = maxQuestions - selectedQuestions.length;

  // Step 2: Backfill with sevara questions (max 1 per Mishnah)
  if (remainingSlots > 0) {
    const sevaraQuestions = await supabase
      .from('quiz_questions')
      .select('*')
      .in('content_ref', mishnaLearned)
      .eq('question_type', 'sevara')
      .order('question_index')
      .limit(remainingSlots);

    selectedQuestions.push(...(sevaraQuestions.data || []));
  }

  // Step 3: Shuffle to avoid predictable order
  return shuffleArray(selectedQuestions);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

**Confidence:** MEDIUM
**Rationale:** Prompt patterns are based on pedagogical assessment principles (Bloom's taxonomy, scenario-based assessment). However, quality will require iteration based on generated output. Gemini's structured output support ensures format consistency.

---

## Admin Dashboard Implementation Pattern

### Route Protection

```typescript
// app/admin/analytics/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminAnalyticsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check admin role (requires user_roles table or RLS policy)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/'); // Non-admin users redirected to home
  }

  // Fetch analytics data
  const analytics = await getAnalyticsData(supabase);

  return <AnalyticsDashboard data={analytics} />;
}
```

### Sample Chart Component (Recharts)

```typescript
// components/analytics/ActiveUsersChart.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ActiveUsersChartProps {
  data: Array<{ date: string; activeUsers: number }>;
}

export function ActiveUsersChart({ data }: ActiveUsersChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="activeUsers"
          stroke="#D4A373"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Confidence:** HIGH
**Rationale:** This is standard Next.js App Router + Recharts integration pattern. Admin role checking requires minor schema addition but follows existing RLS patterns.

---

## Performance Considerations

### Analytics Queries

| Metric | Query Strategy | Expected Performance |
|--------|----------------|---------------------|
| Active Learning Days | Materialized view | < 50ms (pre-aggregated) |
| Quiz completion rate | Materialized view | < 50ms (pre-aggregated) |
| Current streak distribution | Direct query with index | < 100ms (indexed on user_id, study_date) |
| Popular tracks | Direct query with GROUP BY | < 200ms (small tracks table) |

### Materialized View Refresh

- **Concurrently:** Allows reads during refresh
- **Nightly:** Off-peak hours (2 AM UTC)
- **Impact:** Minimal, analytics are admin-only (no user-facing delay)

**Confidence:** HIGH
**Rationale:** Materialized views are designed for this use case. Metrics are not real-time sensitive (admin dashboard, manual refresh acceptable).

---

## Integration Points with Existing Stack

### Existing Infrastructure (No Changes)

| Component | Current Version | Analytics Role | Quiz Role |
|-----------|----------------|----------------|-----------|
| Next.js | 16.1.1 | Admin dashboard pages | Quiz generation UI improvements |
| Supabase PostgreSQL | v17 | Analytics data source | Store question_type, new views |
| RxDB | 15.39.0 | (not used for analytics) | Sync quiz questions as before |
| Google Gemini API | gemini-3-flash-preview | (not used for analytics) | Generate scenario/sevara questions |
| PostHog | 1.328.0 | Event tracking (keep for funnels) | Track quiz interactions |

### New Additions

| Component | Version | Integration Point |
|-----------|---------|-------------------|
| Recharts | ^2.13.0 | Admin dashboard components |
| date-fns | ^4.1.0 | Date range filtering in analytics |
| question_type column | (schema) | Quiz generation and selection logic |
| Materialized views | (schema) | Analytics data aggregation |

**Confidence:** HIGH
**Rationale:** Minimal new dependencies, leverages existing infrastructure. RxDB offline-first sync continues to work as-is. Admin dashboard is server-rendered (no offline requirement).

---

## Security Considerations

### Admin Access Control

```sql
-- Create user_profiles table with admin flag
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can read own profile
CREATE POLICY "Users can read own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- RLS: Only admins can access analytics views
CREATE POLICY "Admins can read analytics"
ON analytics_daily_active FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Repeat for other analytics views
```

### Analytics Data Privacy

- **No PII in analytics views:** Aggregate counts only, no user names/emails
- **Admin-only access:** RLS enforces is_admin check
- **Audit logging:** (Optional) Track admin analytics access via PostHog events

**Confidence:** HIGH
**Rationale:** Follows existing RLS patterns in the app. Admin flag approach is standard for role-based access control.

---

## Migration Path

### Phase 1: Database Schema (Low Risk)

1. Add `question_type` column to `quiz_questions` (default: 'sevara')
2. Create materialized views for analytics
3. Set up pg_cron for nightly refresh
4. Add `user_profiles` table with `is_admin` flag

**Estimated effort:** 2-4 hours
**Risk:** Low (additive changes, no data migration)

### Phase 2: Quiz Generation (Medium Risk)

1. Update Gemini prompt in `supabase/functions/_shared/gemini.ts`
2. Implement scenario vs sevara generation logic
3. Update quiz selection algorithm for weekly quizzes
4. Test question quality and iterate on prompts

**Estimated effort:** 1-2 days
**Risk:** Medium (prompt engineering requires iteration, quality validation needed)

### Phase 3: Analytics Dashboard (Low Risk)

1. Install Recharts dependency
2. Create admin analytics page route
3. Implement admin role check middleware
4. Build chart components for key metrics
5. Add date range filtering

**Estimated effort:** 2-3 days
**Risk:** Low (standard Next.js + Recharts integration)

---

## Testing Strategy

### Analytics Dashboard

- **Unit tests:** Chart components render with mock data
- **Integration tests:** Admin role check enforces access control
- **Manual QA:** Verify metrics match raw SQL queries (spot check)

### Quiz Generation

- **Prompt validation:** Generate 50+ questions, manually review quality
- **Schema validation:** Verify Gemini returns valid JSON structure
- **Selection algorithm:** Test weekly quiz has 1 scenario/Mishnah, backfills correctly
- **Edge cases:** Handle Mishnayot with no questions, insufficient sevara questions

**Confidence:** HIGH
**Rationale:** Standard testing approach for analytics dashboards and LLM-based generation.

---

## Cost Analysis

### Dependencies

| Dependency | Bundle Size Impact | Cost |
|------------|-------------------|------|
| Recharts | +120kb (gzipped: ~40kb) | Free (MIT license) |
| date-fns | +15kb (tree-shaken) | Free (MIT license) |

**Total Bundle Impact:** ~55kb gzipped (acceptable for admin-only dashboard)

### Infrastructure

| Resource | Change | Cost Impact |
|----------|--------|-------------|
| Supabase PostgreSQL | +3 materialized views, +1 table | Negligible (within free tier for analytics volume) |
| Google Gemini API | +1-2 questions per Mishnah | ~$0.10 per 1,000 Mishnayot (already budgeted for quiz generation) |
| Vercel | +1 admin page route | No change (SSR page, minimal compute) |

**Total Monthly Cost Increase:** < $5 (assuming moderate usage)

**Confidence:** MEDIUM
**Rationale:** Bundle sizes based on training data (may have changed). Supabase/Gemini costs are estimates based on current pricing (verify before deployment).

---

## Open Questions

### Analytics Dashboard

- **Q:** Should analytics be real-time or nightly refresh acceptable?
  **A:** Nightly refresh sufficient for admin dashboard (stated in requirements).

- **Q:** Should we keep PostHog or replace entirely?
  **A:** KEEP PostHog for event funnels (user sign-in, quiz starts), ADD in-house analytics for learning-specific metrics.

- **Q:** Which metrics are highest priority for MVP?
  **A:** (Pending) Recommend: Active Learning Days, quiz completion rate, popular tracks. Defer: explanation engagement, review usage.

### Quiz Generation

- **Q:** How many scenario vs sevara questions per Mishnah?
  **A:** 1 scenario (guaranteed), 3-5 sevara (based on text length). Weekly quiz: 1 scenario/Mishnah + backfill sevara up to 20 total.

- **Q:** Should old quiz questions be regenerated or grandfathered?
  **A:** (Pending) Recommend: Grandfather existing questions (mark as 'sevara' by default), generate new questions with types going forward.

- **Q:** Prompt iteration process - who validates question quality?
  **A:** (Pending) Likely project owner/rabbi for halakhic accuracy, UX designer for modern scenario relevance.

---

## Confidence Levels Summary

| Area | Confidence | Notes |
|------|------------|-------|
| Recharts for charting | HIGH | Well-established, documented Next.js compatibility |
| PostgreSQL materialized views | HIGH | Standard analytics pattern, native PostgreSQL feature |
| Gemini API integration | HIGH | Already in production for explanations |
| Prompt engineering quality | MEDIUM | Requires iteration, pedagogical principles sound but untested |
| Bundle size estimates | MEDIUM | Based on training data, verify with current versions |
| Cost estimates | MEDIUM | Based on current pricing, may change |
| Admin role implementation | HIGH | Standard RLS pattern, low complexity |

---

## Next Steps (Post-Research)

1. **Validate versions:** Check latest stable releases for Recharts, date-fns
2. **Prompt iteration:** Generate sample questions, review with stakeholders
3. **Metrics prioritization:** Confirm which analytics are MVP vs deferred
4. **Admin user seeding:** Identify initial admin user(s) for testing

---

## Sources

**Confidence Levels:**
- HIGH: Based on established patterns, official documentation (PostgreSQL, Supabase, Gemini)
- MEDIUM: Based on training data, require verification with current versions/docs
- LOW: Speculative, needs research

**Key References (Training Data):**
- PostgreSQL Materialized Views: Standard feature, well-documented
- Recharts: Popular React charting library (training data Jan 2025)
- Google Gemini API: Structured JSON output (verified in existing codebase: `supabase/functions/_shared/gemini.ts`)
- Supabase RLS: Existing pattern in codebase (`supabase/migrations/*_rls.sql`)

**Verification Needed:**
- Recharts current version and Next.js 16 compatibility
- date-fns v4 API changes
- Supabase pg_cron extension availability
- Gemini API pricing (verify before cost estimates)

---

*Research completed by: GSD Project Researcher Agent*
*Next phase: Roadmap creation (will structure implementation phases based on this research)*
