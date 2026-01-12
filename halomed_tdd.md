# Technical Design Document (TDD)
## HaLomeid (הלומד)

**Version:** 1.3  
**Status:** Ready for Implementation  
**Architecture:** Unified Backend, Offline-First Clients  
**Platforms:** Android (Kotlin/Compose), iOS (Swift/SwiftUI), Web (Next.js/React)

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
- **PowerSync**
  - Bi-directional sync
  - SQLite on all platforms
  - Sync rules restrict data to user-relevant scope

### 2.3 Content Sources
- **Sefaria API**
  - Mishnah text
  - Classical commentaries

### 2.4 Language (MVP)

- **Hebrew only** — all content and UI
- Content fields use `_he` suffix (e.g., `mishna_text_he`, `ai_explanation_he`)
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

### 4.1 Tracks

Tracks define *what* is studied and *when* study units exist.

```sql
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_endpoint TEXT DEFAULT 'https://www.sefaria.org/api/',
  schedule_type TEXT NOT NULL
  -- MVP: 'DAILY_WEEKDAYS_ONLY'
);
```

### 4.2 Content Cache

Deduplicated content shared across all users.

```sql
CREATE TABLE content_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE,
  mishna_text_he TEXT NOT NULL,
  ai_explanation_he TEXT NOT NULL,
  ai_deep_dive_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Content Structure:**

| Field | Description |
|---|---|
| `mishna_text_he` | Source text (Mishnah) — displayed bold and visually dominant |
| `ai_explanation_he` | Clear Explanation — one coherent interpretation based on classical commentaries |
| `ai_deep_dive_json` | Summary of Commentaries — expandable section (collapsed by default) presenting multiple interpretive approaches |

### 4.3 User Study Log

Represents scheduled units and completion state.

```sql
CREATE TABLE user_study_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  track_id UUID REFERENCES tracks(id),
  study_date DATE NOT NULL,
  content_id UUID REFERENCES content_cache(id),
  is_completed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, study_date, track_id)
);
```

A row exists only if a unit is scheduled for that user on that date.

**Note:** Dates are stored as DATE (date-only, no time component) in UTC. Clients interpret and display dates according to the device's local time zone.

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

## 6. Track Scheduling (Server-Side)

### 6.1 Responsibility

Scheduling is entirely server-driven.

Clients:
- Do not calculate calendars
- Do not enforce rules
- Simply render scheduled units
- Determine dates using the device's local time zone

---

### 6.2 Edge Function: generate-schedule

#### Inputs

- user_id
- track_id
- start_date
- days_ahead (fixed: 14)

#### Process

1. Read tracks.schedule_type
2. Iterate dates within window
3. For each date:
   - If allowed by schedule type:
     - Assign next content reference
     - Create user_study_log row if missing
4. Ensure content_cache exists for each reference

#### Track Joining

Users may join a track **at any point**, without a fixed global start date.

- When a user joins a track, `start_date` is set to the current date (based on device timezone)
- The Edge Function creates the first scheduled unit for that user starting from the join date
- Each user has their own track progression independent of other users
- Content assignment continues sequentially from the user's join point

---

### 6.3 MVP Schedule Rule

**DAILY_WEEKDAYS_ONLY**

- Units generated on weekdays only
- Shabbat and Jewish holidays are excluded
- If no row exists for a date:
  - No unit
  - No completion expected
  - No streak impact

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

## 8. Sync Strategy (PowerSync)

### 8.1 Sync Window

- Rolling 14-day window (forward only)

### 8.2 Synced Data

- user_study_log rows within window
- content_cache rows referenced by those logs

### 8.3 Conflict Resolution

- is_completed: last-write-wins
- Streak is derived data, never stored as mutable state

### 8.4 Streak Calculation

Streaks are **derived data**, calculated on-demand from `user_study_log`.

**Rules:**

- Streaks are calculated **per track**
- A streak represents consecutive **scheduled units** that were completed
- Days without a scheduled unit:
  - Do not increment the streak
  - Do not break the streak
- Retroactive completion (marking past units as done) **does not affect the streak**
- Only forward-in-time completions on the day of the scheduled unit contribute to streak

**Algorithm:**

1. Query `user_study_log` for the track, ordered by `study_date` descending
2. Starting from the most recent scheduled unit:
   - If `is_completed = true` and was completed on the scheduled day → increment streak
   - If `is_completed = false` → streak ends
   - Skip days without scheduled units (no row exists)
3. Return streak count

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
- PowerSync SQLite (encrypted)
- WorkManager for periodic sync

### 10.2 iOS

- Swift + SwiftUI
- PowerSync SQLite
- BGAppRefreshTask for periodic sync

### 10.3 Web

- Next.js + React
- Tailwind CSS
- PowerSync Web (IndexedDB-backed SQLite)
- PWA with service worker for offline reading

---

## 11. Security

### 11.1 Row Level Security

- user_study_log: auth.uid() = user_id
- content_cache: accessed only via PowerSync sync rules tied to user logs

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
- Deterministic
- Offline-first
- Platform-agnostic
- Track-driven rather than behavior-enforcing

All platforms are equal citizens.