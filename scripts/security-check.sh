#!/bin/bash
# Security check script (runs before commits)
# Reference: @.cursor/agents/security.md

set -e

echo "🔒 Running security checks..."
echo ""

# Check 1: No hardcoded Supabase keys (except known local dev keys in test files)
echo "1. Checking for hardcoded Supabase keys..."
# Known local Supabase dev keys (safe to have in test files as fallbacks)
LOCAL_DEV_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
LOCAL_DEV_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Get staged files
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED_FILES" ]; then
    # No staged files - skip JWT check (only check on commits)
    echo "   (No staged files - skipping JWT check)"
else
    # Check staged files for JWT tokens, but allow known local dev keys in test files
    FOUND_JWT=$(echo "$STAGED_FILES" | xargs grep -h "eyJ[A-Za-z0-9_-]\{100,\}" 2>/dev/null | grep -v "$LOCAL_DEV_ANON_KEY" | grep -v "$LOCAL_DEV_SERVICE_KEY" | head -1 || true)
    if [ -n "$FOUND_JWT" ]; then
        # Check if it's in a test file (which is allowed)
        JWT_FILE=$(echo "$STAGED_FILES" | xargs grep -l "eyJ[A-Za-z0-9_-]\{100,\}" 2>/dev/null | grep -v "supabase/tests/" | head -1 || true)
        if [ -n "$JWT_FILE" ]; then
            echo "❌ ERROR: Hardcoded JWT token found in: $JWT_FILE"
            echo "   Use environment variables instead"
            echo "   (Known local dev keys in test files are allowed)"
            exit 1
        fi
    fi
fi

# Check 2: No hardcoded API keys
echo "2. Checking for hardcoded API keys..."
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED_FILES" ]; then
    # No staged files - skip API key check
    echo "   (No staged files - skipping API key check)"
else
    FOUND_API_KEY_FILE=$(echo "$STAGED_FILES" | xargs grep -l "sk-[A-Za-z0-9]\{48\}" 2>/dev/null | grep -v "\.md$" | grep -v "\.example" | grep -v "security-check.sh" | head -1 || true)
    if [ -n "$FOUND_API_KEY_FILE" ]; then
        echo "❌ ERROR: Hardcoded API key found in: $FOUND_API_KEY_FILE"
        echo "   Use environment variables instead"
        exit 1
    fi
fi

# Check 3: No .env files
echo "3. Checking for .env files..."
if git diff --cached --name-only | grep -E "\.env$|\.env\." | grep -v ".env.example"; then
    echo "❌ ERROR: .env file found in staged files!"
    echo "   .env files should not be committed"
    exit 1
fi

# Check 4: No secret files
echo "4. Checking for secret files..."
if git diff --cached --name-only | grep -E "secrets\.json|credentials\.json|\.pem$|\.key$|\.p12$|\.pfx$"; then
    echo "❌ ERROR: Secret file found in staged files!"
    echo "   Secret files should not be committed"
    exit 1
fi

# Check 5: Verify .gitignore has security patterns
echo "5. Verifying .gitignore..."
if ! grep -q "\.env$" .gitignore 2>/dev/null && ! grep -q "\.env$" supabase/.gitignore 2>/dev/null; then
    echo "⚠️  WARNING: .env not in .gitignore"
fi

echo ""
echo "✅ Security checks passed!"
