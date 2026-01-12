#!/bin/bash
# Security check script (runs before commits)
# Reference: @.cursor/agents/security.md

set -e

echo "🔒 Running security checks..."
echo ""

# Check 1: No hardcoded Supabase keys
echo "1. Checking for hardcoded Supabase keys..."
if git diff --cached --name-only | xargs grep -l "eyJ[A-Za-z0-9_-]\{100,\}" 2>/dev/null; then
    echo "❌ ERROR: Hardcoded JWT token found!"
    echo "   Use environment variables instead"
    exit 1
fi

# Check 2: No hardcoded API keys
echo "2. Checking for hardcoded API keys..."
if git diff --cached --name-only | xargs grep -l "sk-[A-Za-z0-9]\{48\}" 2>/dev/null; then
    echo "❌ ERROR: Hardcoded API key found!"
    echo "   Use environment variables instead"
    exit 1
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
