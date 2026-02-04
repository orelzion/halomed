#!/bin/bash

# TypeScript Validation Script
# Part of production-ready commit hook system

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
WEB_DIR="$REPO_ROOT/web"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📝 TypeScript validation..."

if [ ! -d "$WEB_DIR" ]; then
    echo -e "${YELLOW}⚠️  web directory not found - skipping TypeScript check${NC}"
    exit 0
fi

cd "$WEB_DIR"

# Check if TypeScript is available
if ! command -v npx >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  npx not available - skipping TypeScript check${NC}"
    exit 0
fi

if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  package.json not found - skipping TypeScript check${NC}"
    exit 0
fi

# Check if TypeScript is installed
if ! npx tsc --version >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  TypeScript not installed - run 'npm install'${NC}"
    exit 0
fi

echo "Running type checking..."

# Run TypeScript compiler in noEmit mode (fastest check)
if npx tsc --noEmit --pretty; then
    echo -e "${GREEN}✅ TypeScript validation passed${NC}"
    
    # Optional: Run a quick build check for production readiness
    if [ "$1" = "--build-check" ]; then
        echo "Running production build check..."
        if npm run build >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Production build successful${NC}"
        else
            echo -e "${YELLOW}⚠️  Production build failed - run 'npm run build' to see details${NC}"
            exit 1
        fi
    fi
else
    echo -e "${RED}❌ TypeScript validation failed${NC}"
    exit 1
fi