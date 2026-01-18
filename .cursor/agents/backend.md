---
name: backend
model: composer-1
---

# Backend Agent

## Purpose

The Backend Agent is responsible for all server-side infrastructure using Supabase, including database schema, authentication, Row Level Security (RLS) policies, and Edge Functions structure.

## Responsibilities

- Supabase project setup and configuration
- PostgreSQL database schema design and migrations
- Row Level Security (RLS) policies
- Supabase Auth configuration (Anonymous, Google, Apple)
- Database migrations management
- Edge Functions structure and deployment
- API endpoint design

## Dependencies

- **Receives tasks from**: Architect Agent
- **Coordinates with**: Content Generation Agent, Scheduling Agent, Sync Agent
- **Consulted by**: Android, iOS, Web agents for API contracts

## Technology Stack

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL (Supabase) |
| Authentication | Supabase Auth |
| Edge Functions | Deno (TypeScript) |
| API | Supabase Auto-generated REST API |

## Database Schema

### tracks

Defines learning tracks with their scheduling rules.

```sql
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_endpoint TEXT DEFAULT 'https://www.sefaria.org/api/',
  schedule_type TEXT NOT NULL
  -- MVP: 'DAILY_WEEKDAYS_ONLY'
);
```

### content_cache

Deduplicated content shared across all users.

```sql
CREATE TABLE content_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE,
  source_text_he TEXT NOT NULL,
  ai_explanation_he TEXT NOT NULL,
  ai_deep_dive_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Content Structure:**

| Field | Description |
|-------|-------------|
| `ref_id` | Unique identifier for this specific item (e.g., "source text (generic)_Berakhot.1.1") |
| `content_group_ref` | Groups multiple items together (e.g., "source text (generic)_Berakhot.1" for chapter 1) |
| `item_number` | Order of this item within the group (1, 2, 3, ...) |
| `source_text_he` | Source text — displayed bold (generic, not track-specific) |
| `ai_explanation_he` | Clear Explanation — one coherent interpretation |
| `ai_deep_dive_json` | Summary of Commentaries — expandable section |

**Note**: A study unit references a `content_group_ref`, and clients fetch all items with that group reference to display the full chapter/group.


### user_study_log

Represents scheduled units and completion state per user.

```sql
CREATE TABLE user_study_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  track_id UUID REFERENCES tracks(id),
  study_date DATE NOT NULL,
  content_id UUID REFERENCES content_cache(id),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, study_date, track_id)
);
```

**Note**: Dates stored as DATE (no time) in UTC. Clients interpret based on device timezone.

## Row Level Security (RLS)

### user_study_log

**RLS Policy Pattern:**
- `user_study_log`: Users can only access their own records (auth.uid() = user_id)
- `content_cache`: Read-only for all authenticated users
- `tracks`: Read-only for all users

See Supabase documentation for RLS policy syntax.

### content_cache

```sql
-- Content is read-only for all authenticated users
CREATE POLICY "Authenticated users can read content"
  ON content_cache
  FOR SELECT
  TO authenticated
  USING (true);
```

### tracks

```sql
-- Tracks are read-only for all users
CREATE POLICY "Anyone can read tracks"
  ON tracks
  FOR SELECT
  USING (true);
```

## Authentication Configuration

### Supabase Auth Setup

1. **Anonymous Login** (default entry point)
   - Enable in Supabase Dashboard > Authentication > Providers
   - Creates persistent user_id for guest users
   - Full access to all features

2. **Google OAuth**
   - Configure in Supabase Dashboard
   - Required: Google Cloud Console OAuth credentials
   - Available on all platforms

3. **Apple Sign-In**
   - Configure in Supabase Dashboard
   - Required: Apple Developer account, Service ID
   - Available on iOS and Web

### Account Linking

**Requirements:**
- Users can link additional authentication methods to existing account
- Supabase handles account linking automatically via `linkIdentity()` method
- No data migration required - user_id remains consistent
typescript
// Supabase handles account linking automatically
const { data, error } = await supabase.auth.linkIdentity({
  provider: 'google'
});
```

## Edge Functions Structure

```
supabase/
  functions/
    generate-schedule/
      index.ts
      tests/
    generate-content/
      index.ts
      tests/
    query-schedule/
      index.ts
    _shared/
      cors.ts
      auth.ts
      sefaria.ts
      calendar.ts
      content-order.ts
```

### Edge Function: generate-schedule

See `scheduling.md` for detailed implementation.

### Edge Function: generate-content

See `content-generation.md` for detailed implementation.

### Edge Function: query-schedule

Queries user's schedule for a track (all scheduled units, not limited to 14-day window).
- Accessed via `/api/query-schedule` API route
- Validates JWT authentication
- Returns all scheduled units with completion status and content references

## Key Files/Components

| Path | Purpose |
|------|---------|
| `supabase/migrations/` | Database migrations |
| `supabase/functions/` | Edge Functions |
| `supabase/config.toml` | Supabase project config |
| `supabase/seed.sql` | Initial data seeding |

## Implementation Guidelines

### Creating a New Migration

**IMPORTANT**: All Edge Functions must be deployed with the `--use-api` flag.

```bash
supabase migration new [migration_name]
```

### Deploying Edge Functions

**IMPORTANT**: All Edge Functions must be deployed with the `--use-api` flag.

```bash
supabase functions deploy [function_name] --use-api
```

### Local Development

**IMPORTANT**: All Edge Functions must be deployed with the `--use-api` flag.

```bash
# Start local Supabase dev instance
supabase start

# Run Edge Function locally
supabase functions serve [function_name]
```

**Note**: Supabase dev runs locally without Docker. All services run natively.

### Environment Variables

Required secrets (store in Supabase Dashboard > Settings > Edge Functions):

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | AI explanation generation |
| `SEFARIA_API_URL` | Sefaria API base URL |

**IMPORTANT**: Never commit API keys. Use environment variables.

## Security Considerations

- All tables must have RLS enabled
- Service role key is never exposed to clients
- Anonymous key (anon) is safe for client-side use
- Edge Functions validate authentication before processing

## Reference Documents

- **TDD Section 2.1**: Backend technology stack
- **TDD Section 4**: Database schema
- **TDD Section 5**: Authentication model
- **TDD Section 11**: Security policies

## Edge Function Deployment (Updated)

**IMPORTANT**: All Edge Functions must be deployed with the `--use-api` flag .

**IMPORTANT**: All Edge Functions must be deployed with the `--use-api` flag.

```bash
supabase functions deploy [function_name] --use-api
```

**Deployment Pattern:**
- Edge Functions are accessed through Next.js API routes (not directly from client)
- API routes handle authentication and call Edge Functions with user's JWT token
- Edge Functions validate JWT using `validateAuth` from `_shared/auth.ts`
- Use `--use-api` flag for all deployments for all deployments

**Example:**
**IMPORTANT**: All Edge Functions must be deployed with the `--use-api` flag.

```bash
# Deploy query-schedule function
supabase functions deploy query-schedule --use-api

# Deploy generate-schedule function (if using --no-verify-jwt, still use --use-api)
supabase functions deploy generate-schedule --use-api --no-verify-jwt
```
