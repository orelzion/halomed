# Testing Patterns

**Analysis Date:** 2026-01-27

## Test Framework

**Runner:**
- Backend/Supabase: Deno (native test runner)
- Config: `supabase/tests/` directory structure
- No explicit test config file; tests use Deno test harness directly

**Test Execution:**
- CLI: Run with `deno test` from Supabase directory
- Tests use `Deno.test()` for test definition
- Test discovery: All `*.test.ts` files in `supabase/tests/`

**Assertion Library:**
- Deno standard library assertions: `https://deno.land/std@0.208.0/testing/asserts.ts`
- Key assertions: `assertEquals()`, `assertExists()`, `assertThrows()`, `assert()`

**E2E Testing:**
- Framework: Maestro (YAML-based)
- Location: `tests/maestro/flows/`
- Config: `tests/maestro/config.yaml`
- Supports: Web, Android, iOS

**Web Unit Tests:**
- Not detected in codebase (MVP scope excludes unit tests)
- Framework setup exists in `package.json` (ESLint) but no test runner configured
- Future: Can add Jest or Vitest when needed

## Test File Organization

**Location - Supabase Backend Tests:**
- Centralized in `supabase/tests/` directory
- Organized by domain:
  - `supabase/tests/database/` - Schema, RLS, migrations
  - `supabase/tests/auth/` - Authentication flows
  - `supabase/tests/logic/` - Business logic (Sefaria API, scheduling, AI)
  - `supabase/tests/edge-functions/` - Edge Function integration
  - `supabase/tests/sync/` - Sync logic and conflict resolution
  - `supabase/tests/mishnah-structure.test.ts` - Content structure validation

**Naming Convention:**
- Pattern: `[feature].test.ts`
- Examples:
  - `schema.test.ts`
  - `sefaria.test.ts`
  - `anonymous.test.ts`
  - `streak-calculation.test.ts`
  - `generate-content.test.ts`

**E2E Test Organization:**
- Location: `tests/maestro/flows/`
- Platform-specific subdirectories: `web/`, `android/`, `ios/`
- Feature grouping: `auth/`, `home/`, `study/`, `offline/`, `streak/`
- Shared setup: `tests/maestro/shared/setup.yaml`

## Test Structure

**Backend Test Structure (Deno):**

```typescript
// supabase/tests/database/schema.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Setup: Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '[key]';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Test: Use Deno.test()
Deno.test('schema: tracks table exists with correct columns', async () => {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .limit(0);

  assertEquals(error, null, 'tracks table should exist and be queryable');
  assertExists(data, 'tracks table should return data array');
});

// Cleanup: Optional - Deno handles teardown
Deno.test('schema: clean up', async () => {
  // Cleanup operations if needed
  await new Promise(resolve => setTimeout(resolve, 0));
});
```

**Patterns:**

1. **Setup per test file:**
```typescript
// Global setup (run once per file)
const supabase = createClient(url, key, options);

// Helper functions
async function createTestUser(): Promise<string> {
  const { data, error } = await anonClient.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }
  return data.user.id;
}
```

2. **Assertion pattern:**
```typescript
Deno.test('description of test', async () => {
  // Arrange
  const testData = { title: 'Test Track', schedule_type: 'DAILY_WEEKDAYS_ONLY' };

  // Act
  const { data, error } = await supabase
    .from('tracks')
    .insert([testData])
    .select('*');

  // Assert
  assertEquals(error, null, 'Should insert without error');
  assertExists(data, 'Should return inserted data');
});
```

3. **Error testing:**
```typescript
Deno.test('sefaria: handles API errors gracefully', async () => {
  const invalidRef = 'Invalid_Text_12345.1.1';

  try {
    await fetchText(invalidRef);
    assertEquals(false, true, 'Should throw error for invalid ref');
  } catch (error) {
    assertExists(error, 'Should throw error');
    assertEquals(error instanceof Error, true, 'Error should be Error instance');
  }
});
```

**E2E Test Structure (Maestro YAML):**

```yaml
# tests/maestro/flows/web/auth/login_anonymous.yaml
appId: halomeid-web
---
- launchApp
- assertVisible: "התחבר"
- tapOn: "המשך כאורח"
- assertVisible: "הלומד"
- assertVisible: "משנה יומית"
```

**Patterns:**

1. **Element identification:**
```yaml
# By test ID (preferred)
- assertVisible:
    id: "track_card"

# By text (for user-facing strings)
- tapOn:
    text: "סיימתי"

# By index
- assertVisible:
    index: 0
```

2. **Flow composition:**
```yaml
# Run another flow as setup
- runFlow: ../auth/login_anonymous.yaml

# Then continue with test
- tapOn:
    id: "track_card"

# Assertions
- assertVisible:
    id: "study_screen"
```

3. **Offline testing:**
```yaml
# Wait for initial sync
- wait: 3000

# Toggle network
- toggleAirplaneMode

# Verify offline functionality
- assertVisible:
    id: "mishna_text"

# Re-enable network
- toggleAirplaneMode
```

