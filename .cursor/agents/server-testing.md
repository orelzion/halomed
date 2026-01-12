---
name: server-testing
model: fast
---

# Server Testing Agent

## Purpose

The Server Testing Agent is responsible for testing all server-side components including Supabase Edge Functions, database schema, RLS policies, and business logic using Deno test framework and local Supabase instance.

## Responsibilities

- Supabase local development setup (`supabase start`)
- Deno test framework for Edge Functions
- Unit tests for `generate-schedule` Edge Function
- Unit tests for content generation Edge Function
- Database schema tests
- RLS (Row Level Security) policy tests
- Integration tests with local Supabase instance
- Test data setup and teardown
- Scheduling logic validation
- Streak calculation algorithm tests

## Dependencies

- **Receives tasks from**: Architect Agent
- **Coordinates with**: Backend Agent, Scheduling Agent, Content Generation Agent
- **References**: TDD Section 4, 6, 7, 11

## Technology Stack

| Component | Technology |
|-----------|------------|
| Test Framework | Deno Test |
| Local Backend | Supabase CLI (Docker) |
| Database | PostgreSQL (local) |
| Edge Functions | Deno Runtime |

## Local Development Setup

### Prerequisites

- Docker Desktop running
- Supabase CLI installed

### Installation

```bash
# Install Supabase CLI
npm install -g supabase

# Or via Homebrew
brew install supabase/tap/supabase
```

### Start Local Supabase

```bash
# Initialize (first time)
supabase init

# Start local instance
supabase start
```

This starts:
- PostgreSQL database (port 54322)
- Auth server (port 54321)
- Edge Functions server
- Studio UI (port 54323)

### Local Environment Variables

After `supabase start`, you'll get:

```
API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Anon key: eyJhbGci...
Service role key: eyJhbGci...
```

## Project Structure

```
supabase/
├── config.toml
├── migrations/
│   ├── 20240101000000_initial_schema.sql
│   └── 20240101000001_rls_policies.sql
├── functions/
│   ├── generate-schedule/
│   │   ├── index.ts
│   │   └── tests/
│   │       └── generate-schedule.test.ts
│   ├── generate-content/
│   │   ├── index.ts
│   │   └── tests/
│   │       └── generate-content.test.ts
│   └── _shared/
│       ├── cors.ts
│       ├── auth.ts
│       ├── calendar.ts
│       └── sefaria.ts
├── seed.sql
└── tests/
    ├── database/
    │   ├── schema.test.ts
    │   └── rls.test.ts
    ├── logic/
    │   ├── streak.test.ts
    │   └── scheduling.test.ts
    └── helpers/
        ├── setup.ts
        └── fixtures.ts
```

## Edge Function Tests

### Test File Structure

```typescript
// supabase/functions/generate-schedule/tests/generate-schedule.test.ts

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? 'your-anon-key';

Deno.test('generate-schedule: creates units for weekdays only', async () => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const response = await supabase.functions.invoke('generate-schedule', {
    body: {
      user_id: 'test-user-id',
      track_id: 'test-track-id',
      start_date: '2024-01-15', // Monday
      days_ahead: 7,
    },
  });

  assertEquals(response.error, null);
  assertExists(response.data.scheduled_units);
  
  // Should have 5 units (Mon-Fri), not 7
  assertEquals(response.data.scheduled_units.length, 5);
  
  // Verify no Saturday
  const hasSaturday = response.data.scheduled_units.some(
    (unit: any) => new Date(unit.study_date).getDay() === 6
  );
  assertEquals(hasSaturday, false);
});

Deno.test('generate-schedule: skips Jewish holidays', async () => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test with a date range that includes a known holiday
  const response = await supabase.functions.invoke('generate-schedule', {
    body: {
      user_id: 'test-user-id',
      track_id: 'test-track-id',
      start_date: '2024-04-22', // Passover week
      days_ahead: 7,
    },
  });

  assertEquals(response.error, null);
  
  // Verify Passover days are excluded
  // (Actual count depends on specific holiday dates)
});
```

### Running Edge Function Tests

```bash
# Serve the function locally
supabase functions serve generate-schedule --env-file .env.local

# In another terminal, run tests
deno test --allow-env --allow-net supabase/functions/generate-schedule/tests/
```

## Database Schema Tests

### Schema Validation (schema.test.ts)

