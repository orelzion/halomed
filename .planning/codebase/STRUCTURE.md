# Codebase Structure

**Analysis Date:** 2026-01-27

## Directory Layout

```
halomed/
├── web/                       # Next.js web application (primary platform)
│   ├── app/                   # App Router pages and API routes
│   ├── components/            # React components (screens, UI, providers)
│   ├── lib/                   # Utilities, hooks, database, sync logic
│   ├── locales/               # i18n translations (Hebrew)
│   ├── public/                # Static assets (fonts, icons, manifest)
│   ├── node_modules/          # Dependencies
│   ├── .next/                 # Build output (generated)
│   ├── package.json           # Web dependencies
│   ├── tsconfig.json          # TypeScript config
│   ├── tailwind.config.ts     # Tailwind design tokens
│   ├── next.config.ts         # Next.js config
│   └── instrumentation-client.ts # PostHog setup
│
├── supabase/                  # Supabase backend infrastructure
│   ├── functions/             # Edge Functions (Deno/TypeScript)
│   ├── migrations/            # Database migrations
│   └── config.toml            # Local Supabase config
│
├── shared/                    # Cross-platform shared code
│   ├── lib/
│   │   └── path-generator.ts  # Pure learning path computation logic
│   └── strings/               # Shared string constants
│
├── docs/                      # Project documentation
│   ├── halomed_prd.md         # Product requirements document
│   ├── halomed_tdd.md         # Technical design document
│   ├── legal/                 # GDPR, privacy, licenses
│   └── screenshots/           # UI mockups
│
├── .claude/                   # Claude Code agent guides
│   └── agents/                # Role-specific development guides (architect.md, backend.md, web.md, etc.)
│
├── .planning/                 # GSD planning output (generated)
│   └── codebase/              # Architecture/structure/conventions/testing/concerns analysis
│
├── tests/                     # E2E tests
│   └── maestro/               # Maestro mobile test flows
│
└── CLAUDE.md                  # Project overview and quick start
```

## Directory Purposes

**`web/app/`:**
- Purpose: Next.js App Router pages and route handlers
- Contains: Page components, API routes, layout wrappers
- Key files:
  - `page.tsx`: Home page (shows PathScreen for authenticated users)
  - `layout.tsx`: Root layout with theme, auth, sync providers
  - `(auth)/login/page.tsx`: Authentication entry point
  - `onboarding/page.tsx`: First-time user setup
  - `study/[trackId]/page.tsx`: Study today's content (legacy track-based)
  - `study/path/[nodeId]/page.tsx`: Study a path node
  - `quiz/[nodeId]/page.tsx`: Weekly quiz
  - `review/page.tsx`: Review session
  - `api/*/route.ts`: API endpoints that proxy to Edge Functions

**`web/components/`:**
- Purpose: React components organized by type
- Contains:
  - `screens/`: Full-page components (PathScreen, StudyScreen, ReviewScreen, QuizScreen)
  - `providers/`: Context providers (AuthProvider, SyncProvider, ThemeProvider)
  - `ui/`: Reusable UI primitives (DoneButton, StreakIndicator, TrackCard, etc.)
  - `layout/`: Layout components (Footer, Header)

**`web/lib/`:**
- Purpose: Core application logic and utilities
- Contains:
  - `database/`: RxDB setup, schemas, initialization
  - `hooks/`: Custom React hooks for data and state management
  - `sync/`: Replication engine, schedule generation, content generation orchestration
  - `supabase/`: Supabase client setup and utilities
  - `utils/`: Utility functions (date-format, content-validation)
  - `migration/`: Data migration helpers
  - `privacy/`: Privacy-related utilities
  - `i18n.ts`: Internationalization setup

**`web/public/`:**
- Purpose: Static assets served by Next.js
- Contains: Favicon variants, app icons, manifest.json, fonts (Frank Ruhl Libre, Noto Sans Hebrew)

**`supabase/functions/`:**
- Purpose: Server-side Edge Functions (Deno)
- Contains:
  - `generate-schedule/`: Compute 14-day schedule for user
  - `generate-content/`: Fetch Sefaria content and generate AI explanation
  - `generate-quiz/`: Create quiz questions for content
  - `generate-path/`: Compute full learning path (deprecated, using path-generator now)
  - `schedule-review/`: Create review session nodes
  - `ensure-content/`: Ensure all content in window is generated
  - `_shared/`: Shared Deno utilities (types, Sefaria API, AI integration)

