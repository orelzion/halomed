// Streak validation - ensures streak preservation during migration
const chalk = require('chalk');
const { getThresholds } = require('../config/validation-config');

class StreakValidator {
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
    console.log(chalk.gray('    └─ Analyzing streak preservation...'));

    try {
      // Validate each user's streak
      for (const user of users) {
        await this.validateUserStreak(user);
      }

      // Calculate summary statistics
      this.calculateSummary();

      console.log(chalk.gray(`    └─ Validated ${users.length} users`));
      
    } catch (error) {
      this.results.errors.push({
        message: `Streak validation failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.results.success = false;
    }

    return this.results;
  }

  async validateUserStreak(user) {
    try {
      const userId = user.user_id;
      
      // Get pre-migration learning path data
      const learningPathData = await this.db.getLearningPathData(userId);
      
      // Calculate pre-migration streak from learning_path
      const preMigrationStreak = this.calculateStreakFromLearningPath(learningPathData, user);
      
      // Get post-migration streak from user_preferences
      const postMigrationStreak = user.streak_count || 0;
      
      // Compare streaks
      const streakDifference = Math.abs(preMigrationStreak - postMigrationStreak);
      const streakMatch = streakDifference <= this.thresholds.streakTolerance;

      if (!streakMatch) {
        this.results.discrepancies.push({
          userId,
          type: 'streak_mismatch',
          preMigration: preMigrationStreak,
          postMigration: postMigrationStreak,
          difference: streakDifference,
          tolerance: this.thresholds.streakTolerance
        });
        
        console.log(chalk.yellow(`    └─ ⚠️  Streak mismatch for user ${userId}: ${preMigrationStreak} → ${postMigrationStreak}`));
      }

      // Store detailed results
      this.results.details.push({
        userId,
        userType: user.userType,
        preMigrationStreak,
        postMigrationStreak,
        streakMatch,
        lastStudyDate: user.last_study_date,
        currentContentIndex: user.current_content_index
      });

    } catch (error) {
      this.results.errors.push({
        userId: user.user_id,
        message: `Failed to validate user streak: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.log(chalk.red(`    └─ ❌ Error validating streak for user ${user.user_id}: ${error.message}`));
    }
  }

  calculateStreakFromLearningPath(learningPathData, user) {
    if (!learningPathData || learningPathData.length === 0) {
      return 0;
    }

    // Filter for learning nodes only (not dividers, quizzes, reviews)
    const learningNodes = learningPathData.filter(node => 
      node.node_type === 'learning' && 
      !node.is_divider &&
      node.completed_at !== null
    );

    if (learningNodes.length === 0) {
      return 0;
    }

    // Sort by unlock date (newest first)
    learningNodes.sort((a, b) => new Date(b.unlock_date) - new Date(a.unlock_date));

    let streak = 0;
    const studyDays = this.getValidStudyDays(user.skip_friday);

    // Check each day consecutively
    for (let i = 0; i < learningNodes.length; i++) {
      const node = learningNodes[i];
      const unlockDate = new Date(node.unlock_date);
      const completionDate = new Date(node.completed_at);
      
      // Check if this is a valid study day
      const dayOfWeek = unlockDate.toLocaleDateString('en-US', { weekday: 'long' });
      if (!studyDays.includes(dayOfWeek)) {
        continue; // Skip non-study days
      }

      // Check if completion was on time (retroactive completions don't count)
      if (completionDate > unlockDate) {
        break; // Late completion breaks streak
      }

      // If this is not the first node, check consecutive day
      if (i > 0) {
        const prevNode = learningNodes[i - 1];
        const prevDate = new Date(prevNode.unlock_date);
        const currentDate = new Date(node.unlock_date);
        
        // Calculate days difference, accounting for skipped days
        const daysDiff = this.countStudyDaysBetween(prevDate, currentDate, studyDays);
        
        if (daysDiff !== 1) {
          break; // Not consecutive study day
        }
      }

      streak++;
    }

    return streak;
  }

  getValidStudyDays(skipFriday) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    if (!skipFriday) {
      days.push('Friday');
    }
    return days;
  }