```typescript
// supabase/tests/database/schema.test.ts

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  'http://localhost:54321',
  'your-service-role-key'
);

Deno.test('schema: tracks table exists with correct columns', async () => {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .limit(0);
  
  assertEquals(error, null);
});

Deno.test('schema: content_cache has unique ref_id constraint', async () => {
  // Insert first record
  const { error: error1 } = await supabase
    .from('content_cache')
    .insert({
      ref_id: 'test_unique_ref',
      mishna_text_he: 'Test',
      ai_explanation_he: 'Test',
    });
  
  assertEquals(error1, null);
  
  // Attempt duplicate
  const { error: error2 } = await supabase
    .from('content_cache')
    .insert({
      ref_id: 'test_unique_ref',
      mishna_text_he: 'Test 2',
      ai_explanation_he: 'Test 2',
    });
  
  assertExists(error2); // Should fail
  
  // Cleanup
  await supabase
    .from('content_cache')
    .delete()
    .eq('ref_id', 'test_unique_ref');
});

Deno.test('schema: user_study_log has composite unique constraint', async () => {
  const testData = {
    user_id: 'test-user-schema',
    track_id: 'test-track',
    study_date: '2024-01-15',
  };
  
  // Insert first
  const { error: error1 } = await supabase
    .from('user_study_log')
    .insert(testData);
  
  assertEquals(error1, null);
  
  // Attempt duplicate
  const { error: error2 } = await supabase
    .from('user_study_log')
    .insert(testData);
  
  assertExists(error2); // Should fail on unique constraint
  
  // Cleanup
  await supabase
    .from('user_study_log')
    .delete()
    .match(testData);
});
```

## RLS Policy Tests

### RLS Validation (rls.test.ts)

```typescript
// supabase/tests/database/rls.test.ts

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Use anon key (not service role) to test RLS
const supabase = createClient(
  'http://localhost:54321',
  'your-anon-key'
);

Deno.test('RLS: anonymous user cannot read other users study logs', async () => {
  // Create two test users and their data using service role
  // Then try to access one user's data as another
  
  const { data, error } = await supabase
    .from('user_study_log')
    .select('*')
    .eq('user_id', 'other-user-id');
  
  // Should return empty (not error) due to RLS
  assertEquals(data?.length, 0);
});

Deno.test('RLS: authenticated user can only see own study logs', async () => {
  // Sign in as test user
  const { data: authData } = await supabase.auth.signInAnonymously();
  const userId = authData.user?.id;
  
  // Insert data for this user
  await supabase
    .from('user_study_log')
    .insert({
      user_id: userId,
      track_id: 'test-track',
      study_date: '2024-01-15',
    });
  
  // Query should only return own data
  const { data, error } = await supabase
    .from('user_study_log')
    .select('*');
  
  assertEquals(error, null);
  data?.forEach(row => {
    assertEquals(row.user_id, userId);
  });
  
  // Cleanup
  await supabase
    .from('user_study_log')
    .delete()
    .eq('user_id', userId);
});

Deno.test('RLS: content_cache is readable by all authenticated users', async () => {
  // Sign in as anonymous user
  await supabase.auth.signInAnonymously();
  
  const { data, error } = await supabase
    .from('content_cache')
    .select('*')
    .limit(1);
  
  assertEquals(error, null);
  // Should be able to read (even if empty)
});
```

## Business Logic Tests

### Streak Calculation (streak.test.ts)

```typescript
// supabase/tests/logic/streak.test.ts

import { assertEquals } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// Import the streak calculation function
import { calculateStreak } from '../../functions/_shared/streak.ts';

Deno.test('streak: consecutive completions count correctly', () => {
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-17T10:00:00Z' },
    { study_date: '2024-01-16', is_completed: true, completed_at: '2024-01-16T10:00:00Z' },
    { study_date: '2024-01-15', is_completed: true, completed_at: '2024-01-15T10:00:00Z' },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 3);
});

Deno.test('streak: missing completion breaks streak', () => {
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-17T10:00:00Z' },
    { study_date: '2024-01-16', is_completed: false, completed_at: null },
    { study_date: '2024-01-15', is_completed: true, completed_at: '2024-01-15T10:00:00Z' },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 1); // Only the most recent
});

Deno.test('streak: retroactive completion does not count', () => {
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-17T10:00:00Z' },
    // Completed on Jan 18 (retroactive)
    { study_date: '2024-01-16', is_completed: true, completed_at: '2024-01-18T10:00:00Z' },
    { study_date: '2024-01-15', is_completed: true, completed_at: '2024-01-15T10:00:00Z' },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 1); // Jan 16 doesn't count (retroactive)
});

Deno.test('streak: days without scheduled units are skipped', () => {
  // If there's no row for a day, it's not a scheduled day
  const studyLogs = [
    { study_date: '2024-01-17', is_completed: true, completed_at: '2024-01-17T10:00:00Z' },
    // No entry for Jan 16 (weekend or holiday)
    { study_date: '2024-01-15', is_completed: true, completed_at: '2024-01-15T10:00:00Z' },
  ];
  
  const streak = calculateStreak(studyLogs);
  assertEquals(streak, 2); // Gap doesn't break streak
});
```

