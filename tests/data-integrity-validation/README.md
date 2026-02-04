# Data Integrity Validation System

## Overview

This comprehensive validation system ensures the migration from learning_path table to position-based model preserves all user data with 100% accuracy.

## Purpose

- Validate migration from learning_path table to position-based user_preferences model
- Ensure 100% data preservation across all user types
- Provide automated rollback verification
- Generate detailed validation reports

## Migration Context

The migration transforms user data storage from:

**Before (learning_path table):**
- Individual records for each learning node, quiz, review
- 18,000+ records per active user
- Complex join queries for progress calculation

**After (position-based user_preferences):**
- Single position field (`current_content_index`)
- Arrays for quiz/review completion dates
- Computed progress and streaks
- 1 record per user regardless of activity

## Components

### 1. Core Validation Script
`run-validation.js` - Main validation orchestrator

### 2. Validation Modules
- `streak-validation.js` - Streak preservation validation
- `progress-validation.js` - Progress data accuracy validation  
- `completion-validation.js` - Quiz/review completion validation
- `preferences-validation.js` - User preferences validation
- `rollback-validation.js` - Rollback mechanism verification

### 3. Test Scenarios
- `test-scenarios/` - Different user type validations
  - `new-users.js` - Users with no historical data
  - `regular-users.js` - Users with some progress
  - `power-users.js` - Users with extensive completion data
  - `edge-cases.js` - Unusual data patterns

### 4. Reporting System
- `report-generator.js` - Comprehensive validation reporting
- `validation-report.html` - Visual report template

## Validation Areas

### 1. Streak Preservation
- Compare pre-migration streak calculation with post-migration `streak_count`
- Verify consecutive completion logic maintained
- Validate streak breaks and resets

### 2. Progress Data
- Verify `current_content_index` matches completed learning nodes count
- Validate progress calculation accuracy across all paces
- Check position-based unlock logic

### 3. Quiz Completions
- Ensure `quiz_completion_dates` array contains all historical quiz completions
- Validate date formatting and ordering
- Verify quiz frequency patterns preserved

### 4. Review Completions
- Ensure `review_completion_dates` array contains all historical reviews
- Validate review intensity patterns preserved
- Check spaced repetition logic

### 5. User Preferences
- Validate all settings maintained during migration
- Check pace migrations (one_mishna → seder_per_year)
- Verify start date and holiday preservation

## Usage

```bash
# Install dependencies
npm install

# Run complete validation suite
npm run validate

# Run specific validation areas
npm run validate:streak
npm run validate:progress
npm run validate:completions
npm run validate:preferences
npm run validate:rollback

# Run test scenarios
npm run validate:new-users
npm run validate:regular-users
npm run validate:power-users
npm run validate:edge-cases

# Generate report only
npm run report

# Quick validation (core checks only)
npm run validate:quick
```

## Success Criteria

- **0 discrepancies** across all validation areas
- **100% data preservation** confirmed
- **All user types** pass validation
- **Rollback capability** verified
- **Automated report** generation successful

## Output

Validation generates:

1. **Console Output** - Real-time validation progress
2. **JSON Report** - Detailed machine-readable results
3. **HTML Report** - Visual summary with charts
4. **Rollback Verification** - Confirmation that rollback works

## File Structure

```
data-integrity-validation/
├── package.json
├── README.md
├── run-validation.js                 # Main orchestrator
├── config/
│   ├── database.js                   # Database connection
│   └── validation-config.js         # Validation parameters
├── validators/
│   ├── streak-validation.js
│   ├── progress-validation.js
│   ├── completion-validation.js
│   ├── preferences-validation.js
│   └── rollback-validation.js
├── test-scenarios/
│   ├── new-users.js
│   ├── regular-users.js
│   ├── power-users.js
│   └── edge-cases.js
├── reporting/
│   ├── report-generator.js
│   ├── validation-report.html
│   └── charts.js
└── output/
    ├── validation-report.json
    ├── validation-report.html
    └── rollback-test.log
```

## Configuration

Edit `config/validation-config.js` to customize:

- Database connection parameters
- Validation tolerance thresholds
- User sample sizes
- Report output format
- Logging levels

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure Supabase credentials are correct
2. **Time Zone Issues**: All dates should be in UTC
3. **Large Datasets**: Use sampling for initial validation
4. **Memory Issues**: Process users in batches for large datasets

### Debug Mode

```bash
DEBUG=true npm run validate
```

This enables detailed logging and intermediate result inspection.