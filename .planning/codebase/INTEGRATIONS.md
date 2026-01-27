# External Integrations

**Analysis Date:** 2026-01-27

## APIs & External Services

**Sefaria API - Torah Text & Commentaries:**
- Service: Sefaria.org API (`https://www.sefaria.org/api/`)
- What it's used for: Fetch Hebrew Torah text, Mishnah passages, classical commentaries (Bartenura, Mishnat Eretz Israel, Rambam)
- SDK/Client: Direct HTTP fetch in Deno Edge Functions
- Implementation: `supabase/functions/_shared/sefaria.ts`
- Endpoints:
  - `GET /api/texts/{ref}` - Fetch text with Hebrew reference and translations
  - `GET /api/links/{ref}` - Fetch related commentaries and sources
- Features:
  - Retry logic with exponential backoff for rate limiting (3 retries default)
  - Converts ref_id format (e.g., `Mishnah_Berakhot.1.1`) to Sefaria format
  - Extracts commentator names from references
  - Handles both string and array Hebrew text responses
- Rate limit handling: 429 responses with Retry-After headers respected

**Wikisource API - Structured Mishna Text:**
- Service: Hebrew Wikisource (`he.wikisource.org`)
- What it's used for: Fetch structured, formatted Mishnah text (preferred over Sefaria for better formatting)
- Implementation: `supabase/functions/_shared/wikisource.ts`
- Fallback: If Wikisource fails, falls back to Sefaria API
- Used in: `generate-content` edge function (line 173)

**Google Gemini API - AI Content Generation:**
- Service: Google Generative AI API (`https://generativelanguage.googleapis.com/v1beta`)
- Model: `gemini-3-flash-preview` (structured JSON output support)
- What it's used for: Generate AI-powered Torah explanations (summary, halakha, opinions, expansions)
- SDK/Client: Direct HTTP fetch with JSON schema validation
- Auth: Bearer token via `GEMINI_API_KEY` environment variable
- Implementation: `supabase/functions/_shared/gemini.ts`
- Request format:
  - Source Hebrew text + classical commentaries
  - Structured output schema for MishnahExplanation interface
  - Language: Hebrew (both input and output)
- Response format: JSON with `summary`, `halakha`, `opinions[]`, `expansions[]` fields
- Error handling: Returns 503 if API key missing or API fails (never caches placeholder)
- Features:
  - Schema validation for structured outputs
  - Processes Sefaria commentary data into context
  - Fallback error responses with retriable flag

## Data Storage

**Databases:**
- PostgreSQL 17 (Supabase)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` for client, `SUPABASE_SERVICE_ROLE_KEY` for Edge Functions
  - Client: `@supabase/supabase-js` v2.90.1
  - RLS (Row Level Security): Enabled on all tables
  - User access: Filtered by `auth.uid() = user_id`

**Local Client Storage:**
- IndexedDB via Dexie 4.2.1
- Abstracted through RxDB 15.39.0
- Collections:
  - `user_study_log` - Track study completion per day per track
  - `content_cache` - Cached Torah content with AI explanations
  - `tracks` - Available learning tracks
  - `user_preferences` - User settings (themes, notifications, etc.)
  - `learning_path` - Generated learning path nodes
  - `quiz_questions` - Quiz content
- Implementation: `web/lib/database/database.ts`, `web/lib/database/schemas.ts`

**File Storage:**
- Not used in MVP
- Supabase Storage available but not configured

**Caching:**
- Content-level caching in `content_cache` PostgreSQL table
- Client-side RxDB provides reactive caching with automatic Supabase sync
- 14-day rolling sync window for offline-first operations
- Service Worker precaching via Serwist for static assets

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (managed)
- Methods:
  - Anonymous (no credentials required, enabled for MVP)
  - Google OAuth (configured but disabled by default, requires `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`)
  - Apple OAuth (configured but disabled by default, requires `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET`)

**Implementation Details:**
- Location: `web/app/auth/callback/route.ts` (OAuth callback handler)
- Flow: PKCE (Proof Key for Code Exchange) for secure OAuth
- Server-side: Uses `@supabase/ssr` for cookie-based token management
- Client-side: Uses `@supabase/supabase-js` for session management
- JWT: 3600-second expiry (1 hour), refresh token rotation enabled
- Account linking: Anonymous users can link to Google/Apple accounts
- Supabase config: `supabase/config.toml` lines 144-327

## Monitoring & Observability

**Error Tracking:**
- Not configured in MVP (no Sentry, LogRocket, etc.)
- Console.error/warn used in Edge Functions for debugging

**Logs:**
- Supabase Edge Function logs: Via Deno's console API
- Client-side: Browser console and service worker logs
- PostHog event logging (optional, see Analytics)

**Analytics:**
- PostHog 1.328.0 (client) + posthog-node 5.21.1 (server)
- Production: `https://eu.i.posthog.com` with key `phc_7AuDW5mb0tjnKA4RH8nvjYZza2wU8mArV6U8JmKArFG`
- Optional in development (fails gracefully if not configured)
- Implementation: `web/lib/posthog-server.ts`, PostHog SDK client-side
- Tagged with environment and app version in all events
- Server-side event capture in OAuth callback route

