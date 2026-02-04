// Progress validation - ensures learning progress accuracy during migration
const chalk = require('chalk');
const { getThresholds } = require('../config/validation-config');

class ProgressValidator {
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
    console.log(chalk.gray('    └─ Analyzing progress preservation...'));

    try {
      // Validate each user's progress
      for (const user of users) {
        await this.validateUserProgress(user);
      }

      // Calculate summary statistics
      this.calculateSummary();

      console.log(chalk.gray(`    └─ Validated progress for ${users.length} users`));
      
    } catch (error) {
      this.results.errors.push({
        message: `Progress validation failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.results.success = false;
    }

    return this.results;
  }

  async validateUserProgress(user) {
    try {
      const userId = user.user_id;
      
      // Get pre-migration learning path data
      const learningPathData = await this.db.getLearningPathData(userId);
      
      // Calculate expected progress from learning_path
      const expectedProgress = this.calculateProgressFromLearningPath(learningPathData);
      
      // Get post-migration progress from user_preferences
      const actualProgress = user.current_content_index || 0;
      
      // Compare progress
      const progressDifference = Math.abs(expectedProgress - actualProgress);
      const progressMatch = progressDifference <= this.thresholds.progressTolerance;

      if (!progressMatch) {
        this.results.discrepancies.push({
          userId,
          type: 'progress_mismatch',
          expected: expectedProgress,
          actual: actualProgress,
          difference: progressDifference,
          tolerance: this.thresholds.progressTolerance
        });
        
        console.log(chalk.yellow(`    └─ ⚠️  Progress mismatch for user ${userId}: ${expectedProgress} → ${actualProgress}`));
      }

      // Validate position-based consistency
      const positionValidation = this.validatePositionBasedConsistency(user, learningPathData);
      
      // Store detailed results
      this.results.details.push({
        userId,
        userType: user.userType,
        expectedProgress,
        actualProgress,
        progressMatch,
        progressDifference,
        pace: user.pace,
        pathStartDate: user.path_start_date,
        ...positionValidation
      });

    } catch (error) {
      this.results.errors.push({
        userId: user.user_id,
        message: `Failed to validate user progress: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`    └─ ❌ Error validating progress for user ${user.user_id}: ${error.message}`));
    }
  }

  calculateProgressFromLearningPath(learningPathData) {
    if (!learningPathData || learningPathData.length === 0) {
      return 0;
    }

    // Count completed learning nodes (not dividers, not quizzes, not reviews)
    const completedLearningNodes = learningPathData.filter(node => 
      node.node_type === 'learning' && 
      !node.is_divider &&
      node.completed_at !== null
    );

    return completedLearningNodes.length;
  }

  validatePositionBasedConsistency(user, learningPathData) {
    const validation = {
      paceConsistent: true,
      startDateConsistent: true,
      unlockedContentCount: 0,
      completedContentCount: 0,
      paceIssues: [],
      dateIssues: []
    };

    try {
      // Calculate expected unlocked content based on pace and start date
      const expectedUnlocked = this.calculateExpectedUnlockedContent(user);
      validation.unlockedContentCount = expectedUnlocked;

      // Count actual unlocked content in learning_path
      const actualUnlocked = learningPathData ? learningPathData.filter(node => {
        const unlockDate = new Date(node.unlock_date);
        return unlockDate <= new Date();
      }).length : 0;

      // Check if user's current position is reasonable
      const maxReasonablePosition = Math.min(expectedUnlocked, actualUnlocked);
      if (user.current_content_index > maxReasonablePosition + 1) {
        validation.paceIssues.push({
          type: 'position_too_high',
          currentPosition: user.current_content_index,
          maxReasonable: maxReasonablePosition,
          message: 'Current position exceeds expected unlocked content'
        });
        validation.paceConsistent = false;
      }

      // Validate start date consistency
      if (learningPathData && learningPathData.length > 0) {
        const earliestUnlock = new Date(Math.min(...learningPathData.map(n => new Date(n.unlock_date))));
        const userStartDate = new Date(user.path_start_date);
        
        const dateDifference = Math.abs(earliestUnlock - userStartDate) / (1000 * 60 * 60 * 24);
        if (dateDifference > 7) { // Allow 7 days tolerance
          validation.dateIssues.push({
            type: 'start_date_mismatch',
            userStartDate: user.path_start_date,
            earliestLearningPath: earliestUnlock.toISOString().split('T')[0],
            difference: Math.round(dateDifference),
            message: 'Start date significantly differs from learning path data'
          });
          validation.startDateConsistent = false;
        }
      }

      // Validate pace migration (one_mishna should have been migrated to seder_per_year)
      if (user.pace === 'one_mishna') {
        validation.paceIssues.push({
          type: 'unmigrated_pace',
          pace: user.pace,
          message: 'User still has old pace value that should have been migrated'
        });
        validation.paceConsistent = false;
      }

    } catch (error) {
      validation.paceIssues.push({
        type: 'validation_error',
        message: `Position validation error: ${error.message}`
      });
      validation.paceConsistent = false;
    }

    return validation;
  }

  calculateExpectedUnlockedContent(user) {
    if (!user.path_start_date) {
      return 0;
    }

    const startDate = new Date(user.path_start_date);
    const currentDate = new Date();
    
    // Calculate study days between start date and current date
    const studyDays = this.getStudyDaysForUser(user);
    const elapsedStudyDays = this.countStudyDaysBetween(startDate, currentDate, studyDays);
    
    // Get pace definition
    const paceRate = this.getPaceRate(user.pace);
    
    return Math.floor(elapsedStudyDays * paceRate);
  }

  getStudyDaysForUser(user) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    if (!user.skip_friday) {
      days.push('Friday');
    }
    return days;
  }

  countStudyDaysBetween(startDate, endDate, studyDays) {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.toLocaleDateString('en-US', { weekday: 'long' });
      if (studyDays.includes(dayOfWeek)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  getPaceRate(pace) {
    const paceRates = {
      'one_chapter': 8,      // ~8 mishnayot/day
      'two_mishna': 2,        // 2 mishnayot/day  
      'seder_per_year': 3,    // ~3 mishnayot/day (average)
      'one_mishna': 1,        // Should have been migrated
    };
    
    return paceRates[pace] || 2; // Default to two_mishna
  }

  // Advanced validation: Check progress calculation edge cases
  validateProgressEdgeCases(user) {
    const edgeCases = [];

    // Check users with unusually high progress
    if (user.current_content_index > 1000) {
      edgeCases.push({
        type: 'high_progress',
        userId: user.user_id,
        progress: user.current_content_index,
        message: 'User has unusually high progress - verify calculation'
      });
    }

    // Check users with progress but no start date
    if (user.current_content_index > 0 && !user.path_start_date) {
      edgeCases.push({
        type: 'progress_no_start_date',
        userId: user.user_id,
        currentContentIndex: user.current_content_index,
        message: 'User has progress but no path start date'
      });
    }

    // Check users with negative or invalid progress
    if (user.current_content_index < 0) {
      edgeCases.push({
        type: 'negative_progress',
        userId: user.user_id,
        currentContentIndex: user.current_content_index,
        message: 'User has negative progress index'
      });
    }

    // Check users with progress exceeding total Mishnah count
    if (user.current_content_index > 4505) { // Total Mishnah count
      edgeCases.push({
        type: 'progress_exceeds_total',
        userId: user.user_id,
        currentContentIndex: user.current_content_index,
        message: 'User progress exceeds total Mishnah count'
      });
    }

    return edgeCases;
  }

  calculateSummary() {
    const totalUsers = this.results.details.length;
    const matchingProgress = this.results.details.filter(detail => detail.progressMatch).length;
    const mismatchingProgress = totalUsers - matchingProgress;
    const consistentPace = this.results.details.filter(detail => detail.paceConsistent).length;
    const consistentStartDate = this.results.details.filter(detail => detail.startDateConsistent).length;

    const progressStats = this.calculateProgressStatistics();

    this.results.summary = {
      totalUsers,
      matchingProgress,
      mismatchingProgress,
      progressMatchRate: totalUsers > 0 ? ((matchingProgress / totalUsers) * 100).toFixed(2) + '%' : '0%',
      consistentPace,
      consistentStartDate,
      ...progressStats,
      discrepanciesFound: mismatchingProgress > 0
    };
  }

  calculateProgressStatistics() {
    const progressValues = this.results.details.map(detail => detail.actualProgress).filter(p => p >= 0);
    
    if (progressValues.length === 0) {
      return {
        averageProgress: 0,
        medianProgress: 0,
        maxProgress: 0,
        minProgress: 0
      };
    }

    const sorted = [...progressValues].sort((a, b) => a - b);
    const sum = progressValues.reduce((acc, val) => acc + val, 0);
    
    return {
      averageProgress: Math.round(sum / progressValues.length),
      medianProgress: sorted[Math.floor(sorted.length / 2)],
      maxProgress: Math.max(...progressValues),
      minProgress: Math.min(...progressValues)
    };
  }
}

module.exports = ProgressValidator;