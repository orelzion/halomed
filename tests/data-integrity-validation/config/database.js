// Database configuration and connection utilities
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Database connection helper
class DatabaseHelper {
  constructor() {
    this.client = supabase;
  }

  // Test database connection
  async testConnection() {
    try {
      const { data, error } = await this.client
        .from('user_preferences')
        .select('count', { count: 'exact', head: true });
      
      if (error) throw error;
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  // Execute query with error handling
  async executeQuery(query, params = []) {
    try {
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Query failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get user sample for validation
  async getUserSample(limit = 100, userType = 'all') {
    let query = this.client.from('user_preferences').select('*');
    
    // Filter by user type if specified
    switch (userType) {
      case 'new':
        query = query.eq('current_content_index', 0);
        break;
      case 'active':
        query = query.gt('current_content_index', 0).lt('current_content_index', 100);
        break;
      case 'power':
        query = query.gte('current_content_index', 100);
        break;
    }

    const { data, error } = await query.limit(limit);
    if (error) throw error;
    return data;
  }

  // Get all users (use with caution on large datasets)
  async getAllUsers() {
    const { data, error } = await this.client
      .from('user_preferences')
      .select('*');
    if (error) throw error;
    return data;
  }

  // Get user by ID
  async getUserById(userId) {
    const { data, error } = await this.client
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  // Get learning path data for user (pre-migration)
  async getLearningPathData(userId) {
    const { data, error } = await this.client
      .from('learning_path')
      .select('*')
      .eq('user_id', userId)
      .eq('_deleted', false)
      .order('unlock_date');
    if (error) throw error;
    return data;
  }

  // Get user study log data
  async getUserStudyLog(userId) {
    const { data, error } = await this.client
      .from('user_study_log')
      .select('*')
      .eq('user_id', userId)
      .order('study_date');
    if (error) throw error;
    return data;
  }

  // Execute raw SQL query (admin operations)
  async executeRawSQL(sql, params = []) {
    try {
      const { data, error } = await this.client.rpc('execute_sql', {
        sql_query: sql,
        sql_params: params
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get migration statistics
  async getMigrationStats() {
    try {
      // Get user preferences stats
      const { data: prefStats, error: prefError } = await this.client
        .from('user_preferences')
        .select('user_id, current_content_index, quiz_completion_dates, review_completion_dates, streak_count');

      if (prefError) throw prefError;

      // Get learning path stats (if table still exists)
      let learningPathStats = null;
      try {
        const { data: lpStats, error: lpError } = await this.client
          .from('learning_path')
          .select('user_id, node_type, completed_at, _deleted');

        if (!lpError) {
          learningPathStats = lpStats;
        }
      } catch (e) {
        // Table might not exist after migration
        console.log('ℹ️  learning_path table not accessible (expected after migration)');
      }

      return {
        userPreferences: prefStats,
        learningPath: learningPathStats,
        totalUsers: prefStats?.length || 0
      };
    } catch (error) {
      console.error('Failed to get migration stats:', error.message);
      throw error;
    }
  }

  // Validate table exists
  async tableExists(tableName) {
    try {
      const { data, error } = await this.client
        .from(tableName)
        .select('count', { count: 'exact', head: true });
      return !error;
    } catch (error) {
      return false;
    }
  }

  // Close connection (cleanup)
  async close() {
    // Supabase client doesn't need explicit closing
    console.log('Database connection closed');
  }
}

module.exports = { DatabaseHelper, supabase };