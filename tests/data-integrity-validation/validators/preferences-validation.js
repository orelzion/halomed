// Preferences validation - ensures user preferences are preserved during migration
const chalk = require('chalk');
const { getThresholds } = require('../config/validation-config');

class PreferencesValidator {
  constructor(database) {
    this.db = database;
    this.thresholds = getThresholds();
    this.results = {
      success: true,
      summary: {},
      discrepancies: [],
      errors: [],
      warnings: [],
      details: []
    };
  }

  async validate(users) {
    console.log(chalk.gray('    └─ Analyzing user preferences preservation...'));

    try {
      // Validate each user's preferences
      for (const user of users) {
        await this.validateUserPreferences(user);
      }

      // Calculate summary statistics
      this.calculateSummary();

      console.log(chalk.gray(`    └─ Validated preferences for ${users.length} users`));
      
    } catch (error) {
      this.results.errors.push({
        message: `Preferences validation failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.results.success = false;
    }

    return this.results;
  }

  async validateUserPreferences(user) {
    try {
      const userId = user.user_id;
      
      // Validate core preferences
      const coreValidation = this.validateCorePreferences(user);
      
      // Validate migrated preferences
      const migrationValidation = this.validateMigratedPreferences(user);
      
      // Validate data types and formats
      const typeValidation = this.validateDataTypes(user);
      
      // Validate business logic consistency
      const logicValidation = this.validateBusinessLogic(user);
      
      // Store detailed results
      this.results.details.push({
        userId,
        userType: user.userType,
        core: coreValidation,
        migration: migrationValidation,
        types: typeValidation,
        logic: logicValidation,
        overallValid: coreValidation.valid && 
                      migrationValidation.valid && 
                      typeValidation.valid && 
                      logicValidation.valid
      });

    } catch (error) {
      this.results.errors.push({
        userId: user.user_id,
        message: `Failed to validate user preferences: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`    └─ ❌ Error validating preferences for user ${user.user_id}: ${error.message}`));
    }
  }

  validateCorePreferences(user) {
    const validation = {
      valid: true,
      issues: []
    };

    try {
      // Required fields validation
      const requiredFields = [
        'user_id',
        'pace',
        'review_intensity',
        'path_start_date',
        'current_content_index',
        'streak_count'
      ];

      for (const field of requiredFields) {
        if (user[field] === null || user[field] === undefined) {
          validation.issues.push({
            type: 'missing_required_field',
            field,
            message: `Required field '${field}' is null or undefined`
          });
          validation.valid = false;
        }
      }

      // Pace validation
      const validPaces = ['one_chapter', 'two_mishna', 'seder_per_year'];
      if (!validPaces.includes(user.pace)) {
        validation.issues.push({
          type: 'invalid_pace',
          pace: user.pace,
          validPaces,
          message: `Invalid pace value: ${user.pace}`
        });
        validation.valid = false;
      }

      // Review intensity validation
      const validIntensities = ['none', 'light', 'medium', 'intensive'];
      if (!validIntensities.includes(user.review_intensity)) {
        validation.issues.push({
          type: 'invalid_review_intensity',
          intensity: user.review_intensity,
          validIntensities,
          message: `Invalid review_intensity value: ${user.review_intensity}`
        });
        validation.valid = false;
      }

      // Boolean field validation
      const booleanFields = ['skip_friday'];
      for (const field of booleanFields) {
        if (user[field] !== undefined && typeof user[field] !== 'boolean') {
          validation.issues.push({
            type: 'invalid_boolean_field',
            field,
            value: user[field],
            actualType: typeof user[field],
            message: `Boolean field '${field}' has non-boolean value`
          });
          validation.valid = false;
        }
      }

      // Numeric field validation
      const numericFields = [
        { name: 'current_content_index', min: 0, max: 4505 },
        { name: 'streak_count', min: 0, max: 1000 } // Reasonable upper bound
      ];

      for (const { name, min, max } of numericFields) {
        const value = user[name];
        if (typeof value !== 'number' || isNaN(value)) {
          validation.issues.push({
            type: 'invalid_numeric_field',
            field: name,
            value,
            message: `Numeric field '${name}' has non-numeric value`
          });
          validation.valid = false;
        } else if (value < min || value > max) {
          validation.issues.push({
            type: 'numeric_out_of_range',
            field: name,
            value,
            min,
            max,
            message: `Numeric field '${name}' is out of valid range [${min}, ${max}]`
          });
          validation.valid = false;
        }
      }

    } catch (error) {
      validation.issues.push({
        type: 'validation_error',
        error: error.message,
        message: 'Error during core preferences validation'
      });
      validation.valid = false;
    }

    return validation;
  }

