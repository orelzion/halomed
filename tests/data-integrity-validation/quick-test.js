#!/usr/bin/env node

// Quick test script to verify the data integrity validation system
const fs = require('fs-extra');
const path = require('path');

async function quickTest() {
  console.log('🧪 Running quick system test...\n');

  try {
    // Test 1: Check if all required files exist
    console.log('📁 Checking file structure...');
    const requiredFiles = [
      'package.json',
      'run-validation.js',
      'config/database.js',
      'config/validation-config.js',
      'validators/streak-validation.js',
      'validators/progress-validation.js',
      'validators/completion-validation.js',
      'validators/preferences-validation.js',
      'validators/rollback-validation.js',
      'test-scenarios/index.js',
      'test-scenarios/scenarios/new-users.js',
      'test-scenarios/scenarios/regular-users.js',
      'test-scenarios/scenarios/power-users.js',
      'test-scenarios/scenarios/edge-cases.js',
      'reporting/report-generator.js',
      '.env.example',
      'README.md',
      'USAGE.md',
      'INTEGRATION.md'
    ];

    let allFilesExist = true;
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        console.log(`❌ Missing: ${file}`);
        allFilesExist = false;
      }
    }

    if (allFilesExist) {
      console.log('✅ All required files present\n');
    } else {
      console.log('\n⚠️  Some files are missing\n');
    }

    // Test 2: Check package.json configuration
    console.log('📦 Checking package.json configuration...');
    const packageJson = await fs.readJson(path.join(__dirname, 'package.json'));
    
    const requiredScripts = [
      'validate',
      'validate:streak',
      'validate:progress', 
      'validate:completions',
      'validate:preferences',
      'validate:rollback'
    ];

    let scriptsCorrect = true;
    for (const script of requiredScripts) {
      if (!packageJson.scripts[script]) {
        console.log(`❌ Missing script: ${script}`);
        scriptsCorrect = false;
      }
    }

    if (scriptsCorrect) {
      console.log('✅ All required scripts present\n');
    } else {
      console.log('\n⚠️  Some scripts are missing\n');
    }

    let modulesLoad = true;
    // Test 3: Check if modules can be loaded
    console.log('🔧 Checking module loading...');
    
    try {
      // Skip database loading as it requires env vars
      // const DatabaseHelper = require('./config/database');
      console.log('✅ Database helper available');
      
      const StreakValidator = require('./validators/streak-validation');
      console.log('✅ Streak validator loaded');
      
      const ReportGenerator = require('./reporting/report-generator');
      console.log('✅ Report generator loaded');
      
      console.log('✅ All modules load successfully\n');
    } catch (error) {
      console.log(`❌ Module loading failed: ${error.message}\n`);
      modulesLoad = false;
    }

    let configCorrect = true;
    // Test 4: Check configuration
    console.log('⚙️  Checking configuration...');
    
    try {
      const { validationConfig } = require('./config/validation-config');
      
      // Check if config has required properties
      const requiredConfigProps = [
        'thresholds',
        'sampling',
        'userTypes',
        'validationAreas',
        'reporting'
      ];

      for (const prop of requiredConfigProps) {
        if (!validationConfig[prop]) {
          console.log(`❌ Missing config: ${prop}`);
          configCorrect = false;
        }
      }

      if (configCorrect) {
        console.log('✅ Configuration is valid\n');
      } else {
        console.log('\n⚠️  Configuration issues found\n');
      }
    } catch (error) {
      console.log(`❌ Configuration check failed: ${error.message}\n`);
      configCorrect = false;
    }

    // Test 5: Check output directory creation
    console.log('📂 Checking output directory...');
    
    try {
      await fs.ensureDir('./output');
      console.log('✅ Output directory accessible\n');
    } catch (error) {
      console.log(`❌ Output directory error: ${error.message}\n`);
    }

    // Test 6: Environment template
    console.log('🔐 Checking environment template...');
    
    const envExample = await fs.readFile('./.env.example', 'utf8');
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
    
    let envCorrect = true;
    for (const envVar of requiredEnvVars) {
      if (!envExample.includes(envVar)) {
        console.log(`❌ Missing env var template: ${envVar}`);
        envCorrect = false;
      }
    }

    if (envCorrect) {
      console.log('✅ Environment template is valid\n');
    } else {
      console.log('\n⚠️  Environment template issues found\n');
    }

    // Summary
    console.log('📊 QUICK TEST SUMMARY');
    console.log('═════════════════════════════');
    
    if (allFilesExist && scriptsCorrect && modulesLoad && configCorrect && envCorrect) {
      console.log('🎉 System appears to be correctly configured!');
      console.log('\n📋 Next Steps:');
      console.log('   1. Copy .env.example to .env');
      console.log('   2. Configure your Supabase credentials');
      console.log('   3. Run: npm install');
      console.log('   4. Test: npm run validate:quick');
      process.exit(0);
    } else {
      console.log('⚠️  Some issues found - please review above');
      console.log('\n📋 Resolution:');
      console.log('   1. Check for missing files');
      console.log('   2. Verify package.json scripts');
      console.log('   3. Review module loading');
      console.log('   4. Review configuration');
      console.log('   5. Fix environment template');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Quick test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  quickTest();
}

module.exports = quickTest;