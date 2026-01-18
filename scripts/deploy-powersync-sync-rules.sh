#!/bin/bash
# Deploy PowerSync sync rules to the instance
# Usage: ./scripts/deploy-powersync-sync-rules.sh

set -e

echo "🚀 Deploying PowerSync sync rules..."
echo ""

# Validate sync rules first
echo "📋 Validating sync rules..."
npx powersync instance sync-rules validate -f powersync/powersync.yaml

if [ $? -ne 0 ]; then
  echo "❌ Sync rules validation failed. Please fix errors before deploying."
  exit 1
fi

echo ""
echo "✅ Sync rules validated successfully"
echo ""

# Deploy sync rules
echo "📤 Deploying sync rules to PowerSync instance..."
npx powersync instance sync-rules deploy -f powersync/powersync.yaml

echo ""
echo "✅ Sync rules deployed successfully!"
echo ""
echo "Note: It may take a few moments for PowerSync to sync the new data."
