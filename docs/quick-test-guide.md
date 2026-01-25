# Quick Test Guide - RxDB Migration

## 🚀 Quick Start Testing

### Step 1: Apply Supabase Migrations

```bash
# Option A: Using Supabase CLI (if you have it)
cd supabase
supabase db reset  # This applies all migrations

# Option B: Apply manually via Supabase Dashboard
# Go to SQL Editor and run each migration file:
# - 20260124203623_add_deleted_fields.sql
# - 20260124203624_ensure_updated_at_triggers.sql
# - 20260124203625_add_realtime_publication.sql
```

### Step 2: Start Dev Server

```bash
cd web
npm run dev
```

### Step 3: Test in Browser

1. **Open the app** in your browser (usually `http://localhost:3000`)

2. **Open DevTools** (F12 or Cmd+Option+I)

3. **Check Console** for:
   ```
   [RxDB] Database initialized
   [RxDB] Migration not completed, running PowerSync migration...
   [RxDB] Migration completed successfully (or "No PowerSync data found, skipping migration")
   [Replication] Setting up RxDB Supabase replications...
   [Replication] Initial replication completed
   ```

4. **Check IndexedDB**:
   - DevTools → Application → IndexedDB
   - Look for database: `halomeid`
   - Verify 6 collections exist:
     - `user_study_log`
     - `content_cache`
     - `tracks`
     - `user_preferences`
     - `learning_path`
     - `quiz_questions`

5. **Check Sync Indicator**:
   - Look for sync indicator in bottom-left corner
   - Should show "מסנכרן..." then "סינכרון הושלם"

### Step 4: Test Basic Functionality

1. **Log in** (if not already)

2. **Navigate the app**:
   - Home screen loads tracks
   - Click a track → study unit loads
   - Complete a unit → updates locally and syncs

3. **Check Supabase**:
   - Go to Supabase Dashboard → Table Editor
   - Check `user_study_log` table
   - Verify your completion appears there

4. **Test Offline**:
   - DevTools → Network → Offline
   - Complete another unit
   - Go back online
   - Verify it syncs

## ✅ Success Criteria

- [ ] No console errors
- [ ] Database `halomeid` exists in IndexedDB
- [ ] All 6 collections exist
- [ ] Data appears in collections after sync
- [ ] Sync indicator appears
- [ ] App functions normally (can study, complete units, etc.)
- [ ] Changes sync to Supabase
- [ ] Offline mode works

## 🐛 Common Issues

### "RxDB database not available"
- Check browser supports IndexedDB
- Check console for errors
- Try clearing browser cache

### "Replication not starting"
- Check you're logged in
- Check Supabase env vars are set
- Check Realtime is enabled for tables
- Check RLS policies allow access

### "No data syncing"
- Verify migrations were applied
- Check `updated_at` triggers exist
- Check Realtime publication includes tables
- Check console for replication errors

### Migration errors
- If PowerSync packages are removed, migration will skip (this is OK)
- If you have PowerSync data and want to migrate, keep PowerSync packages installed temporarily

## 📊 What to Monitor

1. **Console logs** - Should see replication and sync messages
2. **IndexedDB** - Should see data in collections
3. **Network tab** - Should see Supabase API calls
4. **Supabase Dashboard** - Should see data updates

## 🔍 Detailed Testing

For comprehensive testing, see: `docs/testing-rxdb-migration.md`
