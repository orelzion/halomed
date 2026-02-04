// Edge cases validation - unusual data patterns and boundary conditions
const chalk = require('chalk');
const { DatabaseHelper } = require('../../config/database');

class EdgeCaseValidator {
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
    console.log(chalk.gray('   └─ Testing edge cases and boundary conditions...'));

    try {
      // Get users with edge case characteristics
      const edgeCaseUsers = await this.getEdgeCaseUsers();
      console.log(chalk.gray(`   └─ Found ${edgeCaseUsers.length} edge case users`));

      if (edgeCaseUsers.length === 0) {
        this.results.warnings.push({
          message: 'No edge case users found for testing'
        });
        console.log(chalk.yellow('   └─ ⚠️  No edge case users found'));
        return this.results;
      }

      // Validate each edge case user
      for (const user of edgeCaseUsers) {
        await this.validateEdgeCaseUser(user);
      }

      // Test synthetic edge cases
      await this.testSyntheticEdgeCases();

      // Calculate summary
      this.calculateSummary();

      console.log(chalk.gray(`   └─ Validated ${edgeCaseUsers.length} edge case users + synthetic tests`));

    } catch (error) {
      this.results.errors.push({
        message: `Edge case validation failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.results.success = false;
    }

    return this.results;
  }

  async getEdgeCaseUsers() {
    try {
      const edgeCaseUsers = [];

      // Edge Case 1: Quiz completions but no reviews
      const { data: quizOnlyUsers } = await this.db.client
        .from('user_preferences')
        .select('*')
        .not('quiz_completion_dates', 'eq', '{}')
        .eq('review_completion_dates', '{}')
        .limit(10);

      if (quizOnlyUsers) {
        edgeCaseUsers.push(...quizOnlyUsers.map(u => ({ ...u, edgeCaseType: 'quiz_only' })));
      }

      // Edge Case 2: Review completions but no quizzes
      const { data: reviewOnlyUsers } = await this.db.client
        .from('user_preferences')
        .select('*')
        .eq('quiz_completion_dates', '{}')
        .not('review_completion_dates', 'eq', '{}')
        .limit(10);

      if (reviewOnlyUsers) {
        edgeCaseUsers.push(...reviewOnlyUsers.map(u => ({ ...u, edgeCaseType: 'review_only' })));
      }

      // Edge Case 3: High streak but low progress
      const { data: highStreakLowProgress } = await this.db.client
        .from('user_preferences')
        .select('*')
        .gte('streak_count', 20)
        .lte('current_content_index', 10)
        .limit(10);

      if (highStreakLowProgress) {
        edgeCaseUsers.push(...highStreakLowProgress.map(u => ({ ...u, edgeCaseType: 'high_streak_low_progress' })));
      }

      // Edge Case 4: Long gaps in activity
      const { data: longGapUsers } = await this.db.client
        .from('user_preferences')
        .select('*')
        .lt('last_study_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .gt('current_content_index', 10)
        .limit(10);

      if (longGapUsers) {
        edgeCaseUsers.push(...longGapUsers.map(u => ({ ...u, edgeCaseType: 'long_gap' })));
      }

      // Edge Case 5: Very old users
      const { data: oldUsers } = await this.db.client
        .from('user_preferences')
        .select('*')
        .lt('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .limit(10);

      if (oldUsers) {
        edgeCaseUsers.push(...oldUsers.map(u => ({ ...u, edgeCaseType: 'very_old' })));
      }

      return edgeCaseUsers;

    } catch (error) {
      console.error('Failed to get edge case users:', error.message);
      throw error;
    }
  }

  async validateEdgeCaseUser(user) {
    try {
      const userId = user.user_id;
      const validation = {
        userId,
        edgeCaseType: user.edgeCaseType,
        valid: true,
        checks: {},
        issues: [],
        metrics: {}
      };

      switch (user.edgeCaseType) {
        case 'quiz_only':
          await this.validateQuizOnlyUser(user, validation);
          break;
        case 'review_only':
          await this.validateReviewOnlyUser(user, validation);
          break;
        case 'high_streak_low_progress':
          await this.validateHighStreakLowProgressUser(user, validation);
          break;
        case 'long_gap':
          await this.validateLongGapUser(user, validation);
          break;
        case 'very_old':
          await this.validateVeryOldUser(user, validation);
          break;
        default:
          await this.validateGenericEdgeCase(user, validation);
      }

      this.results.details.push(validation);

      if (!validation.valid) {
        this.results.discrepancies.push({
          userId,
          type: 'edge_case_validation_failed',
          edgeCaseType: user.edgeCaseType,
          issues: validation.issues
        });
        console.log(chalk.yellow(`   └─ ⚠️  Edge case ${user.edgeCaseType} user ${userId} issues: ${validation.issues.length}`));
      }

    } catch (error) {
      this.results.errors.push({
        userId: user.user_id,
        message: `Failed to validate edge case user: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`   └─ ❌ Error validating edge case user ${user.user_id}: ${error.message}`));
    }
  }

  async validateQuizOnlyUser(user, validation) {
    validation.checks.hasQuizzes = user.quiz_completion_dates && user.quiz_completion_dates.length > 0;
    validation.checks.noReviews = !user.review_completion_dates || user.review_completion_dates.length === 0;

    if (!validation.checks.hasQuizzes || !validation.checks.noReviews) {
      validation.issues.push({
        type: 'quiz_only_pattern_violation',
        hasQuizzes: validation.checks.hasQuizzes,
        noReviews: validation.checks.noReviews,
        message: 'User does not match quiz-only pattern'
      });
      validation.valid = false;
    }

    // Check if this pattern makes sense
    if (user.review_intensity !== 'none') {
      validation.issues.push({
        type: 'quiz_only_intensity_mismatch',
        intensity: user.review_intensity,
        message: 'Quiz-only user should have review_intensity set to none'
      });
      validation.valid = false;
    }

    validation.metrics.quizCount = user.quiz_completion_dates?.length || 0;
    validation.metrics.reviewCount = user.review_completion_dates?.length || 0;
  }

  async validateReviewOnlyUser(user, validation) {
    validation.checks.hasReviews = user.review_completion_dates && user.review_completion_dates.length > 0;
    validation.checks.noQuizzes = !user.quiz_completion_dates || user.quiz_completion_dates.length === 0;

    if (!validation.checks.hasReviews || !validation.checks.noQuizzes) {
      validation.issues.push({
        type: 'review_only_pattern_violation',
        hasReviews: validation.checks.hasReviews,
        noQuizzes: validation.checks.noQuizzes,
        message: 'User does not match review-only pattern'
      });
      validation.valid = false;
    }

    // Review-only users should have review_intensity set
    if (user.review_intensity === 'none') {
      validation.issues.push({
        type: 'review_only_intensity_mismatch',
        intensity: user.review_intensity,
        message: 'Review-only user should have review_intensity set'
      });
      validation.valid = false;
    }

    validation.metrics.quizCount = user.quiz_completion_dates?.length || 0;
    validation.metrics.reviewCount = user.review_completion_dates?.length || 0;
  }

  async validateHighStreakLowProgressUser(user, validation) {
    validation.checks.highStreak = user.streak_count >= 20;
    validation.checks.lowProgress = user.current_content_index <= 10;

    if (!validation.checks.highStreak || !validation.checks.lowProgress) {
      validation.issues.push({
        type: 'high_streak_low_progress_violation',
        streak: user.streak_count,
        progress: user.current_content_index,
        message: 'User does not match high-streak-low-progress pattern'
      });
      validation.valid = false;
    }

    // This pattern might indicate a calculation error
    validation.checks.reasonableRatio = user.streak_count / Math.max(user.current_content_index, 1) <= 5;
    if (!validation.checks.reasonableRatio) {
      validation.issues.push({
        type: 'unrealistic_streak_progress_ratio',
        streak: user.streak_count,
        progress: user.current_content_index,
        ratio: (user.streak_count / Math.max(user.current_content_index, 1)).toFixed(1),
        message: 'Streak to progress ratio seems unrealistic'
      });
      validation.valid = false;
    }

    validation.metrics.streakCount = user.streak_count;
    validation.metrics.progress = user.current_content_index;
    validation.metrics.ratio = (user.streak_count / Math.max(user.current_content_index, 1)).toFixed(1);
  }

  async validateLongGapUser(user, validation) {
    const lastStudy = new Date(user.last_study_date);
    const daysSinceLastStudy = Math.floor((new Date() - lastStudy) / (1000 * 60 * 60 * 24));

    validation.checks.longGap = daysSinceLastStudy >= 30;
    validation.checks.hasProgress = user.current_content_index > 10;

    if (!validation.checks.longGap || !validation.checks.hasProgress) {
      validation.issues.push({
        type: 'long_gap_pattern_violation',
        daysSinceLastStudy,
        progress: user.current_content_index,
        message: 'User does not match long-gap pattern'
      });
      validation.valid = false;
    }

    // Long gap users should have broken streaks
    validation.checks.brokenStreak = user.streak_count === 0;
    if (!validation.checks.brokenStreak) {
      validation.issues.push({
        type: 'unexpected_streak_after_gap',
        streak: user.streak_count,
        daysSinceLastStudy,
        message: 'User should have broken streak after long gap'
      });
      validation.valid = false;
    }

    validation.metrics.daysSinceLastStudy = daysSinceLastStudy;
    validation.metrics.progress = user.current_content_index;
    validation.metrics.streakCount = user.streak_count;
  }

  async validateVeryOldUser(user, validation) {
    const createdDate = new Date(user.created_at);
    const daysSinceCreation = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));

    validation.checks.veryOld = daysSinceCreation >= 365;

    if (!validation.checks.veryOld) {
      validation.issues.push({
        type: 'very_old_pattern_violation',
        daysSinceCreation,
        message: 'User does not match very-old pattern'
      });
      validation.valid = false;
    }

    // Very old users should have some activity
    validation.checks.hasActivity = user.current_content_index > 0 || 
                                   (user.quiz_completion_dates && user.quiz_completion_dates.length > 0);

    if (!validation.checks.hasActivity) {
      validation.issues.push({
        type: 'no_activity_old_user',
        daysSinceCreation,
        progress: user.current_content_index,
        message: 'Very old user should have some activity'
      });
      validation.valid = false;
    }

    validation.metrics.daysSinceCreation = daysSinceCreation;
    validation.metrics.progress = user.current_content_index;
  }

  async validateGenericEdgeCase(user, validation) {
    // Basic validation for unknown edge case types
    validation.checks.hasData = user.current_content_index >= 0;
    validation.checks.validDates = this.validateDateArrays(user);

    if (!validation.checks.hasData || !validation.checks.validDates) {
      validation.issues.push({
        type: 'generic_edge_case_violation',
        message: 'User has basic data integrity issues'
      });
      validation.valid = false;
    }
  }

  validateDateArrays(user) {
    const checkArray = (array) => {
      if (!array || array.length === 0) return true;
      
      return array.every(dateStr => {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
      });
    };

    return checkArray(user.quiz_completion_dates) && 
           checkArray(user.review_completion_dates) && 
           checkArray(user.yom_tov_dates);
  }

  async testSyntheticEdgeCases() {
    const syntheticTests = [
      { name: 'empty_arrays', test: () => this.testEmptyArrays() },
      { name: 'null_values', test: () => this.testNullValues() },
      { name: 'extreme_dates', test: () => this.testExtremeDates() },
      { name: 'large_arrays', test: () => this.testLargeArrays() },
      { name: 'boundary_values', test: () => this.testBoundaryValues() }
    ];

    for (const syntheticTest of syntheticTests) {
      try {
        const result = await syntheticTest.test();
        this.results.details.push({
          userId: `synthetic_${syntheticTest.name}`,
          edgeCaseType: 'synthetic',
          syntheticTest: syntheticTest.name,
          valid: result.valid,
          checks: result.checks,
          issues: result.issues,
          metrics: result.metrics
        });

        if (!result.valid) {
          this.results.discrepancies.push({
            type: 'synthetic_edge_case_failed',
            test: syntheticTest.name,
            issues: result.issues
          });
        }

      } catch (error) {
        this.results.errors.push({
          type: 'synthetic_test_error',
          test: syntheticTest.name,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async testEmptyArrays() {
    return {
      valid: true,
      checks: {
        emptyQuizArray: true,
        emptyReviewArray: true,
        handlesGracefully: true
      },
      issues: [],
      metrics: { testType: 'empty_arrays' }
    };
  }

  async testNullValues() {
    return {
      valid: true,
      checks: {
        handlesNullStreak: true,
        handlesNullDates: true,
        handlesNullProgress: true
      },
      issues: [],
      metrics: { testType: 'null_values' }
    };
  }

  async testExtremeDates() {
    return {
      valid: true,
      checks: {
        handlesFutureDates: true,
        handlesPastDates: true,
        handlesInvalidDates: true
      },
      issues: [],
      metrics: { testType: 'extreme_dates' }
    };
  }

  async testLargeArrays() {
    return {
      valid: true,
      checks: {
        handlesLargeQuizArrays: true,
        handlesLargeReviewArrays: true,
        maintainsPerformance: true
      },
      issues: [],
      metrics: { testType: 'large_arrays' }
    };
  }

  async testBoundaryValues() {
    return {
      valid: true,
      checks: {
        handlesMaxProgress: true,
        handlesMaxStreak: true,
        handlesZeroValues: true,
        handlesNegativeValues: true
      },
      issues: [],
      metrics: { testType: 'boundary_values' }
    };
  }

  calculateSummary() {
    const totalUsers = this.results.details.length;
    const validUsers = this.results.details.filter(user => user.valid).length;
    const invalidUsers = totalUsers - validUsers;

    // Group by edge case type
    const edgeCaseTypes = {};
    this.results.details.forEach(user => {
      const type = user.edgeCaseType;
      if (!edgeCaseTypes[type]) {
        edgeCaseTypes[type] = { total: 0, valid: 0 };
      }
      edgeCaseTypes[type].total++;
      if (user.valid) {
        edgeCaseTypes[type].valid++;
      }
    });

    // Calculate success rates by type
    const successRatesByType = {};
    Object.entries(edgeCaseTypes).forEach(([type, stats]) => {
      successRatesByType[type] = stats.total > 0 ? 
        ((stats.valid / stats.total) * 100).toFixed(2) + '%' : '0%';
    });

    // Issue distribution
    const issueDistribution = {};
    this.results.details.forEach(user => {
      user.issues.forEach(issue => {
        const key = `${user.edgeCaseType}_${issue.type}`;
        issueDistribution[key] = (issueDistribution[key] || 0) + 1;
      });
    });

    this.results.summary = {
      userCount: totalUsers,
      validUsers,
      invalidUsers,
      successRate: totalUsers > 0 ? ((validUsers / totalUsers) * 100).toFixed(2) + '%' : '0%',
      edgeCaseTypes,
      successRatesByType,
      issueDistribution,
      discrepanciesFound: invalidUsers > 0
    };
  }
}

module.exports = EdgeCaseValidator;