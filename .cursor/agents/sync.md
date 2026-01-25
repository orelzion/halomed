---
name: sync
model: fast
---

# Sync Agent

## Purpose

The Sync Agent is responsible for configuring platform-specific offline-first synchronization solutions between the Supabase backend and all client platforms (Android, iOS, Web).

## Responsibilities

- Platform-specific sync configuration and setup
- Sync logic implementation for all platforms
- Local database schema definitions
- Conflict resolution strategies
- Offline-first sync patterns
- Sync window management (14-day rolling)
- Content generation during sync

## Dependencies

- **Receives tasks from**: Architect Agent
- **Coordinates with**: Backend Agent (database schema), Scheduling Agent (sync window)
- **Outputs to**: Android, iOS, Web agents (client integration)

## Technology Stack

| Platform | Sync Technology | Local Database |
|----------|-----------------|----------------|
| Web | RxDB with Supabase Plugin | RxDB (IndexedDB) |
| Android | Custom Sync Engine | Room (SQLite) |
| iOS | Custom Sync Engine | SQLite |

## Platform-Specific Sync Overview

**Web (RxDB):**
- RxDB with Supabase Realtime plugin
- Automatic bi-directional sync
- Query-level date filtering (14-day window)
- Built-in conflict resolution
- Content generation during sync

**Android (Custom Sync):**
- Room database for local SQLite storage
- Supabase Realtime subscriptions for live updates
- Custom sync engine with date filtering
- WorkManager for background sync
- Content generation during sync

**iOS (Custom Sync):**
- SQLite for local storage
- Supabase Realtime subscriptions for live updates
- Custom sync engine with date filtering
- BGAppRefreshTask for background sync
- Content generation during sync

## Sync Configuration

### Shared Sync Strategy

All platforms implement:
- **14-day rolling window**: Sync data within ±14 days of current date
- **Date filtering**: Applied at query level (not in sync rules)
- **Content generation**: Ensure all lessons and quizzes in window are generated during sync
- **Conflict resolution**: Last-write-wins based on `updated_at` timestamp
- **Soft deletes**: Use `_deleted` boolean field instead of hard deletes

### Web (RxDB) Configuration

**Files:**
- `web/lib/database/database.ts` - RxDB instance
- `web/lib/database/schemas.ts` - Collection schemas
- `web/lib/sync/replication.ts` - Replication setup with date filtering
- `web/lib/sync/content-generation.ts` - Content generation during sync

**Replication Setup:**
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

### Android (Custom Sync) Configuration

**Files:**
- `android/app/src/main/java/com/halomeid/data/sync/SyncEngine.kt` - Main sync orchestration
- `android/app/src/main/java/com/halomeid/data/local/RoomDatabase.kt` - Room database
- `android/app/src/main/java/com/halomeid/data/local/dao/` - DAOs

**Sync Flow:**
1. Generate schedule (ensure content exists)
2. Sync user_study_log within 14-day window
3. Sync referenced content_cache
4. Sync tracks (all)
5. Generate quizzes for content in window
6. Clean up old data outside window

### iOS (Custom Sync) Configuration

**Files:**
- `ios/HaLomeid/Data/Sync/SyncEngine.swift` - Main sync orchestration
- `ios/HaLomeid/Data/Local/Database.swift` - SQLite database
- `ios/HaLomeid/Data/Local/Models/` - Swift models

**Sync Flow:**
Same as Android - platform-specific implementation

## Local Database Schemas

### Web (RxDB Collections)

**user_study_log:**
- id, user_id, track_id, study_date, content_id, is_completed, completed_at, _modified, _deleted

**content_cache:**
- id, ref_id, source_text_he, ai_explanation_json, created_at, _modified, _deleted

**tracks:**
- id, title, source_endpoint, schedule_type, _modified, _deleted

### Android (Room Entities)

**UserStudyLog:**
- @Entity with Room annotations
- Fields: id, userId, trackId, studyDate, contentId, isCompleted, completedAt, updatedAt, deleted

**ContentCache:**
- @Entity with Room annotations
- Fields: id, refId, sourceTextHe, aiExplanationJson, createdAt, updatedAt, deleted

**Track:**
- @Entity with Room annotations
- Fields: id, title, sourceEndpoint, scheduleType, updatedAt, deleted

### iOS (SQLite Tables)

**user_study_log:**
- id, user_id, track_id, study_date, content_id, is_completed, completed_at, updated_at, deleted

**content_cache:**
- id, ref_id, source_text_he, ai_explanation_json, created_at, updated_at, deleted

**tracks:**
- id, title, source_endpoint, schedule_type, updated_at, deleted

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
// Sync window boundaries
const windowStart = subDays(new Date(), 14);
const windowEnd = addDays(new Date(), 14);
```

## Offline-First Patterns

### Read Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   SQLite    │────▶│   Display   │
│   Request   │     │   (Local)   │     │    Data     │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Write Flow

**Web (RxDB):**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│    RxDB     │────▶│  Supabase   │
│   Write     │     │  (IndexedDB)│     │  Realtime    │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Android/iOS (Custom Sync):**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  SQLite     │────▶│  Sync Queue │
│   Write     │     │  (Local)    │     │  (Custom)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                    (When online)
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Supabase   │
                                        │  Realtime   │
                                        └─────────────┘
```

