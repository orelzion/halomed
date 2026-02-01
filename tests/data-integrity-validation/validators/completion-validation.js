// Completion validation - ensures quiz and review completion data preservation
const chalk = require('chalk');
const { getThresholds } = require('../config/validation-config');

class CompletionValidator {
  constructor(database) {
    this.db = database;
    this.thresholds = getThresholds();
    this.results = {
      success: true,
      summary: {
        quiz: {},
        review: {}
      },
      discrepancies: [],
      errors: [],
      warnings: [],
      details: []
    };
  }

  async validate(users) {
    console.log(chalk.gray('    └─ Analyzing quiz and review completion preservation...'));

    try {
      // Validate each user's completion data
      for (const user of users) {
        await this.validateUserCompletions(user);
      }

      // Calculate summary statistics
      this.calculateSummary();

      console.log(chalk.gray(`    └─ Validated completions for ${users.length} users`));
      
    } catch (error) {
      this.results.errors.push({
        message: `Completion validation failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.results.success = false;
    }

    return this.results;
  }

  async validateUserCompletions(user) {
    try {
      const userId = user.user_id;
      
      // Get pre-migration learning path data
      const learningPathData = await this.db.getLearningPathData(userId);
      
      // Extract completion data from learning_path
      const learningPathCompletions = this.extractCompletionsFromLearningPath(learningPathData);
      
      // Get post-migration completion data from user_preferences
      const preferenceCompletions = {
        quiz: user.quiz_completion_dates || [],
        review: user.review_completion_dates || []
      };
      
      // Validate quiz completions
      const quizValidation = this.validateQuizCompletions(
        userId, 
        learningPathCompletions.quiz, 
        preferenceCompletions.quiz
      );
      
      // Validate review completions
      const reviewValidation = this.validateReviewCompletions(
        userId,
        learningPathCompletions.review,
        preferenceCompletions.review
      );
      
      // Check for data integrity issues
      const integrityCheck = this.checkCompletionIntegrity(user, learningPathCompletions, preferenceCompletions);
      
      // Store detailed results
      this.results.details.push({
        userId,
        userType: user.userType,
        quiz: {
          preMigration: learningPathCompletions.quiz.length,
          postMigration: preferenceCompletions.quiz.length,
          dates: preferenceCompletions.quiz,
          ...quizValidation
        },
        review: {
          preMigration: learningPathCompletions.review.length,
          postMigration: preferenceCompletions.review.length,
          dates: preferenceCompletions.review,
          ...reviewValidation
        },
        integrity: integrityCheck
      });

    } catch (error) {
      this.results.errors.push({
        userId: user.user_id,
        message: `Failed to validate user completions: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`    └─ ❌ Error validating completions for user ${user.user_id}: ${error.message}`));
    }
  }

