// New users validation - users with no historical data
const chalk = require('chalk');
const { DatabaseHelper } = require('../../config/database');

class NewUserValidator {
  constructor(database) {
    this.db = database;
    this.results = {
      success: true,
      summary: {},
      discrepancies: [],
      errors: [],
      warnings: [],
      details: []
    };
  }

  async validate() {
    console.log(chalk.gray('   └─ Testing new users (no historical data)...'));

    try {
      // Get sample of new users
      const newUsers = await this.getNewUsers();
      console.log(chalk.gray(`   └─ Found ${newUsers.length} new users`));

      if (newUsers.length === 0) {
        this.results.warnings.push({
          message: 'No new users found for testing'
        });
        console.log(chalk.yellow('   └─ ⚠️  No new users found'));
        return this.results;
      }

      // Validate each new user
      for (const user of newUsers) {
        await this.validateNewUser(user);
      }

      // Calculate summary
      this.calculateSummary();

      console.log(chalk.gray(`   └─ Validated ${newUsers.length} new users`));

    } catch (error) {
      this.results.errors.push({
        message: `New user validation failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.results.success = false;
    }

    return this.results;
  }

  async getNewUsers() {
    try {
      // New users are defined as:
      // - current_content_index = 0 (no learning progress)
      // - No quiz or review completions
      // - Recent creation date (within last 30 days)
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await this.db.client
        .from('user_preferences')
        .select('*')
        .eq('current_content_index', 0)
        .is('last_study_date', null)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(50);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Failed to get new users:', error.message);
      throw error;
    }
  }

  async validateNewUser(user) {
    try {
      const userId = user.user_id;
      const validation = {
        userId,
        valid: true,
        checks: {},
        issues: []
      };

      // Check 1: Zero progress
      validation.checks.zeroProgress = user.current_content_index === 0;
      if (!validation.checks.zeroProgress) {
        validation.issues.push({
          type: 'non_zero_progress',
          currentProgress: user.current_content_index,
          expected: 0,
          message: 'New user should have zero progress'
        });
        validation.valid = false;
      }

      // Check 2: No completions
      const hasQuizCompletions = user.quiz_completion_dates && user.quiz_completion_dates.length > 0;
      const hasReviewCompletions = user.review_completion_dates && user.review_completion_dates.length > 0;
      
      validation.checks.noCompletions = !hasQuizCompletions && !hasReviewCompletions;
      if (!validation.checks.noCompletions) {
        validation.issues.push({
          type: 'unexpected_completions',
          quizCount: user.quiz_completion_dates?.length || 0,
          reviewCount: user.review_completion_dates?.length || 0,
          message: 'New user should have no quiz or review completions'
        });
        validation.valid = false;
      }

      // Check 3: Zero streak
      validation.checks.zeroStreak = user.streak_count === 0;
      if (!validation.checks.zeroStreak) {
        validation.issues.push({
          type: 'non_zero_streak',
          currentStreak: user.streak_count,
          expected: 0,
          message: 'New user should have zero streak'
        });
        validation.valid = false;
      }

      // Check 4: No last study date
      validation.checks.noLastStudyDate = !user.last_study_date;
      if (!validation.checks.noLastStudyDate) {
        validation.issues.push({
          type: 'unexpected_last_study_date',
          lastStudyDate: user.last_study_date,
          message: 'New user should have no last study date'
        });
        validation.valid = false;
      }

      // Check 5: Valid default settings
      const defaultValidation = this.validateDefaultSettings(user);
      validation.checks.validDefaults = defaultValidation.valid;
      validation.checks.defaultsDetails = defaultValidation.details;
      
      if (!defaultValidation.valid) {
        validation.issues.push(...defaultValidation.issues);
        validation.valid = false;
      }

      // Check 6: Valid dates
      const dateValidation = this.validateDates(user);
      validation.checks.validDates = dateValidation.valid;
      
      if (!dateValidation.valid) {
        validation.issues.push(...dateValidation.issues);
        validation.valid = false;
      }

      // Check 7: Learning path consistency
      const learningPathCheck = await this.validateLearningPathConsistency(userId);
      validation.checks.learningPathConsistent = learningPathCheck.consistent;
      
      if (!learningPathCheck.consistent) {
        validation.issues.push(...learningPathCheck.issues);
        validation.valid = false;
      }

      this.results.details.push(validation);

      if (!validation.valid) {
        this.results.discrepancies.push({
          userId,
          type: 'new_user_validation_failed',
          issues: validation.issues
        });
        console.log(chalk.yellow(`   └─ ⚠️  New user ${userId} validation issues: ${validation.issues.length}`));
      }

    } catch (error) {
      this.results.errors.push({
        userId: user.user_id,
        message: `Failed to validate new user: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`   └─ ❌ Error validating new user ${user.user_id}: ${error.message}`));
    }
  }

