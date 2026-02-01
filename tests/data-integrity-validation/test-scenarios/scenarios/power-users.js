// Power users validation - users with extensive completion data
const chalk = require('chalk');
const { DatabaseHelper } = require('../../config/database');

class PowerUserValidator {
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
    console.log(chalk.gray('   └─ Testing power users (extensive progress)...'));

    try {
      // Get sample of power users
      const powerUsers = await this.getPowerUsers();
      console.log(chalk.gray(`   └─ Found ${powerUsers.length} power users`));

      if (powerUsers.length === 0) {
        this.results.warnings.push({
          message: 'No power users found for testing'
        });
        console.log(chalk.yellow('   └─ ⚠️  No power users found'));
        return this.results;
      }

      // Validate each power user
      for (const user of powerUsers) {
        await this.validatePowerUser(user);
      }

      // Calculate summary
      this.calculateSummary();

      console.log(chalk.gray(`   └─ Validated ${powerUsers.length} power users`));

    } catch (error) {
      this.results.errors.push({
        message: `Power user validation failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.results.success = false;
    }

    return this.results;
  }

  async getPowerUsers() {
    try {
      // Power users are defined as:
      // - current_content_index >= 100
      // - Significant completion history
      // - Active users with long-term engagement
      
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data, error } = await this.db.client
        .from('user_preferences')
        .select('*')
        .gte('current_content_index', 100)
        .gte('last_study_date', ninetyDaysAgo.toISOString())
        .order('current_content_index', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Failed to get power users:', error.message);
      throw error;
    }
  }

  async validatePowerUser(user) {
    try {
      const userId = user.user_id;
      const validation = {
        userId,
        userType: user.userType,
        valid: true,
        checks: {},
        issues: [],
        metrics: {}
      };

      // Check 1: High progress validation
      validation.checks.highProgress = user.current_content_index >= 100;
      if (!validation.checks.highProgress) {
        validation.issues.push({
          type: 'insufficient_progress',
          progress: user.current_content_index,
          expected: '>= 100',
          message: 'Power user should have high progress'
        });
        validation.valid = false;
      }

      // Check 2: Extensive completion data
      const completionCheck = this.validateExtensiveCompletions(user);
      validation.checks.extensiveCompletions = completionCheck.valid;
      validation.metrics.completionDetails = completionCheck.details;
      
      if (!completionCheck.valid) {
        validation.issues.push(...completionCheck.issues);
        validation.valid = false;
      }

      // Check 3: Long-term engagement patterns
      const engagementCheck = await this.validateLongTermEngagement(user);
      validation.checks.longTermEngaged = engagementCheck.engaged;
      validation.metrics.engagementDetails = engagementCheck.details;
      
      if (!engagementCheck.engaged) {
        validation.issues.push(...engagementCheck.issues);
        validation.valid = false;
      }

      // Check 4: Advanced streak patterns
      const streakCheck = this.validateAdvancedStreak(user);
      validation.checks.advancedStreak = streakCheck.advanced;
      validation.metrics.streakDetails = streakCheck.details;
      
      if (!streakCheck.advanced) {
        validation.issues.push(...streakCheck.issues);
        validation.valid = false;
      }

      // Check 5: Data volume handling
      const volumeCheck = await this.validateDataVolume(user);
      validation.checks.volumeHandled = volumeCheck.handled;
      validation.metrics.volumeDetails = volumeCheck.details;
      
      if (!volumeCheck.handled) {
        validation.issues.push(...volumeCheck.issues);
        validation.valid = false;
      }

      // Check 6: Performance under load
      const performanceCheck = await this.validatePerformance(user);
      validation.checks.performanceAcceptable = performanceCheck.acceptable;
      validation.metrics.performanceDetails = performanceCheck.details;
      
      if (!performanceCheck.acceptable) {
        validation.issues.push(...performanceCheck.issues);
        validation.valid = false;
      }

      this.results.details.push(validation);

      if (!validation.valid) {
        this.results.discrepancies.push({
          userId,
          type: 'power_user_validation_failed',
          issues: validation.issues
        });
        console.log(chalk.yellow(`   └─ ⚠️  Power user ${userId} validation issues: ${validation.issues.length}`));
      }

    } catch (error) {
      this.results.errors.push({
        userId: user.user_id,
        message: `Failed to validate power user: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`   └─ ❌ Error validating power user ${user.user_id}: ${error.message}`));
    }
  }

  validateExtensiveCompletions(user) {
    const validation = { valid: true, details: {}, issues: [] };

    const quizCount = user.quiz_completion_dates ? user.quiz_completion_dates.length : 0;
    const reviewCount = user.review_completion_dates ? user.review_completion_dates.length : 0;
    const totalCompletions = quizCount + reviewCount;

    validation.details.quizCount = quizCount;
    validation.details.reviewCount = reviewCount;
    validation.details.totalCompletions = totalCompletions;

    // Power users should have significant completion history
    if (totalCompletions < 20) {
      validation.issues.push({
        type: 'insufficient_completions',
        totalCompletions,
        expected: '>= 20',
        message: 'Power user should have extensive completion history'
      });
      validation.valid = false;
    }

    // Check completion frequency
    if (user.quiz_completion_dates && user.quiz_completion_dates.length > 1) {
      const dates = user.quiz_completion_dates.map(d => new Date(d)).sort((a, b) => a - b);
      const totalDays = Math.floor((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24));
      const averageGap = totalDays / (dates.length - 1);

      validation.details.quizFrequency = averageGap;

      // Power users should have consistent quiz completion (weekly-ish)
      if (averageGap > 14) {
        validation.issues.push({
          type: 'inconsistent_quiz_frequency',
          averageGap: Math.round(averageGap),
          expected: '~7 days',
          message: 'Power user should have consistent quiz completion frequency'
        });
        validation.valid = false;
      }
    }

    // Check review intensity alignment
    if (user.review_intensity !== 'none' && reviewCount === 0) {
      validation.issues.push({
        type: 'review_intensity_mismatch',
        intensity: user.review_intensity,
        reviewCount,
        message: 'User has review intensity but no review completions'
      });
      validation.valid = false;
    }

    return validation;
  }

  async validateLongTermEngagement(user) {
    const validation = { engaged: true, details: {}, issues: [] };

    try {
      // Check user age (how long they've been using the app)
      if (user.created_at) {
        const createdDate = new Date(user.created_at);
        const now = new Date();
        const userAgeDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

        validation.details.userAgeDays = userAgeDays;

        // Power users should have been using the app for a while
        if (userAgeDaysDays < 60) {
          validation.issues.push({
            type: 'insufficient_user_age',
            userAgeDays,
            expected: '>= 60 days',
            message: 'Power user should have long-term engagement'
          });
          validation.engaged = false;
        }
      }

      // Check study consistency over time
      if (user.path_start_date) {
        const startDate = new Date(user.path_start_date);
        const now = new Date();
        const studyDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

        validation.details.studyDays = studyDays;

        // Calculate expected progress based on pace and time
        const expectedProgress = this.calculateExpectedProgress(user, studyDays);
        const progressRatio = user.current_content_index / expectedProgress;

        validation.details.expectedProgress = expectedProgress;
        validation.details.progressRatio = progressRatio;

        // Power users should be making good progress
        if (progressRatio < 0.5) {
          validation.issues.push({
            type: 'low_progress_ratio',
            progressRatio: Math.round(progressRatio * 100),
            expected: '>= 50%',
            message: 'Power user progress ratio is too low'
          });
          validation.engaged = false;
        }
      }

      // Check for consistent activity patterns
      const activityPattern = this.analyzeActivityPattern(user);
      validation.details.activityPattern = activityPattern;

      if (activityPattern.inconsistencyScore > 0.3) {
        validation.issues.push({
          type: 'inconsistent_activity',
          inconsistencyScore: Math.round(activityPattern.inconsistencyScore * 100),
          message: 'Power user shows inconsistent activity patterns'
        });
        validation.engaged = false;
      }

    } catch (error) {
      validation.issues.push({
        type: 'engagement_validation_error',
        error: error.message,
        message: 'Failed to validate long-term engagement'
      });
      validation.engaged = false;
    }

    return validation;
  }

  calculateExpectedProgress(user, studyDays) {
    const paceRates = {
      'one_chapter': 8,
      'two_mishna': 2,
      'seder_per_year': 3
    };
    
    const paceRate = paceRates[user.pace] || 2;
    return Math.floor(studyDays * paceRate);
  }

  analyzeActivityPattern(user) {
    const allDates = [
      ...(user.quiz_completion_dates || []),
      ...(user.review_completion_dates || [])
    ].filter(date => date).map(dateStr => new Date(dateStr)).sort((a, b) => a - b);

    if (allDates.length < 3) {
      return { inconsistencyScore: 0, pattern: 'insufficient_data' };
    }

    // Calculate gaps between consecutive activities
    const gaps = [];
    for (let i = 1; i < allDates.length; i++) {
      gaps.push((allDates[i] - allDates[i - 1]) / (1000 * 60 * 60 * 24));
    }

    // Calculate coefficient of variation (CV) as inconsistency measure
    const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((a, b) => a + Math.pow(b - meanGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / meanGap;

    return {
      inconsistencyScore: Math.min(cv, 1), // Cap at 1
      pattern: cv > 0.3 ? 'inconsistent' : 'consistent',
      meanGap: Math.round(meanGap),
      stdDev: Math.round(stdDev)
    };
  }

  validateAdvancedStreak(user) {
    const validation = { advanced: true, details: {}, issues: [] };

    validation.details.currentStreak = user.streak_count || 0;
    validation.details.hasProgress = user.current_content_index > 0;

    // Power users should have meaningful streaks
    if (user.streak_count < 5 && user.current_content_index > 50) {
      validation.issues.push({
        type: 'low_streak_for_progress',
        streak: user.streak_count,
        progress: user.current_content_index,
        message: 'Power user should have higher streak for progress level'
      });
      validation.advanced = false;
    }

    // Check streak reasonableness
    if (user.streak_count > 100) {
      validation.issues.push({
        type: 'suspiciously_high_streak',
        streak: user.streak_count,
        message: 'Streak seems suspiciously high - verify calculation'
      });
      validation.advanced = false;
    }

    // Validate streak vs last study date
    if (user.last_study_date && user.streak_count > 0) {
      const daysSinceLastStudy = Math.floor((new Date() - new Date(user.last_study_date)) / (1000 * 60 * 60 * 24));
      
      validation.details.daysSinceLastStudy = daysSinceLastStudy;

      // High streak users should have recent activity
      if (user.streak_count > 10 && daysSinceLastStudy > 3) {
        validation.issues.push({
          type: 'high_streak_inactive',
          streak: user.streak_count,
          daysSinceLastStudy,
          message: 'User has high streak but no recent activity'
        });
        validation.advanced = false;
      }
    }

    return validation;
  }

  async validateDataVolume(user) {
    const validation = { handled: true, details: {}, issues: [] };

    try {
      // Check array sizes for power users
      const quizArraySize = user.quiz_completion_dates ? user.quiz_completion_dates.length : 0;
      const reviewArraySize = user.review_completion_dates ? user.review_completion_dates.length : 0;
      const yomTovArraySize = user.yom_tov_dates ? user.yom_tov_dates.length : 0;

      validation.details.arraySizes = {
        quiz: quizArraySize,
        review: reviewArraySize,
        yomTov: yomTovArraySize
      };

      // Power users should have reasonable array sizes
      if (quizArraySize > 200) {
        validation.issues.push({
          type: 'excessive_quiz_array',
          size: quizArraySize,
          message: 'Quiz completion array is excessively large'
        });
        validation.handled = false;
      }

      if (reviewArraySize > 500) {
        validation.issues.push({
          type: 'excessive_review_array',
          size: reviewArraySize,
          message: 'Review completion array is excessively large'
        });
        validation.handled = false;
      }

      // Check data integrity in arrays
      const arrayIntegrity = this.validateArrayIntegrity(user);
      validation.details.arrayIntegrity = arrayIntegrity;

      if (!arrayIntegrity.valid) {
        validation.issues.push(...arrayIntegrity.issues);
        validation.handled = false;
      }

    } catch (error) {
      validation.issues.push({
        type: 'data_volume_validation_error',
        error: error.message,
        message: 'Failed to validate data volume'
      });
      validation.handled = false;
    }

    return validation;
  }

  validateArrayIntegrity(user) {
    const validation = { valid: true, issues: [] };

    // Check for null/undefined values in arrays
    const checkArray = (array, name) => {
      if (!array) return;

      const invalidEntries = array.filter(entry => 
        entry === null || entry === undefined || entry === ''
      );

      if (invalidEntries.length > 0) {
        validation.valid = false;
        validation.issues.push({
          type: 'invalid_array_entries',
          array: name,
          count: invalidEntries.length,
          message: `Array ${name} contains invalid entries`
        });
      }

      // Check date format validity
      const invalidDates = array.filter(entry => {
        if (typeof entry !== 'string') return true;
        const date = new Date(entry);
        return isNaN(date.getTime());
      });

      if (invalidDates.length > 0) {
        validation.valid = false;
        validation.issues.push({
          type: 'invalid_dates_in_array',
          array: name,
          count: invalidDates.length,
          message: `Array ${name} contains invalid date formats`
        });
      }
    };

    checkArray(user.quiz_completion_dates, 'quiz_completion_dates');
    checkArray(user.review_completion_dates, 'review_completion_dates');
    checkArray(user.yom_tov_dates, 'yom_tov_dates');

    return validation;
  }

  async validatePerformance(user) {
    const validation = { acceptable: true, details: {}, issues: [] };

    try {
      // Simulate performance test for power user data
      const startTime = Date.now();

      // Test query performance for this user
      const queryTest = await this.testUserQueryPerformance(user.user_id);
      
      const queryTime = Date.now() - startTime;
      validation.details.queryTime = queryTime;
      validation.details.queryTest = queryTest;

      // Power user queries should complete quickly
      if (queryTime > 1000) {
        validation.issues.push({
          type: 'slow_query_performance',
          queryTime,
          threshold: 1000,
          message: 'Query performance is slow for power user'
        });
        validation.acceptable = false;
      }

      // Test array operations performance
      const arrayTest = this.testArrayOperations(user);
      validation.details.arrayTest = arrayTest;

      if (!arrayTest.performant) {
        validation.issues.push(...arrayTest.issues);
        validation.acceptable = false;
      }

    } catch (error) {
      validation.issues.push({
        type: 'performance_validation_error',
        error: error.message,
        message: 'Failed to validate performance'
      });
      validation.acceptable = false;
    }

    return validation;
  }

  async testUserQueryPerformance(userId) {
    try {
      const startTime = Date.now();
      
      // Test complex query for this user
      const { data, error } = await this.db.client
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      const queryTime = Date.now() - startTime;

      return {
        success: !error,
        queryTime,
        dataReturned: !!data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        queryTime: Date.now() - startTime
      };
    }
  }

  testArrayOperations(user) {
    const validation = { performant: true, issues: [] };

    try {
      const startTime = Date.now();

      // Test array operations
      const quizArray = user.quiz_completion_dates || [];
      const reviewArray = user.review_completion_dates || [];

      // Test array length operations
      const quizLength = quizArray.length;
      const reviewLength = reviewArray.length;

      // Test array filtering
      const recentQuizzes = quizArray.filter(date => {
        const d = new Date(date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return d >= thirtyDaysAgo;
      });

      const operationTime = Date.now() - startTime;
      validation.details.operationTime = operationTime;
      validation.details.arrayLengths = { quiz: quizLength, review: reviewLength };
      validation.details.recentQuizzes = recentQuizzes.length;

      // Array operations should be fast
      if (operationTime > 100) {
        validation.performant = false;
        validation.issues.push({
          type: 'slow_array_operations',
          operationTime,
          threshold: 100,
          message: 'Array operations are slow for power user'
        });
      }

    } catch (error) {
      validation.performant = false;
      validation.issues.push({
        type: 'array_operation_error',
        error: error.message,
        message: 'Failed to test array operations'
      });
    }

    return validation;
  }

  calculateSummary() {
    const totalUsers = this.results.details.length;
    const validUsers = this.results.details.filter(user => user.valid).length;
    const invalidUsers = totalUsers - validUsers;

    // Calculate success rates for each check
    const checkSuccessRates = {};
    const checkNames = ['highProgress', 'extensiveCompletions', 'longTermEngaged', 'advancedStreak', 'volumeHandled', 'performanceAcceptable'];
    
    checkNames.forEach(checkName => {
      const passed = this.results.details.filter(user => user.checks[checkName] === true).length;
      checkSuccessRates[checkName] = totalUsers > 0 ? ((passed / totalUsers) * 100).toFixed(2) + '%' : '0%';
    });

    // Progress statistics for power users
    const progressValues = this.results.details.map(user => user.current_content_index).filter(p => p >= 0);
    const avgProgress = progressValues.length > 0 ? 
      Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length) : 0;
    const maxProgress = Math.max(...progressValues, 0);

    // Completion statistics
    const completionTotals = this.results.details.map(user => 
      (user.quiz_completion_dates?.length || 0) + (user.review_completion_dates?.length || 0)
    );
    const avgCompletions = completionTotals.length > 0 ? 
      Math.round(completionTotals.reduce((a, b) => a + b, 0) / completionTotals.length) : 0;

    this.results.summary = {
      userCount: totalUsers,
      validUsers,
      invalidUsers,
      successRate: totalUsers > 0 ? ((validUsers / totalUsers) * 100).toFixed(2) + '%' : '0%',
      averageProgress: avgProgress,
      maxProgress,
      averageCompletions: avgCompletions,
      checkSuccessRates,
      discrepanciesFound: invalidUsers > 0
    };
  }
}

module.exports = PowerUserValidator;