## Mocking

**Approach:** Minimal mocking in current codebase

**Backend (Deno) - No mocking library:**
- Tests use real Supabase instance (local or staging)
- API calls use real endpoints:
  - Sefaria API: `https://www.sefaria.org/api/`
  - Google Gemini API: Real API with actual keys
  - Wikisource: Real HTTP calls

**E2E (Maestro) - No mocking:**
- Tests against real app running locally or in staging
- Network mocking: Use `toggleAirplaneMode` for offline testing
- No response interception or stubbing

**Strategy when API is unreliable:**
```typescript
// Create test utilities that call API but handle failures gracefully
// Example: Sefaria tests include error handling tests
Deno.test('sefaria: handles API errors gracefully', async () => {
  try {
    await fetchText('InvalidRef');
  } catch (error) {
    // Verify error handling is correct
    assertExists(error);
  }
});
```

**What to Mock (if added in future):**
- External API responses (Sefaria, Gemini) could be mocked with a service layer
- Database state: Reset between tests rather than mocking
- Auth: Use real anonymous sign-in, not mocked tokens

## Fixtures and Test Data

**Test Data Patterns:**

1. **Inline test data:**
```typescript
Deno.test('database: insert track', async () => {
  const testTrack = {
    title: 'Test Track',
    schedule_type: 'DAILY_WEEKDAYS_ONLY',
    source_endpoint: 'https://www.sefaria.org/api/',
  };

  const { data, error } = await supabase
    .from('tracks')
    .insert([testTrack])
    .select('*');

  assertEquals(error, null);
});
```

2. **Test user creation:**
```typescript
async function createTestUser(): Promise<string> {
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await anonClient.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }
  return data.user.id;
}
```

3. **Common test refs:**
```typescript
const testRef = 'Mishnah_Berakhot.1.1';  // Used in Sefaria tests
const tracks = ['Mishnah', 'Talmud'];     // Common content sources
```

**Location:**
- Inline in test files (no separate fixtures directory)
- Helper functions defined at top of test file
- Reused across multiple tests in same file

## Coverage

**Requirements:** None enforced (MVP)

**View Coverage:**
- No coverage tool configured
- Can be added with: `npm install --save-dev jest @types/jest` (or Vitest)
- Supabase tests don't track coverage metrics

**Coverage Gaps (Known):**
- Web/client unit tests: 0% (not in MVP scope)
- Supabase backend tests: Comprehensive for critical paths
- E2E tests: Cover main user flows
- Edge Functions: Unit tests in `supabase/tests/edge-functions/`

## Test Types

**Unit Tests (Backend/Deno):**

Scope: Test individual functions in isolation
```typescript
Deno.test('sefaria: can fetch source text from Sefaria API', async () => {
  const testRef = 'Mishnah_Berakhot.1.1';

  const result = await fetchText(testRef);
  assertExists(result, 'Should return result');
  assertExists(result.he, 'Should have Hebrew text field');
  assertEquals(typeof result.he, 'string', 'Hebrew text should be a string');
});
```

Examples in codebase:
- `supabase/tests/logic/sefaria.test.ts` - Sefaria utility functions
- `supabase/tests/database/schema.test.ts` - Database schema validation
- `supabase/tests/edge-functions/generate-content.test.ts` - Content generation logic

**Integration Tests (Backend/Deno):**

Scope: Test components working together (API + Database + Auth)
```typescript
Deno.test('edge-function: generate-content creates cache entry', async () => {
  // 1. Create test user
  const userId = await createTestUser();

  // 2. Call Edge Function
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': serviceKey },
    body: JSON.stringify({ ref_id: 'Mishnah_Berakhot.1.1' }),
  });

  // 3. Verify database state changed
  const { data } = await supabase.from('content_cache').select('*');
  assertExists(data, 'Content should be cached');
});
```

Examples in codebase:
- `supabase/tests/edge-functions/generate-content.test.ts`
- `supabase/tests/sync/user-study-log-sync.test.ts`
- `supabase/tests/auth/anonymous.test.ts`

**E2E Tests (Maestro):**

Scope: Test complete user flows across app screens
```yaml
# Test: Study completion flow
appId: halomeid-web
---
- launchApp
- runFlow: ../auth/login_anonymous.yaml
- tapOn:
    id: "track_card"
- assertVisible:
    id: "study_screen"
- tapOn:
    text: "סיימתי"
- assertVisible:
    text: "✓ סיימתי"
```

Examples in codebase:
- `tests/maestro/flows/web/study/mark_complete.yaml`
- `tests/maestro/flows/web/offline/offline_read.yaml`
- `tests/maestro/flows/web/home/home_display.yaml`

**Sync/State Tests (Backend/Deno):**

