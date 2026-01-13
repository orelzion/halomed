# PowerSync Configuration

This directory contains PowerSync configuration files for syncing Supabase data to client applications.

## Setup Instructions

### 1. Create PowerSync Instance

1. Go to [PowerSync Dashboard](https://app.powersync.com/)
2. Sign up or log in
3. Create a new project/instance
4. Note your **PowerSync Instance ID** and **API Key**

### 2. Create PowerSync Publication in Supabase

**⚠️ CRITICAL: Do this BEFORE connecting in PowerSync Dashboard!**

PowerSync requires a PostgreSQL publication for logical replication.

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this SQL:
   ```sql
   CREATE PUBLICATION powersync FOR ALL TABLES;
   ```
3. Verify it was created:
   ```sql
   SELECT * FROM pg_publication WHERE pubname = 'powersync';
   ```

**Alternative:** Apply the migration file:
- `supabase/migrations/20260113140000_create_powersync_publication.sql`
- Run: `supabase db push` (if using CLI) or apply via SQL Editor

### 3. Connect to Supabase

1. In PowerSync Dashboard, navigate to **Connections**
2. Add a new connection:
   - **Type**: PostgreSQL
   - **Host**: Your Supabase database host (from Supabase Dashboard > Settings > Database)
   - **Port**: 5432
   - **Database**: `postgres`
   - **Username**: `postgres`
   - **Password**: Your Supabase database password
   - **SSL Mode**: Require
   - **Publication**: `powersync` ⚠️ **This field is required!**

### 4. Configure Authentication

PowerSync uses Supabase Auth for user authentication:

1. In PowerSync Dashboard, navigate to **Authentication**
2. Configure Supabase Auth integration:
   - **Auth Provider**: Supabase
   - **Supabase URL**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - **Supabase Anon Key**: Your Supabase anon/public key
   - **JWT Secret**: Your Supabase JWT secret (from Supabase Dashboard > Settings > API)

### 4. Environment Variables

Create a `.env` file in this directory (or add to project root `.env`):

```bash
# PowerSync Configuration
POWERSYNC_INSTANCE_ID=your-instance-id
POWERSYNC_API_KEY=your-api-key

# Supabase Configuration (for PowerSync connection)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_DB_HOST=db.xxxxx.supabase.co
SUPABASE_DB_PASSWORD=your-db-password
SUPABASE_JWT_SECRET=your-jwt-secret
```

**⚠️ IMPORTANT**: Never commit `.env` files or API keys to version control.

## Files in This Directory

- `powersync.yaml` - Sync rules configuration (created in Task 7.2)
- `schemas/` - SQLite schema definitions (created in Tasks 7.6-7.8)
  - `user_study_log.sql`
  - `content_cache.sql`
  - `tracks.sql`

## Reference

- **TDD Section 8**: Sync Strategy (PowerSync)
- **sync.md**: Sync Agent documentation
- [PowerSync Documentation](https://docs.powersync.com/)
