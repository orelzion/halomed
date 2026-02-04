# Coding Conventions

**Analysis Date:** 2026-01-27

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `TrackCard.tsx`, `StudyScreen.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useTracks.ts`, `useAuth.ts`, `useCompletion.ts`)
- Utilities: camelCase with descriptive names (e.g., `date-format.ts`, `content-validation.ts`)
- API routes: kebab-case (e.g., `generate-content`, `update-preferences`)
- Tests: original file name + `.test.ts` or `.spec.ts` (e.g., `schema.test.ts`, `sefaria.test.ts`)

**Functions:**
- camelCase for all functions: `loadTracks()`, `fetchText()`, `signInAnonymously()`
- Descriptive verb-noun pattern: `calculateStreak()`, `validateAuth()`, `generateMishnahExplanation()`
- Async functions do not have special prefix (just camelCase)

**Variables:**
- camelCase for all variables: `studyDate`, `isCompleted`, `tracksWithStatus`, `todayLog`
- Boolean variables often prefixed with `is`, `has`, `should` or end with these: `hasStudiedToday`, `isMounted`, `isLoading`
- State variables follow hook pattern: `[value, setValue]` (e.g., `const [tracks, setTracks]= useState()`)

**Types & Interfaces:**
- PascalCase for all types and interfaces: `TrackWithStatus`, `AuthContextType`, `ContentGenerationRequest`
- Interface names describe what they are: `AuthProviderProps`, `TrackCardProps`, `ContentGenerationResponse`
- Type suffix optional but common: `TrackRecord`, `UserPreferences`

**Constants:**
- UPPER_SNAKE_CASE for module-level constants: `MIGRATION_FLAG_KEY`, `DEFAULT_SYNC_WINDOW`
- camelCase for derived/computed constants: `today`, `requiredCollections`

**Database/Collections:**
- snake_case for table names: `user_study_log`, `content_cache`, `user_preferences`, `learning_path`
- snake_case for column names: `study_date`, `is_completed`, `ai_explanation_json`, `ref_id`

## Code Style

**Formatting:**
- No explicit Prettier config found; follows ESLint Next.js defaults
- 2-space indentation (standard Next.js/Node.js)
- Semicolons required (ESLint enforces)
- Single quotes used inconsistently; both single and double quotes appear in codebase

