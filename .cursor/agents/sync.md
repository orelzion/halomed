---
name: sync
model: fast
---

# Sync Agent

## Purpose

The Sync Agent is responsible for configuring PowerSync for bi-directional synchronization between the Supabase backend and all client platforms (Android, iOS, Web).

## Responsibilities

- PowerSync configuration and setup
- Sync rules for all platforms
- SQLite schema definitions
- Conflict resolution strategies
- Offline-first sync patterns
- Sync window management (14-day rolling)

## Dependencies

- **Receives tasks from**: Architect Agent
- **Coordinates with**: Backend Agent (database schema), Scheduling Agent (sync window)
- **Outputs to**: Android, iOS, Web agents (client integration)

## Technology Stack

| Platform | Sync Technology |
|----------|-----------------|
| Android | PowerSync Kotlin SDK |
| iOS | PowerSync Swift SDK |
| Web | PowerSync Web SDK (IndexedDB-backed SQLite) |

## PowerSync Overview

PowerSync provides:
- Real-time bi-directional sync
- Offline-first architecture
- SQLite on all platforms
- Automatic conflict resolution

## Sync Configuration

### PowerSync Dashboard Setup

1. Create PowerSync instance
2. Connect to Supabase database
3. Configure sync rules
4. Deploy to clients

### Sync Rules

```yaml
# powersync.yaml

bucket_definitions:
  # User-specific study logs
  user_data:
    parameters:
      - user_id: token.user_id
    data:
      - SELECT id, user_id, track_id, study_date, content_group_ref, is_completed, completed_at
        FROM user_study_log
        WHERE user_id = bucket.user_id
          AND study_date >= CURRENT_DATE - INTERVAL '14 days'
          AND study_date <= CURRENT_DATE + INTERVAL '14 days'

  # Shared content (read-only)
  content:
    data:
      - SELECT id, ref_id, content_group_ref, item_number, source_text_he, ai_explanation_he, ai_deep_dive_json, created_at
        FROM content_cache
        WHERE id IN (
          SELECT content_group_ref FROM user_study_log 
          WHERE study_date >= CURRENT_DATE - INTERVAL '14 days'
            AND study_date <= CURRENT_DATE + INTERVAL '14 days'
        )

  # Track definitions (read-only)
  tracks:
    data:
      - SELECT id, title, source_endpoint, schedule_type
        FROM tracks
```

## SQLite Schema (Client-Side)

### user_study_log

```sql
CREATE TABLE user_study_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  study_date TEXT NOT NULL,
  content_group_ref TEXT,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  UNIQUE(user_id, study_date, track_id)
);

CREATE INDEX idx_study_log_user_date ON user_study_log(user_id, study_date);
CREATE INDEX idx_study_log_track ON user_study_log(track_id);
```

### content_cache

```sql
CREATE TABLE content_cache (
  id TEXT PRIMARY KEY,
  ref_id TEXT UNIQUE,
  source_text_he TEXT NOT NULL,
  ai_explanation_he TEXT NOT NULL,
  ai_deep_dive_json TEXT,
  created_at TEXT
);
```

### tracks

```sql
CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_endpoint TEXT,
  schedule_type TEXT NOT NULL
);
```

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

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   SQLite    │────▶│  PowerSync  │
│   Write     │     │   (Local)   │     │   Queue     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                    (When online)
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Supabase   │
                                        │   Server    │
                                        └─────────────┘
```

### Completion Marking (Offline)

```typescript
// Mark completion locally (immediate)
await db.execute(
  `UPDATE user_study_log 
   SET is_completed = 1, completed_at = ? 
   WHERE id = ?`,
  [new Date().toISOString(), unitId]
);

// PowerSync automatically queues for sync
// Sync happens when connectivity resumes
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

### Client Integration

**Android:**
- Initialize PowerSync with PowerSyncBuilder
- Configure schema and SupabaseConnector
- Use powerSync.watch() to observe data changes

**iOS:**
- Initialize PowerSync with PowerSyncBuilder
- Configure schema and SupabaseConnector
- Use powerSync.watch() with closure for updates

**Web:**
- Initialize PowerSync with IndexedDB backend
- Configure schema
- Use powerSync.watch() with subscribe() for updates


## Key Files/Components

| Path | Purpose |
|------|---------|
| `powersync/powersync.yaml` | Sync rules configuration |
| `shared/schema.ts` | Shared schema definition |
| Platform-specific SDK integration | See platform agents |

## Implementation Guidelines

### Initial Sync

1. User authenticates
2. PowerSync connects to backend
3. Initial sync downloads 14-day window
4. App ready for offline use

### Sync Status Monitoring

**Requirements:**
- Monitor sync connection status
- Show online/offline state to user
- Handle sync errors gracefully
- App continues with local data on errors

**Implementation Pattern:**
- Use powerSync.onStatusChange() callback
- Use powerSync.onError() for error handling
- Display sync status in UI if needed
typescript
powerSync.onError((error) => {
  console.error('Sync error:', error);
  // Handle gracefully - app continues with local data
});
```

## Testing

See platform-specific testing agents for:
- Offline behavior tests
- Sync conflict tests
- Streak calculation tests

## Reference Documents

- **TDD Section 2.2**: Sync Layer
- **TDD Section 8**: Sync Strategy (PowerSync)
- **TDD Section 9**: Offline Behavior
