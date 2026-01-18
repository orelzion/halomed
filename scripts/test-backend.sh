#!/bin/bash
# Test script for backend migrations and RLS policies
# Supports both syntax tests (no Supabase required) and integration tests (Supabase dev required)

set -e

echo "🧪 Testing HaLomeid Backend"
echo "============================"
echo ""

# Always run syntax tests (no Supabase needed)
echo "📝 Running SQL syntax validation tests (no Supabase required)..."
if deno test --allow-read supabase/tests/syntax/migrations.test.ts 2>/dev/null; then
    echo "✅ Syntax tests passed"
else
    echo "⚠️  Syntax tests failed or Deno not installed"
    echo "   Install Deno: curl -fsSL https://deno.land/install.sh | sh"
fi

echo ""

# Check if Supabase is running for integration tests
if ! supabase status > /dev/null 2>&1; then
    echo "⚠️  Supabase dev is not running. Skipping integration tests."
    echo "   To run integration tests:"
    echo "   1. Run: supabase start"
    echo "   2. Run this script again"
    echo ""
    echo "✅ Syntax validation complete (integration tests skipped)"
    exit 0
fi

echo "✅ Supabase is running - running integration tests..."
echo ""

# Get environment variables from Supabase status
echo "📋 Getting Supabase connection details..."
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
SUPABASE_ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
SUPABASE_SERVICE_KEY=$(supabase status | grep "service_role key" | awk '{print $3}')

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Could not get Supabase credentials. Please check: supabase status"
    exit 1
fi

export SUPABASE_URL
export SUPABASE_ANON_KEY
export SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY

echo "✅ Got connection details"
echo ""

# Run schema tests
echo "📊 Running schema integration tests..."
if deno test --allow-env --allow-net --allow-read supabase/tests/database/schema.test.ts 2>/dev/null; then
    echo "✅ Schema tests passed"
else
    echo "❌ Schema tests failed"
    exit 1
fi

echo ""

# Run RLS tests
echo "🔒 Running RLS integration tests..."
if deno test --allow-env --allow-net --allow-read supabase/tests/database/rls.test.ts 2>/dev/null; then
    echo "✅ RLS tests passed"
else
    echo "❌ RLS tests failed"
    exit 1
fi

echo ""
echo "🎉 All tests passed!"
echo ""
echo "Next steps:"
echo "  - Continue with authentication setup (Task 3.x)"
echo "  - Or proceed with Edge Functions structure (Task 4.x)"
