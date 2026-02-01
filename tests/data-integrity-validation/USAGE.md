# Data Integrity Validation System - Usage Guide

## Overview

The Data Integrity Validation System ensures 100% data preservation during the migration from learning_path table to the position-based user_preferences model.

## Quick Start

### 1. Installation

```bash
cd tests/data-integrity-validation
npm install
```

### 2. Configuration

Copy the example environment file and configure your database connection:

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Run Validation

```bash
# Run complete validation suite
npm run validate

# Quick validation (sample users only)
npm run validate:quick

# Run specific validation areas
npm run validate:streak
npm run validate:progress
npm run validate:completions
npm run validate:preferences
npm run validate:rollback
```

## Validation Areas

### 1. Streak Validation (`validate:streak`)

**Purpose**: Ensures streak preservation during migration.

**What it checks**:
- Pre-migration streak calculation vs post-migration `streak_count`
- Consecutive completion logic
- Streak breaks and resets

**Success Criteria**: 0 discrepancy in streak values

### 2. Progress Validation (`validate:progress`)

**Purpose**: Validates learning progress accuracy.

**What it checks**:
- `current_content_index` matches completed learning nodes count
- Progress calculation accuracy across all paces
- Position-based unlock logic
- Pace migration (one_mishna → seder_per_year)

**Success Criteria**: Exact match between expected and actual progress

### 3. Completion Validation (`validate:completions`)

**Purpose**: Ensures quiz and review completion data preservation.

**What it checks**:
- `quiz_completion_dates` array contains all historical quiz completions
- `review_completion_dates` array contains all historical reviews
- Date formatting, ordering, and uniqueness
- Completion frequency patterns

**Success Criteria**: All completion dates preserved exactly

### 4. Preferences Validation (`validate:preferences`)

**Purpose**: Validates user settings preservation.

**What it checks**:
- All settings maintained during migration
- Data types and formats
- Business logic consistency
- Timestamp ordering

**Success Criteria**: All preferences preserved exactly

### 5. Rollback Validation (`validate:rollback`)

**Purpose**: Tests rollback mechanism functionality.

**What it checks**:
- Can restore learning_path table if needed
- Recovers original data without loss
- Validates rollback accuracy

**Success Criteria**: Rollback restores data 100%

## Test Scenarios

### User Types

1. **New Users** (`validate:new-users`)
   - No historical data
   - Default settings validation
   - Date consistency checks

2. **Regular Users** (`validate:regular-users`)
   - Some progress (1-100 content index)
   - Activity consistency
   - Pace vs progress alignment

3. **Power Users** (`validate:power-users`)
   - Extensive progress (>100 content index)
   - High completion volumes
   - Performance under load

4. **Edge Cases** (`validate:edge-cases`)
   - Quiz-only users
   - Review-only users
   - High streak, low progress
   - Long gaps in activity
   - Very old users

### Running Scenarios

```bash
# Run all test scenarios
npm run scenarios

# Run specific scenarios
npm run validate:new-users
npm run validate:regular-users
npm run validate:power-users
npm run validate:edge-cases
```

## Configuration Options

### Validation Modes

```bash
# Quick mode - Core validations on small sample
npm run validate -- --mode quick

# Full mode - All validations on full sample
npm run validate -- --mode full

# Production mode - Safe for production deployment
npm run validate -- --mode production
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_KEY` | Supabase service key | Required |
| `VALIDATION_MODE` | quick/full/production | full |
| `SAMPLE_SIZE` | Number of users to validate | 100 |
| `ENABLE_ROLLBACK_TESTING` | Run rollback tests | false |
| `GENERATE_HTML_REPORT` | Generate HTML report | true |
| `INCLUDE_CHARTS` | Include charts in report | true |

## Understanding Reports

### Console Output