**`shared/lib/`:**
- Purpose: Platform-agnostic computation and types
- Contains:
  - `path-generator.ts`: Pure functions for learning path math (pace calculation, date mapping, review scheduling)
  - Works in both browser (via bundler) and Deno (Edge Functions)

**`docs/`:**
- Purpose: Project documentation and specs
- Key files:
  - `halomed_prd.md`: User stories, MVP scope, value proposition
  - `halomed_tdd.md`: Database schema, API design, sync strategy, all platform implementations
  - `legal/`: GDPR, privacy policy, accessibility statements

## Key File Locations

**Entry Points:**

- `web/app/layout.tsx`: Root layout initializing all providers
- `web/app/page.tsx`: Home page (authenticated users see PathScreen)
- `web/app/(auth)/login/page.tsx`: Login page (unauthenticated users)
- `web/app/onboarding/page.tsx`: Preference setup for new users
- `supabase/functions/_shared/index.ts`: Deno shared utilities

**Configuration:**

- `web/package.json`: Dependencies (Next.js, React, RxDB, Supabase)
- `web/tsconfig.json`: TypeScript compiler options with path aliases (`@/`, `@shared/`)
- `web/tailwind.config.ts`: Desert Oasis color tokens and theme config
- `web/next.config.ts`: Next.js features (PWA with Serwist, webpack config)
- `supabase/config.toml`: Local Supabase dev setup
- `CLAUDE.md`: Development guide and quick start commands

**Core Logic:**

- `web/lib/database/database.ts`: RxDB initialization and connection
- `web/lib/database/schemas.ts`: RxDB collection schemas (matching Postgres)
- `web/components/providers/SyncProvider.tsx`: Orchestrates all sync operations
- `web/lib/sync/replication.ts`: Sets up bidirectional replication for each collection
- `shared/lib/path-generator.ts`: Pure math for computing learning paths (40KB, comprehensive)
- `web/lib/hooks/usePreferences.ts`: User settings management
- `web/lib/hooks/usePath.ts`: Learning path UI adapter
- `web/lib/hooks/useStudyUnit.ts`: Content loading for study
- `web/lib/hooks/useReviews.ts`: Review content management

**UI Screens:**

- `web/components/screens/PathScreen.tsx`: Main home screen (44KB, paginated path)
- `web/components/screens/StudyScreen.tsx`: Content display with completion
- `web/components/screens/ReviewScreen.tsx`: Review session UI
- `web/components/screens/QuizScreen.tsx`: Quiz interaction
- `web/components/screens/ScheduleScreen.tsx`: Track-based schedule view (legacy)

**API Proxies:**

- `web/app/api/generate-schedule/route.ts`: Trigger schedule generation
- `web/app/api/generate-content/route.ts`: Trigger content generation
- `web/app/api/generate-quiz/route.ts`: Trigger quiz generation
- `web/app/api/ensure-content/route.ts`: Ensure content exists
- `web/app/api/calculate-yom-tov/route.ts`: Get holiday calendar

**Testing & E2E:**

- `tests/maestro/flows/web/`: Mobile testing flows (legacy)

## Naming Conventions

**Files:**

