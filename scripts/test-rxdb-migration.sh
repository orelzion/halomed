#!/bin/bash
# Quick test script for RxDB migration
# Usage: ./scripts/test-rxdb-migration.sh

set -e

echo "🧪 Testing RxDB Migration"
echo "========================="
echo ""

# Check if we're in the right directory
if [ ! -f "web/package.json" ]; then
    echo "❌ Error: Must run from project root"
    exit 1
fi

echo "1️⃣  Checking Supabase migrations..."
if [ -f "supabase/migrations/20260124203623_add_deleted_fields.sql" ]; then
    echo "   ✅ Migration files exist"
else
    echo "   ❌ Migration files missing!"
    exit 1
fi

echo ""
echo "2️⃣  Checking dependencies..."
cd web
if npm list rxdb > /dev/null 2>&1; then
    echo "   ✅ RxDB installed"
else
    echo "   ❌ RxDB not installed. Run: npm install"
    exit 1
fi

if npm list dexie > /dev/null 2>&1; then
    echo "   ✅ Dexie installed"
else
    echo "   ❌ Dexie not installed. Run: npm install"
    exit 1
fi

echo ""
echo "3️⃣  Building project..."
if npm run build > /dev/null 2>&1; then
    echo "   ✅ Build successful"
else
    echo "   ❌ Build failed. Check errors above."
    exit 1
fi

echo ""
echo "4️⃣  Next steps:"
echo "   📝 Apply Supabase migrations:"
echo "      cd supabase && supabase db reset"
echo "      (or apply migrations manually)"
echo ""
echo "   🚀 Start dev server:"
echo "      cd web && npm run dev"
echo ""
echo "   🔍 Test in browser:"
echo "      - Open DevTools → Application → IndexedDB"
echo "      - Look for 'halomeid' database"
echo "      - Check console for migration/replication logs"
echo ""
echo "✅ Pre-flight checks complete!"
echo ""
echo "📖 See docs/testing-rxdb-migration.md for detailed testing guide"
