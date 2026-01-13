# 14-Day Rolling Window Implementation

## Overview

The sync window maintains a 14-day rolling window for efficient data synchronization and local storage management.

## Window Calculation

### Forward Window
- **Start**: Current date - 14 days
- **End**: Current date + 14 days
- **Total**: 29 days inclusive

### Purpose
- Limit local storage usage
- Ensure relevant data is available
- Support streak calculation (backward window)
- Support future scheduling (forward window)

## Implementation

### Client-Side Filtering

Since PowerSync doesn't support `INTERVAL` syntax in sync rules, date filtering is implemented client-side:

```typescript
function getSyncWindowDates(currentDate: Date): { start: Date; end: Date } {
  const start = new Date(currentDate);
  start.setDate(start.getDate() - 14);
  
  const end = new Date(currentDate);
  end.setDate(end.getDate() + 14);
  
  return { start, end };
}

function isDateInSyncWindow(date: Date, currentDate: Date): boolean {
  const window = getSyncWindowDates(currentDate);
  return date >= window.start && date <= window.end;
}
```

### Automatic Updates

The window automatically updates as the current date progresses:
- Old data (outside window) is removed from local storage
- New data (within window) is synced automatically
- Window shifts forward daily

## Tables Using Window

- **user_study_log**: Filtered by `study_date` within window
- **content_cache**: Filtered by referenced `user_study_log` entries within window
- **tracks**: No window filtering (all tracks sync)

## Reference

- **PRD Section 9**: Offline-First Behavior
- **TDD Section 8.1**: Sync Window
- **sync.md Section 6**: Sync Window Management
