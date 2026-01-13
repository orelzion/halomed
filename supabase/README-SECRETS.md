# Storing Secrets for Supabase Edge Functions

## Local Development

1. **Create `.env.local` file** in the `supabase/` directory:
   ```bash
   cp supabase/.env.local.example supabase/.env.local
   ```

2. **Add your API keys** to `supabase/.env.local`:
   ```bash
   OPENAI_API_KEY=sk-your-actual-key-here
   GEMINI_API_KEY=your-gemini-key-here
   ```

3. **Sync API keys to `supabase/functions/.env`** (required for edge functions invoked via HTTP):
   ```bash
   # Run the sync script
   ./supabase/sync-env.sh
   
   # Or manually:
   grep -E "^(GEMINI_API_KEY|OPENAI_API_KEY)=" supabase/.env.local > supabase/functions/.env
   ```

4. **Restart Supabase** to load the new environment variables:
   ```bash
   supabase stop
   supabase start
   ```

   **Note**: When you invoke edge functions via HTTP (e.g., in tests), they run in Supabase's runtime which automatically loads `supabase/functions/.env`. The `supabase/.env.local` file is only used when manually serving functions with `supabase functions serve --env-file`.
   
   **For integration tests to work**: Make sure `supabase/functions/.env` exists and contains your API keys, then restart Supabase.

## Production (Remote Supabase Project)

Use the Supabase CLI to set secrets:

```bash
supabase secrets set OPENAI_API_KEY=sk-your-actual-key-here --project-ref your-project-ref
```

Or set it in the Supabase Dashboard:
1. Go to **Settings** > **Edge Functions** > **Secrets**
2. Add `OPENAI_API_KEY` with your key value

## Security Notes

- ✅ `.env.local` is already in `.gitignore` - it will NOT be committed
- ❌ Never commit API keys to version control
- ✅ Use environment variables, never hardcode secrets in code
- ✅ The `generate-content` function already uses `Deno.env.get('OPENAI_API_KEY')`

## Verification

To verify your API key is accessible in a function:

```bash
# In your Edge Function code:
const apiKey = Deno.env.get('OPENAI_API_KEY');
console.log('API Key present:', !!apiKey); // Should log true if set
```
