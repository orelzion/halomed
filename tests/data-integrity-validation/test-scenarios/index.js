// Test scenarios for different user types
const chalk = require('chalk');
const { DatabaseHelper } = require('../config/database');
const validationConfig = require('../config/validation-config');

// Import individual scenario validators
const NewUserValidator = require('./scenarios/new-users');
const RegularUserValidator = require('./scenarios/regular-users');
const PowerUserValidator = require('./scenarios/power-users');
const EdgeCaseValidator = require('./scenarios/edge-cases');

class ScenarioTestRunner {
  constructor() {
    this.db = new DatabaseHelper();
    this.results = {
      summary: {
        startTime: new Date().toISOString(),
        endTime: null,
        scenariosRun: 0,
        scenariosPassed: 0,
        scenariosFailed: 0,
        overallSuccess: true
      },
      scenarioResults: {},
      errors: [],
      warnings: []
    };
  }

  async runAllScenarios() {
    console.log(chalk.blue('🎭 Running Test Scenarios'));
    console.log(chalk.gray('═'.repeat(50)));

    try {
      const scenarios = [
        { name: 'new-users', validator: new NewUserValidator(this.db) },
        { name: 'regular-users', validator: new RegularUserValidator(this.db) },
        { name: 'power-users', validator: new PowerUserValidator(this.db) },
        { name: 'edge-cases', validator: new EdgeCaseValidator(this.db) }
      ];

      for (const scenario of scenarios) {
        await this.runScenario(scenario.name, scenario.validator);
      }

      this.generateSummary();
      this.displayResults();

    } catch (error) {
      console.error(chalk.red('💥 Scenario testing failed:'), error.message);
      this.results.errors.push({
        message: `Scenario testing failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.results.summary.overallSuccess = false;
    }

    return this.results;
  }

  async runScenario(scenarioName, validator) {
    console.log(chalk.yellow(`\n🧪 Running ${scenarioName} scenario...`));

    try {
      const startTime = Date.now();
      const result = await validator.validate();
      const duration = Date.now() - startTime;

      this.results.scenarioResults[scenarioName] = {
        ...result,
        duration,
        success: result.success || false
      };

      this.results.summary.scenariosRun++;

      if (result.success) {
        this.results.summary.scenariosPassed++;
        console.log(chalk.green(`✅ ${scenarioName} scenario passed`));
      } else {
        this.results.summary.scenariosFailed++;
        this.results.summary.overallSuccess = false;
        console.log(chalk.red(`❌ ${scenarioName} scenario failed`));
        
        if (result.errors) {
          result.errors.forEach(error => {
            console.log(chalk.red(`   └─ ${error.message || error}`));
          });
        }
      }

      if (result.warnings) {
        result.warnings.forEach(warning => {
          console.log(chalk.yellow(`   ⚠️  ${warning.message || warning}`));
          this.results.warnings.push({
            scenario: scenarioName,
            warning: warning.message || warning,
            timestamp: new Date().toISOString()
          });
        });
      }

      // Display key metrics
      if (result.summary) {
        Object.entries(result.summary).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            console.log(chalk.gray(`   └─ ${key}: ${value}`));
          }
        });
      }

    } catch (error) {
      console.error(chalk.red(`❌ ${scenarioName} scenario error:`), error.message);
      this.results.scenarioResults[scenarioName] = {
        success: false,
        error: error.message,
        duration: 0
      };
      this.results.summary.scenariosRun++;
      this.results.summary.scenariosFailed++;
      this.results.summary.overallSuccess = false;
      this.results.errors.push({
        scenario: scenarioName,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  generateSummary() {
    this.results.summary.endTime = new Date().toISOString();

    // Calculate success rates by user type
    const successRates = {};
    Object.entries(this.results.scenarioResults).forEach(([scenario, result]) => {
      if (result.summary && result.summary.userCount) {
        successRates[scenario] = {
          userCount: result.summary.userCount,
          successRate: result.summary.successRate || '0%'
        };
      }
    });

    this.results.summary.successRates = successRates;
  }

  displayResults() {
    console.log(chalk.blue('\n📊 TEST SCENARIOS SUMMARY'));
    console.log(chalk.gray('═'.repeat(50)));

    console.log(chalk.white(`Scenarios Run: ${this.results.summary.scenariosRun}`));
    console.log(chalk.green(`Scenarios Passed: ${this.results.summary.scenariosPassed}`));
    
    if (this.results.summary.scenariosFailed > 0) {
      console.log(chalk.red(`Scenarios Failed: ${this.results.summary.scenariosFailed}`));
    }

    console.log(chalk.gray(`Duration: ${this.getDuration()}`));

    // Success rates by scenario
    if (this.results.summary.successRates) {
      console.log(chalk.white('\n📈 Success Rates:'));
      Object.entries(this.results.summary.successRates).forEach(([scenario, data]) => {
        const rate = parseFloat(data.successRate);
        let color = chalk.red;
        if (rate >= 95) color = chalk.green;
        else if (rate >= 80) color = chalk.yellow;
        
        console.log(`   ${scenario}: ${color(data.successRate)} (${data.userCount} users)`);
      });
    }

    // Warnings
    if (this.results.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Warnings: ${this.results.warnings.length}`));
      this.results.warnings.slice(0, 5).forEach(warning => {
        console.log(chalk.gray(`   └─ ${warning.scenario}: ${warning.warning}`));
      });
      if (this.results.warnings.length > 5) {
        console.log(chalk.gray(`   └─ ... and ${this.results.warnings.length - 5} more`));
      }
    }

    // Errors
    if (this.results.errors.length > 0) {
      console.log(chalk.red(`\n❌ Errors: ${this.results.errors.length}`));
      this.results.errors.slice(0, 5).forEach(error => {
        console.log(chalk.gray(`   └─ ${error.scenario || 'General'}: ${error.message}`));
      });
      if (this.results.errors.length > 5) {
        console.log(chalk.gray(`   └─ ... and ${this.results.errors.length - 5} more`));
      }
    }

    // Overall status
    const status = this.results.summary.overallSuccess ? '✅ PASS' : '❌ FAIL';
    const statusColor = this.results.summary.overallSuccess ? chalk.green.bold : chalk.red.bold;
    
    console.log(statusColor(`\n${status} - Test Scenarios ${this.results.summary.overallSuccess ? 'Completed' : 'Failed'}`));
  }

  getDuration() {
    const start = new Date(this.results.summary.startTime);
    const end = new Date(this.results.summary.endTime);
    const duration = Math.round((end - start) / 1000);
    return `${duration}s`;
  }
}

// Individual scenario runners
if (require.main === module) {
  const runner = new ScenarioTestRunner();
  runner.runAllScenarios().then(results => {
    process.exit(results.summary.overallSuccess ? 0 : 1);
  }).catch(error => {
    console.error('Scenario runner failed:', error);
    process.exit(1);
  });
}

module.exports = ScenarioTestRunner;