  extractCompletionsFromLearningPath(learningPathData) {
    const completions = {
      quiz: [],
      review: []
    };

    if (!learningPathData) {
      return completions;
    }

    // Extract quiz completions
    const quizNodes = learningPathData.filter(node => 
      node.node_type === 'weekly_quiz' && 
      node.completed_at !== null
    );

    completions.quiz = quizNodes.map(node => ({
      date: new Date(node.completed_at).toISOString().split('T')[0], // YYYY-MM-DD format
      nodeId: node.id,
      unlockDate: node.unlock_date
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Extract review completions
    const reviewNodes = learningPathData.filter(node => 
      ['review', 'review_session'].includes(node.node_type) && 
      node.completed_at !== null
    );

    completions.review = reviewNodes.map(node => ({
      date: new Date(node.completed_at).toISOString().split('T')[0], // YYYY-MM-DD format
      nodeId: node.id,
      unlockDate: node.unlock_date,
      reviewOf: node.review_of_node_id
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    return completions;
  }

  validateQuizCompletions(userId, preMigrationQuiz, postMigrationQuiz) {
    const validation = {
      countMatch: true,
      datesMatch: true,
      orderCorrect: true,
      missingDates: [],
      extraDates: [],
      discrepancies: []
    };

    try {
      // Check count match
      const countDifference = Math.abs(preMigrationQuiz.length - postMigrationQuiz.length);
      validation.countMatch = countDifference <= this.thresholds.arrayLengthTolerance;

      if (!validation.countMatch) {
        validation.discrepancies.push({
          type: 'quiz_count_mismatch',
          preMigration: preMigrationQuiz.length,
          postMigration: postMigrationQuiz.length,
          difference: countDifference
        });
      }

      // Convert postMigrationQuiz to date objects for comparison
      const postDates = postMigrationQuiz.map(dateStr => new Date(dateStr)).sort((a, b) => a - b);
      const preDates = preMigrationQuiz.map(q => new Date(q.date)).sort((a, b) => a - b);

      // Check for missing dates
      for (const preDate of preDates) {
        const found = postDates.some(postDate => 
          Math.abs(preDate - postDate) <= this.thresholds.dateTolerance
        );
        
        if (!found) {
          validation.missingDates.push(preDate.toISOString().split('T')[0]);
        }
      }

      // Check for extra dates
      for (const postDate of postDates) {
        const found = preDates.some(preDate => 
          Math.abs(preDate - postDate) <= this.thresholds.dateTolerance
        );
        
        if (!found) {
          validation.extraDates.push(postDate.toISOString().split('T')[0]);
        }
      }

      // Validate date order and uniqueness
      if (postDates.length > 1) {
        for (let i = 1; i < postDates.length; i++) {
          if (postDates[i] <= postDates[i - 1]) {
            validation.orderCorrect = false;
            validation.discrepancies.push({
              type: 'quiz_date_order_error',
              index: i,
              previousDate: postDates[i - 1].toISOString().split('T')[0],
              currentDate: postDates[i].toISOString().split('T')[0]
            });
          }
        }
      }

      // Check for duplicate dates
      const uniquePostDates = [...new Set(postDates)];
      if (uniquePostDates.length !== postDates.length) {
        validation.orderCorrect = false;
        validation.discrepancies.push({
          type: 'quiz_duplicate_dates',
          totalCount: postDates.length,
          uniqueCount: uniquePostDates.length
        });
      }

      validation.datesMatch = validation.missingDates.length === 0 && validation.extraDates.length === 0;

    } catch (error) {
      validation.discrepancies.push({
        type: 'quiz_validation_error',
        error: error.message
      });
      validation.datesMatch = false;
    }

    return validation;
  }

  validateReviewCompletions(userId, preMigrationReview, postMigrationReview) {
    const validation = {
      countMatch: true,
      datesMatch: true,
      orderCorrect: true,
      missingDates: [],
      extraDates: [],
      discrepancies: []
    };

    try {
      // Check count match
      const countDifference = Math.abs(preMigrationReview.length - postMigrationReview.length);
      validation.countMatch = countDifference <= this.thresholds.arrayLengthTolerance;

      if (!validation.countMatch) {
        validation.discrepancies.push({
          type: 'review_count_mismatch',
          preMigration: preMigrationReview.length,
          postMigration: postMigrationReview.length,
          difference: countDifference
        });
      }

      // Convert to date objects for comparison
      const postDates = postMigrationReview.map(dateStr => new Date(dateStr)).sort((a, b) => a - b);
      const preDates = preMigrationReview.map(r => new Date(r.date)).sort((a, b) => a - b);

      // Check for missing dates
      for (const preDate of preDates) {
        const found = postDates.some(postDate => 
          Math.abs(preDate - postDate) <= this.thresholds.dateTolerance
        );
        
        if (!found) {
          validation.missingDates.push(preDate.toISOString().split('T')[0]);
        }
      }

      // Check for extra dates
      for (const postDate of postDates) {
        const found = preDates.some(preDate => 
          Math.abs(preDate - postDate) <= this.thresholds.dateTolerance
        );
        
        if (!found) {
          validation.extraDates.push(postDate.toISOString().split('T')[0]);
        }
      }

      // Validate date order and uniqueness
      if (postDates.length > 1) {
        for (let i = 1; i < postDates.length; i++) {
          if (postDates[i] <= postDates[i - 1]) {
            validation.orderCorrect = false;
            validation.discrepancies.push({
              type: 'review_date_order_error',
              index: i,
              previousDate: postDates[i - 1].toISOString().split('T')[0],
              currentDate: postDates[i].toISOString().split('T')[0]
            });
          }
        }
      }

      // Check for duplicate dates
      const uniquePostDates = [...new Set(postDates)];
      if (uniquePostDates.length !== postDates.length) {
        validation.orderCorrect = false;
        validation.discrepancies.push({
          type: 'review_duplicate_dates',
          totalCount: postDates.length,
          uniqueCount: uniquePostDates.length
        });
      }

      validation.datesMatch = validation.missingDates.length === 0 && validation.extraDates.length === 0;

    } catch (error) {
      validation.discrepancies.push({
        type: 'review_validation_error',
        error: error.message
      });
      validation.datesMatch = false;
    }

    return validation;
  }

  checkCompletionIntegrity(user, learningPathCompletions, preferenceCompletions) {
    const integrity = {
      quizOnlyReviewNone: false,
      reviewOnlyQuizNone: false,
      reasonableFrequency: true,
      futureDates: false,
      issues: []
    };

    try {
      // Check edge case: quiz completions but no reviews
      if (preferenceCompletions.quiz.length > 0 && preferenceCompletions.review.length === 0) {
        integrity.quizOnlyReviewNone = true;
        integrity.issues.push({
          type: 'quiz_only_user',
          message: 'User has quiz completions but no review completions'
        });
      }

      // Check edge case: review completions but no quizzes
      if (preferenceCompletions.review.length > 0 && preferenceCompletions.quiz.length === 0) {
        integrity.reviewOnlyQuizNone = true;
        integrity.issues.push({
          type: 'review_only_user',
          message: 'User has review completions but no quiz completions'
        });
      }

      // Check for reasonable completion frequency
      if (preferenceCompletions.quiz.length > 0) {
        const quizDates = preferenceCompletions.quiz.map(d => new Date(d)).sort((a, b) => a - b);
        if (quizDates.length > 1) {
          const totalDays = (quizDates[quizDates.length - 1] - quizDates[0]) / (1000 * 60 * 60 * 24);
          const averageGap = totalDays / (quizDates.length - 1);
          
          // Quiz frequency should be approximately weekly (7 days ± 3 days)
          if (averageGap < 4 || averageGap > 10) {
            integrity.reasonableFrequency = false;
            integrity.issues.push({
              type: 'unusual_quiz_frequency',
              averageGap: Math.round(averageGap),
              expected: '7 days ± 3 days'
            });
          }
        }
      }

      // Check for future dates (data integrity issue)
      const currentDate = new Date();
      const futureQuizDates = preferenceCompletions.quiz.filter(d => new Date(d) > currentDate);
      const futureReviewDates = preferenceCompletions.review.filter(d => new Date(d) > currentDate);

      if (futureQuizDates.length > 0 || futureReviewDates.length > 0) {
        integrity.futureDates = true;
        integrity.issues.push({
          type: 'future_completion_dates',
          quizCount: futureQuizDates.length,
          reviewCount: futureReviewDates.length
        });
      }

    } catch (error) {
      integrity.issues.push({
        type: 'integrity_check_error',
        error: error.message
      });
    }

    return integrity;
  }

  calculateSummary() {
    const totalUsers = this.results.details.length;
    
    // Quiz statistics
    const quizStats = this.calculateQuizStatistics();
    
    // Review statistics
    const reviewStats = this.calculateReviewStatistics();
    
    // Combined statistics
    const overallDiscrepancies = [
      ...quizStats.discrepancies,
      ...reviewStats.discrepancies
    ];

    this.results.summary = {
      quiz: quizStats,
      review: reviewStats,
      totalUsers,
      overallDiscrepanciesCount: overallDiscrepancies.length,
      discrepanciesFound: overallDiscrepancies.length > 0
    };
  }

  calculateQuizStatistics() {
    const quizDetails = this.results.details.map(detail => detail.quiz);
    const totalUsers = quizDetails.length;
    
    const matchingCount = quizDetails.filter(q => q.countMatch).length;
    const matchingDates = quizDetails.filter(q => q.datesMatch).length;
    const correctOrder = quizDetails.filter(q => q.orderCorrect).length;
    
    const totalPreMigration = quizDetails.reduce((sum, q) => sum + q.preMigration, 0);
    const totalPostMigration = quizDetails.reduce((sum, q) => sum + q.postMigration, 0);
    
    const discrepancies = quizDetails.flatMap(q => q.discrepancies || []);

    return {
      totalUsers,
      matchingCount,
      matchingDates,
      correctOrder,
      countMatchRate: totalUsers > 0 ? ((matchingCount / totalUsers) * 100).toFixed(2) + '%' : '0%',
      datesMatchRate: totalUsers > 0 ? ((matchingDates / totalUsers) * 100).toFixed(2) + '%' : '0%',
      orderCorrectRate: totalUsers > 0 ? ((correctOrder / totalUsers) * 100).toFixed(2) + '%' : '0%',
      totalPreMigration,
      totalPostMigration,
      totalDifference: totalPreMigration - totalPostMigration,
      discrepancies
    };
  }

  calculateReviewStatistics() {
    const reviewDetails = this.results.details.map(detail => detail.review);
    const totalUsers = reviewDetails.length;
    
    const matchingCount = reviewDetails.filter(r => r.countMatch).length;
    const matchingDates = reviewDetails.filter(r => r.datesMatch).length;
    const correctOrder = reviewDetails.filter(r => r.orderCorrect).length;
    
    const totalPreMigration = reviewDetails.reduce((sum, r) => sum + r.preMigration, 0);
    const totalPostMigration = reviewDetails.reduce((sum, r) => sum + r.postMigration, 0);
    
    const discrepancies = reviewDetails.flatMap(r => r.discrepancies || []);

    return {
      totalUsers,
      matchingCount,
      matchingDates,
      correctOrder,
      countMatchRate: totalUsers > 0 ? ((matchingCount / totalUsers) * 100).toFixed(2) + '%' : '0%',
      datesMatchRate: totalUsers > 0 ? ((matchingDates / totalUsers) * 100).toFixed(2) + '%' : '0%',
      orderCorrectRate: totalUsers > 0 ? ((correctOrder / totalUsers) * 100).toFixed(2) + '%' : '0%',
      totalPreMigration,
      totalPostMigration,
      totalDifference: totalPreMigration - totalPostMigration,
      discrepancies
    };
  }
}

module.exports = CompletionValidator;