  validateDefaultSettings(user) {
    const validation = {
      valid: true,
      details: {},
      issues: []
    };

    // Check pace
    const validPaces = ['one_chapter', 'two_mishna', 'seder_per_year'];
    validation.details.validPace = validPaces.includes(user.pace);
    if (!validation.details.validPace) {
      validation.issues.push({
        type: 'invalid_default_pace',
        pace: user.pace,
        validPaces,
        message: 'New user has invalid default pace'
      });
      validation.valid = false;
    }

    // Check review intensity
    const validIntensities = ['none', 'light', 'medium', 'intensive'];
    validation.details.validIntensity = validIntensities.includes(user.review_intensity);
    if (!validation.details.validIntensity) {
      validation.issues.push({
        type: 'invalid_default_intensity',
        intensity: user.review_intensity,
        validIntensities,
        message: 'New user has invalid default review intensity'
      });
      validation.valid = false;
    }

    // Check skip_friday default (should be true by default)
    validation.details.defaultSkipFriday = user.skip_friday === true;
    if (user.skip_friday !== true && user.skip_friday !== false) {
      validation.issues.push({
        type: 'invalid_skip_friday',
        value: user.skip_friday,
        message: 'skip_friday should be boolean'
      });
      validation.valid = false;
    }

    // Check yom_tov_dates (should be empty array for new users)
    validation.details.emptyYomTov = !user.yom_tov_dates || user.yom_tov_dates.length === 0;
    if (user.yom_tov_dates && user.yom_tov_dates.length > 0) {
      validation.issues.push({
        type: 'unexpected_yom_tov_dates',
        count: user.yom_tov_dates.length,
        message: 'New user should have no holiday dates'
      });
      validation.valid = false;
    }

    return validation;
  }

  validateDates(user) {
    const validation = {
      valid: true,
      issues: []
    };

    const now = new Date();

    // Check created_at is not in future
    if (user.created_at) {
      const createdAt = new Date(user.created_at);
      if (createdAt > now) {
        validation.issues.push({
          type: 'future_created_at',
          created_at: user.created_at,
          message: 'Created at date is in the future'
        });
        validation.valid = false;
      }
    }

    // Check updated_at is not before created_at
    if (user.created_at && user.updated_at) {
      const createdAt = new Date(user.created_at);
      const updatedAt = new Date(user.updated_at);
      if (updatedAt < createdAt) {
        validation.issues.push({
          type: 'invalid_timestamp_order',
          created_at: user.created_at,
          updated_at: user.updated_at,
          message: 'Updated at is before created at'
        });
        validation.valid = false;
      }
    }

    // Check path_start_date is reasonable
    if (user.path_start_date) {
      const pathStartDate = new Date(user.path_start_date);
      const createdAt = new Date(user.created_at);
      
      // Path start should be on or after created at
      if (pathStartDate < createdAt.setHours(0, 0, 0, 0)) {
        validation.issues.push({
          type: 'path_start_before_created',
          path_start_date: user.path_start_date,
          created_at: user.created_at,
          message: 'Path start date is before user creation date'
        });
        validation.valid = false;
      }
      
      // Path start should not be too far in the past
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      if (pathStartDate < thirtyDaysAgo) {
        validation.issues.push({
          type: 'old_path_start_date',
          path_start_date: user.path_start_date,
          message: 'Path start date is more than 30 days old for new user'
        });
        validation.valid = false;
      }
    }

    return validation;
  }

  async validateLearningPathConsistency(userId) {
    const validation = {
      consistent: true,
      issues: []
    };

    try {
      // Check if learning_path exists for new user
      const { data: learningPath, error } = await this.db.client
        .from('learning_path')
        .select('count', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('_deleted', false);

      if (error && error.code !== 'PGRST116') { // PGRST116 = relation not found
        throw error;
      }

      // For new users, learning_path should be minimal or empty
      if (learningPath !== null && learningPath > 0) {
        // If learning_path exists, it should only contain unlocked nodes for the first few days
        const { data: pathData, error: dataError } = await this.db.client
          .from('learning_path')
          .select('*')
          .eq('user_id', userId)
          .eq('_deleted', false)
          .order('unlock_date')
          .limit(10);

        if (!dataError && pathData) {
          const completedNodes = pathData.filter(node => node.completed_at !== null);
          if (completedNodes.length > 0) {
            validation.issues.push({
              type: 'unexpected_completed_nodes',
              count: completedNodes.length,
              message: 'New user should have no completed learning path nodes'
            });
            validation.consistent = false;
          }
        }
      }

    } catch (error) {
      validation.issues.push({
        type: 'learning_path_check_error',
        error: error.message,
        message: 'Failed to check learning path consistency'
      });
      validation.consistent = false;
    }

    return validation;
  }

  calculateSummary() {
    const totalUsers = this.results.details.length;
    const validUsers = this.results.details.filter(user => user.valid).length;
    const invalidUsers = totalUsers - validUsers;

    // Check distribution of issues
    const issueDistribution = {};
    this.results.details.forEach(user => {
      user.issues.forEach(issue => {
        issueDistribution[issue.type] = (issueDistribution[issue.type] || 0) + 1;
      });
    });

    // Calculate success rate for each check
    const checkSuccessRates = {};
    const checkNames = ['zeroProgress', 'noCompletions', 'zeroStreak', 'noLastStudyDate', 'validDefaults', 'validDates', 'learningPathConsistent'];
    
    checkNames.forEach(checkName => {
      const passed = this.results.details.filter(user => user.checks[checkName] === true).length;
      checkSuccessRates[checkName] = totalUsers > 0 ? ((passed / totalUsers) * 100).toFixed(2) + '%' : '0%';
    });

    this.results.summary = {
      userCount: totalUsers,
      validUsers,
      invalidUsers,
      successRate: totalUsers > 0 ? ((validUsers / totalUsers) * 100).toFixed(2) + '%' : '0%',
      issueDistribution,
      checkSuccessRates,
      discrepanciesFound: invalidUsers > 0
    };
  }
}

module.exports = NewUserValidator;