## CI/CD & Deployment

**Hosting:**
- Vercel (Next.js hosting with automatic deployments)
  - Main branch → Production deployment
  - Develop branch → Preview deployment
  - Configuration: `web/vercel.json`

**Edge Functions:**
- Supabase (Deno v2 runtime)
- Deployment: `supabase functions deploy [function_name] --use-api`
- Functions requiring `--use-api` flag for proper authorization
- 8 functions: `generate-content`, `generate-path`, `generate-quiz`, `generate-schedule`, `update-preferences`, `schedule-review`, `query-schedule`, `ensure-content`

**Database Migrations:**
- Supabase migration system
- Location: Applied via `supabase db push`
- Seed data: `supabase/seed.sql`

**CI/CD Pipeline:**
- Vercel build validation (automatic on push to main/develop)
- No explicit GitHub Actions configured for tests
- Maestro E2E tests run locally before merging

## Environment Configuration

**Critical Environment Variables:**

**Client-side (NEXT_PUBLIC_*):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key for client
- `NEXT_PUBLIC_POWERSYNC_INSTANCE_ID` - PowerSync instance (future, currently unused)
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog API key (optional, production only)
- `NEXT_PUBLIC_POSTHOG_HOST` - PostHog host (optional, production only)

**Server-side (Edge Functions):**
- `SUPABASE_URL` - Set automatically by Supabase platform
- `SUPABASE_SERVICE_ROLE_KEY` - Set automatically by Supabase platform
- `GEMINI_API_KEY` - Google Gemini API key (required for content generation)
- `SEFARIA_API_URL` - Optional, defaults to `https://www.sefaria.org/api/`

**Secrets Location:**
- Development: `web/.env.local` (git-ignored)
- Production: Vercel environment variables (dashboard)
- Edge Functions: Supabase Secrets (via `supabase/functions/.env`)
- PowerSync credentials: `.env` file (git-ignored)

## Webhooks & Callbacks

**Incoming:**
- OAuth callback endpoint: `web/app/auth/callback/route.ts`
  - Handles: Google, Apple auth redirects
  - Processes: Account linking for anonymous users
  - Redirects: Sent to `NEXT_PUBLIC_SUPABASE_URL` + `/auth/v1/callback`

**Outgoing:**
- None currently configured
- Supabase could trigger webhooks on auth events (not enabled in MVP)

## External Data Sources

**Content:**
- Sefaria API - Primary source for Torah texts and classical commentaries
- Wikisource - Structured Mishnah formatting
- Hebcal (@hebcal/core) - Hebrew calendar calculations for scheduling

**User Analytics:**
- PostHog - Event tracking and analytics (optional)

---

*Integration audit: 2026-01-27*