  countStudyDaysBetween(startDate, endDate, studyDays) {
    let count = 0;
    const current = new Date(startDate);
    current.setDate(current.getDate() + 1); // Start from day after

    while (current < endDate) {
      const dayOfWeek = current.toLocaleDateString('en-US', { weekday: 'long' });
      if (studyDays.includes(dayOfWeek)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  // Alternative streak calculation using user_study_log (if available)
  calculateStreakFromStudyLog(studyLogData, user) {
    if (!studyLogData || studyLogData.length === 0) {
      return 0;
    }

    const studyDays = this.getValidStudyDays(user.skip_friday);
    let streak = 0;

    // Sort by study date descending
    studyLogData.sort((a, b) => new Date(b.study_date) - new Date(a.study_date));

    for (let i = 0; i < studyLogData.length; i++) {
      const entry = studyLogData[i];
      
      if (!entry.is_completed) {
        break; // Incomplete day breaks streak
      }

      // Check if this is a valid study day
      const studyDate = new Date(entry.study_date);
      const dayOfWeek = studyDate.toLocaleDateString('en-US', { weekday: 'long' });
      if (!studyDays.includes(dayOfWeek)) {
        continue; // Skip non-study days
      }

      // Check consecutive days
      if (i > 0) {
        const prevEntry = studyLogData[i - 1];
        const daysDiff = Math.floor(
          (new Date(prevEntry.study_date) - new Date(entry.study_date)) / 
          (1000 * 60 * 60 * 24)
        );

        // Account for skipped days (like Shabbat)
        const studyDaysDiff = this.countStudyDaysBetween(
          new Date(entry.study_date),
          new Date(prevEntry.study_date),
          studyDays
        );

        if (studyDaysDiff !== 1) {
          break; // Not consecutive study day
        }
      }

      streak++;
    }

    return streak;
  }

  calculateSummary() {
    const totalUsers = this.results.details.length;
    const matchingStreaks = this.results.details.filter(detail => detail.streakMatch).length;
    const mismatchingStreaks = totalUsers - matchingStreaks;

    this.results.summary = {
      totalUsers,
      matchingStreaks,
      mismatchingStreaks,
      matchRate: totalUsers > 0 ? ((matchingStreaks / totalUsers) * 100).toFixed(2) + '%' : '0%',
      averageStreakLength: this.calculateAverageStreakLength(),
      maxStreakLength: this.calculateMaxStreakLength(),
      discrepanciesFound: mismatchingStreaks > 0
    };
  }

  calculateAverageStreakLength() {
    const streaks = this.results.details.map(detail => detail.postMigrationStreak);
    if (streaks.length === 0) return 0;
    
    const sum = streaks.reduce((acc, streak) => acc + streak, 0);
    return (sum / streaks.length).toFixed(1);
  }

  calculateMaxStreakLength() {
    const streaks = this.results.details.map(detail => detail.postMigrationStreak);
    return Math.max(...streaks, 0);
  }

  // Advanced validation: Check streak calculation edge cases
  validateEdgeCases(user) {
    const edgeCases = [];

    // Check users with high streaks
    if (user.streak_count > 30) {
      edgeCases.push({
        type: 'high_streak',
        userId: user.user_id,
        streakCount: user.streak_count,
        message: 'User has unusually high streak - verify calculation'
      });
    }

    // Check users with recent activity but no streak
    if (user.last_study_date && user.streak_count === 0) {
      const daysSinceLastStudy = Math.floor(
        (new Date() - new Date(user.last_study_date)) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastStudy <= 7) {
        edgeCases.push({
          type: 'recent_activity_no_streak',
          userId: user.user_id,
          lastStudyDate: user.last_study_date,
          daysSinceLastStudy,
          message: 'User has recent activity but no streak'
        });
      }
    }

    // Check users with progress but no last study date
    if (user.current_content_index > 0 && !user.last_study_date) {
      edgeCases.push({
        type: 'progress_no_last_study',
        userId: user.user_id,
        currentContentIndex: user.current_content_index,
        message: 'User has progress but no last study date'
      });
    }

    return edgeCases;
  }
}

module.exports = StreakValidator;