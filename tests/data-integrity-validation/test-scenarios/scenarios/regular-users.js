// Regular users validation - users with some progress
const chalk = require('chalk');
const { DatabaseHelper } = require('../../config/database');

class RegularUserValidator {
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
    console.log(chalk.gray('   └─ Testing regular users (some progress)...'));

    try {
      // Get sample of regular users
      const regularUsers = await this.getRegularUsers();
      console.log(chalk.gray(`   └─ Found ${regularUsers.length} regular users`));

      if (regularUsers.length === 0) {
        this.results.warnings.push({
          message: 'No regular users found for testing'
        });
        console.log(chalk.yellow('   └─ ⚠️  No regular users found'));
        return this.results;
      }

      // Validate each regular user
      for (const user of regularUsers) {
        await this.validateRegularUser(user);
      }

      // Calculate summary
      this.calculateSummary();

      console.log(chalk.gray(`   └─ Validated ${regularUsers.length} regular users`));

    } catch (error) {
      this.results.errors.push({
        message: `Regular user validation failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.results.success = false;
    }

    return this.results;
  }

  async getRegularUsers() {
    try {
      // Regular users are defined as:
      // - current_content_index between 1 and 100
      // - Some activity in the last 90 days
      // - Not extreme power users
      
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data, error } = await this.db.client
        .from('user_preferences')
        .select('*')
        .gte('current_content_index', 1)
        .lte('current_content_index', 100)
        .gte('last_study_date', ninetyDaysAgo.toISOString())
        .limit(100);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Failed to get regular users:', error.message);
      throw error;
    }
  }

  async validateRegularUser(user) {
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

      // Check 1: Reasonable progress range
      validation.checks.reasonableProgress = user.current_content_index >= 1 && user.current_content_index <= 100;
      if (!validation.checks.reasonableProgress) {
        validation.issues.push({
          type: 'unreasonable_progress',
          progress: user.current_content_index,
          expected: '1-100',
          message: 'Regular user should have moderate progress'
        });
        validation.valid = false;
      }

      // Check 2: Activity consistency
      const activityCheck = await this.validateActivityConsistency(user);
      validation.checks.activityConsistent = activityCheck.consistent;
      validation.metrics.activityDetails = activityCheck.details;
      
      if (!activityCheck.consistent) {
        validation.issues.push(...activityCheck.issues);
        validation.valid = false;
      }

      // Check 3: Completion data integrity
      const completionCheck = await this.validateCompletionData(user);
      validation.checks.completionsValid = completionCheck.valid;
      validation.metrics.completionDetails = completionCheck.details;
      
      if (!completionCheck.valid) {
        validation.issues.push(...completionCheck.issues);
        validation.valid = false;
      }

      // Check 4: Streak合理性
      const streakCheck = this.validateStreakReasonableness(user);
      validation.checks.streakReasonable = streakCheck.reasonable;
      validation.metrics.streakDetails = streakCheck.details;
      
      if (!streakCheck.reasonable) {
        validation.issues.push(...streakCheck.issues);
        validation.valid = false;
      }

      // Check 5: Pace vs Progress alignment
      const paceCheck = await this.validatePaceProgressAlignment(user);
      validation.checks.paceAligned = paceCheck.aligned;
      validation.metrics.paceDetails = paceCheck.details;
      
      if (!paceCheck.aligned) {
        validation.issues.push(...paceCheck.issues);
        validation.valid = false;
      }

      // Check 6: Data consistency across tables
      const consistencyCheck = await this.validateCrossTableConsistency(user);
      validation.checks.crossTableConsistent = consistencyCheck.consistent;
      validation.metrics.consistencyDetails = consistencyCheck.details;
      
      if (!consistencyCheck.consistent) {
        validation.issues.push(...consistencyCheck.issues);
        validation.valid = false;
      }

      this.results.details.push(validation);

      if (!validation.valid) {
        this.results.discrepancies.push({
          userId,
          type: 'regular_user_validation_failed',
          issues: validation.issues
        });
        console.log(chalk.yellow(`   └─ ⚠️  Regular user ${userId} validation issues: ${validation.issues.length}`));
      }

    } catch (error) {
      this.results.errors.push({
        userId: user.user_id,
        message: `Failed to validate regular user: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`   └─ ❌ Error validating regular user ${user.user_id}: ${error.message}`));
    }
  }

  async validateActivityConsistency(user) {
    const validation = {
      consistent: true,
      details: {},
      issues: []
    };

    try {
      // Check if last_study_date is reasonable
      if (user.last_study_date) {
        const lastStudy = new Date(user.last_study_date);
        const now = new Date();
        const daysSinceLastStudy = Math.floor((now - lastStudy) / (1000 * 60 * 60 * 24));
        
        validation.details.daysSinceLastStudy = daysSinceLastStudy;

        // For regular users, last study should be within last 90 days
        if (daysSinceLastStudy > 90) {
          validation.issues.push({
            type: 'inactive_too_long',
            daysSinceLastStudy,
            message: 'Regular user inactive for more than 90 days'
          });
          validation.consistent = false;
        }

        // Last study should not be in future
        if (daysSinceLastStudy < 0) {
          validation.issues.push({
            type: 'future_last_study',
            lastStudyDate: user.last_study_date,
            message: 'Last study date is in the future'
          });
          validation.consistent = false;
        }
      } else {
        // Users with progress should have a last study date
        if (user.current_content_index > 0) {
          validation.issues.push({
            type: 'progress_without_last_study',
            progress: user.current_content_index,
            message: 'User has progress but no last study date'
          });
          validation.consistent = false;
        }
      }

      // Check activity frequency based on completion dates
      const activityFrequency = this.calculateActivityFrequency(user);
      validation.details.activityFrequency = activityFrequency;

      // Regular users should have some regular activity
      if (activityFrequency.averageGap > 30 && user.current_content_index > 10) {
        validation.issues.push({
          type: 'infrequent_activity',
          averageGap: activityFrequency.averageGap,
          message: 'User has progress but very infrequent activity'
        });
        validation.consistent = false;
      }

    } catch (error) {
      validation.issues.push({
        type: 'activity_consistency_error',
        error: error.message,
        message: 'Failed to validate activity consistency'
      });
      validation.consistent = false;
    }

    return validation;
  }

  calculateActivityFrequency(user) {
    const allDates = [
      ...(user.quiz_completion_dates || []),
      ...(user.review_completion_dates || [])
    ].filter(date => date).map(dateStr => new Date(dateStr)).sort((a, b) => a - b);

    if (allDates.length < 2) {
      return { averageGap: null, totalDays: null };
    }

    let totalGap = 0;
    for (let i = 1; i < allDates.length; i++) {
      totalGap += (allDates[i] - allDates[i - 1]) / (1000 * 60 * 60 * 24);
    }

    const averageGap = Math.round(totalGap / (allDates.length - 1));
    const totalDays = Math.floor((allDates[allDates.length - 1] - allDates[0]) / (1000 * 60 * 60 * 24));

    return { averageGap, totalDays };
  }

  async validateCompletionData(user) {
    const validation = {
      valid: true,
      details: {},
      issues: []
    };

    try {
      const quizCount = user.quiz_completion_dates ? user.quiz_completion_dates.length : 0;
      const reviewCount = user.review_completion_dates ? user.review_completion_dates.length : 0;

      validation.details.quizCount = quizCount;
      validation.details.reviewCount = reviewCount;
      validation.details.totalCompletions = quizCount + reviewCount;

      // Regular users should have some completions
      if (validation.details.totalCompletions === 0 && user.current_content_index > 10) {
        validation.issues.push({
          type: 'no_completions_with_progress',
          progress: user.current_content_index,
          message: 'User has significant progress but no quiz/review completions'
        });
        validation.valid = false;
      }

      // Check date order for completions
      const dateOrderCheck = this.validateCompletionDateOrder(user);
      validation.details.dateOrderValid = dateOrderCheck.valid;
      
      if (!dateOrderCheck.valid) {
        validation.issues.push(...dateOrderCheck.issues);
        validation.valid = false;
      }

      // Check for duplicate dates
      const duplicateCheck = this.validateCompletionDuplicates(user);
      validation.details.noDuplicates = duplicateCheck.noDuplicates;
      
      if (!duplicateCheck.noDuplicates) {
        validation.issues.push(...duplicateCheck.issues);
        validation.valid = false;
      }

    } catch (error) {
      validation.issues.push({
        type: 'completion_data_error',
        error: error.message,
        message: 'Failed to validate completion data'
      });
      validation.valid = false;
    }

    return validation;
  }

  validateCompletionDateOrder(user) {
    const validation = { valid: true, issues: [] };

    const checkArray = (array, name) => {
      if (!array || array.length < 2) return;

      for (let i = 1; i < array.length; i++) {
        const prev = new Date(array[i - 1]);
        const curr = new Date(array[i]);
        
        if (curr <= prev) {
          validation.issues.push({
            type: 'date_order_violation',
            array: name,
            index: i,
            previous: array[i - 1],
            current: array[i],
            message: `Dates not in chronological order in ${name}`
          });
          validation.valid = false;
        }
      }
    };

    checkArray(user.quiz_completion_dates, 'quiz_completion_dates');
    checkArray(user.review_completion_dates, 'review_completion_dates');

    return validation;
  }

  validateCompletionDuplicates(user) {
    const validation = { noDuplicates: true, issues: [] };

    const checkArray = (array, name) => {
      if (!array) return;

      const uniqueDates = [...new Set(array)];
      if (uniqueDates.length !== array.length) {
        validation.noDuplicates = false;
        validation.issues.push({
          type: 'duplicate_dates',
          array: name,
          totalCount: array.length,
          uniqueCount: uniqueDates.length,
          message: `Duplicate dates found in ${name}`
        });
      }
    };

    checkArray(user.quiz_completion_dates, 'quiz_completion_dates');
    checkArray(user.review_completion_dates, 'review_completion_dates');

    return validation;
  }

  validateStreakReasonableness(user) {
    const validation = { reasonable: true, details: {}, issues: [] };

    validation.details.streakCount = user.streak_count || 0;
    validation.details.hasProgress = user.current_content_index > 0;
    validation.details.hasLastStudy = !!user.last_study_date;

    // For regular users, streak should be reasonable
    if (user.streak_count > 0) {
      // Streak shouldn't be ridiculously high for moderate progress
      if (user.streak_count > 50 && user.current_content_index < 50) {
        validation.issues.push({
          type: 'unrealistic_streak',
          streak: user.streak_count,
          progress: user.current_content_index,
          message: 'Streak seems unrealistic for progress level'
        });
        validation.reasonable = false;
      }

      // User with streak should have recent activity
      if (user.last_study_date) {
        const daysSinceLastStudy = Math.floor((new Date() - new Date(user.last_study_date)) / (1000 * 60 * 60 * 24));
        if (daysSinceLastStudy > 7 && user.streak_count > 1) {
          validation.issues.push({
            type: 'streak_without_recent_activity',
            streak: user.streak_count,
            daysSinceLastStudy,
            message: 'User has streak but no recent activity'
          });
          validation.reasonable = false;
        }
      }
    }

    // User with progress should have some streak or recent activity
    if (user.current_content_index > 10 && user.streak_count === 0 && user.last_study_date) {
      const daysSinceLastStudy = Math.floor((new Date() - new Date(user.last_study_date)) / (1000 * 60 * 60 * 24));
      if (daysSinceLastStudy <= 3) {
        validation.issues.push({
          type: 'recent_progress_no_streak',
          progress: user.current_content_index,
          daysSinceLastStudy,
          message: 'User has recent progress but zero streak'
        });
        // Don't mark as invalid - this could be normal
      }
    }

    return validation;
  }

  async validatePaceProgressAlignment(user) {
    const validation = { aligned: true, details: {}, issues: [] };

    try {
      const paceRate = this.getPaceRate(user.pace);
      validation.details.pace = user.pace;
      validation.details.paceRate = paceRate;

      if (user.path_start_date) {
        const startDate = new Date(user.path_start_date);
        const currentDate = new Date();
        const elapsedDays = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
        
        validation.details.elapsedDays = elapsedDays;
        validation.details.expectedProgress = Math.floor(elapsedDays * paceRate);
        validation.details.actualProgress = user.current_content_index;

        // Calculate reasonable range (considering skipped days and variations)
        const minExpected = Math.floor(validation.details.expectedProgress * 0.5);
        const maxExpected = Math.floor(validation.details.expectedProgress * 1.5);

        if (user.current_content_index < minExpected || user.current_content_index > maxExpected) {
          validation.issues.push({
            type: 'pace_progress_misalignment',
            actual: user.current_content_index,
            expected: validation.details.expectedProgress,
            minExpected,
            maxExpected,
            pace: user.pace,
            message: 'Progress not aligned with pace and elapsed time'
          });
          validation.aligned = false;
        }
      }

    } catch (error) {
      validation.issues.push({
        type: 'pace_alignment_error',
        error: error.message,
        message: 'Failed to validate pace-progress alignment'
      });
      validation.aligned = false;
    }

    return validation;
  }

  getPaceRate(pace) {
    const paceRates = {
      'one_chapter': 8,
      'two_mishna': 2,
      'seder_per_year': 3
    };
    return paceRates[pace] || 2;
  }

  async validateCrossTableConsistency(user) {
    const validation = { consistent: true, details: {}, issues: [] };

    try {
      // Check if learning_path completion count matches current_content_index
      const { data: learningPath, error } = await this.db.client
        .from('learning_path')
        .select('node_type, completed_at')
        .eq('user_id', user.user_id)
        .eq('_deleted', false);

      if (!error && learningPath) {
        const completedLearning = learningPath.filter(node => 
          node.node_type === 'learning' && 
          node.completed_at !== null
        ).length;

        validation.details.learningPathCompletions = completedLearning;
        validation.details.userPreferencesProgress = user.current_content_index;

        const difference = Math.abs(completedLearning - user.current_content_index);
        if (difference > 5) { // Allow some tolerance
          validation.issues.push({
            type: 'cross_table_progress_mismatch',
            learningPathCount: completedLearning,
            userPreferencesCount: user.current_content_index,
            difference,
            message: 'Progress count mismatch between tables'
          });
          validation.consistent = false;
        }
      }

    } catch (error) {
      validation.issues.push({
        type: 'cross_table_consistency_error',
        error: error.message,
        message: 'Failed to validate cross-table consistency'
      });
      validation.consistent = false;
    }

    return validation;
  }

  calculateSummary() {
    const totalUsers = this.results.details.length;
    const validUsers = this.results.details.filter(user => user.valid).length;
    const invalidUsers = totalUsers - validUsers;

    // Calculate success rates for each check
    const checkSuccessRates = {};
    const checkNames = ['reasonableProgress', 'activityConsistent', 'completionsValid', 'streakReasonable', 'paceAligned', 'crossTableConsistent'];
    
    checkNames.forEach(checkName => {
      const passed = this.results.details.filter(user => user.checks[checkName] === true).length;
      checkSuccessRates[checkName] = totalUsers > 0 ? ((passed / totalUsers) * 100).toFixed(2) + '%' : '0%';
    });

    // Distribution of issues
    const issueDistribution = {};
    this.results.details.forEach(user => {
      user.issues.forEach(issue => {
        issueDistribution[issue.type] = (issueDistribution[issue.type] || 0) + 1;
      });
    });

    // Progress statistics
    const progressValues = this.results.details.map(user => user.current_content_index).filter(p => p >= 0);
    const avgProgress = progressValues.length > 0 ? 
      Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length) : 0;

    this.results.summary = {
      userCount: totalUsers,
      validUsers,
      invalidUsers,
      successRate: totalUsers > 0 ? ((validUsers / totalUsers) * 100).toFixed(2) + '%' : '0%',
      averageProgress: avgProgress,
      checkSuccessRates,
      issueDistribution,
      discrepanciesFound: invalidUsers > 0
    };
  }
}

module.exports = RegularUserValidator;