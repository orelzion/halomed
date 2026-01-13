# PowerSync Setup Checklist

## Task 7.1: PowerSync Project Setup

## ⚠️ IMPORTANT: Development vs Production Setup

**PowerSync Cloud cannot connect to localhost Supabase!**

You have two options:

### Option A: Development Supabase Instance (Recommended for Development)
- Create a **separate cloud-hosted Supabase project** for development/staging
- Connect PowerSync to this development instance
- This allows you to test PowerSync without affecting production
- **Recommended approach** for active development

### Option B: Production Supabase (Only for Production)
- Connect PowerSync directly to your production Supabase
- ⚠️ **Not recommended for development** - you'll be testing against production data
- Use this only when ready to deploy

### Option C: Self-Hosted PowerSync (Advanced)
- Run PowerSync locally via Docker
- Can connect to local Supabase
- More complex setup, see PowerSync docs for self-hosting

**For Task 7.1, we recommend Option A** - create a development Supabase instance.

### Prerequisites ✅
- [x] Backend authentication configured (Supabase Auth)
- [x] Supabase project created and running (development OR production)
- [x] Database schema deployed

### Setup Steps

#### Step 1: Create PowerSync Account
- [ ] Sign up at [app.powersync.com](https://app.powersync.com/)
- [ ] Verify email address
- [ ] Complete account setup

#### Step 2: Create PowerSync Instance
- [ ] Create new project in PowerSync Dashboard
- [ ] Note the **Instance ID** (format: `xxxxx-xxxxx-xxxxx`)
- [ ] Note the **API Key** (keep secure!)

#### Step 3: Create PowerSync Publication in Supabase
**⚠️ IMPORTANT: This must be done BEFORE connecting in PowerSync Dashboard**

PowerSync requires a PostgreSQL publication for logical replication. You need to create this in your Supabase database first.

**For Development Supabase Instance:**
1. Go to your **development Supabase Dashboard** → SQL Editor
2. Run this SQL:
   ```sql
   CREATE PUBLICATION powersync FOR ALL TABLES;
   ```
3. Verify it was created:
   ```sql
   SELECT * FROM pg_publication WHERE pubname = 'powersync';
   ```

**For Local Development (if using self-hosted PowerSync):**
- Migration file: `supabase/migrations/20260113140000_create_powersync_publication.sql`
- Run: `supabase db push` (applies to local instance)
- Or run the SQL directly in local Supabase Studio

**Note:** The migration was already applied to your local Supabase, but you'll need to apply it to your cloud Supabase instance (development or production) separately.

#### Step 4: Connect to Supabase Database
- [ ] In PowerSync Dashboard, go to **Connections** → **Add Connection**
- [ ] Connection Type: **PostgreSQL**
- [ ] Get connection details from Supabase Dashboard:
  - Host: `db.xxxxx.supabase.co` (from Supabase Settings > Database)
  - Port: `5432`
  - Database: `postgres`
  - Username: `postgres`
  - Password: (from Supabase Settings > Database)
  - SSL Mode: **Require**
  - **Publication**: `powersync` (this is the key field!)
- [ ] Test connection
- [ ] Save connection

#### Step 5: Configure Supabase Auth Integration
- [ ] In PowerSync Dashboard, go to **Authentication**
- [ ] Check **"Use Supabase Auth"** checkbox ✅
- [ ] Check **"Development tokens"** checkbox ✅ (for development)
- [ ] Get JWT Secret from development Supabase:
  - Go to **Settings** → **API** → **JWT Settings**
  - Click **Reveal** next to JWT Secret
  - Copy the secret
- [ ] Paste JWT Secret into **"Supabase JWT Secret (optional)"** field in PowerSync
  - Note: This field is marked as "Legacy" - enter it if your project uses legacy JWT keys
  - If your project uses new JWT signing keys, you might not need this
- [ ] Leave other optional fields empty (JWKS URI, JWT Audience, HS256 tokens)
- [ ] Click **Save and Deploy**

#### Step 6: Configure Environment Variables
- [ ] Create `.env` file in project root (or `powersync/.env`)
- [ ] Add PowerSync credentials:
  ```bash
  POWERSYNC_INSTANCE_ID=your-instance-id
  POWERSYNC_API_KEY=your-api-key
  ```
- [ ] Verify `.env` is in `.gitignore`
- [ ] Document where to find these values for team members

### Verification

After setup, verify:
- [ ] PowerSync Dashboard shows "Connected" status for Supabase
- [ ] Authentication test passes in PowerSync Dashboard
- [ ] Can see Supabase tables in PowerSync Dashboard
- [ ] Environment variables are set (but not committed)

### Next Steps

Once Task 7.1 is complete:
- Task 7.2a: Write tests for sync rules configuration
- Task 7.2: Create `powersync.yaml` sync rules file

### Troubleshooting

**Connection fails:**
- Verify Supabase database is running
- Check firewall/network settings
- Verify SSL certificate is valid
- Check database password is correct

**"Publication 'powersync' not found" error:**
- ⚠️ **Most common issue!** You must create the publication first
- Go to Supabase SQL Editor and run: `CREATE PUBLICATION powersync FOR ALL TABLES;`
- Verify with: `SELECT * FROM pg_publication WHERE pubname = 'powersync';`
- Make sure the publication name in PowerSync connection matches exactly: `powersync`
- Wait a few seconds after creating publication before testing connection

**Authentication fails:**
- Verify Supabase URL is correct
- Check anon key is valid
- Verify JWT secret matches Supabase settings
- Check Supabase Auth is enabled

**Can't see tables:**
- Verify database connection is active
- Check RLS policies allow PowerSync to read tables
- Verify table names match exactly

### Reference Links

- [PowerSync Dashboard](https://app.powersync.com/)
- [PowerSync Documentation](https://docs.powersync.com/)
- [Supabase Dashboard](https://app.supabase.com/)
- TDD Section 8: Sync Strategy
- `.cursor/agents/sync.md`: Sync Agent documentation
