# Performance Test Execution Guide

## Quick Start

```bash
# Quick database validation (no browser deps needed)
cd tests/performance
npm run test:quick

# Install all dependencies for full suite
npm install

# Run all performance tests
npm run test:performance

# Run individual tests
npm run test:database
npm run test:sync
npm run test:client
npm run test:storage
npm run test:load

# Generate report only
npm run report
```

## Prerequisites

1. **Local Development Environment**
   ```bash
   # Start Supabase local development
   cd supabase
   supabase start
   
   # Start web development server
   cd web
   npm run dev
   ```

2. **Environment Variables**
   ```bash
   # For local testing
   export SUPABASE_URL="http://localhost:54321"
   export SUPABASE_ANON_KEY="your-anon-key"
   ```

3. **Browser Dependencies**
   - Chrome/Chromium for Puppeteer tests
   - Sufficient memory for concurrent browser testing

## Test Categories

### 📊 Database Performance Tests
- **Analytics queries** (position-based vs learning_path)
- **Edge Function performance** (generate-path, schedule-review)
- **Scalability** with different user counts
- **Query optimization** validation

### 🔄 Sync Performance Tests
- **Bandwidth usage** measurement
- **Initial sync time** analysis
- **Incremental sync** efficiency
- **Data transfer** reduction validation

### 🌐 Client Performance Tests
- **Page load speed** measurement
- **Memory usage** analysis
- **Rendering performance** testing
- **Interaction response** times

### 💾 Storage Performance Tests
- **IndexedDB usage** analysis
- **localStorage efficiency** measurement
- **Cache usage** optimization
- **Storage reduction** validation

### 🚀 Load Testing
- **Concurrent user** simulation
- **Database load** testing
- **Client load** performance
- **Scalability** metrics

## Expected Results

Based on migration documentation, expect to see:

- **Database**: 99.9% reduction in queries (221K → ~28 rows)
- **Sync**: 95% reduction in data transfer
- **Client**: 50% faster load times
- **Storage**: 90% reduction in IndexedDB usage

## Output Files

All results are saved to `tests/performance/results/`:

- `database-results.json` - Database performance metrics
- `sync-results.json` - Sync performance data
- `client-results.json` - Client-side performance
- `storage-results.json` - Storage usage analysis
- `load-results.json` - Load testing results
- `combined-results.json` - All results combined
- `performance-report.html` - Visual report

## Customization

### Test Configuration
Edit individual test files to modify:
- Test parameters (user counts, iterations)
- Performance thresholds
- Test scenarios
- Expected values

### Environment Settings
Modify `run-all-tests.js` to:
- Skip specific tests
- Adjust test order
- Change prerequisites
- Modify reporting

## Troubleshooting

### Common Issues

**"Puppeteer fails to launch"**
```bash
# Install Chromium dependencies
sudo apt-get install -y libgbm-dev
# Or use headless mode
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

**"Supabase connection fails"**
```bash
# Check Supabase status
supabase status
# Verify environment variables
echo $SUPABASE_URL
```

**"Memory issues during load testing"**
```bash
# Reduce concurrent users
# Edit load-testing.js and change concurrentUsers parameter
```

### Debug Mode

Run individual tests with detailed logging:
```bash
node database-performance.js
node sync-performance.js
```

## Integration with CI/CD

Add to GitHub Actions:

```yaml
- name: Run Performance Tests
  run: |
    cd tests/performance
    npm install
    npm run test:performance
    # Upload results as artifacts
    upload: tests/performance/results/
```

## Performance Baselines

### Target Metrics
- Database queries: < 100ms avg response
- Sync operations: < 5 seconds initial
- Page load: < 3 seconds
- Memory usage: < 50MB
- Storage: < 10MB total

### Alert Thresholds
- Query response > 500ms
- Sync time > 10 seconds
- Load time > 5 seconds
- Memory usage > 100MB
- Storage usage > 50MB

## Continuous Monitoring

Set up automated performance monitoring:

1. **Daily performance runs**
2. **Performance regression detection**
3. **Trend analysis over time**
4. **Automated alerts for degradation**

## Migration Validation

The performance tests validate:

✅ **Functionality Maintained**
- Same features available
- Consistent behavior
- No data loss

✅ **Performance Improved**
- Faster queries
- Reduced bandwidth
- Lower storage usage
- Better user experience

✅ **Scalability Enhanced**
- Handles more users
- Efficient resource usage
- Stable under load

✅ **Migration Success**
- Learning path eliminated
- Position-based model working
- Analytics accurate
- All systems operational