  validateMigratedPreferences(user) {
    const validation = {
      valid: true,
      issues: []
    };

    try {
      // Check for old pace values that should have been migrated
      if (user.pace === 'one_mishna') {
        validation.issues.push({
          type: 'unmigrated_pace',
          currentPace: user.pace,
          expectedPace: 'seder_per_year',
          message: 'User still has old pace value that should have been migrated to seder_per_year'
        });
        validation.valid = false;
      }

      // Validate array fields exist (migration artifacts)
      const arrayFields = [
        'quiz_completion_dates',
        'review_completion_dates',
        'yom_tov_dates'
      ];

      for (const field of arrayFields) {
        const value = user[field];
        if (value !== undefined && !Array.isArray(value)) {
          validation.issues.push({
            type: 'invalid_array_field',
            field,
            value,
            actualType: typeof value,
            message: `Array field '${field}' is not an array`
          });
          validation.valid = false;
        }
      }

      // Validate date format in array fields
      const dateArrayFields = ['quiz_completion_dates', 'review_completion_dates'];
      for (const field of dateArrayFields) {
        const dates = user[field] || [];
        for (let i = 0; i < dates.length; i++) {
          const dateStr = dates[i];
          if (typeof dateStr !== 'string') {
            validation.issues.push({
              type: 'invalid_date_in_array',
              field,
              index: i,
              value: dateStr,
              message: `Date in array '${field}' is not a string`
            });
            validation.valid = false;
          } else {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
              validation.issues.push({
                type: 'invalid_date_format',
                field,
                index: i,
                value: dateStr,
                message: `Invalid date format in array '${field}': ${dateStr}`
              });
              validation.valid = false;
            }
          }
        }
      }

      // Validate path_start_date is reasonable
      if (user.path_start_date) {
        const startDate = new Date(user.path_start_date);
        const now = new Date();
        const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
        
        if (startDate > now) {
          validation.issues.push({
            type: 'future_start_date',
            startDate: user.path_start_date,
            message: 'Path start date is in the future'
          });
          validation.valid = false;
        }
        
        if (startDate < oneYearAgo) {
          validation.issues.push({
            type: 'very_old_start_date',
            startDate: user.path_start_date,
            message: 'Path start date is more than one year old'
          });
          // Don't mark as invalid, just warning
        }
      }

    } catch (error) {
      validation.issues.push({
        type: 'migration_validation_error',
        error: error.message,
        message: 'Error during migration preferences validation'
      });
      validation.valid = false;
    }

