/**
 * Run All Performance Tests
 * Orchestrates execution of all performance test modules
 */

const DatabasePerformanceTest = require('./database-performance');
const SyncPerformanceTest = require('./sync-performance');
const ClientPerformanceTest = require('./client-performance');
const StoragePerformanceTest = require('./storage-performance');
const LoadTesting = require('./load-testing');
const PerformanceReportGenerator = require('./generate-report');

class PerformanceTestRunner {
  constructor() {
    this.testResults = {
      database: null,
      sync: null,
      client: null,
      storage: null,
      load: null
    };
    this.startTime = Date.now();
  }

  async runTest(testName, TestClass) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Running ${testName} Performance Tests`);
    console.log('='.repeat(60));
    
    try {
      const test = new TestClass();
      await test.run();
      this.testResults[testName.toLowerCase()] = 'PASSED';
      console.log(`✅ ${testName} tests completed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ ${testName} tests failed:`, error.message);
      this.testResults[testName.toLowerCase()] = 'FAILED';
      return false;
    }
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...\n');
    
    const checks = [
      {
        name: 'Node.js version',
        check: () => process.version >= 'v16.0.0',
        message: 'Node.js v16 or higher required'
      },
      {
        name: 'Environment variables',
        check: () => {
          return process.env.SUPABASE_URL || 
                 (process.argv.includes('--local') && true);
        },
        message: 'SUPABASE_URL environment variable or --local flag required'
      },
      {
        name: 'Dependencies installed',
        check: () => {
          try {
            require('@supabase/supabase-js');
            require('puppeteer');
            return true;
          } catch (e) {
            return false;
          }
        },
        message: 'Run: npm install in tests/performance directory'
      }
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
      try {
        const passed = check.check();
        if (passed) {
          console.log(`   ✅ ${check.name}`);
        } else {
          console.log(`   ❌ ${check.name}: ${check.message}`);
          allPassed = false;
        }
      } catch (error) {
        console.log(`   ❌ ${check.name}: ${error.message}`);
        allPassed = false;
      }
    }
    
    if (!allPassed) {
      console.log('\n❌ Prerequisites not met. Please install dependencies and try again.');
      process.exit(1);
    }
    
    console.log('\n✅ All prerequisites met.\n');
  }

  printSummary() {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const passedTests = Object.values(this.testResults).filter(r => r === 'PASSED').length;
    const totalTests = Object.keys(this.testResults).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\nTotal Time: ${totalTime} seconds`);
    console.log(`Tests Passed: ${passedTests}/${totalTests}`);
    
    console.log('\nTest Results:');
    Object.entries(this.testResults).forEach(([test, result]) => {
      const icon = result === 'PASSED' ? '✅' : '❌';
      const testName = test.charAt(0).toUpperCase() + test.slice(1);
      console.log(`   ${icon} ${testName}: ${result}`);
    });
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All performance tests completed successfully!');
      console.log('\n📄 Generating comprehensive report...');
    } else {
      console.log('\n⚠️  Some tests failed. Report will include available results.');
    }
  }

  async run() {
    console.log('🚀 HaLomeid Performance Testing Suite');
    console.log('=======================================');
    console.log('Validating migration benefits from learning_path to position-based model\n');
    
    try {
      // Check prerequisites
      await this.checkPrerequisites();
      
      // Run all tests
      const testRunner = async (testName, TestClass, enabled = true) => {
        if (!enabled) {
          console.log(`⏭️  Skipping ${testName} tests`);
          return;
        }
        return await this.runTest(testName, TestClass);
      };
      
      // Run each test
      await testRunner('Database', DatabasePerformanceTest);
      await testRunner('Sync', SyncPerformanceTest);
      await testRunner('Client', ClientPerformanceTest);
      await testRunner('Storage', StoragePerformanceTest);
      await testRunner('Load', LoadTesting);
      
      // Print summary
      this.printSummary();
      
      // Generate report
      try {
        const reportGenerator = new PerformanceReportGenerator();
        const reportResult = await reportGenerator.generateReport();
        
        console.log('\n📊 Final Report:');
        console.log(`   Migration Score: ${reportResult.summary.overallScore}/100`);
        console.log(`   Key Achievements: ${reportResult.summary.keyAchievements.length}`);
        console.log(`   Recommendations: ${reportResult.summary.recommendations.length}`);
        
        if (reportGenerator.combinedResults.recommendations.filter(r => r.priority === 'High').length === 0) {
          console.log('   🎯 Migration validated successfully - no high-priority issues');
        }
        
      } catch (reportError) {
        console.error('\n❌ Report generation failed:', reportError.message);
        console.log('Raw test results are still available in the results/ directory.');
      }
      
      console.log('\n🎯 Performance testing complete!');
      
    } catch (error) {
      console.error('\n❌ Performance testing failed:', error);
      process.exit(1);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const runSpecificTest = args.find(arg => arg.startsWith('--test='));

if (runSpecificTest) {
  const testType = runSpecificTest.split('=')[1].toLowerCase();
  const tests = {
    database: DatabasePerformanceTest,
    sync: SyncPerformanceTest,
    client: ClientPerformanceTest,
    storage: StoragePerformanceTest,
    load: LoadTesting
  };
  
  if (tests[testType]) {
    console.log(`Running ${testType} performance test only...\n`);
    const test = new tests[testType]();
    test.run().catch(console.error);
  } else {
    console.error(`Unknown test type: ${testType}`);
    console.log(`Available tests: ${Object.keys(tests).join(', ')}`);
    process.exit(1);
  }
} else {
  // Run all tests
  const runner = new PerformanceTestRunner();
  runner.run().catch(console.error);
}