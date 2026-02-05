# Technical Design Document (TDD)
## HaLomeid (הלומד)

**Version:** 2.1
**Status:** Current Implementation (Client-Side Path Computation)
**Last Updated:** 2026-02-04 (Removed learning_path table, client-side computation)
**Architecture:** Unified Backend, Offline-First Clients
**Platforms:** Web (Next.js/React), Android (future), iOS (future)

---

## 1. System Overview

HaLomeid is an **offline-first, multi-platform application** built around a single source of truth backend and passive, synchronized clients.

All platforms:
- Share the same data model
- Share the same scheduling and business logic
- Differ only in UI framework and OS-level background execution

---

## 2. Core Technology Stack

### 2.1 Backend
- **Supabase**
  - PostgreSQL (primary datastore)
  - Auth (Anonymous, Google, Apple)
  - Edge Functions (scheduling, content generation)

### 2.2 Sync Layer
- **Platform-Specific Solutions**
  - **Web**: RxDB with Supabase Realtime plugin (IndexedDB)
  - **Android**: Custom sync engine with Room (SQLite) + Supabase Realtime
  - **iOS**: Custom sync engine with SQLite + Supabase Realtime
  - All platforms implement 14-day rolling window filtering
  - Bi-directional sync with conflict resolution (last-write-wins)
  - Content generation during sync to ensure all lessons/quizzes available

### 2.3 Content Sources
- **Sefaria API**
  - Mishnah text
  - Classical commentaries

### 2.4 Language (MVP)

- **Hebrew only** — all content and UI
- Content fields use `_he` suffix (e.g., `source_text_he`)
- AI explanations stored as structured JSONB (`ai_explanation_json`) with Hebrew content
- Multi-language support is out of MVP scope but architecturally considered

---

## 3. Design System (Global, All Platforms)

### 3.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| Primary Background | `#FEFAE0` | Study screen |
| Secondary Background | `#E9EDC9` | Home, headers |
| Card Surface | `#FAEDCD` | Track cards |
| Accent | `#D4A373` | Streak, Done button |
| Muted Accent | `#CCD5AE` | Icons, dividers |

---

### 3.2 Typography Assets

The following fonts are **mandatory assets on all platforms**:

- **Frank Ruhl Libre (Bold)**  
  - Usage: Source text (Mishnah)
- **Noto Sans Hebrew (Regular)**  
  - Usage: AI explanations, UI text

Fonts must be bundled locally:
- No reliance on external CDNs
- No platform-specific font substitutions

---

## 4. Database Schema (PostgreSQL)

### 4.1 User Preferences

Stores user-specific learning configuration and progress tracking.

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_content_index INTEGER DEFAULT 0 NOT NULL,
  pace TEXT DEFAULT 'two_mishna' NOT NULL,
  -- Options: 'one_chapter', 'two_mishna', 'seder_per_year'
  review_intensity TEXT DEFAULT 'none' NOT NULL,
  -- Options: 'none', 'light', 'medium', 'intensive'
  path_start_date DATE DEFAULT CURRENT_DATE NOT NULL,
  skip_friday BOOLEAN DEFAULT TRUE NOT NULL,
  yom_tov_dates TEXT[] DEFAULT '{}',
  -- Array of YYYY-MM-DD strings for Jewish holidays
  streak_count INTEGER DEFAULT 0 NOT NULL,
  last_study_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Key Fields:**
- `current_content_index`: Global position in Mishnah (0-4505), determines what content is unlocked
- `pace`: Learning speed - controls how many mishnayot unlock per day
- `review_intensity`: Spaced repetition setting - controls review frequency
- `path_start_date`: When the user started their learning journey
- `yom_tov_dates`: User-specific holiday dates that skip study days

### 4.2 Content Cache

Deduplicated content shared across all users.