**Linting:**
- ESLint v9 with Next.js and TypeScript plugins
- Config: `web/eslint.config.mjs` using flat config format
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`
- `npm run lint` command available (no args provided)

**TypeScript Configuration:**
- Target: ES2017
- Strict mode enabled (`"strict": true`)
- Module resolution: "bundler"
- Path aliases configured:
  - `@/*` → current directory (web root)
  - `@shared/*` → `../shared/` (shared code)

## Import Organization

**Order (enforced by convention, not explicit config):**

1. React/Next.js imports
```typescript
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'next-i18next';
```

2. Third-party libraries
```typescript
import { createClient } from '@supabase/supabase-js';
import { HDate, HebrewCalendar } from '@hebcal/core';
import type { RxDatabase } from 'rxdb';
```

3. Internal absolute imports (using `@/` alias)
```typescript
import { getDatabase } from '@/lib/database/database';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { formatDateDual } from '@/lib/utils/date-format';
```

4. Relative imports (rare, only when necessary)
```typescript
import { migrateFromPowerSync } from '../migration/powersync-to-rxdb';
```

**Type imports:** Consistently use `type` keyword
```typescript
import type { User, Session } from '@supabase/supabase-js';
import type { RxDatabase } from 'rxdb';
```

**Path Aliases:**
- Always use `@/` for absolute imports from web root
- Always use `@shared/` for shared code across platforms
- Never use relative paths `../../../` when aliases available

## Error Handling

**Patterns:**

1. **Async functions with error objects** (common in Supabase/API context):
```typescript
const { data, error } = await supabase.from('tracks').select();
if (error) {
  console.error('Error loading tracks:', error);
  // Handle or return null
}
```

2. **Try-catch for non-Supabase async operations:**
```typescript
try {
  const db = await getDatabase();
  // operation
} catch (error) {
  console.error('Error message:', error);
  if (isMounted) setLoading(false);
}
```

3. **Throwing errors in hooks and utilities:**
```typescript
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
```

4. **Error handling in API routes:**
```typescript
if (!ref_id) {
  return NextResponse.json({ error: 'Missing ref_id' }, { status: 400 });
}
if (userError || !user) {
  return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
}
```

5. **Edge Function error handling (Deno):**
```typescript
try {
  // operation
} catch (error) {
  return new Response(
    JSON.stringify({ error: 'Operation failed' }),
    { status: 500, headers: corsHeaders }
  );
}
```

**Error Messages:**
- Use descriptive, context-specific messages
- Format: `[Context] Error description` (e.g., `[RxDB] Collections added successfully`, `[usePreferences] Database not available`)
- Include relevant identifiers when helpful: `[RxDB] Migrating user_preferences doc from v0 to v1: ${oldDoc?.id}`

## Logging

**Framework:** `console` (no logger library)

**Patterns:**

1. **Debug logs** (use `console.log` with prefixes):
```typescript
console.log('[RxDB] Adding collections...');
console.log('[Completion] Local update complete, RxDB will sync automatically');
console.log('[Consent] Successfully synced to backend');
```

2. **Warning logs** (use `console.warn`):
```typescript
console.warn('[usePreferences] Database or user_preferences collection not available');
console.warn('[Consent] Failed to sync to backend:', await response.text());
console.warn(`Tractate "${tractate}" not found in mapping for ref_id: ${refId}`);
```

3. **Error logs** (use `console.error`):
```typescript
console.error('Error loading tracks:', error);
console.error('[RxDB] Failed to initialize database:', error);
console.error('[usePreferences] Error loading preferences:', error);
```

**Prefix Convention:**
- Use `[ComponentName]` or `[FeatureName]` prefix for context
- Examples: `[RxDB]`, `[Consent]`, `[Completion]`, `[usePreferences]`
- No prefix for generic errors that are self-explanatory

## Comments

**When to Comment:**

1. **Complex logic requiring explanation:**
```typescript
// Map tracks with status
// Only counts completions made on the scheduled day
const tracksWithStatus: TrackWithStatus[] = allTracks.map((trackDoc) => {
  const track = trackDoc.toJSON();
  const todayLog = todayLogs.find((log) => log.track_id === track.id);
  // ...
});
```

2. **Non-obvious data transformations:**
```typescript
// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

// RxDB automatically syncs when online
// Watch for changes using RxDB observables
```

3. **Architecture/design decisions:**
```typescript
// Note: RxDB core functions are imported dynamically to avoid webpack/SSR issues
// Using dynamic import ensures it's only loaded client-side
```

4. **Workarounds and temporary solutions (marked with TODO/FIXME):**
```typescript
// TODO: Replace with proper i18n once translation keys are available
// FIXME: This approach doesn't handle edge case X
```

**What NOT to comment:**
- Obvious code that reads itself
- Variable names that are self-explanatory
- Standard React patterns
- Simple getters/setters

**JSDoc/TSDoc:**
- Used minimally in codebase
- File headers include context references (e.g., `// Reference: TDD Section 7, content-generation.md`)
- Function documentation provided for complex functions, especially Edge Functions:
```typescript
/**
 * RxDB Database Instance
 * Creates and exports RxDB database with collections
 * Reference: Migration Plan Phase 2, Tasks 2.2, 2.5
 */
