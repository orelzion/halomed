#!/bin/bash
# Sync API keys from .env.local to functions/.env for edge functions
# This ensures edge functions invoked via HTTP have access to environment variables

set -e

ENV_LOCAL="supabase/.env.local"
FUNCTIONS_ENV="supabase/functions/.env"

if [ ! -f "$ENV_LOCAL" ]; then
  echo "❌ $ENV_LOCAL not found"
  exit 1
fi

# Extract API keys and write to functions/.env
echo "📋 Syncing API keys from $ENV_LOCAL to $FUNCTIONS_ENV..."
grep -E "^(GEMINI_API_KEY|OPENAI_API_KEY)=" "$ENV_LOCAL" > "$FUNCTIONS_ENV" || {
  echo "⚠️  No GEMINI_API_KEY or OPENAI_API_KEY found in $ENV_LOCAL"
  exit 1
}

echo "✅ Synced API keys to $FUNCTIONS_ENV"
echo ""
echo "⚠️  IMPORTANT: Restart Supabase for changes to take effect:"
echo "   supabase stop && supabase start"
