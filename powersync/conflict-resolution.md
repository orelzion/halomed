# Conflict Resolution Strategy

## Overview

PowerSync uses **last-write-wins** strategy for conflict resolution on `user_study_log` table.

## Strategy: Last-Write-Wins

### For `is_completed` field:
- Conflicts resolved based on `completed_at` timestamp
- Most recent write wins
- If timestamps are equal, local value is preferred

### For `completed_at` field:
- Most recent timestamp wins
- Null values handled correctly
- Timestamp accuracy maintained across devices

## Implementation

PowerSync handles conflict resolution automatically based on timestamps. The client SDK implements:

1. **On sync conflict:**
   - Compare `completed_at` timestamps
   - Use value with most recent timestamp
   - Update local SQLite database

2. **Offline completion:**
   - Local write is queued
   - On sync, timestamp comparison determines winner
   - App continues working with local data

## Conflict Scenarios

| Scenario | Resolution |
|----------|------------|
| Offline completion, then sync | Local write wins if timestamp is newer |
| Multiple devices complete same unit | Latest `completed_at` timestamp wins |
| Server update during offline | Merge based on timestamp comparison |
| Equal timestamps | Local value preferred (client-side decision) |

## Reference

- **TDD Section 8.3**: Conflict Resolution
- **sync.md Section 5**: Conflict Resolution Strategies
