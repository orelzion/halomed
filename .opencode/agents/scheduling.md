# Scheduling Guide

## Purpose

The Scheduling Guide covers server-side track scheduling logic, including the `generate-schedule` Edge Function, Jewish calendar integration, and the 14-day rolling window generation.

## Responsibilities

- Edge Function: `generate-schedule`
- Track scheduling logic (DAILY_WEEKDAYS_ONLY for MVP)
- Jewish calendar integration (Shabbat/holiday exclusion)
- User track joining logic
- 14-day rolling window generation
- Content assignment for scheduled units

## Scheduling Model

### Key Principles

1. **Server-Driven**: All scheduling is calculated server-side
2. **Passive Clients**: Clients only render what the server provides
3. **Per-User Progression**: Each user has independent track progress
4. **No Fixed Start Date**: Users join tracks at any point

### Schedule Types

| Type | Description | MVP |
|------|-------------|-----|
| `DAILY_WEEKDAYS_ONLY` | Units on weekdays only, excludes Shabbat and Jewish holidays | Yes |
| `DAILY` | Units every day | Future |
| `WEEKLY` | One unit per week | Future |

## Edge Function: generate-schedule

### Location

```
supabase/functions/generate-schedule/index.ts
```

### Input

```typescript
interface GenerateScheduleRequest {
  user_id: string;
  track_id: string;
  start_date: string;      // ISO date (YYYY-MM-DD)
  days_ahead: number;      // Fixed: 14 for MVP
}
```

### Process

1. Read `tracks.schedule_type` for the track
2. Get user's current position in the track
3. Iterate dates within window (start_date to start_date + days_ahead)
4. For each date:
   - Check if allowed by schedule type
   - If allowed:
     - Assign next content reference
     - Create `user_study_log` row if missing
5. Ensure `content_cache` exists for each reference (trigger generation if needed)
6. Return scheduled units

### Output

```typescript
interface GenerateScheduleResponse {
  scheduled_units: ScheduledUnit[];
}

interface ScheduledUnit {
  id: string;
  study_date: string;
  content_group_ref: string;
  is_completed: boolean;
}
```

## DAILY_WEEKDAYS_ONLY Logic

### Excluded Days

1. **Saturday (Shabbat)**: Day of week = 6
2. **Jewish Holidays**: From Hebrew calendar

### Jewish Holiday Detection

```typescript
import { HebrewCalendar, HDate } from '@hebcal/core';

function isJewishHoliday(date: Date): boolean {
  const hdate = new HDate(date);
  const events = HebrewCalendar.getHolidaysOnDate(hdate);

  // Check for major holidays that exclude study
  const majorHolidays = [
    'Rosh Hashana',
    'Yom Kippur',
    'Sukkot',
    'Shmini Atzeret',
    'Simchat Torah',
    'Pesach',
    'Shavuot',
  ];

  return events.some(e =>
    majorHolidays.some(h => e.desc.includes(h))
  );
}
```

### Schedule Generation Algorithm

```typescript
function generateSchedule(
  trackId: string,
  userId: string,
  startDate: Date,
  daysAhead: number,
  scheduleType: string
): ScheduledUnit[] {
  const units: ScheduledUnit[] = [];
  let contentIndex = getUserContentIndex(userId, trackId);

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(startDate, i);

    if (isScheduledDay(date, scheduleType)) {
      const contentRef = getNextContentRef(trackId, contentIndex);

      units.push({
        study_date: formatDate(date),
        content_ref: contentRef,
        is_completed: false,
      });

      contentIndex++;
    }
  }

  return units;
}

function isScheduledDay(date: Date, scheduleType: string): boolean {
  switch (scheduleType) {
    case 'DAILY_WEEKDAYS_ONLY':
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 6) return false; // Saturday
      if (isJewishHoliday(date)) return false;
      return true;

    case 'DAILY':
      return true;

    default:
      return false;
  }
}
```

## User Track Joining

### When User Joins

1. User selects a track
2. `start_date` is set to current date (device timezone)
3. Edge Function creates first scheduled unit from join date
4. Content assignment starts from beginning of track

### Track Progression

```typescript
interface UserTrackProgress {
  user_id: string;
  track_id: string;
  current_content_index: number;  // Position in track content
  joined_at: Date;
}
```

## 14-Day Rolling Window

### Window Calculation

- **Start**: Current date (device timezone)
- **End**: Current date + 14 days
- **Sync**: Only units within window are synced to clients

### Window Refresh

- Client requests schedule refresh on app launch
- Server regenerates window from current date
- Old units outside window are not deleted (kept for history)

## Content Assignment

### Track Content Order

For MVP Mishnah track, content follows the order:
1. Berakhot Chapter 1-9
2. Peah Chapter 1-8
3. ... (continues through all tractates)

### Content Reference Format

```
Mishnah_{Tractate}.{Chapter}
```

Example: `Mishnah_Berakhot.1`

## Key Files

| Path | Purpose |
|------|---------|
| `supabase/functions/generate-schedule/index.ts` | Main Edge Function |
| `supabase/functions/_shared/calendar.ts` | Jewish calendar utilities |
| `supabase/functions/_shared/content-order.ts` | Track content ordering |

## Implementation Guidelines

### Date Handling

- Store dates as DATE (no time) in UTC
- Clients interpret based on device timezone
- Use ISO format (YYYY-MM-DD) for API communication

### Timezone Considerations

```typescript
// Client sends local date
const localDate = new Date().toISOString().split('T')[0];

// Server processes as-is (date-only, no timezone conversion)
```

### Idempotency

- Multiple calls with same parameters should not create duplicate units
- Use UPSERT with UNIQUE constraint on (user_id, study_date, track_id)

## Database Queries

### Get User's Current Position

```sql
SELECT COUNT(*) as completed_count
FROM user_study_log
WHERE user_id = $1
  AND track_id = $2
  AND is_completed = true;
```

### Create Scheduled Unit

```sql
INSERT INTO user_study_log (user_id, track_id, study_date, content_group_ref)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, study_date, track_id) DO NOTHING;
```

## Reference Documents

- **PRD Section 4.1**: Tracks
- **PRD Section 4.2**: Track Scheduling
- **TDD Section 6**: Track Scheduling (Server-Side)
