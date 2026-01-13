# PowerSync Sync Rules Setup

## Overview

PowerSync requires sync rules to be configured **before** you can generate an API key. We already have the sync rules file created (`powersync/powersync.yaml`).

## Step 1: Locate Your Sync Rules File

The sync rules are in: `powersync/powersync.yaml`

This file defines:
- `user_data` bucket - User study logs with 14-day rolling window
- `content` bucket - Content cache referenced by user logs
- `tracks` bucket - Track definitions

## Step 2: Configure in PowerSync Dashboard

### ⚠️ IMPORTANT: Remove Default/Example Rules First!

Before adding your sync rules, **remove any default/example rules** that reference `mytable` or other example tables. These will cause errors.

### Option A: Upload YAML File (If Supported)

1. Go to PowerSync Dashboard → **Sync Rules** or **Configuration**
2. **First, delete any default/example rules** (especially ones with `mytable`)
3. Look for **"Upload YAML"** or **"Import Configuration"** option
4. Upload `powersync/powersync.yaml`
5. Review the configuration
6. Save

### Option B: Manual Configuration (Copy-Paste)

1. **First, delete any default/example rules** in PowerSync Dashboard
2. Open `powersync/powersync.yaml` in your editor
3. Copy the entire YAML content
4. Go to PowerSync Dashboard → **Sync Rules** or **Configuration**
5. Paste the YAML into the editor (replacing any default content)
6. Review the configuration
7. Save

### Option C: Configure via UI (If Available)

Some PowerSync dashboards have a UI builder. If so:

1. **First, delete any default/example buckets/rules** (especially ones with `mytable`)
2. Go to **Sync Rules** → **Add Bucket** or similar
3. Create three buckets:

**Bucket 1: `user_data`**
- Parameters: `user_id: token.user_id`
- SQL Query:
  ```sql
  SELECT id, user_id, track_id, study_date, content_id, is_completed, completed_at
  FROM user_study_log
  WHERE user_id = bucket.user_id
    AND study_date >= CURRENT_DATE - INTERVAL '14 days'
    AND study_date <= CURRENT_DATE + INTERVAL '14 days'
  ```

**Bucket 2: `content`**
- No parameters (read-only)
- SQL Query:
  ```sql
  SELECT id, ref_id, source_text_he, ai_explanation_json, created_at
  FROM content_cache
  WHERE id IN (
    SELECT content_id FROM user_study_log 
    WHERE user_id = bucket.user_id
      AND study_date >= CURRENT_DATE - INTERVAL '14 days'
      AND study_date <= CURRENT_DATE + INTERVAL '14 days'
  )
  ```

**Bucket 3: `tracks`**
- No parameters (read-only)
- SQL Query:
  ```sql
  SELECT id, title, source_endpoint, schedule_type
  FROM tracks
  ```

## Step 3: Verify Sync Rules

After configuring, verify:
- [ ] All three buckets are defined (`user_data`, `content`, `tracks`)
- [ ] `user_data` has the `user_id` parameter
- [ ] All SQL queries reference the correct tables
- [ ] 14-day window filter is present in `user_data` and `content` buckets

## Step 4: Generate API Key

Once sync rules are saved:
1. Go to **Settings** → **API Keys**
2. Click **Generate API Key**
3. Name it (e.g., "Development")
4. Copy the key immediately
5. Save to `.env` as `POWERSYNC_DEV_API_KEY`

## Troubleshooting

**"Table public.mytable not found" error:**
- ⚠️ **Most common issue!** PowerSync has default/example rules
- Delete any rules/buckets that reference `mytable` or other example tables
- Only use rules that reference your actual tables: `user_study_log`, `content_cache`, `tracks`
- See `TROUBLESHOOTING.md` for detailed fix

**"Sync rules required" error:**
- Make sure you've saved the sync rules configuration
- Verify the YAML syntax is valid
- Check that all required buckets are defined

**YAML upload fails:**
- Check YAML syntax (indentation, colons, etc.)
- Verify all table names match your database schema
- Make sure publication is created in Supabase

**Can't find sync rules section:**
- Look for "Configuration", "Sync Rules", "Buckets", or "Data Sync"
- May be under project settings or main navigation

## Reference

- Sync rules file: `powersync/powersync.yaml`
- Created in: Task 7.2 ✅
- Reference: `.cursor/agents/sync.md` Section 3
