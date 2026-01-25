# Testing RxDB Migration Guide

This guide covers how to test the migration from PowerSync to RxDB.

## Prerequisites

1. **Run Supabase Migrations First**
   ```bash
   cd supabase
   supabase db reset  # Or apply migrations manually
   # Or if using Supabase CLI:
   supabase migration up
   ```

   The new migrations to apply:
   - `20260124203623_add_deleted_fields.sql`
   - `20260124203624_ensure_updated_at_triggers.sql`
   - `20260124203625_add_realtime_publication.sql`

2. **Install Dependencies**
   ```bash
   cd web
   npm install
   ```

## Testing Steps

### 1. Test Database Initialization

**Goal**: Verify RxDB initializes correctly and creates collections.

**Steps**:
1. Start the dev server:
   ```bash
   cd web
   npm run dev
   ```

2. Open browser DevTools → Application → IndexedDB
3. Look for database named `halomeid`
4. Verify all 6 collections exist:
   - `user_study_log`
   - `content_cache`
   - `tracks`
   - `user_preferences`
   - `learning_path`
   - `quiz_questions`

5. Check console for:
   ```
   [RxDB] Database initialized
   [RxDB] Migration not completed, running PowerSync migration...
   [RxDB] Migration completed successfully
   ```

**Expected**: Database created, collections visible, no errors.

---

### 2. Test PowerSync Migration (if PowerSync data exists)

**Goal**: Verify existing PowerSync data migrates to RxDB.

**Steps**:
1. If you have an existing user with PowerSync data:
   - Log in to the app
   - Check console for migration logs
   - Verify data appears in RxDB IndexedDB

2. Check migration logs in console:
   ```
   [Migration] Starting PowerSync to RxDB migration...
   [Migration] Migrated X user_study_log entries
   [Migration] Migrated X content_cache entries
   ...
   [Migration] Migration completed successfully
   ```

3. Verify data in IndexedDB:
   - Open DevTools → Application → IndexedDB → `halomeid`
   - Check each collection has data
   - Compare counts with what was in PowerSync

**Expected**: All PowerSync data migrated, counts match.

**Note**: If PowerSync packages are removed, migration will gracefully skip (this is expected).

---

### 3. Test Replication Setup

**Goal**: Verify two-way sync works with Supabase.

**Steps**:
1. Log in to the app
2. Check console for replication logs:
   ```
   [Replication] Setting up RxDB Supabase replications...
   [Replication] Waiting for initial replication...
   [Replication] Initial replication completed
   ```

3. Verify initial sync:
   - Check IndexedDB has data from Supabase
   - Verify 14-day window filtering (only recent data synced)

4. Test pull (server → client):
   - Make a change in Supabase dashboard (e.g., update a track title)
   - Wait a few seconds
   - Verify change appears in the app (check IndexedDB or UI)

5. Test push (client → server):
   - Complete a study unit in the app
   - Check Supabase dashboard - `user_study_log` should update
   - Verify `updated_at` timestamp changed

**Expected**: Initial sync completes, real-time updates work both ways.

---

### 4. Test 14-Day Window Filtering

**Goal**: Verify only data within 14-day window is synced.

**Steps**:
1. Check what data is in IndexedDB:
   - Open DevTools → Application → IndexedDB
   - Check `user_study_log` collection
   - Verify `study_date` values are within ±14 days of today

2. Check `learning_path` collection:
   - Verify `unlock_date` values are within ±14 days

3. Test edge case:
   - Create a `user_study_log` entry in Supabase with `study_date` = 20 days ago
   - Verify it does NOT appear in IndexedDB
   - Create entry with `study_date` = 10 days ago
   - Verify it DOES appear in IndexedDB

**Expected**: Only data within 14-day window is synced.

---

### 5. Test Content Generation During Sync

**Goal**: Verify content and quizzes are generated for 14-day window.

**Steps**:
1. Check console for content generation logs:
   ```
   [Content Generation] Ensuring content is generated for 14-day window...
   [Content Generation] Generating schedule for 14-day window...
   [Content Generation] Generating X content entries...
   [Content Generation] Generating quizzes for X content entries...
   [Content Generation] Content generation completed
   ```

2. Verify in Supabase:
   - Check `content_cache` table has entries for content_refs in window
   - Check `quiz_questions` table has questions for those content_refs

3. Verify in IndexedDB:
   - Check `content_cache` collection has the generated content
   - Check `quiz_questions` collection has the questions