```
🔍 Data Integrity Validation System
Mode: FULL
Started: 2026-01-31T10:00:00.000Z

✅ Database connection successful

👥 Selecting users for validation...
  • Selecting 50 new users...
  • Selecting 100 regular users...
  • Selecting 30 power users...
✅ Selected 180 users for validation

🧪 Running validation suite...

📊 Validating streak...
  └─ Analyzing streak preservation...
  └─ Validated 180 users
  └─ Status: ✅ PASS
  └─ Total Users: 180
  └─ Matching Streaks: 180
  └─ Match Rate: 100.00%

📋 Generating validation report...
✅ Report generated

📊 FINAL VALIDATION SUMMARY
════════════════════════════════════════
Mode: FULL
Total Users: 180
Successful Validations: 5
Failed Validations: 0
🎯 Overall Score: 100/100

🎉 PERFECT VALIDATION - 100% DATA INTEGRITY CONFIRMED
```

### HTML Report

The HTML report includes:

1. **Summary Cards**: Overall score, total users, validation results
2. **Validation Areas**: Detailed results for each validation area
3. **Charts**: Visual representation of validation results
4. **User Details**: Sample user-level validation data
5. **Errors & Warnings**: Detailed issue descriptions

### JSON Report

Machine-readable format with:
- Complete validation results
- Detailed discrepancy information
- Performance metrics
- User-level data (if enabled)

## Success Criteria

### Overall Score

- **100/100**: Perfect validation - 0 discrepancies
- **95-99**: Excellent - Minor discrepancies, review recommended
- **80-94**: Good - Some discrepancies, investigate before proceeding
- **<80**: Critical - Do not proceed with migration

### Required for Production

1. **0 discrepancies** across all validation areas
2. **100% data preservation** confirmed
3. **All user types** pass validation
4. **Rollback capability** verified
5. **Performance acceptable** (<1s per query)

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
❌ Database connection failed: Invalid API key
```

**Solution**: Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file.

#### Learning Path Table Not Found

```bash
⚠️  learning_path table not found - running post-migration validation
```

**Solution**: This is expected after migration. Validation adapts automatically.

#### Memory Issues with Large Datasets

```bash
⚠️  Memory usage exceeded 500MB
```

**Solution**: Reduce SAMPLE_SIZE or use quick mode.

#### Slow Query Performance

```bash
⚠️  Query took 2.5s (>1s threshold)
```

**Solution**: Check database indexes and query optimization.

### Debug Mode

Enable detailed logging:

```bash
DEBUG=true npm run validate
```

This provides:
- Detailed query information
- Intermediate validation results
- Memory usage tracking
- Performance metrics

### Validation Failed

If validation fails:

1. **Review discrepancies**: Check the specific validation area that failed
2. **Examine user details**: Look at individual user failures
3. **Check data integrity**: Verify source data quality
4. **Run targeted validation**: Test specific areas individually

## Performance Considerations

### Large Datasets

For datasets with >10,000 users:

```bash
npm run validate -- --mode production --sample-size 500
```

### Memory Optimization

- Process users in batches
- Use sampling for initial validation
- Limit user details in reports

### Query Optimization

- Ensure proper database indexes
- Use query timeouts
- Monitor slow queries

## Best Practices

### Before Migration

1. **Run full validation** on current state
2. **Create database backup**
3. **Test on staging environment**
4. **Document baseline metrics**

### During Migration

1. **Monitor performance** in real-time
2. **Run quick validation** at each step
3. **Stop on critical errors**
4. **Maintain rollback capability**

### After Migration

1. **Run complete validation suite**
2. **Generate full report**
3. **Review all discrepancies**
4. **Archive validation results**

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Data Integrity Validation

on:
  pull_request:
    branches: [main]

jobs:
  validate-migration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: tests/data-integrity-validation
        run: npm install
        
      - name: Run validation
        working-directory: tests/data-integrity-validation
        run: npm run validate:quick
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

## Support

For questions or issues:

1. Check this guide for common problems
2. Review validation logs for detailed error information
3. Examine generated reports for discrepancy patterns
4. Contact the development team for complex issues

## Version History

- **v1.0.0**: Initial release with comprehensive validation suite
- Supports learning_path to position-based migration validation
- Includes rollback testing and performance monitoring