# Storing Secrets for Supabase Edge Functions

## Local Development

1. **Create `.env.local` file** in the `supabase/` directory:
   ```bash
   cp supabase/.env.local.example supabase/.env.local
   ```

2. **Add your OpenAI API key** to `supabase/.env.local`:
   ```bash
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. **Serve functions with environment variables**:
   ```bash
   supabase functions serve generate-content --env-file ./supabase/.env.local
   ```

   Or set it in your shell before serving:
   ```bash
   export OPENAI_API_KEY=sk-your-actual-key-here
   supabase functions serve generate-content
   ```

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
