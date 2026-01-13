# PowerSync Troubleshooting Guide

## Error: "Table public.mytable not found"

### Problem
PowerSync is trying to reference a table called `mytable` which doesn't exist in your database. This is usually a default/example table name.

### Solution

**If you see this in PowerSync Dashboard:**

1. **Remove any default/example sync rules:**
   - Look for any sync rules or buckets that reference `mytable`
   - Delete or remove those rules

2. **Use only your actual tables:**
   - `user_study_log`
   - `content_cache`
   - `tracks`

3. **Make sure your sync rules match your schema:**
   - Verify table names are exactly: `user_study_log`, `content_cache`, `tracks`
   - Check column names match your actual schema
   - No typos or case sensitivity issues

### Step-by-Step Fix

1. In PowerSync Dashboard → **Sync Rules** or **Configuration**
2. Look for any rules/buckets that mention `mytable`
3. **Delete** those default rules
4. **Add** your actual sync rules (from `powersync/powersync.yaml`):
   - `user_data` bucket → queries `user_study_log`
   - `content` bucket → queries `content_cache`
   - `tracks` bucket → queries `tracks`

5. Save the configuration
6. Try again

### Verify Your Tables Exist

Run this in your Supabase SQL Editor to verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_study_log', 'content_cache', 'tracks');
```

You should see all three tables listed.

### Common Causes

- PowerSync dashboard has example/default sync rules
- Copy-pasted example code with `mytable`
- Old/leftover configuration from another project

### Prevention

Always use the sync rules from `powersync/powersync.yaml` which reference your actual tables.
