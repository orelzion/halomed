# Position-Based Learning Model E2E Tests

## Overview

This test suite validates that the position-based model maintains all critical capabilities after migration from the node-based to position-based tracking system. These tests ensure no regressions in user experience and data integrity.

## Test Structure

```
tests/maestro/flows/web/
├── position_based_learning.yaml      # Main test runner
└── subflows/
    ├── test_30_item_lookback.yaml      # Test 1: 30-item lookback functionality
    ├── test_infinite_pagination.yaml   # Test 2: Infinite scroll pagination
    ├── test_optional_reviews.yaml       # Test 3: Optional reviews behavior
    ├── test_optional_quizzes.yaml       # Test 4: Optional quizzes behavior
    ├── test_mixed_behavior.yaml         # Test 5: Mixed skipping behavior
    └── test_data_integrity.yaml         # Test 6: Data integrity validation
```

## Critical Capabilities Tested

### 1. 30-Item Lookback Test
**Purpose:** Verify users can scroll back through exactly 30 completed learning items.

**Test Coverage:**
- Validates the lookback functionality shows correct number of completed items
- Ensures pagination triggers after 30 items
- Tests content loading and display for historical items
- Verifies no data loss during scroll operations

**Expected Results:**
- Users can scroll through 30 completed items seamlessly
- Pagination indicators appear correctly
- Progress bar maintains accurate counts
- No performance issues or data duplication

### 2. Infinite Pagination Test
**Purpose:** Test seamless loading of learning path content through multiple pages.

**Test Coverage:**
- Validates infinite scroll functionality
- Tests smooth page transitions
- Ensures no data duplication or missing items
- Verifies loading states and error handling

**Expected Results:**
- Content loads smoothly without jarring transitions
- No duplicate items appear during pagination
- Loading indicators work correctly
- End-of-path handling works properly

### 3. Optional Reviews Test
**Purpose:** Verify reviews are truly optional and don't block progress.

**Test Coverage:**
- Tests skipping review sessions
- Verifies next learning node accessibility
- Ensures progress isn't blocked by incomplete reviews
- Validates navigation back to learning path

**Expected Results:**
- Users can skip reviews without issues
- Next learning items remain accessible
- Progress tracking continues normally
- No blocking behavior from optional content

### 4. Optional Quizzes Test
**Purpose:** Verify weekly quizzes are truly optional and don't block progress.

**Test Coverage:**
- Tests skipping quiz sessions
- Verifies continued access to learning content
- Ensures progress isn't blocked by incomplete quizzes
- Validates proper navigation flow

**Expected Results:**
- Users can skip quizzes without issues
- Learning path progression remains unaffected
- Completion tracking works correctly
- No forced interaction with optional quizzes

### 5. Mixed Behavior Test
**Purpose:** Test scenarios where users skip both reviews and quizzes for multiple weeks.

**Test Coverage:**
- Tests skipping multiple types of optional content
- Verifies learning continues normally
- Ensures completion tracking remains accurate
- Validates analytics accuracy

**Expected Results:**
- Learning progression continues smoothly
- Completion tracking works correctly
- Analytics remain accurate despite skipped content
- No negative impact on user experience

### 6. Data Integrity Test
**Purpose:** Verify position-based calculations and data tracking accuracy.

**Test Coverage:**
- Tests `current_content_index` updates
- Verifies completion date tracking
- Validates position calculations
- Ensures data consistency across operations

**Expected Results:**
- Position calculations remain accurate
- Completion dates are tracked correctly
- Progress counters update properly
- No data corruption or inconsistencies

## Running the Tests

### Prerequisites

1. **Development Environment:**
    ```bash
    # Start the web application
    cd web && npm run dev
    
    # Start Supabase (if using local)
    npx supabase start
    ```

2. **Maestro Installation:**
   ```bash
   # Install Maestro (if not already installed)
   curl -Ls "https://get.maestro.mobile.dev" | bash
   
   # Or via Homebrew
   brew install maestro
   ```

### Running Individual Tests

