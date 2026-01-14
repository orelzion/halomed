#!/bin/bash
# Verify that files are created by correct agents
# Checks for agent markers and TDD order

set -e

echo "🔍 Verifying Agent Assignments"
echo "=============================="
echo ""

ERRORS=0

# Check test files have server-testing marker
echo "📝 Checking test files..."
TEST_FILES=$(find supabase/tests -name "*.test.ts" 2>/dev/null || true)
if [ -z "$TEST_FILES" ]; then
  echo "  ⚠️  No test files found"
else
  for file in $TEST_FILES; do
    if ! grep -q "Agent: server-testing\|Agent: server_testing" "$file" 2>/dev/null; then
      echo "  ❌ Missing agent marker: $file"
      ERRORS=$((ERRORS + 1))
    else
      echo "  ✅ $file"
    fi
  done
fi

echo ""

# Check migrations have backend marker
echo "🗄️  Checking migration files..."
MIGRATION_FILES=$(find supabase/migrations -name "*.sql" 2>/dev/null | sort || true)
if [ -z "$MIGRATION_FILES" ]; then
  echo "  ⚠️  No migration files found"
else
  for file in $MIGRATION_FILES; do
    if ! grep -q "Agent: backend" "$file" 2>/dev/null; then
      echo "  ❌ Missing agent marker: $file"
      ERRORS=$((ERRORS + 1))
    else
      echo "  ✅ $file"
    fi
  done
fi

echo ""

# Check TDD order (tests before migrations)
echo "🔄 Checking TDD order (tests before code)..."
# This is a simplified check - in practice, you'd compare timestamps
echo "  ℹ️  Manual verification needed: test files should be created before migrations"

echo ""

# Check tasks.md has architect definitions
echo "📋 Checking tasks.md..."
if [ -f "tasks.md" ]; then
  if grep -q "Architect\|architect" tasks.md 2>/dev/null; then
    echo "  ✅ tasks.md references architect"
  else
    echo "  ⚠️  tasks.md may be missing architect references"
  fi
else
  echo "  ❌ tasks.md not found"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "=============================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ All agent assignments verified"
  exit 0
else
  echo "❌ Found $ERRORS issues"
  exit 1
fi