```sql
CREATE TABLE content_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL,
  source_text_he TEXT NOT NULL,
  ai_explanation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Content Structure:**

| Field | Description |
|---|---|
| `source_text_he` | Source text (Mishnah) — displayed bold and visually dominant |
| `ai_explanation_json` | Structured JSON output from Gemini API containing explanation, halakha, opinions, and expansions |

**Structure of `ai_explanation_json`:**

```typescript
{
  summary: string;        // תקציר המשנה בעברית מודרנית (Clear explanation)
  halakha: string;         // ההלכה המעשית במידה וישנה (Practical halakha if applicable)
  opinions: Array<{         // רשימת הדעות השונות של החכמים (Summary of commentaries)
    source: string;         // מקור הדעה (Source: name of sage and source)
    details: string;         // פרטי הדעה בעברית מודרנית (Opinion details in modern Hebrew)
  }>;
  expansions: Array<{        // הרחבות לנושאים שהקורא המודרני יצטרך הסבר נוסף (Expansions)
    topic: string;          // נושא ההרחבה (Topic)
    explanation: string;    // הסבר מפורט בעברית מודרנית (Detailed explanation)
    source?: string;        // מקור ההרחבה (Source - optional)
  }>;
}
```

**Note:** The `ai_explanation_json` field consolidates what was previously separate `ai_explanation_he` (TEXT) and `ai_deep_dive_json` (JSONB) fields into a single structured JSONB column.

### 4.3 Learning Path (DEPRECATED)

The `learning_path` table has been **removed** in favor of client-side path computation.

The learning path is now computed entirely on the client using the shared `path-generator.ts` library, which calculates:
- Learning nodes based on `current_content_index`, `pace`, and `path_start_date`
- Review sessions based on spaced repetition intervals
- Weekly quizzes based on calendar dates
- Chapter/tractate completion markers

This approach:
- Eliminates server-side path generation
- Reduces database writes and sync complexity
- Provides instant path rendering without waiting for sync

**Synced Data:** Only `user_preferences` is synced. The path is computed locally from the user's position and preferences.

---

## 5. Authentication Model (All Platforms)

- All users authenticate via Supabase Auth
- Entry point: Login page with authentication options
- Primary authentication methods:
  - Google Sign-In (available on all platforms)
  - Apple Sign-In (available on iOS and Web, where applicable)
- Anonymous login:
  - Available as an option on the login page
  - Not the default entry point
  - Anonymous users receive a persistent server-side user ID
  - Have full access to all features
  - Are fully synced across sessions

### 5.1 Account Linking

- Users can link additional authentication methods to their account
- Linking preserves:
  - Study history
  - Completion data
  - Streaks
  - No data migration required

---

## 6. Position-Based Learning Path (Client-Side Computation)

### 6.1 Architecture

HaLomeid uses a **position-based model** where each user has:
- A **current position** (`current_content_index`) in the global Mishnah sequence (0-4505)
- **No stored learning path** — the entire path is computed client-side from preferences
- Progress tracked by advancing the position as content is completed

This differs from traditional track-based systems:
- No separate "tracks" - all users follow the same Mishnah sequence
- No `learning_path` table - path is computed locally using `path-generator.ts`
- Scheduling is deterministic based on position, pace, and start date
- The entire learning path can be computed on-demand without database queries

### 6.2 Edge Function: generate-path (Content Pre-generation)

The `generate-path` function now only **pre-generates content** for upcoming learning nodes. It does NOT create learning_path rows.

#### Inputs

- `user_id`: User ID
- `pace`: Learning speed ('one_chapter', 'two_mishna', 'seder_per_year')
- `review_intensity`: Review frequency ('none', 'light', 'medium', 'intensive')
- `force` (optional): Regenerate content even if it exists

#### Process

1. Read user preferences from `user_preferences` table
2. Calculate content refs for next 14 days based on:
   - `path_start_date`: When user started
   - `pace`: How many mishnayot per day
   - `skip_friday`: Whether to skip Fridays
   - `yom_tov_dates`: User-specific holiday dates
3. Check which content already exists in `content_cache`
4. Generate missing content using `generate-content` Edge Function
5. Return count of generated vs cached content

#### Review Intervals

Based on `review_intensity` setting:
- `none`: No reviews
- `light`: Review at 7 and 30 days after learning
- `medium`: Review at 3, 7, and 30 days after learning
- `intensive`: Review at 1, 3, 7, 14, and 30 days after learning

---

### 6.3 Progress Tracking

Progress is tracked through `current_content_index` in `user_preferences`:

1. User completes a learning node
2. Client updates local state (optimistic update)
3. Client increments `current_content_index` in `user_preferences`
4. RxDB sync propagates the change to Supabase
5. Path is automatically re-computed on next render with new position
6. Streak is calculated based on consecutive daily completions

**Key Property:** Progress is a simple counter, not date-dependent scheduling.

Completion tracking for reviews and quizzes is stored in:
- `user_preferences.review_completion_dates`: Array of dates when reviews were completed
- `user_preferences.quiz_completion_dates`: Array of dates when quizzes were completed

---

### 6.4 MVP Schedule Rules

**Study Days:**
- Weekdays (Sunday-Thursday) by default
- Friday: Optional (controlled by `skip_friday` preference)
- Saturday (Shabbat): Always skipped
- Jewish holidays: Skipped (stored in `yom_tov_dates`)

**Unlock Logic:**
- Each node has an `unlock_date` computed at path generation time
- Nodes become available when current date >= unlock_date
- Completion of prerequisites is not required for unlock (just dates)
- Users can skip ahead to any unlocked content

---

## 7. AI Content Generation

### 7.1 Strategy

**Hybrid generation**

- Content is generated once and cached
- Generation is triggered server-side
- Clients never wait on AI responses

### 7.2 Explanation Rules

- AI reads all available Sefaria commentaries
- Produces:
  - One clear, consistent explanation
  - Optional structured summary of opinions

---

## 8. Sync Strategy

### 8.1 Sync Window

- Rolling 14-day window (±14 days from current date)
- Applied at query level (not in sync rules)
- Forward and backward: includes recent history for streak calculation

### 8.2 Synced Data

All data synced to local device:

- **user_preferences**: User's learning configuration (pace, review intensity, progress)
- **content_cache**: Content for Mishnayot within 14-day window
- **quiz_questions**: Questions for quizzes within the window

**Note:** The learning path is computed locally from `user_preferences`, not synced.

**Rolling Window Strategy:**
- Applied when querying `content_cache`
- Includes content where unlock_date is within ±14 days of current date
- Window moves forward automatically as dates progress
- Ensures offline access to recent history (for streak) and upcoming content

### 8.3 Content Generation During Sync

**Initial Setup:**
1. User completes onboarding (sets pace, review intensity)
2. Client locally computes initial learning path from preferences
3. `generate-path` Edge Function is called to pre-generate content for next 14 days

**Ongoing Sync:**
- During periodic sync, check for missing content in 14-day window
- Generate any missing content using Edge Functions:
  - `generate-content`: Creates Mishnah text + AI explanation
  - `generate-quiz`: Creates quiz questions for weekly assessments
- Non-blocking: Content generation happens in background
- Users see loading states if content not yet available

**Rollforward Strategy:**
- As dates progress, the 14-day window moves forward
- New content becomes visible as it enters the window
- Old content (outside window) is retained in cache but not synced

### 8.4 Conflict Resolution

- Strategy: Last-write-wins based on `updated_at` timestamp
- is_completed: resolved by `completed_at` timestamp
- Streak is derived data, never stored as mutable state

### 8.4 Streak Calculation

Streaks are **derived data**, calculated on-demand from the computed path.

**Rules:**

- A streak represents consecutive **study days** with completed learning nodes
- Days without study (Shabbat, holidays, Fridays if skipped) do not affect the streak
- Only **learning nodes** (not reviews or quizzes) count toward the streak
- Retroactive completion (marking past units as done) **does not affect the streak**
- Only completions on or before the scheduled date contribute to the streak

**Algorithm:**

1. Compute learning nodes from path-generator, ordered by unlock_date descending
2. Starting from the most recent scheduled learning node:
   - If completed and completion date ≤ unlock_date → increment streak
   - If not completed or completion date > unlock_date → streak ends
   - Skip non-learning nodes (reviews, quizzes, dividers)
   - Skip nodes where unlock_date > current date (not yet scheduled)
3. Return streak count

**Note:** Completion tracking uses `user_preferences` fields, comparing completion timestamps against scheduled unlock dates from path computation.

**Storage:** The calculated streak is cached in `user_preferences.streak_count` and updated when:
- User completes a learning node on its scheduled date
- User breaks a streak by missing a day
- Daily background sync recalculates streaks

---

## 9. Offline Behavior (All Platforms)

Offline mode supports:
- Reading scheduled units
- Marking completion
- Local streak calculation

Network is required only for:
- Initial authentication
- Account linking

---

## 10. Platform Implementations

### 10.1 Android

- Kotlin + Jetpack Compose
- Room (SQLite) for local storage
- Custom sync engine with Supabase Realtime
- WorkManager for periodic sync
- Content generation during sync

### 10.2 iOS

- Swift + SwiftUI
- SQLite for local storage
- Custom sync engine with Supabase Realtime
- BGAppRefreshTask for periodic sync
- Content generation during sync

### 10.3 Web

- Next.js + React
- Tailwind CSS
- RxDB (IndexedDB) for local storage
- RxDB Supabase plugin for sync
- PWA with service worker for offline reading
- Content generation during sync

---

## 11. Security

### 11.1 Row Level Security

All user-specific tables enforce RLS policies:

**user_preferences:**
```sql
-- Users can only access their own preferences
CREATE POLICY user_preferences_policy ON user_preferences
  FOR ALL USING (auth.uid() = user_id);
```

**quiz_questions:**
```sql
-- All authenticated users can read quiz questions
CREATE POLICY quiz_questions_read_policy ON quiz_questions
  FOR SELECT USING (auth.role() = 'authenticated');
```

**content_cache:**
```sql
-- All authenticated users can read cached content
CREATE POLICY content_cache_read_policy ON content_cache
  FOR SELECT USING (auth.role() = 'authenticated');
```

### 11.2 Realtime Subscriptions

All tables are added to Supabase Realtime publication for live sync:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE content_cache;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_questions;
```

---

## 12. Explicit Non-Goals (MVP)

- Social features
- Comments or discussions
- Notifications
- AI chat / Q&A
- Multimedia content
- Cross-user interactions

---

## 13. Summary

HaLomeid's technical architecture is:
- **Deterministic**: Learning path is computed client-side from user preferences
- **Offline-first**: Essential data synced locally with 14-day rolling content window
- **Platform-agnostic**: Shared `path-generator.ts` library provides identical logic across platforms
- **Position-based**: Progress tracked by simple index counter, not stored path rows
- **User-driven**: Each user has independent pace, start date, and review settings

All platforms are equal citizens, with the same capabilities and user experience.