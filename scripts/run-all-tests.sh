#!/bin/bash
# Run all backend tests with proper environment setup

set -e

echo "🧪 Running Full Test Suite"
echo "=========================="
echo ""

# Get Supabase credentials
echo "📋 Getting Supabase credentials..."
SUPABASE_URL="http://127.0.0.1:54321"

# Try to get keys from status output
STATUS_OUTPUT=$(supabase status 2>&1)
ANON_KEY=$(echo "$STATUS_OUTPUT" | grep -A 1 "anon key" | tail -1 | awk '{print $1}' | tr -d '\n')
SERVICE_KEY=$(echo "$STATUS_OUTPUT" | grep -A 1 "service_role key" | tail -1 | awk '{print $1}' | tr -d '\n')

# Fallback: try JSON output
if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_KEY" ]; then
  if command -v python3 &> /dev/null; then
    JSON_OUTPUT=$(supabase status --output json 2>/dev/null || echo "{}")
    if [ "$JSON_OUTPUT" != "{}" ]; then
      ANON_KEY=$(echo "$JSON_OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('anonKey', ''))" 2>/dev/null || echo "")
      SERVICE_KEY=$(echo "$JSON_OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('serviceRoleKey', ''))" 2>/dev/null || echo "")
    fi
  fi
fi

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_KEY" ]; then
  echo "❌ Could not extract Supabase keys. Please check: supabase status"
  exit 1
fi

export SUPABASE_URL
export SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"

echo "✅ Got credentials"
echo ""

# Find Deno
DENO_CMD="deno"
if [ ! -x "$(command -v deno)" ]; then
  if [ -f ~/.deno/bin/deno ]; then
    DENO_CMD=~/.deno/bin/deno
  else
    echo "❌ Deno not found. Please install Deno."
    exit 1
  fi
fi

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run tests and count results
run_test_suite() {
  local test_file=$1
  local suite_name=$2
  
  echo "📝 Running $suite_name..."
  if $DENO_CMD test --allow-env --allow-net --allow-read "$test_file" 2>&1; then
    echo "✅ $suite_name passed"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo "❌ $suite_name failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo ""
}

# 1. Syntax tests (no Supabase needed)
echo "1️⃣  Syntax Tests (no Supabase required)"
run_test_suite "supabase/tests/syntax/migrations.test.ts" "Syntax tests"

# 2. Schema tests
echo "2️⃣  Schema Integration Tests"
run_test_suite "supabase/tests/database/schema.test.ts" "Schema tests"

# 3. RLS tests
echo "3️⃣  RLS Integration Tests"
run_test_suite "supabase/tests/database/rls.test.ts" "RLS tests"

# 4. Auth tests
echo "4️⃣  Authentication Tests"
run_test_suite "supabase/tests/auth/anonymous.test.ts" "Anonymous auth tests"
run_test_suite "supabase/tests/auth/google-oauth.test.ts" "Google OAuth tests"
run_test_suite "supabase/tests/auth/apple-oauth.test.ts" "Apple OAuth tests"

# 5. Logic tests
echo "5️⃣  Logic Tests"
run_test_suite "supabase/tests/logic/scheduling.test.ts" "Scheduling logic tests"
run_test_suite "supabase/tests/logic/user-track-joining.test.ts" "User track joining tests"

# 6. Edge Functions structure tests
echo "6️⃣  Edge Functions Structure Tests"
run_test_suite "supabase/tests/edge-functions/structure.test.ts" "Edge Functions structure tests"

# Summary
echo "=========================="
echo "📊 Test Summary"
echo "=========================="
echo "Total test suites: $TOTAL_TESTS"
echo "✅ Passed: $PASSED_TESTS"
echo "❌ Failed: $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed. Please review the output above."
  exit 1
fi
