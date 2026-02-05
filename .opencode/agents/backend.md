# Backend Guide

## Purpose

The Backend Guide covers all server-side infrastructure using Supabase, including database schema, authentication, Row Level Security (RLS) policies, and Edge Functions.

## Responsibilities

- Supabase project setup and configuration
- PostgreSQL database schema design and migrations
- Row Level Security (RLS) policies
- Supabase Auth configuration (Anonymous, Google, Apple)
- Database migrations management
- Edge Functions structure and deployment
- API endpoint design

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
  ref_id TEXT UNIQUE NOT NULL,
  source_text_he TEXT NOT NULL,
  ai_explanation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Content Structure:**

| Field | Description |
|-------|-------------|
| `ref_id` | Unique identifier (e.g., "Mishnah_Berakhot.1.1") |
| `source_text_he` | Source text — displayed bold |
| `ai_explanation_json` | Structured JSON with explanation, halakha, opinions, expansions |

### user_study_log

Represents scheduled units and completion state per user.

```sql
CREATE TABLE user_study_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  study_date DATE NOT NULL,
  content_id UUID REFERENCES content_cache(id) ON DELETE SET NULL,
  is_completed BOOLEAN DEFAULT FALSE NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, study_date, track_id)
);
```

**Note**: Dates stored as DATE (no time) in UTC. Clients interpret based on device timezone.

## Row Level Security (RLS)

### user_study_log

```sql
-- Users can only access their own records
CREATE POLICY "Users can access own study log"
  ON user_study_log
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);
```

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

1. **Anonymous Login**
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

```typescript
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
    generate-content/
      index.ts
    generate-quiz/
      index.ts
    query-schedule/
      index.ts
    ensure-content/
      index.ts
    schedule-review/
      index.ts
    update-preferences/
      index.ts
    _shared/
      cors.ts
      auth.ts
      sefaria.ts
      calendar.ts
      content-order.ts
```

## Implementation Guidelines

### Creating a New Migration

```bash
npx supabase migration new [migration_name]
```

### Deploying Edge Functions

**IMPORTANT**: Always deploy with `--use-api` flag:

```bash
npx supabase functions deploy [function_name] --use-api
```

### Local Development

```bash
# Start local Supabase dev instance
npx supabase start

# Run Edge Function locally
npx supabase functions serve [function_name]

# Push migrations to local database
npx supabase db push
```

### Environment Variables

Required secrets (store in Supabase Dashboard > Settings > Edge Functions):

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | AI explanation generation |
| `SEFARIA_API_URL` | Sefaria API base URL |

**IMPORTANT**: Never commit API keys. Use environment variables.

## Security Considerations

- All tables must have RLS enabled
- Service role key is never exposed to clients
- Anonymous key (anon) is safe for client-side use
- Edge Functions validate authentication before processing

## Key Files

| Path | Purpose |
|------|---------|
| `supabase/migrations/` | Database migrations |
| `supabase/functions/` | Edge Functions |
| `supabase/config.toml` | Supabase project config |

## Reference Documents

- **TDD Section 2.1**: Backend technology stack
- **TDD Section 4**: Database schema
- **TDD Section 5**: Authentication model
- **TDD Section 11**: Security policies
