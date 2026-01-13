# PowerSync Development Setup Guide

## Understanding Your Environment

You have:
1. **Local Supabase** - Running on `localhost:54322` (via `supabase start`)
2. **Production Supabase** - Cloud-hosted (not touched yet)
3. **PowerSync Account** - Cloud service (just created)

## The Problem

**PowerSync Cloud cannot connect to localhost!** 

PowerSync is a cloud service that needs to reach your database over the internet. Your local Supabase running on `localhost:54322` is not accessible from the internet.

## Recommended Approach: Development Supabase Instance

**Note:** You don't need Supabase Branches (paid feature). Just create a **separate project** - this is free on the free tier!

### Step 1: Create a Development Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click **New Project** (this creates a completely separate project, not a branch)
3. Name it something like: `halomed-dev` or `halomed-staging`
4. Choose a region close to you
5. Set a database password (save it!)
6. Wait for the project to be created (~2 minutes)

**This is FREE** - Supabase free tier allows multiple projects. You're just creating a second project, not using the branching feature.

### Step 2: Apply Migrations to Development Instance

You need to apply all your migrations to this new development instance:

**Option A: Using Supabase CLI (Recommended)**
```bash
# Link to your development project
supabase link --project-ref your-dev-project-ref

# Push all migrations
supabase db push
```

**Option B: Manual via SQL Editor**
1. Go to Development Supabase Dashboard → SQL Editor
2. Copy and run each migration file from `supabase/migrations/` in order
3. Or use the "Run migrations" feature if available

### Step 3: Create PowerSync Publication

In your **development Supabase** SQL Editor, run:
```sql
CREATE PUBLICATION powersync FOR ALL TABLES;
```

Verify:
```sql
SELECT * FROM pg_publication WHERE pubname = 'powersync';
```

### Step 4: Connect PowerSync to Development Supabase

Now in PowerSync Dashboard:
1. Go to **Connections** → **Add Connection**
2. Use your **development Supabase** connection details:
   - Host: `db.xxxxx.supabase.co` (from development project)
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: (development project password)
   - SSL Mode: **Require**
   - Publication: `powersync`

### Step 5: Configure Auth for Development

In PowerSync Dashboard → **Authentication**:
- Supabase URL: `https://xxxxx.supabase.co` (development project URL)
- Supabase Anon Key: (from development project)
- JWT Secret: (from development project)

## Workflow

### Daily Development
1. Work with **local Supabase** for backend development (`supabase start`)
2. Test Edge Functions, migrations, etc. locally
3. When ready to test PowerSync integration:
   - Push migrations to development Supabase: `supabase db push`
   - Test PowerSync sync with development instance

### Before Production
1. Create a **separate PowerSync project** for production in PowerSync Dashboard
2. Set up a **separate PowerSync instance** for production
3. Connect it to your **production Supabase**
4. Apply migrations to production Supabase
5. Create PowerSync publication in production
6. Update `.env` with production values:
   - `POWERSYNC_PROD_INSTANCE_ID`
   - `POWERSYNC_PROD_API_KEY`
   - `SUPABASE_PROD_*` values

## Alternative: Self-Hosted PowerSync (Advanced)

If you want to use PowerSync with local Supabase:

1. **Self-host PowerSync** using Docker (see PowerSync docs)
2. This runs PowerSync locally and can connect to `localhost:54322`
3. More complex setup, but allows full local development

See: [PowerSync Self-Hosting Docs](https://docs.powersync.com/self-hosting/)

## Summary

**For Task 7.1, do this:**
1. ✅ Create development Supabase project (cloud)
2. ✅ Apply migrations to development instance
3. ✅ Create PowerSync publication in development
4. ✅ Connect PowerSync to development Supabase
5. ✅ Configure PowerSync auth with development Supabase

**Keep using local Supabase for:**
- Backend development
- Testing Edge Functions
- Running Deno tests
- Schema changes and migrations

**Use development Supabase for:**
- PowerSync integration testing
- Client app development (Android/iOS/Web)
- Testing sync behavior
