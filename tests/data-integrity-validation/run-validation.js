// Main validation orchestrator
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { DatabaseHelper } = require('./config/database');
const { validationConfig, getModeConfig } = require('./config/validation-config');

// Import validators
const StreakValidator = require('./validators/streak-validation');
const ProgressValidator = require('./validators/progress-validation');
const CompletionValidator = require('./validators/completion-validation');
const PreferencesValidator = require('./validators/preferences-validation');
const RollbackValidator = require('./validators/rollback-validation');

// Import report generator
const ReportGenerator = require('./reporting/report-generator');

class ValidationOrchestrator {
  constructor() {
    this.db = new DatabaseHelper();
    this.reportData = {
      summary: {
        startTime: new Date().toISOString(),
        endTime: null,
        mode: 'full',
        totalUsers: 0,
        successfulValidations: 0,
        failedValidations: 0,
        discrepancies: [],
        overallScore: null,
      },
      details: {
        users: [],
        validationAreas: {},
        errors: [],
        warnings: [],
      },
      performance: {
        queryTimes: [],
        memoryUsage: [],
        totalDuration: null,
      }
    };
    
    // Parse command line arguments
    this.args = this.parseArgs();
    this.mode = this.args.mode || 'full';
    this.config = getModeConfig(this.mode);
  }

  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('--')) {
          parsed[key] = nextArg;
          i++; // Skip next argument
        } else {
          parsed[key] = true;
        }
      }
    }
    
    return parsed;
  }

  async initialize() {
    console.log(chalk.blue('🔍 Data Integrity Validation System'));
    console.log(chalk.gray(`Mode: ${this.mode.toUpperCase()}`));
    console.log(chalk.gray(`Started: ${new Date().toISOString()}`));
    console.log('');

    // Ensure output directory exists
    await fs.ensureDir('./output');

    // Test database connection
    const connected = await this.db.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Check if required tables exist
    const userPrefsExists = await this.db.tableExists('user_preferences');
    const learningPathExists = await this.db.tableExists('learning_path');

    if (!userPrefsExists) {
      throw new Error('user_preferences table not found');
    }

    if (!learningPathExists) {
      console.log(chalk.yellow('⚠️  learning_path table not found - running post-migration validation'));
    }

    console.log(chalk.green('✅ Initialization complete\n'));
  }

  async getValidationUsers() {
    console.log(chalk.blue('👥 Selecting users for validation...'));

    const users = [];
    const userTypes = this.config.userTypes;

    for (const userType of userTypes) {
      const sampleSize = this.config.sampleSize === 'all' 
        ? validationConfig.sampling[`${userType}UsersSample`]
        : this.config.sampleSize;

      if (sampleSize > 0) {
        console.log(chalk.gray(`  • Selecting ${sampleSize} ${userType} users...`));
        const userSample = await this.db.getUserSample(sampleSize, userType);
        users.push(...userSample.map(user => ({ ...user, userType })));
      }
    }

    // Remove duplicates and limit total users
    const uniqueUsers = users.filter((user, index, self) => 
      index === self.findIndex(u => u.user_id === user.user_id)
    ).slice(0, validationConfig.sampling.maxTotalUsers);

    console.log(chalk.green(`✅ Selected ${uniqueUsers.length} users for validation\n`));
    return uniqueUsers;
  }

  async runValidation(users) {
    console.log(chalk.blue('🧪 Running validation suite...'));

    const validators = this.getValidators();
    const validationAreas = this.config.validationAreas || validators.keys();

    for (const area of validationAreas) {
      console.log(chalk.yellow(`\n📊 Validating ${area}...`));
      
      try {
        const startTime = Date.now();
        const validator = validators.get(area);
        
        if (!validator) {
          console.log(chalk.yellow(`⚠️  Validator not found for ${area}`));
          continue;
        }

        const results = await validator.validate(users);
        const duration = Date.now() - startTime;

        // Store results
        this.reportData.details.validationAreas[area] = results;
        this.reportData.performance.queryTimes.push({
          area,
          duration,
          userCount: users.length
        });

        // Display summary
        this.displayValidationSummary(area, results);

        // Update counters
        if (results.success) {
          this.reportData.summary.successfulValidations++;
        } else {
          this.reportData.summary.failedValidations++;
          
          // Add discrepancies to summary
          if (results.discrepancies) {
            this.reportData.summary.discrepancies.push(...results.discrepancies);
          }
        }

        // Log errors and warnings
        if (results.errors) {
          this.reportData.details.errors.push(...results.errors);
        }
        if (results.warnings) {
          this.reportData.details.warnings.push(...results.warnings);
        }

      } catch (error) {
        console.error(chalk.red(`❌ Validation failed for ${area}:`), error.message);
        this.reportData.summary.failedValidations++;
        this.reportData.details.errors.push({
          area,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    console.log(chalk.green('\n✅ Validation suite completed\n'));
  }

  getValidators() {
    const validators = new Map();

    // Core validators
    validators.set('streak', new StreakValidator(this.db));
    validators.set('progress', new ProgressValidator(this.db));
    validators.set('completions', new CompletionValidator(this.db));
    validators.set('preferences', new PreferencesValidator(this.db));

    // Extended validators (if included)
    if (this.config.validationAreas.includes('rollback') || this.config.validationAreas === 'all') {
      validators.set('rollback', new RollbackValidator(this.db));
    }

    return validators;
  }

  displayValidationSummary(area, results) {
    console.log(chalk.gray(`  └─ Status: ${results.success ? '✅ PASS' : '❌ FAIL'}`));
    
    if (results.summary) {
      Object.entries(results.summary).forEach(([key, value]) => {
        console.log(chalk.gray(`  └─ ${key}: ${value}`));
      });
    }

    if (results.discrepancies && results.discrepancies.length > 0) {
      console.log(chalk.yellow(`  └─ Discrepancies: ${results.discrepancies.length}`));
    }

    if (results.errors && results.errors.length > 0) {
      console.log(chalk.red(`  └─ Errors: ${results.errors.length}`));
    }
  }

  async runRollbackTest() {
    if (this.config.rollbackTesting === false) {
      console.log(chalk.yellow('⚠️  Rollback testing skipped'));
      return;
    }

    console.log(chalk.blue('\n🔄 Running rollback test...'));

    try {
      const rollbackValidator = new RollbackValidator(this.db);
      const results = await rollbackValidator.validate(
        await this.db.getUserSample(
          validationConfig.sampling.rollbackSampleSize,
          'regular'
        )
      );

      this.reportData.details.validationAreas.rollback = results;

      if (results.success) {
        console.log(chalk.green('✅ Rollback test passed'));
      } else {
        console.log(chalk.red('❌ Rollback test failed'));
        this.reportData.summary.failedValidations++;
      }
    } catch (error) {
      console.error(chalk.red('❌ Rollback test error:'), error.message);
      this.reportData.details.errors.push({
        area: 'rollback',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  calculateOverallScore() {
    const totalValidations = this.reportData.summary.successfulValidations + 
                           this.reportData.summary.failedValidations;
    
    if (totalValidations === 0) {
      this.reportData.summary.overallScore = 0;
      return;
    }

    const successRate = this.reportData.summary.successfulValidations / totalValidations;
    
    // Deduct points for discrepancies
    let score = successRate * 100;
    
    // Each discrepancy reduces score by 1 point
    score -= this.reportData.summary.discrepancies.length;
    
    // Each error reduces score by 5 points
    score -= this.reportData.details.errors.length * 5;
    
    // Each warning reduces score by 0.5 points
    score -= this.reportData.details.warnings.length * 0.5;

    this.reportData.summary.overallScore = Math.max(0, Math.round(score));
  }

  async generateReport() {
    console.log(chalk.blue('📋 Generating validation report...'));

    // Finalize summary
    this.reportData.summary.endTime = new Date().toISOString();
    this.reportData.summary.totalUsers = this.reportData.details.users.length;
    this.calculateOverallScore();

    // Generate report
    const reportGenerator = new ReportGenerator();
    await reportGenerator.generate(this.reportData, this.config);

    console.log(chalk.green('✅ Report generated\n'));
  }

  async displayFinalSummary() {
    console.log(chalk.blue('📊 FINAL VALIDATION SUMMARY'));
    console.log(chalk.gray('═'.repeat(50)));
    
    console.log(chalk.white(`Mode: ${this.mode.toUpperCase()}`));
    console.log(chalk.white(`Total Users: ${this.reportData.summary.totalUsers}`));
    console.log(chalk.white(`Successful Validations: ${this.reportData.summary.successfulValidations}`));
    console.log(chalk.white(`Failed Validations: ${this.reportData.summary.failedValidations}`));
    
    if (this.reportData.summary.discrepancies.length > 0) {
      console.log(chalk.yellow(`Discrepancies Found: ${this.reportData.summary.discrepancies.length}`));
    }
    
    if (this.reportData.details.errors.length > 0) {
      console.log(chalk.red(`Errors: ${this.reportData.details.errors.length}`));
    }
    
    if (this.reportData.details.warnings.length > 0) {
      console.log(chalk.yellow(`Warnings: ${this.reportData.details.warnings.length}`));
    }

    // Overall score with color coding
    const score = this.reportData.summary.overallScore;
    let scoreColor = chalk.red;
    if (score >= 95) scoreColor = chalk.green;
    else if (score >= 80) scoreColor = chalk.yellow;
    
    console.log(scoreColor(`\n🎯 Overall Score: ${score}/100`));

    // Status message
    if (score === 100) {
      console.log(chalk.green.bold('\n🎉 PERFECT VALIDATION - 100% DATA INTEGRITY CONFIRMED'));
    } else if (score >= 95) {
      console.log(chalk.green('\n✅ EXCELLENT - Data integrity maintained with minor discrepancies'));
    } else if (score >= 80) {
      console.log(chalk.yellow('\n⚠️  GOOD - Some discrepancies found, review recommended'));
    } else {
      console.log(chalk.red.bold('\n❌ CRITICAL ISSUES - Do not proceed with migration'));
    }

    console.log(chalk.gray(`\nReport saved to: ./output/validation-report.html`));
    console.log(chalk.gray(`Duration: ${this.reportData.performance.totalDuration}ms`));
  }

  async run() {
    try {
      await this.initialize();
      
      const users = await this.getValidationUsers();
      this.reportData.details.users = users;
      
      await this.runValidation(users);
      
      if (this.mode !== 'quick') {
        await this.runRollbackTest();
      }
      
      await this.generateReport();
      
      // Calculate total duration
      const endTime = Date.now();
      this.reportData.performance.totalDuration = endTime - new Date(this.reportData.summary.startTime).getTime();
      
      this.displayFinalSummary();
      
    } catch (error) {
      console.error(chalk.red('\n💥 Validation failed:'), error.message);
      console.error(chalk.gray(error.stack));
      process.exit(1);
    } finally {
      await this.db.close();
    }
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const orchestrator = new ValidationOrchestrator();
  orchestrator.run().catch(console.error);
}

module.exports = ValidationOrchestrator;