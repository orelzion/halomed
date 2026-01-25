#!/bin/bash
# Deploy all Supabase Edge Functions
# Usage: ./deploy-functions.sh [function-name]
# If function-name is provided, only that function is deployed
# Otherwise, all functions are deployed

set -e

PROJECT_REF="sjpzatrwnwtcvjnyvdoy"

# Functions called from server-side API routes (use service role key, no JWT verification)
NO_VERIFY_JWT_FUNCTIONS=(
  "generate-path"
  "update-preferences"
  "generate-quiz"
  "ensure-content"
  "generate-content"
  "schedule-review"
  "query-schedule"
  "generate-schedule"
)

# Functions called directly from client (verify user JWT)
VERIFY_JWT_FUNCTIONS=(
  "delete-account"
  "export-user-data"
  "set-consent"
  "get-consent"
)

deploy_function() {
  local func=$1
  local no_verify=$2
  
  echo "----------------------------------------"
  echo "Deploying: $func"
  
  if [ "$no_verify" = "true" ]; then
    echo "  (--no-verify-jwt)"
    supabase functions deploy "$func" --no-verify-jwt --project-ref "$PROJECT_REF"
  else
    echo "  (with JWT verification)"
    supabase functions deploy "$func" --project-ref "$PROJECT_REF"
  fi
  
  echo "Done: $func"
}

# Check if specific function was requested
if [ -n "$1" ]; then
  FUNCTION_NAME=$1
  
  # Check if it's a no-verify function
  for func in "${NO_VERIFY_JWT_FUNCTIONS[@]}"; do
    if [ "$func" = "$FUNCTION_NAME" ]; then
      deploy_function "$FUNCTION_NAME" "true"
      exit 0
    fi
  done
  
  # Check if it's a verify function
  for func in "${VERIFY_JWT_FUNCTIONS[@]}"; do
    if [ "$func" = "$FUNCTION_NAME" ]; then
      deploy_function "$FUNCTION_NAME" "false"
      exit 0
    fi
  done
  
  echo "Unknown function: $FUNCTION_NAME"
  echo "Available functions:"
  echo "  No-verify-jwt: ${NO_VERIFY_JWT_FUNCTIONS[*]}"
  echo "  Verify-jwt: ${VERIFY_JWT_FUNCTIONS[*]}"
  exit 1
fi

# Deploy all functions
echo "========================================"
echo "Deploying ALL Supabase Edge Functions"
echo "Project: $PROJECT_REF"
echo "========================================"

echo ""
echo "=== Functions WITHOUT JWT verification ==="
for func in "${NO_VERIFY_JWT_FUNCTIONS[@]}"; do
  deploy_function "$func" "true"
done

echo ""
echo "=== Functions WITH JWT verification ==="
for func in "${VERIFY_JWT_FUNCTIONS[@]}"; do
  deploy_function "$func" "false"
done

echo ""
echo "========================================"
echo "All functions deployed successfully!"
echo "========================================"
