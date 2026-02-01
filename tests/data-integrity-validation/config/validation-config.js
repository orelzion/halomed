// Validation configuration parameters

const validationConfig = {
  // Database connection
  database: {
    maxConnections: 10,
    queryTimeout: 30000, // 30 seconds
  },

  // Validation thresholds and tolerances
  thresholds: {
    // Streak validation tolerance (in days)
    streakTolerance: 0, // Must be exact match
    
    // Progress validation tolerance
    progressTolerance: 0, // Must be exact match
    
    // Date comparison tolerance (in milliseconds)
    dateTolerance: 1000, // 1 second tolerance for timestamp comparisons
    
    // Array length tolerance
    arrayLengthTolerance: 0, // Must be exact match
    
    // Percentage tolerance for rate calculations
    rateTolerance: 0.01, // 1% tolerance
  },

  // User sampling for validation
  sampling: {
    // Number of users to validate per user type
    newUsersSample: 50,
    regularUsersSample: 100,
    powerUsersSample: 30,
    edgeCasesSample: 20,
    
    // Maximum total users to validate
    maxTotalUsers: 500,
    
    // Random seed for reproducible sampling
    randomSeed: 12345,
  },

  // User type definitions
  userTypes: {
    // New users: No learning progress
    new: {
      currentContentIndex: 0,
      minQuizCompletions: 0,
      minReviewCompletions: 0,
    },
    
    // Regular users: Some progress
    regular: {
      currentContentIndexMin: 1,
      currentContentIndexMax: 50,
      minQuizCompletions: 1,
      minReviewCompletions: 0,
    },
    
    // Power users: Extensive progress
    power: {
      currentContentIndexMin: 100,
      minQuizCompletions: 5,
      minReviewCompletions: 3,
    },
    
    // Edge cases: Unusual patterns
    edge: {
      includeQuizOnly: true, // Quiz completions but no reviews
      includeReviewOnly: true, // Review completions but no quizzes
      includeHighStreak: true, // High streak counts
      includeLongInactivity: true, // Long gaps in activity
    }
  },

  // Validation areas configuration
  validationAreas: {
    // Core validations (always run)
    core: [
      'streak',
      'progress', 
      'quizCompletions',
      'reviewCompletions',
      'preferences'
    ],
    
    // Extended validations (optional)
    extended: [
      'migrationConsistency',
      'dataIntegrity',
      'performanceMetrics',
      'rollbackCapability'
    ],
  },

  // Progress calculation parameters
  progress: {
    // Total Mishnah count in the sequence
    totalMishnayot: 4506,
    
    // Pace definitions (mishnayot per day)
    paceDefinitions: {
      'one_chapter': 8,      // ~8 mishnayot/day, ~2 years
      'two_mishna': 2,        // 2 mishnayot/day, ~8 years  
      'seder_per_year': 3,    // 2-4 mishnayot/day (dynamic), ~6 years
    },
    
    // Study days configuration
    studyDays: {
      weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      fridayOptional: true,
      saturday: false, // Shabbat
    }
  },

  // Streak calculation rules
  streak: {
    // Study days that count toward streak
    validStudyDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    
    // Whether Friday counts (based on user preference)
    fridayCountsDependsOnPreference: true,
    
    // Saturday never counts (Shabbat)
    saturdayNeverCounts: true,
    
    // Retroactive completions (past dates) don't count toward streak
    retroactiveCompletionsDontCount: true,
  },

  // Reporting configuration
  reporting: {
    // Output directory
    outputDir: './output',
    
    // Report formats
    formats: ['json', 'html', 'console'],
    
    // Include charts in HTML report
    includeCharts: true,
    
    // Chart configuration
    charts: {
      width: 800,
      height: 600,
      theme: 'light',
    },
    
    // Detail level
    detailLevel: 'full', // 'summary', 'detailed', 'full'
    
    // Include user-level details in report
    includeUserDetails: true,
    
    // Maximum users to include in detailed report
    maxUserDetails: 50,
  },

  // Rollback testing configuration
  rollback: {
    // Test rollback on sample users only
    testOnSampleOnly: true,
    
    // Sample size for rollback testing
    rollbackSampleSize: 10,
    
    // Rollback test timeout (minutes)
    rollbackTimeout: 5,
    
    // Verify rollback restores original data exactly
    verifyExactRestoration: true,
  },

  // Performance monitoring
  performance: {
    // Track query execution times
    trackQueryTimes: true,
    
    // Track memory usage
    trackMemoryUsage: true,
    
    // Performance thresholds (warnings)
    warnings: {
      queryTimeMs: 1000, // Warn if query takes > 1 second
      memoryUsageMB: 500, // Warn if memory usage > 500MB
    }
  },

  // Logging configuration
  logging: {
    level: 'info', // 'error', 'warn', 'info', 'debug'
    // Log to file
    fileLogging: true,
    logFile: './output/validation.log',
    // Log to console
    consoleLogging: true,
    // Include timestamps
    timestamps: true,
  },

  // Validation modes
  modes: {
    // Quick mode: Core validations on small sample
    quick: {
      sampleSize: 20,
      userTypes: ['regular'],
      validationAreas: ['streak', 'progress', 'preferences'],
      detailedReporting: false,
    },
    
    // Full mode: All validations on full sample
    full: {
      sampleSize: 'all', // Use configured sample sizes
      userTypes: ['new', 'regular', 'power', 'edge'],
      validationAreas: 'all',
      detailedReporting: true,
    },
    
    // Production mode: Validations suitable for production deployment
    production: {
      sampleSize: 100,
      userTypes: ['regular', 'power'],
      validationAreas: ['streak', 'progress', 'completions', 'preferences'],
      detailedReporting: true,
      rollbackTesting: false, // Skip rollback in production
    }
  }
};

// Get configuration for specific mode
function getModeConfig(mode = 'full') {
  return validationConfig.modes[mode] || validationConfig.modes.full;
}

// Get user type configuration
function getUserTypeConfig(userType) {
  return validationConfig.userTypes[userType] || validationConfig.userTypes.regular;
}

// Get threshold values
function getThresholds() {
  return validationConfig.thresholds;
}

module.exports = {
  validationConfig,
  getModeConfig,
  getUserTypeConfig,
  getThresholds,
};