Scope: Test offline-first sync logic and conflict resolution
```typescript
Deno.test('sync: applies 14-day rolling window', async () => {
  // Create records outside sync window
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 20);

  const { data } = await supabase
    .from('user_study_log')
    .select('*')
    .gte('study_date', oldDate.toISOString());

  // Verify old records not synced
  assertEquals(data?.length, 0, 'Should not sync records outside window');
});
```

Examples in codebase:
- `supabase/tests/sync/sync-window.test.ts`
- `supabase/tests/sync/streak-calculation.test.ts`
- `supabase/tests/sync/conflict-resolution.test.ts`

## Common Patterns

**Async Testing:**

All Deno tests are async (use `async ()`):
```typescript
Deno.test('async test example', async () => {
  const result = await someAsyncOperation();
  assertEquals(result, expected);
});
```

Maestro tests handle async implicitly (waits for operations):
```yaml
- launchApp           # Waits for app to launch
- assertVisible       # Waits for element to appear (with retry)
- tapOn               # Waits for element, then taps
```

**Error Testing:**

```typescript
// 1. Try-catch approach
Deno.test('handles errors', async () => {
  try {
    await invalidOperation();
    assertEquals(false, true, 'Should have thrown');
  } catch (error) {
    assertExists(error);
  }
});

// 2. assertThrows (if available)
Deno.test('throws on invalid input', () => {
  assertThrows(() => {
    functionThatThrows();
  });
});

// 3. Error object checking
Deno.test('API error handling', async () => {
  const { data, error } = await supabase.from('table').select();
  if (error) {
    assertEquals(error.code, 'PGRST116', 'Should be specific error code');
  }
});
```

**Cleanup/Teardown:**

No explicit test teardown mechanism in Deno tests. Instead:
1. Create test users/data with unique identifiers
2. Tests are isolated (don't depend on order)
3. Real database state is used (tests can clean up manually if needed)
4. Optional: Add cleanup test at end of file

```typescript
Deno.test('cleanup: clear test data', async () => {
  // Manual cleanup if test database reuse is a concern
  await supabase
    .from('tracks')
    .delete()
    .eq('title', 'Test Track');
});
```

**Environment Variables:**

Tests load from Deno environment:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '[default key]';
const geminiKey = Deno.env.get('GOOGLE_AI_API_KEY') ?? '';
```

Set via:
```bash
SUPABASE_URL=http://localhost:54321 \
SUPABASE_SERVICE_ROLE_KEY=... \
deno test supabase/tests/
```

Or in `.env` file in `supabase/functions/` (referenced by tests)

## Running Tests

**Backend Tests (Deno):**

```bash
# Run all tests
deno test supabase/tests/

# Run single test file
deno test supabase/tests/database/schema.test.ts

# Run with environment variables
SUPABASE_URL=http://localhost:54321 deno test supabase/tests/

# Watch mode (if Deno supports - check version)
deno test --watch supabase/tests/
```

**E2E Tests (Maestro):**

```bash
# Run single flow
maestro test tests/maestro/flows/web/auth/login_anonymous.yaml

# Run all web flows
maestro test tests/maestro/flows/web/

# Platform-specific
maestro test --platform web tests/maestro/flows/web/

# With Maestro Studio (visual testing)
maestro studio
```

**Prerequisites:**
- Local Supabase running: `supabase start`
- Web app running: `npm run dev` (for E2E)
- Maestro installed: `brew install maestro`

## Key Test Scenarios

| Scenario | Test File | Description | Type |
|----------|-----------|-------------|------|
| Database schema | `database/schema.test.ts` | Table structure validation | Unit |
| RLS policies | `database/rls.test.ts` | Row-level security enforcement | Unit |
| Anonymous auth | `auth/anonymous.test.ts` | Anonymous sign-in flow | Integration |
| Sefaria integration | `logic/sefaria.test.ts` | Content API calls | Unit |
| Content generation | `edge-functions/generate-content.test.ts` | AI explanation generation | Integration |
| Schedule generation | `edge-functions/generate-schedule.test.ts` | Daily schedule creation | Integration |
| Sync window | `sync/sync-window.test.ts` | 14-day rolling window | Unit |
| Streak calculation | `sync/streak-calculation.test.ts` | Streak counting logic | Unit |
| Anonymous login | `maestro/flows/web/auth/login_anonymous.yaml` | User sign-in flow | E2E |
| Home display | `maestro/flows/web/home/home_display.yaml` | Track card rendering | E2E |
| Mark complete | `maestro/flows/web/study/mark_complete.yaml` | Completion toggle | E2E |
| Offline read | `maestro/flows/web/offline/offline_read.yaml` | Offline-first functionality | E2E |

## Reference Documents

- **TDD Section 10:** Platform Implementations & Testing
- **Client Testing Guide:** `.claude/agents/client-testing.md`
- **Deno Documentation:** https://docs.deno.com/
- **Maestro Documentation:** https://maestro.mobile.dev/

---

*Testing analysis: 2026-01-27*
