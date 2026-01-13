# Environment Variables Setup

## Overview

You have separate environments for both PowerSync and Supabase:

- **Development**: For active development and testing
- **Production**: For live deployment (set up later)

## Current Setup (Development)

### PowerSync Development Instance

1. In PowerSync Dashboard, you should have a **Development project**
2. Get these values from PowerSync Dashboard → Development Project → Settings:
   - **Instance ID**: Looks like `xxxxx-xxxxx-xxxxx`
   - **API Key**: Long string (keep secure!)

### Development Supabase

Your development Supabase project: `https://sjpzatrwnwtcvjnyvdoy.supabase.co`

Get these from Supabase Dashboard → Settings → API:
- **Anon Key**: "anon public" key (starts with `eyJ...`)
- **JWT Secret**: Settings → API → JWT Settings → Reveal

## .env File Structure

The `.env` file has been created with this structure:

```bash
# PowerSync Development
POWERSYNC_DEV_INSTANCE_ID=your-dev-instance-id
POWERSYNC_DEV_API_KEY=your-dev-api-key

# Development Supabase
SUPABASE_DEV_URL=https://sjpzatrwnwtcvjnyvdoy.supabase.co
SUPABASE_DEV_ANON_KEY=your-dev-anon-key
SUPABASE_DEV_JWT_SECRET=your-dev-jwt-secret

# Production (commented out for now)
# POWERSYNC_PROD_INSTANCE_ID=...
# SUPABASE_PROD_URL=...
```

## Where to Find Values

### PowerSync Values

1. Go to [PowerSync Dashboard](https://app.powersync.com/)
2. Select your **Development project**
3. Go to **Settings** or **Project Settings**
4. Find:
   - **Instance ID** (or Project ID)
   - **API Key** (may need to generate or reveal)

### Supabase Values

1. Go to your development Supabase: `https://sjpzatrwnwtcvjnyvdoy.supabase.co`
2. **Settings** → **API**
3. Find:
   - **Project URL**: Already in `.env`
   - **anon public** key: Copy the "anon public" key
   - **JWT Secret**: Scroll to JWT Settings → Click "Reveal"

## Setting Up Production (Later)

When ready for production:

1. **Create Production PowerSync Project:**
   - In PowerSync Dashboard → Create new project
   - Name it: `halomed-prod` or similar
   - Get Instance ID and API Key

2. **Use Production Supabase:**
   - Your existing production Supabase project
   - Get production URL, anon key, JWT secret

3. **Update .env:**
   - Uncomment production variables
   - Fill in production values
   - Set `ENVIRONMENT=prod` when deploying

## Environment Switching

The `.env` file includes:
```bash
ENVIRONMENT=dev  # or 'prod' for production
```

Your application code can use this to switch between environments.

## Security Notes

- ✅ `.env` is in `.gitignore` (won't be committed)
- ⚠️ Never commit `.env` to git
- ⚠️ Never share API keys or secrets
- ⚠️ Use different keys for dev and prod

## Verification

After filling in values, verify:
- [ ] All placeholder values replaced with actual values
- [ ] No `your-*-here` placeholders remaining
- [ ] `.env` file is not tracked by git (`git status` should not show it)
