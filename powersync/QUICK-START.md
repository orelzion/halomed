# Quick Start: PowerSync Development Setup

## Step-by-Step Guide

### 1. Create Development Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click **"New Project"** (top right or in your organization)
3. Fill in:
   - **Name**: `halomed-dev` (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine
4. Click **"Create new project"**
5. Wait ~2 minutes for project to be created

### 2. Get Your Project Reference

After project is created:
1. Go to **Settings** → **General**
2. Copy your **Reference ID** (looks like: `abcdefghijklmnop`)
3. Or extract it from your Supabase URL: `https://YOUR_REF.supabase.co`
   - Example: `https://sjpzatrwnwtcvjnyvdoy.supabase.co` → ref is `sjpzatrwnwtcvjnyvdoy`
4. You'll need this for linking

### 3. Link and Push Migrations

In your terminal (from project root):

```bash
# Link to your development project
supabase link --project-ref YOUR_PROJECT_REF

# When prompted, enter your database password (the one you set in step 1)

# Push all migrations to development
supabase db push
```

This will apply all your migrations from `supabase/migrations/` to your development instance.

### 4. Create PowerSync Publication

1. Go to your **development Supabase Dashboard**
2. Click **SQL Editor** (left sidebar)
3. Run this SQL:
   ```sql
   CREATE PUBLICATION powersync FOR ALL TABLES;
   ```
4. Verify it worked:
   ```sql
   SELECT * FROM pg_publication WHERE pubname = 'powersync';
   ```
   You should see one row with `pubname = 'powersync'`

### 5. Get Connection Details

From your **development Supabase Dashboard**:

**For Database Connection:**
1. Go to **Settings** → **Database**
2. Copy:
   - **Host**: `db.xxxxx.supabase.co`
   - **Port**: `5432` (default)
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: (the one you set in step 1)

**For Authentication:**
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key (starts with `eyJ...`)
   - **JWT Secret**: Click "Reveal" next to JWT Secret

### 6. Configure Sync Rules in PowerSync

**⚠️ IMPORTANT: You must configure sync rules BEFORE you can generate an API key!**

1. Go to [PowerSync Dashboard](https://app.powersync.com/)
2. Navigate to **Sync Rules** or **Configuration** section
3. You can either:
   - **Option A: Upload YAML file** (if available):
     - Upload `powersync/powersync.yaml` from your project
   - **Option B: Configure manually** (copy from `powersync.yaml`):
     - Go to your project: `powersync/powersync.yaml`
     - Copy the YAML content
     - Paste into PowerSync Dashboard sync rules editor

4. The sync rules should define these buckets:
   - `user_data` - User study logs (with 14-day window)
   - `content` - Content cache (referenced by user logs)
   - `tracks` - Track definitions

5. Save the sync rules configuration

### 7. Connect PowerSync to Database

1. In PowerSync Dashboard, go to **Connections** → **Add Connection**
2. Fill in:
   - **Type**: PostgreSQL
   - **Host**: `db.xxxxx.supabase.co` (from step 5)
   - **Port**: `5432`
   - **Database**: `postgres`
   - **Username**: `postgres`
   - **Password**: (your dev project password)
   - **SSL Mode**: Require
   - **Publication**: `powersync` ⚠️ **Important!**
3. Click **Test Connection**
4. If successful, click **Save**

### 8. Get Instance URL and Create Development Token

PowerSync will show you:
1. **Instance URL**: `https://xxxxx.powersync.journeyapps.com`
   - Extract the Instance ID from the URL (the part before `.powersync.journeyapps.com`)
   - Save to `.env` as `POWERSYNC_DEV_INSTANCE_ID`

2. **Development Token Setup**:
   - PowerSync will ask for a **Token Subject**
   - This is the user_id that will be used for testing
   - **Option A**: Use a test user ID from your Supabase (go to Authentication → Users, copy a user's UUID)
   - **Option B**: Use a simple test value like `test-user-1`
   - Enter the token subject
   - Generate the token
   - **Copy it immediately** - you won't see it again!
   - Save to `.env` as `POWERSYNC_DEV_TOKEN` (for reference)

**Note:** Development tokens are temporary. In production, tokens come from Supabase Auth automatically.

See `DEV-TOKEN-SETUP.md` for detailed instructions.

### 9. Configure PowerSync Auth

1. In PowerSync Dashboard → **Authentication**
2. You should see the authentication configuration page with:
   - **Use Supabase Auth** checkbox (check this ✅)
   - **Development tokens** checkbox (check this ✅ for development)
   - **Supabase JWT Secret (optional)** field (marked as "Legacy")

3. Get your JWT Secret from development Supabase:
   - Go to your **development Supabase Dashboard** → **Settings** → **API**
   - Scroll down to **JWT Settings**
   - Click **Reveal** next to **JWT Secret**
   - Copy the secret (it's a long string)

4. In PowerSync, paste the JWT Secret into the **Supabase JWT Secret (optional)** field

5. **Leave other fields empty** for now (JWKS URI, JWT Audience, HS256 tokens are optional/advanced)

6. Click **Save and Deploy** (bottom right)

**Note:** If your Supabase project uses new JWT signing keys (not legacy), you might not need to enter the JWT secret. Try saving without it first - if it works, you're good! If you get an error, then enter the legacy JWT secret.

### 10. Save Environment Variables

The `.env` file has been created in your project root with placeholders.

**Fill in these values:**

**PowerSync Development Instance:**
- `POWERSYNC_DEV_INSTANCE_ID` - From PowerSync Dashboard → Development Project → Settings
- `POWERSYNC_DEV_API_KEY` - From PowerSync Dashboard → Development Project → Settings

**Development Supabase:**
- `SUPABASE_DEV_URL` - Already filled: `https://sjpzatrwnwtcvjnyvdoy.supabase.co`
- `SUPABASE_DEV_ANON_KEY` - From Supabase Dashboard → Settings → API
- `SUPABASE_DEV_JWT_SECRET` - From Supabase Dashboard → Settings → API → JWT Settings

**For Production (later):**
- Uncomment and fill in `POWERSYNC_PROD_*` and `SUPABASE_PROD_*` values when ready

**⚠️ Make sure `.env` is in `.gitignore`!** (Already done ✅)

## Verification Checklist

- [ ] Development Supabase project created
- [ ] Migrations pushed successfully (`supabase db push`)
- [ ] PowerSync publication created and verified
- [ ] PowerSync connection test passes
- [ ] PowerSync authentication test passes
- [ ] Environment variables saved (not committed)

## You're Done! 🎉

Task 7.1 is now complete. You can now:
- Test PowerSync sync with your development instance
- Develop client apps (Android/iOS/Web) against development Supabase
- Keep using local Supabase for backend development

## Daily Workflow

**For backend development:**
```bash
supabase start  # Use local Supabase
# Develop, test, create migrations locally
```

**When ready to test PowerSync:**
```bash
supabase db push  # Push migrations to dev Supabase
# Test PowerSync sync with development instance
```

## Troubleshooting

**"Publication 'powersync' not found":**
- Make sure you created it in the **development** Supabase, not local
- Run the SQL in development Supabase SQL Editor

**Connection fails:**
- Double-check all connection details match development project
- Verify password is correct
- Make sure publication name is exactly `powersync` (lowercase)

**Migrations fail:**
- Make sure you're linked to development project: `supabase link --project-ref YOUR_REF`
- Check migration files are valid SQL