### Scheduling Logic (scheduling.test.ts)

```typescript
// supabase/tests/logic/scheduling.test.ts

import { assertEquals } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

import { isScheduledDay, isJewishHoliday } from '../../functions/_shared/calendar.ts';

Deno.test('scheduling: Saturday is not a scheduled day', () => {
  const saturday = new Date('2024-01-20'); // Saturday
  const result = isScheduledDay(saturday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, false);
});

Deno.test('scheduling: Monday is a scheduled day', () => {
  const monday = new Date('2024-01-15'); // Monday
  const result = isScheduledDay(monday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, true);
});

Deno.test('scheduling: Passover is detected as holiday', () => {
  const passover = new Date('2024-04-23'); // First day of Passover 2024
  const result = isJewishHoliday(passover);
  assertEquals(result, true);
});

Deno.test('scheduling: regular weekday is not a holiday', () => {
  const regularDay = new Date('2024-06-15'); // Regular day
  const result = isJewishHoliday(regularDay);
  assertEquals(result, false);
});
```

## Test Helpers

### Setup (helpers/setup.ts)

```typescript
// supabase/tests/helpers/setup.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'your-service-role-key'
);

export async function setupTestData() {
  // Insert test tracks
  await supabase.from('tracks').insert({
    id: 'test-track-id',
    title: 'Test Track',
    schedule_type: 'DAILY_WEEKDAYS_ONLY',
  });
  
  // Insert test content
  await supabase.from('content_cache').insert({
    id: 'test-content-id',
    ref_id: 'Mishnah_Berakhot.1.1',
    mishna_text_he: 'מאימתי קורין את שמע בערבית',
    ai_explanation_he: 'Test explanation',
  });
}

export async function cleanupTestData() {
  await supabase.from('user_study_log').delete().like('user_id', 'test-%');
  await supabase.from('content_cache').delete().eq('id', 'test-content-id');
  await supabase.from('tracks').delete().eq('id', 'test-track-id');
}
```

### Fixtures (helpers/fixtures.ts)

```typescript
// supabase/tests/helpers/fixtures.ts

export const testTrack = {
  id: 'test-track-id',
  title: 'משנה יומית',
  schedule_type: 'DAILY_WEEKDAYS_ONLY',
  source_endpoint: 'https://www.sefaria.org/api/',
};

export const testContent = {
  id: 'test-content-id',
  ref_id: 'Mishnah_Berakhot.1.1',
  mishna_text_he: 'מאימתי קורין את שמע בערבית',
  ai_explanation_he: 'זמן קריאת שמע של ערבית...',
  ai_deep_dive_json: {
    approaches: [
      { commentator: 'רש"י', summary_he: 'פירוש ראשון' },
    ],
  },
};
```

## Running All Tests

```bash
# Run all server tests
deno test --allow-env --allow-net supabase/tests/

# Run with coverage
deno test --allow-env --allow-net --coverage=coverage supabase/tests/

# Generate coverage report
deno coverage coverage --lcov > coverage.lcov
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Server Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Start Supabase
        run: supabase start
        
      - name: Run migrations
        run: supabase db push
        
      - name: Setup Deno
        uses: denoland/setup-deno@v1
        
      - name: Run tests
        run: deno test --allow-env --allow-net supabase/tests/
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Reference Documents

- **TDD Section 4**: Database Schema
- **TDD Section 6**: Track Scheduling
- **TDD Section 7**: AI Content Generation
- **TDD Section 8.4**: Streak Calculation
- **TDD Section 11**: Security (RLS)
- **Supabase Docs**: https://supabase.com/docs/guides/functions/unit-test