    return validation;
  }

  validateDataTypes(user) {
    const validation = {
      valid: true,
      issues: []
    };

    try {
      // Expected data types for each field
      const expectedTypes = {
        user_id: 'string',
        pace: 'string',
        review_intensity: 'string',
        path_start_date: 'string', // Date string
        current_content_index: 'number',
        streak_count: 'number',
        skip_friday: 'boolean',
        quiz_completion_dates: 'object', // Array
        review_completion_dates: 'object', // Array
        yom_tov_dates: 'object', // Array
        last_study_date: 'string', // Date string or null
        created_at: 'string', // ISO string
        updated_at: 'string' // ISO string
      };

      for (const [field, expectedType] of Object.entries(expectedTypes)) {
        const value = user[field];
        const actualType = value === null ? 'null' : typeof value;

        if (value !== undefined && actualType !== expectedType) {
          validation.issues.push({
            type: 'type_mismatch',
            field,
            expectedType,
            actualType,
            value,
            message: `Field '${field}' expected type '${expectedType}' but got '${actualType}'`
          });
          validation.valid = false;
        }
      }

    } catch (error) {
      validation.issues.push({
        type: 'type_validation_error',
        error: error.message,
        message: 'Error during data type validation'
      });
      validation.valid = false;
    }

    return validation;
  }

  validateBusinessLogic(user) {
    const validation = {
      valid: true,
      issues: []
    };

    try {
      // Check business logic consistency

      // If user has progress, they should have a last_study_date
      if (user.current_content_index > 0 && !user.last_study_date) {
        validation.issues.push({
          type: 'progress_without_last_study',
          currentContentIndex: user.current_content_index,
          lastStudyDate: user.last_study_date,
          message: 'User has progress but no last study date'
        });
        validation.valid = false;
      }

      // If user has a streak, they should have a last_study_date
      if (user.streak_count > 0 && !user.last_study_date) {
        validation.issues.push({
          type: 'streak_without_last_study',
          streakCount: user.streak_count,
          lastStudyDate: user.last_study_date,
          message: 'User has streak but no last study date'
        });
        validation.valid = false;
      }

      // If user has quiz/review completions, they should have progress
      const hasQuizCompletions = user.quiz_completion_dates && user.quiz_completion_dates.length > 0;
      const hasReviewCompletions = user.review_completion_dates && user.review_completion_dates.length > 0;
      
      if ((hasQuizCompletions || hasReviewCompletions) && user.current_content_index === 0) {
        validation.issues.push({
          type: 'completions_without_progress',
          hasQuizCompletions,
          hasReviewCompletions,
          currentContentIndex: user.current_content_index,
          message: 'User has quiz/review completions but no learning progress'
        });
        validation.valid = false;
      }

      // Check for reasonable last_study_date if it exists
      if (user.last_study_date) {
        const lastStudy = new Date(user.last_study_date);
        const now = new Date();
        const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
        
        if (lastStudy > now) {
          validation.issues.push({
            type: 'future_last_study',
            lastStudyDate: user.last_study_date,
            message: 'Last study date is in the future'
          });
          validation.valid = false;
        }
        
        if (lastStudy < oneYearAgo && user.streak_count > 0) {
          validation.issues.push({
            type: 'old_last_study_with_streak',
            lastStudyDate: user.last_study_date,
            streakCount: user.streak_count,
            message: 'Last study date is very old but user has a streak'
          });
          validation.valid = false;
        }
      }

      // Validate timestamp ordering (created_at should be before updated_at)
      if (user.created_at && user.updated_at) {
        const created = new Date(user.created_at);
        const updated = new Date(user.updated_at);
        
        if (created > updated) {
          validation.issues.push({
            type: 'invalid_timestamp_order',
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            message: 'created_at is after updated_at'
          });
          validation.valid = false;
        }
      }

    } catch (error) {
      validation.issues.push({
        type: 'business_logic_validation_error',
        error: error.message,
        message: 'Error during business logic validation'
      });
      validation.valid = false;
    }

    return validation;
  }

  calculateSummary() {
    const totalUsers = this.results.details.length;
    const validUsers = this.results.details.filter(detail => detail.overallValid).length;
    const invalidUsers = totalUsers - validUsers;

    // Calculate validation area statistics
    const coreValid = this.results.details.filter(detail => detail.core.valid).length;
    const migrationValid = this.results.details.filter(detail => detail.migration.valid).length;
    const typesValid = this.results.details.filter(detail => detail.types.valid).length;
    const logicValid = this.results.details.filter(detail => detail.logic.valid).length;

    // Collect all issues
    const allIssues = [
      ...this.results.details.flatMap(detail => detail.core.issues),
      ...this.results.details.flatMap(detail => detail.migration.issues),
      ...this.results.details.flatMap(detail => detail.types.issues),
      ...this.results.details.flatMap(detail => detail.logic.issues)
    ];

    // Group issues by type
    const issuesByType = allIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});

    // Pace distribution
    const paceDistribution = this.results.details.reduce((acc, detail) => {
      const user = this.findUserById(detail.userId);
      if (user && user.pace) {
        acc[user.pace] = (acc[user.pace] || 0) + 1;
      }
      return acc;
    }, {});

    // Review intensity distribution
    const intensityDistribution = this.results.details.reduce((acc, detail) => {
      const user = this.findUserById(detail.userId);
      if (user && user.review_intensity) {
        acc[user.review_intensity] = (acc[user.review_intensity] || 0) + 1;
      }
      return acc;
    }, {});

    this.results.summary = {
      totalUsers,
      validUsers,
      invalidUsers,
      overallValidRate: totalUsers > 0 ? ((validUsers / totalUsers) * 100).toFixed(2) + '%' : '0%',
      coreValid,
      migrationValid,
      typesValid,
      logicValid,
      coreValidRate: totalUsers > 0 ? ((coreValid / totalUsers) * 100).toFixed(2) + '%' : '0%',
      migrationValidRate: totalUsers > 0 ? ((migrationValid / totalUsers) * 100).toFixed(2) + '%' : '0%',
      typesValidRate: totalUsers > 0 ? ((typesValid / totalUsers) * 100).toFixed(2) + '%' : '0%',
      logicValidRate: totalUsers > 0 ? ((logicValid / totalUsers) * 100).toFixed(2) + '%' : '0%',
      totalIssues: allIssues.length,
      issuesByType,
      paceDistribution,
      intensityDistribution,
      discrepanciesFound: invalidUsers > 0
    };
  }

  findUserById(userId) {
    // This would need access to the original user data
    // For now, return null - this helper method would be implemented differently
    // in the actual validation orchestrator
    return null;
  }
}

module.exports = PreferencesValidator;