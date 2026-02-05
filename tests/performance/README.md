# Performance Testing Framework for HaLomeid Migration

## Overview

This framework validates performance improvements from migrating from `learning_path` table (221K+ records) to position-based model in `user_preferences`.

## Key Areas Tested

1. **Database Query Performance** - Analytics queries, Edge Functions
2. **Sync Performance** - Data transfer, replication speed  
3. **Client-Side Performance** - Rendering, memory usage
4. **Storage Performance** - IndexedDB size, storage usage

## Testing Scripts

- `database-performance.js` - Database query benchmarks
- `sync-performance.js` - Sync bandwidth and timing
- `client-performance.js` - Browser performance metrics
- `storage-performance.js` - IndexedDB usage analysis
- `load-testing.js` - Multi-user load scenarios

## Running Tests

```bash
# Start local environment
cd supabase && npx supabase start
cd ../web && npm run dev

# Run performance tests
node tests/performance/database-performance.js
node tests/performance/sync-performance.js
node tests/performance/client-performance.js
node tests/performance/storage-performance.js
node tests/performance/load-testing.js

# Generate report
node tests/performance/generate-report.js
```

## Expected Improvements

- **Database**: 99.9% reduction in analytics queries (221K → ~28 rows)
- **Sync**: 95% reduction in data transfer
- **Client**: 50% faster initial load
- **Storage**: 90% reduction in IndexedDB usage

## Migration Validation

Tests validate that position-based model provides:
- ✅ Same functionality as learning_path table
- ✅ Better performance across all metrics
- ✅ Scalability for larger datasets
- ✅ Consistent user experience