- Components: PascalCase (e.g., `PathScreen.tsx`, `DoneButton.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `usePreferences.ts`, `usePath.ts`)
- Utilities: camelCase (e.g., `content-validation.ts`, `date-format.ts`)
- API routes: kebab-case (e.g., `generate-schedule`, `ensure-content`)
- Edge Functions: kebab-case directories (e.g., `supabase/functions/generate-schedule/`)

**Directories:**

- Page routes: kebab-case with brackets for dynamic segments (e.g., `[trackId]`, `study/path/[nodeId]`)
- Layout groups: parentheses for organization (e.g., `(auth)`, `(legal)`)
- Component categories: lowercase plural (e.g., `screens/`, `ui/`, `hooks/`, `providers/`)

**Variables & Functions:**

- React components: PascalCase (e.g., `function PathScreen()`)
- Hooks: camelCase starting with `use` (e.g., `function usePreferences()`)
- Constants: UPPER_SNAKE_CASE (e.g., `PERIODIC_SYNC_INTERVAL_MS`, `PAGE_SIZE`)
- Boolean flags: prefixed with `is`, `has`, `can` (e.g., `isConnected`, `hasSynced`, `isLocked`)

## Where to Add New Code

**New Feature:**

- Primary code: `web/lib/hooks/use[FeatureName].ts` for data logic
- UI: `web/components/screens/[FeatureName]Screen.tsx` for full pages or `web/components/ui/[Component].tsx` for reusable pieces
- Page route: `web/app/[route]/page.tsx` to expose feature
- Tests: Same directory as implementation with `.test.ts` or `.spec.ts` suffix
- Backend: `supabase/functions/[feature]/` if server-side computation needed

**New Component/Module:**

- Reusable UI component: `web/components/ui/[ComponentName].tsx`
- Screen/page: `web/components/screens/[ScreenName].tsx`
- Custom hook: `web/lib/hooks/use[HookName].ts`
- Layout component: `web/components/layout/[LayoutName].tsx`
- Provider: `web/components/providers/[Provider].tsx`

**Utilities:**

- Date/time helpers: `web/lib/utils/date-format.ts`
- Validation: `web/lib/utils/content-validation.ts`
- Cross-platform: `shared/lib/[module].ts` (works in browser and Deno)

**Edge Functions:**

- New server operation: Create directory `supabase/functions/[operation-name]/`
- Implementation: `index.ts` in that directory
- Shared code: Use `supabase/functions/_shared/` for utilities
- Deploy: `supabase functions deploy [operation-name] --use-api`

## Special Directories

**`web/.next/`:**
- Purpose: Next.js build output and type definitions
- Generated: Yes
- Committed: No (in .gitignore)

**`web/node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (via npm install)
- Committed: No (in .gitignore)

**`web/locales/`:**
- Purpose: i18n translation files
- Structure: `he/common.json` for Hebrew strings
- Pattern: Keys like `app_name`, `daily_mishna`, `study_today`
- Committed: Yes (source of truth for strings)

**`web/public/`:**
- Purpose: Static assets
- Subdirectories: `/fonts` for Frank Ruhl Libre and Noto Sans Hebrew
- Contains: Favicon variants (16x16, 32x32, 192x192), manifest.json, apple-touch-icon
- Committed: Yes

**`supabase/migrations/`:**
- Purpose: Database schema changes
- Naming: `[timestamp]_[description].sql` (e.g., `20250113140000_create_tracks.sql`)
- Committed: Yes (source of truth for schema)
- Pattern: CREATE TABLE IF NOT EXISTS, add columns with IF NOT EXISTS

**`.claude/agents/`:**
- Purpose: Role-specific development guides
- Files: `architect.md`, `backend.md`, `web.md`, `sync.md`, `design-system.md`, `content-generation.md`, `scheduling.md`, `client-testing.md`, `security.md`, `regulations.md`
- Committed: Yes (project standards)

**`.planning/codebase/`:**
- Purpose: GSD analysis output
- Files: `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `STACK.md`, `INTEGRATIONS.md`, `CONCERNS.md`
- Generated: By GSD agents
- Committed: Yes (reference for future work)

## Path Aliases

Configured in `tsconfig.json`:

- `@/`: `web/` (current project root)
- `@shared/`: `shared/` (cross-platform code)

Usage examples:
- `import { usePreferences } from '@/lib/hooks/usePreferences'`
- `import { computePath } from '@shared/lib/path-generator'`

## Import Organization Pattern

Standard import order observed throughout codebase:

```typescript
// 1. React & Next.js
'use client';  // If client component
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import type { RxDatabase } from 'rxdb';
import { createClient } from '@supabase/supabase-js';

// 3. Local imports (absolute paths)
import { useAuthContext } from '@/components/providers/AuthProvider';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { computePath } from '@shared/lib/path-generator';

// 4. Type imports
import type { User, Session } from '@supabase/supabase-js';
import type { DatabaseCollections } from '@/lib/database/schemas';
```