```

## Function Design

**Size:** Functions are kept reasonably small, averaging 20-50 lines
- Hooks: 40-140 lines (include state setup, effects, subscriptions)
- Components: 50-150 lines (including JSX)
- Utilities: 10-50 lines

**Parameters:**
- Prefer destructured props for component/function parameters
- Use TypeScript types for all parameters
- Optional parameters use `?` in type definition

```typescript
interface TrackCardProps {
  track: TrackRecord;
  streak: number;
  hasStudiedToday: boolean;
}

export function TrackCard({ track, streak, hasStudiedToday }: TrackCardProps) {
  // ...
}
```

**Return Values:**
- Explicitly type all return values
- Use unions for multiple return types: `Promise<{ error: Error | null }>`
- Return objects with status: `{ tracks, completedToday, loading }`

```typescript
export function useTracks() {
  // ...
  return { tracks, completedToday, loading };
}
```

## Module Design

**Exports:**
- Named exports preferred for functions, components, types
- Default exports used for page components (App Router convention)
- Re-export pattern for barrel files:

```typescript
// lib/hooks/index.ts (if it existed)
export { useTracks } from './useTracks';
export { useAuth } from './useAuth';
export { usePreferences } from './usePreferences';
```

**Barrel Files:**
- Not heavily used in this codebase
- Direct imports preferred: `import { useTracks } from '@/lib/hooks/useTracks'`

**Directory Structure as Module Organization:**
- `/lib/hooks/` - All React hooks
- `/lib/utils/` - Pure utility functions
- `/lib/database/` - Database initialization and schemas
- `/lib/supabase/` - Supabase client and auth functions
- `/components/screens/` - Full-page screen components
- `/components/ui/` - Reusable UI components
- `/components/providers/` - Context providers (Auth, Theme, Sync)
- `/app/api/` - API routes
- `/app/[routes]/` - Page components

## RTL and i18n Conventions

**Text:**
- All user-facing text must use `useTranslation()` hook
- No hardcoded strings in JSX: `t('view_schedule')` instead of "View Schedule"
- HTML structure: RTL is handled via Tailwind `dir="rtl"` on root
- Padding/margin: Use Tailwind directional classes (`ps-`, `pe-`, `ms-`, `me-`)

**Example:**
```typescript
const { t } = useTranslation();
return (
  <div className="flex items-center justify-center ps-4 pe-4">
    <span>{t('view_schedule')}</span>
  </div>
);
```

## Class Names and Tailwind

**Pattern:**
- Use template literals for conditional classes
- No external classname libraries
- Condition short, readable inline:

```typescript
className={`
  relative overflow-hidden rounded-2xl cursor-pointer
  transition-all duration-300 ease-out
  hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]
  ${hasStudiedToday
    ? 'bg-gradient-to-br from-desert-oasis-card to-desert-oasis-accent/10'
    : 'bg-desert-oasis-card shadow-lg'
  }
`}
```

**Theme Variables:**
- Use custom CSS variables for design tokens: `text-[var(--text-primary)]`
- Custom Tailwind colors defined: `desert-oasis-*` prefix

## Anti-Patterns (Explicitly Forbidden)

**From .cursor/rules:**

1. **No arbitrary setTimeout delays:**
```typescript
// ❌ BAD
setTimeout(() => doSomething(), 500);

// ✅ GOOD
useEffect(() => {
  if (data && isReady) doSomething();
}, [data, isReady]);
```

2. **No polling with timeouts:**
```typescript
// ❌ BAD
while (Date.now() - startTime < maxWaitMs) {
  const data = await db.collection.find().exec();
  if (data.length > 0) break;
  await new Promise(resolve => setTimeout(resolve, 500));
}

// ✅ GOOD - Use RxDB observables
const data = await firstValueFrom(
  db.collection.find({ selector }).$.pipe(
    filter(docs => docs.length > 0),
    take(1)
  )
);
```

3. **No hardcoded strings:**
```typescript
// ❌ BAD
return <p>טוען...</p>;

// ✅ GOOD
const { t } = useTranslation();
return <p>{t('loading')}</p>;
```

---

*Convention analysis: 2026-01-27*
