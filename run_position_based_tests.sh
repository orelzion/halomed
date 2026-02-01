#!/bin/bash

# Position-Based Learning E2E Test Runner
# This script runs all the E2E tests for the position-based learning model migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Maestro is installed
if ! command -v maestro &> /dev/null; then
    print_error "Maestro is not installed. Please install it first:"
    echo "curl -Ls \"https://get.maestro.mobile.dev\" | bash"
    echo "export PATH=\"\$PATH\":\"\$HOME/.maestro/bin\""
    exit 1
fi

print_status "Maestro found. Starting position-based learning E2E tests..."

# Check if the web app is running
if ! curl -s http://localhost:3000 > /dev/null; then
    print_warning "Web app doesn't seem to be running on http://localhost:3000"
    print_status "Attempting to start the web app..."
    
    # Try to start the web app
    cd web
    npm run dev &
    WEB_APP_PID=$!
    cd ..
    
    # Wait for the app to start
    print_status "Waiting for web app to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null; then
            print_success "Web app is now running!"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    if ! curl -s http://localhost:3000 > /dev/null; then
        print_error "Failed to start web app. Please start it manually with:"
        echo "cd web && npm run dev"
        exit 1
    fi
fi

# Run the test suite
print_status "Running complete position-based learning test suite..."
echo

maestro test tests/maestro/flows/web/position_based_learning.yaml

# Check if tests passed
if [ $? -eq 0 ]; then
    print_success "All position-based learning tests passed! ✅"
    echo
    print_status "Migration validation successful - no regressions detected."
else
    print_error "Some tests failed! ❌"
    echo
    print_status "Please review the test output above for details."
    
    # Kill the web app if we started it
    if [ ! -z "$WEB_APP_PID" ]; then
        kill $WEB_APP_PID 2>/dev/null
        print_status "Stopped the web app."
    fi
    exit 1
fi

# Clean up: kill the web app if we started it
if [ ! -z "$WEB_APP_PID" ]; then
    kill $WEB_APP_PID 2>/dev/null
    print_status "Stopped the web app."
fi

print_success "Position-based learning migration validation complete! 🎉"