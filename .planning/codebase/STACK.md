# Technology Stack

**Analysis Date:** 2026-01-27

## Languages

**Primary:**
- TypeScript 5 - All application code, edge functions, and configurations
- JavaScript - Service worker and browser APIs
- HTML/CSS - Rendered by React components

**Secondary:**
- TOML - Supabase configuration (`supabase/config.toml`)
- SQL - Database migrations and Edge Function queries
- YAML - Maestro E2E test definitions

## Runtime

**Environment:**
- Node.js 23.1.0 - Web development and build system
- Deno 2 - Edge Functions runtime (configured in `supabase/config.toml`, line 375)

**Package Manager:**
- npm - Web dependencies management
- Lockfile: `web/package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.1 - React framework with App Router (`web/app/`)
- React 19.2.3 - UI component library
- Tailwind CSS 3.4.19 - Utility-first CSS

**Offline-First Data:**
- RxDB 15.39.0 - Client-side database with IndexedDB storage via Dexie
  - Storage: `getRxStorageDexie()` from `rxdb/plugins/storage-dexie`
  - Collections: `user_study_log`, `content_cache`, `tracks`, `user_preferences`, `learning_path`, `quiz_questions`
  - Location: `web/lib/database/database.ts`, `web/lib/database/schemas.ts`

**Service Worker & PWA:**
- Serwist 9.5.0 - Service worker framework with `@serwist/next` integration
  - Service worker: `web/app/sw.ts`
  - Precaching and offline fallback configured
  - Navigation requests fallback to `/offline` page

**Theming:**
- next-themes 0.4.6 - Dark/light/system theme switching
  - Supports three theme modes (light, dark, system)

**Markdown & Content:**
- react-markdown 10.1.0 - Parse and render markdown from AI explanations

**Animation:**
- framer-motion 12.29.0 - UI animations and transitions

**Testing:**
- Maestro - E2E testing framework for UI flows
  - Config: `tests/maestro/config.yaml`
  - Test flows: `tests/maestro/flows/web/`

**Build & Dev:**
- Webpack - Next.js bundler (explicit webpack flag in dev/build)
- TypeScript 5 - Type checking
- ESLint 9 with eslint-config-next 16.1.1 - Code linting
- PostCSS 8.5.6 + Autoprefixer 10.4.23 - CSS processing
- Babel 7.28.6 - JavaScript transpilation with runtime plugin

**Internationalization:**
- next-i18next - i18n support (future expansion, currently Hebrew-only for MVP)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.90.1 - Supabase client for PostgreSQL operations
- @supabase/ssr 0.8.0 - Server-side Supabase integration for PKCE auth flow
- rxdb 15.39.0 - Offline-first reactive database (critical for offline functionality)
- dexie 4.2.1 - IndexedDB abstraction layer used by RxDB

**Infrastructure:**
- @hebcal/core 6.0.8 - Hebrew calendar operations (for scheduling weekdays)
- framer-motion 12.29.0 - Smooth UI animations
- posthog-js 1.328.0 - Client-side analytics
- posthog-node 5.21.1 - Server-side analytics

**Browser Compatibility:**
- process 0.11.10 - Node.js process module polyfill for browser
- @babel/runtime 7.28.6 - Shared babel helpers to reduce bundle size

## Configuration

**Environment (Development):**
- Supabase local: `http://127.0.0.1:54321` with demo anon key
- PowerSync instance ID: Empty for local dev
- Location: `web/.env.local`, `web/.env.local.dev`

**Environment (Production):**
- Supabase production: `https://sjpzatrwnwtcvjnyvdoy.supabase.co`
- PowerSync instance ID: `6966707c30605f245f01f498`
- PostHog: `https://eu.i.posthog.com`
- Location: `web/.env.local.prod`

**Build Configuration:**
- TypeScript: `web/tsconfig.json`
  - Target: ES2017
  - Strict mode enabled
  - Path aliases: `@/*` → web root, `@shared/*` → shared directory
  - Lib: dom, esnext, webworker
- Next.js uses webpack explicitly in dev/build scripts

**Supabase Local Config:**
- API: `http://127.0.0.1:54321`
- Database: PostgreSQL 17 on port 54322
- Studio: `http://127.0.0.1:54323`
- Auth: JWT expiry 3600s, email signup enabled, anonymous sign-ins enabled
- Edge Runtime: Deno 2 with `per_worker` policy for hot reload
- Functions: 8 Edge Functions with `verify_jwt = false` (auth handled by API route)
  - `generate-content`, `generate-path`, `generate-quiz`, `generate-schedule`
  - `update-preferences`, `schedule-review`, `query-schedule`, `ensure-content`

## Platform Requirements

**Development:**
- Node.js 23.1.0 (no .nvmrc, manually managed)
- Supabase CLI (for local dev with `supabase start`)
- Docker (for local Supabase containers)

**Production:**
- Vercel (NextJS hosting platform)
  - Preview builds: `develop` branch
  - Production builds: `main` branch
  - Configuration: `web/vercel.json`
- Edge Functions: Deployed to Supabase with `supabase functions deploy [name] --use-api`

---

*Stack analysis: 2026-01-27*
