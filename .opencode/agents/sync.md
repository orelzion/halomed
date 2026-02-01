# Sync Guide

## Purpose

The Sync Guide covers platform-specific offline-first synchronization between the Supabase backend and clients, primarily focusing on RxDB for the web platform.

## Responsibilities

- Platform-specific sync configuration and setup
- Sync logic implementation
- Local database schema definitions
- Conflict resolution strategies
- Offline-first sync patterns
- Sync window management (14-day rolling)
- Content generation during sync

## Technology Stack

| Platform | Sync Technology | Local Database |
|----------|-----------------|----------------|
| Web | RxDB with Supabase Plugin | RxDB (IndexedDB) |
| Android | Custom Sync Engine | Room (SQLite) |
| iOS | Custom Sync Engine | SQLite |

## Shared Sync Strategy

All platforms implement:
- **14-day rolling window**: Sync data within ±14 days of current date
- **Date filtering**: Applied at query level
- **Content generation**: Ensure all lessons and quizzes in window are generated during sync
- **Conflict resolution**: Last-write-wins based on `updated_at` timestamp
- **Soft deletes**: Use `_deleted` boolean field instead of hard deletes

## Web (RxDB) Configuration

### Files

- `web/lib/database/database.ts` - RxDB instance
- `web/lib/database/schemas.ts` - Collection schemas
- `web/lib/sync/replication.ts` - Replication setup with date filtering
- `web/lib/sync/content-generation.ts` - Content generation during sync

### Replication Setup

```typescript
replicateSupabase({
  collection: db.user_study_log,
  pull: {
    queryBuilder: ({ query }) => {
      const window = getDateWindow(); // ±14 days
      return query
        .eq('user_id', userId)
        .gte('study_date', window.start)
        .lte('study_date', window.end);
    },
  },
});
```

## Local Database Schemas

### Web (RxDB Collections)

**user_study_log:**
- id, user_id, track_id, study_date, content_id, is_completed, completed_at, _modified, _deleted

**content_cache:**
- id, ref_id, source_text_he, ai_explanation_json, created_at, _modified, _deleted

**tracks:**
- id, title, source_endpoint, schedule_type, _modified, _deleted

## Conflict Resolution

### Strategy: Last-Write-Wins

For `user_study_log.is_completed`:

```yaml
conflict_resolution:
  user_study_log:
    columns:
      is_completed:
        strategy: last_write_wins
      completed_at:
        strategy: last_write_wins
```

### Conflict Scenarios

| Scenario | Resolution |
|----------|------------|
| Offline completion, then sync | Local write wins if newer |
| Multiple devices complete same unit | Latest timestamp wins |
| Server update during offline | Merge based on timestamp |

## Sync Window

### 14-Day Rolling Window

- **Forward**: 14 days from current date
- **Backward**: Includes recent history for streak calculation
- **Purpose**: Limit local storage, ensure relevant data

### Window Calculation

```typescript
const windowStart = subDays(new Date(), 14);
const windowEnd = addDays(new Date(), 14);
```

## Offline-First Patterns

### Read Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   RxDB      │────▶│   Display   │
│   Request   │     │  (IndexedDB)│     │    Data     │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Write Flow (Web)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│    RxDB     │────▶│  Supabase   │
│   Write     │     │  (IndexedDB)│     │  Realtime   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Completion Marking (Offline)

```typescript
// Mark completion locally (immediate)
await db.user_study_log.findOne(id).update({
  $set: {
    is_completed: true,
    completed_at: new Date().toISOString(),
    _modified: new Date().toISOString(),
  },
});

// RxDB automatically syncs when online
```

## Streak Calculation

### Algorithm

```typescript
function calculateStreak(userId: string, trackId: string): number {
  const units = db.query(`
    SELECT study_date, is_completed, completed_at
    FROM user_study_log
    WHERE user_id = ? AND track_id = ?
    ORDER BY study_date DESC
  `, [userId, trackId]);

  let streak = 0;

  for (const unit of units) {
    // Only count if completed on the scheduled day
    if (unit.is_completed && wasCompletedOnDay(unit)) {
      streak++;
    } else if (!unit.is_completed) {
      // Streak broken
      break;
    }
    // Skip days without scheduled units (no row)
  }

  return streak;
}

function wasCompletedOnDay(unit: StudyUnit): boolean {
  if (!unit.completed_at) return false;
  const completedDate = new Date(unit.completed_at).toDateString();
  const studyDate = new Date(unit.study_date).toDateString();
  return completedDate === studyDate;
}
```

### Streak Rules

- Calculated **per track**
- Consecutive **scheduled units** that were completed
- Days without scheduled units: don't break, don't increment
- **Retroactive completion does NOT affect streak**

## Content Generation During Sync

### Requirements

- During initial sync, ensure all content in 14-day window is generated
- Generate quizzes for all content in window
- Use existing Edge Functions: `generate-schedule`, `generate-content`, `generate-quiz`
- Non-blocking: Content generation happens in background

### Implementation

- After initial data sync, check for missing content
- Call `generate-schedule` to ensure all user_study_log entries exist
- For each content_ref in window, check if content_cache exists
- If missing, call `generate-content` Edge Function
- Batch requests to avoid overwhelming server

## Sync Status Monitoring

### Requirements

- Monitor sync connection status
- Show non-intrusive sync indicator
- Handle sync errors gracefully
- App continues with local data on errors

### Implementation Pattern

- Web: Monitor RxDB replication status
- Display small badge/icon in corner (not blocking)
- Auto-hide after sync completes
- Show error icon if sync fails

## Initial Sync Flow

1. User authenticates
2. Sync engine connects to Supabase
3. Initial sync downloads 14-day window
4. Generate schedule (ensure all content exists)
5. Generate quizzes for content in window
6. App ready for offline use

## Key Files

| Path | Purpose |
|------|---------|
| `web/lib/database/` | RxDB database and schemas |
| `web/lib/sync/` | RxDB replication setup |

## Reference Documents

- **TDD Section 2.2**: Sync Layer
- **TDD Section 8**: Sync Strategy
- **TDD Section 9**: Offline Behavior
