# PowerSync Integration Documentation

## Overview

This document provides integration guidance for platform agents (Android, iOS, Web) implementing PowerSync in client applications.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Supabase  │────▶│  PowerSync  │────▶│   Client   │
│  (Backend)  │◀────│   (Cloud)   │◀────│  (SQLite)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Configuration

### Instance Details
- **Instance ID**: From PowerSync Dashboard
- **Instance URL**: `https://[instance-id].powersync.journeyapps.com`
- **API Key**: From PowerSync Dashboard (for server-side operations)

### Authentication
- PowerSync uses Supabase Auth
- JWT tokens from Supabase are passed to PowerSync
- User ID extracted from token for data scoping

## Sync Rules

### Buckets

1. **user_data** - User-specific study logs
   - Parameter: `user_id` from token
   - Tables: `user_study_log`
   - Filter: User isolation (all user's data)

2. **content** - Content cache
   - Parameter: `user_id` from token
   - Tables: `content_cache`
   - Filter: Content referenced by user's study logs

3. **tracks** - Track definitions
   - No parameters (global)
   - Tables: `tracks`
   - Filter: None (all tracks)

## SQLite Schemas

Schema files are in `powersync/schemas/`:
- `user_study_log.sql`
- `content_cache.sql`
- `tracks.sql`

### Data Type Mappings

| PostgreSQL | SQLite |
|------------|--------|
| UUID | TEXT |
| BOOLEAN | INTEGER (0/1) |
| DATE | TEXT (YYYY-MM-DD) |
| TIMESTAMPTZ | TEXT (ISO 8601) |
| JSONB | TEXT (JSON string) |

## Conflict Resolution

### Strategy: Last-Write-Wins

- **is_completed**: Resolved by `completed_at` timestamp
- **completed_at**: Most recent timestamp wins
- Implemented automatically by PowerSync SDK

See `conflict-resolution.md` for details.

## Sync Window

### 14-Day Rolling Window

- **Range**: Current date ± 14 days (29 days total)
- **Purpose**: Limit storage, ensure relevant data
- **Implementation**: Client-side filtering (PowerSync doesn't support INTERVAL in sync rules)

See `sync-window.md` for details.

### Schedule Page Queries

The schedule page displays all scheduled units for a track (past, present, and future), not just the 14-day window. This is achieved by:

1. **Sync Rules**: Remain limited to 14-day window for efficient sync
2. **Schedule Query**: Uses Edge Function (`query-schedule`) to query all `user_study_log` entries from Supabase directly (not from PowerSync)
3. **Display**: Schedule page queries server-side for full schedule, while PowerSync continues to sync only the 14-day window

**Important**: The schedule page queries beyond the sync window for display purposes only. The actual sync rules remain optimized for the 14-day window to maintain efficient local storage and sync performance.

## Client Integration

### Initialization

```typescript
// Example (platform-specific)
const powerSync = new PowerSync({
  instanceId: process.env.POWERSYNC_DEV_INSTANCE_ID,
  schema: AppSchema,
  backend: SupabaseConnector(supabaseClient),
});
```

### Status Monitoring

```typescript
powerSync.onStatusChange((status) => {
  // Handle: connected, disconnected, syncing, error
});

powerSync.onError((error) => {
  // Handle errors gracefully
  // App continues with local data
});
```

### Data Access

```typescript
// Query local SQLite
const studyLogs = await powerSync.execute(
  'SELECT * FROM user_study_log WHERE user_id = ?',
  [userId]
);

// Watch for changes
powerSync.watch('SELECT * FROM user_study_log', (results) => {
  // Update UI
});
```

## Testing

### Test Files

- `supabase/tests/sync/sync-rules.test.ts` - Sync rules validation
- `supabase/tests/sync/user-study-log-sync.test.ts` - User data sync
- `supabase/tests/sync/content-cache-sync.test.ts` - Content sync
- `supabase/tests/sync/tracks-sync.test.ts` - Tracks sync
- `supabase/tests/sync/conflict-resolution.test.ts` - Conflict handling
- `supabase/tests/sync/sync-window.test.ts` - Window logic
- `supabase/tests/sync/sync-status.test.ts` - Status monitoring
- `supabase/tests/sync/sync-error-handling.test.ts` - Error handling
- `supabase/tests/sync/streak-calculation.test.ts` - Streak algorithm

### Running Tests

```bash
deno test --allow-read --allow-env supabase/tests/sync/
```

**Note**: Tests require environment variables in `.env` file:
- `POWERSYNC_DEV_INSTANCE_ID`
- `POWERSYNC_DEV_API_KEY`
- `SUPABASE_DEV_URL`
- `SUPABASE_DEV_ANON_KEY`

## Platform-Specific Guides

- **Android**: See `.cursor/agents/android.md` - PowerSync Integration
- **iOS**: See `.cursor/agents/ios.md` - PowerSync Integration
- **Web**: See `.cursor/agents/web.md` - PowerSync Integration

## Reference Documents

- **TDD Section 2.2**: Sync Layer
- **TDD Section 8**: Sync Strategy (PowerSync)
- **TDD Section 9**: Offline Behavior
- **sync.md**: Sync Agent documentation
- **PowerSync Docs**: https://docs.powersync.com/