```bash
# Run the complete test suite
maestro test tests/maestro/flows/web/position_based_learning.yaml

# Run individual test scenarios
maestro test tests/maestro/flows/web/subflows/test_30_item_lookback.yaml
maestro test tests/maestro/flows/web/subflows/test_infinite_pagination.yaml
maestro test tests/maestro/flows/web/subflows/test_optional_reviews.yaml
maestro test tests/maestro/flows/web/subflows/test_optional_quizzes.yaml
maestro test tests/maestro/flows/web/subflows/test_mixed_behavior.yaml
maestro test tests/maestro/flows/web/subflows/test_data_integrity.yaml
```

### Running with Different Platforms

```bash
# Web (default)
maestro test tests/maestro/flows/web/position_based_learning.yaml --platform web

# Android (when available)
maestro test tests/maestro/flows/android/position_based_learning.yaml --platform android

# iOS (when available)
maestro test tests/maestro/flows/ios/position_based_learning.yaml --platform ios
```

## Test Data Requirements

### Authentication
- Tests use anonymous authentication by default
- No special user setup required for basic functionality tests
- For comprehensive testing, consider setting up test users with specific data

### Content Requirements
- Sefaria API should be accessible for content loading
- AI content generation should be working for explanations
- Database should contain some learning path data for pagination tests

### Optional Content Setup
- For comprehensive review/quiz testing, ensure:
  - Review sessions exist in the learning path
  - Weekly quizzes are available for testing
  - Various completion states are represented

## Troubleshooting

### Common Issues

1. **Test Fails to Find Elements:**
   - Ensure the app is fully loaded before tests start
   - Check that element IDs match the actual DOM structure
   - Verify text content matches expected Hebrew strings

2. **Loading Timeout Issues:**
   - Increase wait times for slower connections
   - Check that Supabase and external APIs are accessible
   - Verify content generation is working

3. **Navigation Issues:**
   - Ensure app routes are properly configured
   - Check that navigation elements have correct test IDs
   - Verify back/forward navigation works as expected

4. **Data Consistency Issues:**
   - Ensure database migrations are applied
   - Check that position-based calculations are working
   - Verify RxDB sync is functioning properly

### Debug Mode

Run tests with verbose output for debugging:

```bash
maestro test tests/maestro/flows/web/position_based_learning.yaml --verbose
```

### Using Maestro Studio

For visual debugging and test creation:

```bash
maestro studio
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Position-Based Learning E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd web && npm ci
          curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: Start application
        run: |
          cd web && npm run build &
          npm run start &
          sleep 30

      - name: Run E2E Tests
        run: |
          maestro test tests/maestro/flows/web/position_based_learning.yaml
```

## Expected Outcomes

### Success Criteria

All tests should pass with the following expectations:

1. **No Regressions:** All pre-migration functionality continues to work
2. **Performance:** No degradation in loading times or responsiveness
3. **Data Accuracy:** Position-based calculations are correct
4. **User Experience:** Smooth, uninterrupted learning flow
5. **Optional Content:** Reviews and quizzes remain truly optional

### Migration Validation

The test suite validates that:

- Position-based tracking works identically to node-based tracking
- User progress is preserved during migration
- No data loss or corruption occurs
- All user journeys continue to function normally

## Maintenance

### Updating Tests

When the UI changes:

1. Update element selectors and test IDs
2. Adjust text assertions for Hebrew content changes
3. Modify wait times if loading behavior changes
4. Add new tests for additional features

### Adding New Tests

1. Create new test files in the `subflows/` directory
2. Follow the existing naming convention: `test_[feature].yaml`
3. Include proper setup, execution, and verification steps
4. Add the new test to the main `position_based_learning.yaml` runner

### Test Coverage

Regularly review and update tests to ensure:

- All critical user paths are covered
- Edge cases are tested
- Performance regressions are caught
- New features have corresponding tests

## Conclusion

This comprehensive test suite ensures that the position-based learning model migration maintains all critical capabilities while providing the same excellent user experience. Regular execution of these tests will help catch any regressions and ensure continued system reliability.