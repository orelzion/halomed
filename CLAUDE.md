# HaLomeid (הלומד) - Claude Code Project Guide

## Project Overview

HaLomeid is an **offline-first, multi-platform Torah learning application** designed for religious and traditional users who seek a consistent, calm, and meaningful daily Torah study habit.

**Live Demo:** https://halomed.vercel.app/

### Core Value Proposition
> *A clear, calm, and consistent daily learning experience — without overload, guilt, or enforcement.*

## Quick Start

```bash
# Web development
cd web && npm install && npm run dev

# Supabase local development
supabase start
supabase functions serve

# Run tests
cd web && npm test
cd tests/maestro && maestro test flows/web/
```

## Key Documents

| Document | Path | Purpose |
|----------|------|---------|
| **PRD** | `docs/halomed_prd.md` | Product requirements, user stories, MVP scope |
| **TDD** | `docs/halomed_tdd.md` | Technical architecture, database schema, API design |
| **Agents Guide** | `.claude/agents/README.md` | Role-specific development guides |

**Always read the PRD and TDD before making significant changes.**

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS |
| **Database** | Supabase (PostgreSQL v17) |
| **Sync** | RxDB (offline-first with IndexedDB) |
| **Auth** | Supabase Auth (Anonymous, Google, Apple) |
| **Edge Functions** | Deno v2 (TypeScript) |
| **Content API** | Sefaria API |
| **AI** | Google Gemini |
| **PWA** | Serwist + Service Worker |
| **i18n** | next-i18next (Hebrew only for MVP) |

## Project Structure

```
halomed/
├── web/                    # Next.js web application
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   ├── lib/               # Utilities, hooks, database
│   └── locales/           # i18n translations (Hebrew)
├── supabase/              # Backend infrastructure
│   ├── functions/         # Edge Functions (Deno)
│   ├── migrations/        # Database migrations
│   └── config.toml        # Local dev config
├── shared/                # Shared code across platforms
├── tests/                 # E2E tests (Maestro)
├── docs/                  # Documentation (PRD, TDD)
├── .claude/               # Claude Code agent guides
│   └── agents/           # Role-specific guides
└── .cursor/               # Cursor AI configurations (legacy)
```

## Development Guidelines

### Critical Rules

1. **No Hardcoded Strings** - All user-facing text must use i18n (`useTranslation`)
2. **No Arbitrary Delays** - Never use `setTimeout` to wait for data; use reactive patterns
3. **Offline-First** - All data operations go through RxDB first
4. **RTL Support** - UI is Hebrew-only with full RTL layout
5. **Dark/Light/System Themes** - Support all three theme modes

### Code Quality Rules

**From `.cursor/rules/no-code-smells.mdc`:**
```typescript
// BAD - arbitrary delay hoping data is ready
setTimeout(() => doSomething(), 500);

// GOOD - react to state changes
useEffect(() => {
  if (data && isReady) doSomething();
}, [data, isReady]);

// GOOD - use reactive queries
const subscription = query.subscribe(handleResult);
```

### Supabase Edge Functions

**Always deploy with `--use-api` flag:**
```bash
supabase functions deploy [function_name] --use-api
```

### Security

- Never commit API keys or secrets
- All tables must have RLS enabled
- User data accessed only via `auth.uid() = user_id`
- Use environment variables for all secrets

## Agent Guides

When working on specific areas, reference the appropriate guide in `.claude/agents/`:

| Area | Guide | When to Use |
|------|-------|-------------|
| Architecture | `architect.md` | Starting new features, planning |
| Backend | `backend.md` | Supabase, database, Edge Functions |
| Web | `web.md` | Next.js, React, UI components |
| Sync | `sync.md` | RxDB, offline-first patterns |
| Design System | `design-system.md` | Colors, typography, themes |
| Content | `content-generation.md` | Sefaria API, AI explanations |
| Scheduling | `scheduling.md` | Track scheduling logic |
| Testing | `client-testing.md` | Maestro E2E tests |
| Security | `security.md` | Pre-commit checks, secrets |
| Regulations | `regulations.md` | GDPR, accessibility, cookies |

### Working on a Feature

1. Read relevant PRD/TDD sections
2. Consult the appropriate agent guide(s)
3. Follow the implementation patterns described
4. Run tests before committing

## Database Schema (Quick Reference)

### tracks
```sql
CREATE TABLE tracks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  source_endpoint TEXT DEFAULT 'https://www.sefaria.org/api/',
  schedule_type TEXT NOT NULL  -- MVP: 'DAILY_WEEKDAYS_ONLY'
);
```

### content_cache
```sql
CREATE TABLE content_cache (
  id UUID PRIMARY KEY,
  ref_id TEXT UNIQUE NOT NULL,
  source_text_he TEXT NOT NULL,
  ai_explanation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### user_study_log
```sql
CREATE TABLE user_study_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  track_id UUID REFERENCES tracks(id),
  study_date DATE NOT NULL,
  content_id UUID REFERENCES content_cache(id),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, study_date, track_id)
);
```

## Design System

### Desert Oasis Theme

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| Primary BG | `#FEFAE0` | `#121212` | Study screen |
| Secondary BG | `#E9EDC9` | `#1E1E1E` | Home, headers |
| Card | `#FAEDCD` | `#2D2D2D` | Track cards |
| Accent | `#D4A373` | `#D4A373` | Streak, Done button |
| Muted | `#CCD5AE` | `#3D3D3D` | Icons, dividers |

### Typography

- **Source Text (Mishnah):** Frank Ruhl Libre (Bold)
- **AI Explanation & UI:** Noto Sans Hebrew (Regular)

## MVP Scope

**In Scope:**
- Daily Mishnah learning (weekdays only)
- AI-generated explanations from Sefaria commentaries
- Offline-first sync with 14-day rolling window
- Streak tracking per track
- Anonymous and OAuth authentication
- Web platform (PWA)

**Out of Scope (MVP):**
- Social features, comments, discussions
- Notifications / reminders
- AI chat or Q&A
- Multimedia content
- Android/iOS native apps (future)

## Useful Commands

```bash
# Development
cd web && npm run dev              # Start web dev server
supabase start                     # Start local Supabase
supabase functions serve           # Serve Edge Functions locally

# Database
supabase migration new [name]      # Create new migration
supabase db push                   # Apply migrations

# Testing
cd tests/maestro && maestro test   # Run E2E tests
cd web && npm test                 # Run unit tests

# Deployment
supabase functions deploy [fn] --use-api  # Deploy Edge Function
cd web && npm run build            # Build for production
```

## Common Patterns

### Marking Study Completion (Offline-First)

```typescript
// Local update via RxDB (immediate)
await db.user_study_log.findOne(id).update({
  $set: {
    is_completed: true,
    completed_at: new Date().toISOString(),
  },
});
// RxDB automatically syncs when online
```

### Streak Calculation

```typescript
// Calculated per track from user_study_log
// Only counts completions made on the scheduled day
// Retroactive completions don't affect streak
function calculateStreak(userId: string, trackId: string): number {
  // Query units ordered by study_date DESC
  // Count consecutive completed units
  // Stop at first incomplete unit
}
```

### 14-Day Sync Window

```typescript
// Applied at query level
const window = {
  start: subDays(new Date(), 14),
  end: addDays(new Date(), 14),
};

// Use in RxDB replication queryBuilder
```

## Getting Help

- **Project Documentation:** `docs/`
- **Agent Guides:** `.claude/agents/`
- **Cursor Agents (legacy):** `.cursor/agents/`