**Expected**: All content and quizzes in 14-day window are generated and synced.

---

### 6. Test Offline Functionality

**Goal**: Verify app works offline and syncs when back online.

**Steps**:
1. Load the app and let initial sync complete
2. Go offline (DevTools → Network → Offline)
3. Test offline operations:
   - Complete a study unit
   - Change preferences
   - Navigate through the app
4. Go back online
5. Check console for sync logs
6. Verify changes synced to Supabase

**Expected**: App works offline, changes sync when online.

---

### 7. Test Sync Indicator UI

**Goal**: Verify non-intrusive sync indicator appears.

**Steps**:
1. Open the app
2. Look for sync indicator in bottom-left corner
3. Verify it shows:
   - "מסנכרן..." (Syncing...) during initial sync
   - "סינכרון הושלם" (Sync completed) briefly after sync
   - Auto-hides after 2-3 seconds
4. Test error state (if sync fails):
   - Should show "שגיאת סנכרון" (Sync error)
   - Can be dismissed with X button

**Expected**: Sync indicator appears and disappears appropriately.

---

### 8. Test All Hooks

**Goal**: Verify all hooks work with RxDB.

**Test each hook**:

- **`useStudyUnit`**: Load a study unit, verify data loads
- **`useTracks`**: Verify tracks list loads
- **`useCompletion`**: Toggle completion, verify it updates
- **`usePath`**: Verify learning path loads
- **`usePathStudyUnit`**: Load a path study unit
- **`useStreak`**: Verify streak calculation works
- **`usePreferences`**: Load and update preferences
- **`usePathStreak`**: Verify path streak calculation

**Expected**: All hooks work correctly with RxDB data.

---

### 9. Test Conflict Resolution

**Goal**: Verify last-write-wins conflict resolution works.

**Steps**:
1. Complete a study unit in the app (creates local change)
2. Manually update the same record in Supabase with different data
3. Wait for sync
4. Verify the last write wins (check which value is in both places)

**Expected**: Conflicts resolved correctly (typically last write wins).

---

### 10. Test Data Integrity

**Goal**: Verify data consistency between Supabase and RxDB.

**Steps**:
1. Compare record counts:
   - Count records in Supabase (filtered by 14-day window)
   - Count records in IndexedDB
   - Verify they match

2. Spot-check data:
   - Pick a few records from Supabase
   - Find them in IndexedDB
   - Verify field values match

3. Test after app restart:
   - Close and reopen the app
   - Verify data persists in IndexedDB
   - Verify sync resumes correctly

**Expected**: Data is consistent and persists correctly.

---

## Common Issues and Solutions

### Issue: "RxDB database not available"
**Solution**: Check browser console for errors. Ensure IndexedDB is enabled in browser.

### Issue: "Migration failed"
**Solution**: This is expected if PowerSync packages are removed. Migration will skip gracefully.

### Issue: "Replication not starting"
**Solution**: 
- Check Supabase connection (env vars set correctly?)
- Check Realtime is enabled for tables
- Check RLS policies allow access

### Issue: "No data syncing"
**Solution**:
- Verify user is authenticated
- Check Supabase RLS policies
- Verify `updated_at` triggers are working
- Check console for replication errors

### Issue: "Sync indicator not appearing"
**Solution**: Check `SyncProvider` is in the component tree (should be in `layout.tsx`).

---

## Manual Testing Checklist

- [ ] Database initializes on first load
- [ ] PowerSync migration runs (if data exists) or skips gracefully
- [ ] Initial replication completes
- [ ] Data appears in IndexedDB
- [ ] 14-day window filtering works
- [ ] Content generation runs during sync
- [ ] Offline functionality works
- [ ] Online sync works
- [ ] Sync indicator appears/disappears correctly
- [ ] All hooks work correctly
- [ ] Conflict resolution works
- [ ] Data persists after app restart
- [ ] Real-time updates work (pull and push)

---

## Automated Testing (Future)

Consider adding:
- Unit tests for migration utility
- Integration tests for replication
- E2E tests for sync flow
- Tests for conflict resolution

---

## Performance Testing

Monitor:
- Initial sync time (should be < 30 seconds for 14-day window)
- Memory usage (IndexedDB size)
- Sync latency (time from change to sync)
- App startup time

---

## Rollback Plan

If issues are found:
1. Revert to previous commit
2. Re-enable PowerSync provider in `layout.tsx`
3. Remove RxDB provider
4. Deploy rollback

The migration is designed to be non-destructive - PowerSync data remains intact.