### Completion Marking (Offline)

**Web (RxDB):**
```typescript
// Mark completion locally (immediate)
await db.user_study_log.findOne(id).update({
  $set: {
    is_completed: 1,
    completed_at: new Date().toISOString(),
    _modified: new Date().toISOString(),
  },
});

// RxDB automatically syncs when online
```

**Android (Room):**
```kotlin
// Mark completion locally (immediate)
studyLogDao.update(
  studyLog.copy(
    isCompleted = true,
    completedAt = Instant.now(),
    updatedAt = Instant.now()
  )
)

// Sync happens via WorkManager
```

**iOS (SQLite):**
```swift
// Mark completion locally (immediate)
try db.execute(
  "UPDATE user_study_log SET is_completed = 1, completed_at = ?, updated_at = ? WHERE id = ?",
  [Date(), Date(), unitId]
)

// Sync happens via BGAppRefreshTask
```

## Streak Calculation

### Streak Calculation Algorithm

**Requirements:**
- Query user_study_log for track, ordered by study_date DESC
- Starting from most recent: if completed on scheduled day, increment streak
- If not completed, streak ends
- Skip days without scheduled units (no row exists)
- Only count completions on the scheduled day (not retroactive)

**Implementation Pattern:**
- Query local SQLite database
- Iterate through units in descending date order
- Check completion status and date
- Break on first incomplete unit
typescript
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

## Client Integration

### Web (RxDB)

**Initialization:**
- Create RxDB database instance
- Setup replication with Supabase plugin
- Configure date filtering in queryBuilder
- Monitor replication status

**Data Access:**
- Use RxDB collections for queries
- Reactive queries with `.$` observable
- Automatic sync on writes

### Android (Custom Sync)

**Initialization:**
- Setup Room database
- Initialize SyncEngine with Supabase client
- Configure WorkManager for background sync
- Setup Supabase Realtime subscriptions

**Data Access:**
- Use Room DAOs for queries
- Flow/StateFlow for reactive updates
- Manual sync trigger or WorkManager

### iOS (Custom Sync)

**Initialization:**
- Setup SQLite database
- Initialize SyncEngine with Supabase client
- Configure BGAppRefreshTask for background sync
- Setup Supabase Realtime subscriptions

**Data Access:**
- Use SQL queries or ORM
- Combine publishers for reactive updates
- Manual sync trigger or BGAppRefreshTask


## Key Files/Components

| Path | Purpose |
|------|---------|
| `web/lib/database/` | RxDB database and schemas |
| `web/lib/sync/` | RxDB replication setup |
| `android/app/src/main/java/com/halomeid/data/sync/` | Android sync engine |
| `android/app/src/main/java/com/halomeid/data/local/` | Room database |
| `ios/HaLomeid/Data/Sync/` | iOS sync engine |
| `ios/HaLomeid/Data/Local/` | SQLite database |

## Implementation Guidelines

### Initial Sync

1. User authenticates
2. Sync engine connects to Supabase
3. Initial sync downloads 14-day window
4. Generate schedule (ensure all content exists)
5. Generate quizzes for content in window
6. App ready for offline use

### Content Generation During Sync

**Requirements:**
- During initial sync, ensure all content in 14-day window is generated
- Generate quizzes for all content in window
- Use existing Edge Functions: `generate-schedule`, `generate-content`, `generate-quiz`
- Non-blocking: Content generation happens in background

**Implementation:**
- After initial data sync, check for missing content
- Call `generate-schedule` to ensure all user_study_log entries exist
- For each content_ref in window, check if content_cache exists
- If missing, call `generate-content` Edge Function
- For each content_ref, check if quiz_questions exist
- If missing, call `generate-quiz` Edge Function
- Batch requests to avoid overwhelming server

### Sync Status Monitoring

**Requirements:**
- Monitor sync connection status
- Show non-intrusive sync indicator
- Handle sync errors gracefully
- App continues with local data on errors

**Implementation Pattern:**
- Web: Monitor RxDB replication status
- Android/iOS: Monitor sync engine state
- Display small badge/icon in corner (not blocking)
- Auto-hide after sync completes
- Show error icon if sync fails

## Testing

See platform-specific testing agents for:
- Offline behavior tests
- Sync conflict tests
- Streak calculation tests

## Reference Documents

- **TDD Section 2.2**: Sync Layer
- **TDD Section 8**: Sync Strategy
- **TDD Section 9**: Offline Behavior
- **Migration Plan**: `/Users/orelzion/.cursor/plans/migrate_from_powersync_to_custom_offline-first_solution_5b02e912.plan.md`
