#!/bin/bash
# Sync environment variables from root .env to web/.env.local
# Next.js requires NEXT_PUBLIC_ prefix for client-side variables
#
# Supabase API Keys:
# - Use PUBLISHABLE key (sb_publishable_...) - NEW, RECOMMENDED
# - OR use legacy ANON key (eyJ... JWT) - Still works but legacy
# Both can be found in Supabase Dashboard > Settings > API Keys

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"

if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "❌ Error: .env file not found in $ROOT_DIR"
  exit 1
fi

echo "📋 Syncing environment variables from root .env to web/.env.local..."
echo ""
echo "ℹ️  Supabase Key Types:"
echo "   • Publishable key (sb_publishable_...) - NEW, recommended"
echo "   • Legacy anon key (eyJ... JWT) - Still works"
echo "   Both are safe for client-side use"
echo ""

# Extract and convert variables
awk -F'=' '
  /^SUPABASE_DEV_URL=/ {
    print "NEXT_PUBLIC_SUPABASE_URL="$2
  }
  /^SUPABASE_DEV_ANON_KEY=/ {
    print "NEXT_PUBLIC_SUPABASE_LEGACY_ANON_KEY="$2
  }
  /^SUPABASE_DEV_PUBLISHABLE_KEY=/ {
    print "NEXT_PUBLIC_SUPABASE_ANON_KEY="$2
  }
' "$ROOT_DIR/.env" > "$WEB_DIR/.env.local"

echo "✅ Created/updated web/.env.local"
echo ""
echo "📄 Contents:"
cat "$WEB_DIR/.env.local"
echo ""
echo "⚠️  Remember to restart the dev server: npm run dev -- --webpack"
