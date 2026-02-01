/**
 * PowerSync to RxDB Data Migration Utility
 * Migrates all data from PowerSync SQLite to RxDB IndexedDB
 * Reference: Migration Plan Phase 2, Task 2.4
 * 
 * Note: This migration gracefully handles the case where PowerSync is not available
 * (e.g., after PowerSync packages are removed). It will simply skip migration in that case.
 */

import { RxDatabase } from 'rxdb';
import type { DatabaseCollections } from '../database/schemas';

/**
 * Get PowerSync database (if available at runtime)
 * Uses completely dynamic access to avoid build-time imports
 * Returns null if PowerSync is not available (expected after migration)
 */
async function getPowerSyncDatabase(): Promise<any> {
  try {
    // Only try to access if we're in the browser
    if (typeof window === 'undefined') {
      return null;
    }

    // Check if PowerSync database exists in IndexedDB (PowerSync uses IndexedDB)
    // This is a heuristic - if PowerSync was used, there might be data in IndexedDB
    // But we can't actually access it without the PowerSync module
    // So we'll just skip migration if PowerSync module isn't available
    
    // Try to use eval to dynamically import (avoids webpack static analysis)
    // This will only work if PowerSync packages are still installed
    try {
      // eslint-disable-next-line no-eval
      const importFn = eval('(specifier) => import(specifier)');
      const module = await importFn('../powersync/database').catch(() => null);
      if (module?.getPowerSyncDatabase) {
        return module.getPowerSyncDatabase();
      }
    } catch {
      // PowerSync not available - this is expected after migration
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Normalize PowerSync query results to array
 */
function normalizeRows<T>(result: any): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }
  if (!result) {
    return [];
  }
  if (Array.isArray(result.rows)) {
    return result.rows as T[];
  }
  if (Array.isArray(result.rows?._array)) {
    return result.rows._array as T[];
  }
  if (typeof result.rows?.item === 'function' && typeof result.rows?.length === 'number') {
    return Array.from({ length: result.rows.length }, (_, i) => result.rows.item(i)) as T[];
  }
  return [];
}

/**
 * Convert PowerSync boolean (integer) to RxDB boolean
 */
function convertBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return false;
}

/**
 * Convert PowerSync data to RxDB format
 */
function convertToRxDBFormat(data: any, tableName: string): any {
  const converted = { ...data };

  // Convert boolean fields (stored as integers in PowerSync)
  if (tableName === 'user_study_log') {
    converted.is_completed = convertBoolean(converted.is_completed);
    converted._deleted = false; // Default to not deleted
    if (!converted.updated_at) {
      converted.updated_at = converted.completed_at || new Date().toISOString();
    }

  } else {
    converted._deleted = false;
    if (!converted.updated_at) {
      converted.updated_at = converted.created_at || new Date().toISOString();
    }
  }

  // Ensure all required fields are present
  if (tableName === 'content_cache' && !converted.he_ref) {
    converted.he_ref = null;
  }

  return converted;
}

/**
 * Migrate data from PowerSync to RxDB
 */
export async function migrateFromPowerSync(
  rxdb: RxDatabase<DatabaseCollections>
): Promise<void> {
  const powerSyncDb = await getPowerSyncDatabase();
  if (!powerSyncDb) {
    console.log('[Migration] No PowerSync database found, skipping migration');
    return;
  }

  try {
    // Check if PowerSync has data by trying to query
    const testResult = await powerSyncDb.getAll('SELECT COUNT(*) as count FROM user_study_log LIMIT 1').catch(() => null);
    if (!testResult) {
      console.log('[Migration] PowerSync database not accessible, skipping migration');
      return;
    }

    const rows = normalizeRows<{ count: number }>(testResult);
    const hasData = rows.length > 0 && rows[0]?.count > 0;
    if (!hasData) {
      console.log('[Migration] No PowerSync data found, skipping migration');
      return;
    }
  } catch (error) {
    console.log('[Migration] Could not check PowerSync data, skipping migration:', error);
    return;
  }

  console.log('[Migration] Starting PowerSync to RxDB migration...');

  try {
    // DEPRECATED: user_study_log table removed (replaced by user_preferences + learning_path)
    // console.log('[Migration] Migrating user_study_log...');
    // const studyLogs = normalizeRows(await powerSyncDb.getAll('SELECT * FROM user_study_log').catch(() => []));
    // if (studyLogs.length > 0) {
    //   const converted = studyLogs.map((log: any) => convertToRxDBFormat(log, 'user_study_log'));
    //   await rxdb.user_study_log.bulkInsert(converted);
    //   console.log(`[Migration] Migrated ${converted.length} user_study_log entries`);
    // }

    // Migrate content_cache
    console.log('[Migration] Migrating content_cache...');
    const contentCache = normalizeRows(await powerSyncDb.getAll('SELECT * FROM content_cache').catch(() => []));
    if (contentCache.length > 0) {
      const converted = contentCache.map((content: any) => convertToRxDBFormat(content, 'content_cache'));
      await rxdb.content_cache.bulkInsert(converted);
      console.log(`[Migration] Migrated ${converted.length} content_cache entries`);
    }

    // DEPRECATED: tracks table removed (replaced by user_preferences + learning_path)
    // console.log('[Migration] Migrating tracks...');
    // const tracks = normalizeRows(await powerSyncDb.getAll('SELECT * FROM tracks').catch(() => []));
    // if (tracks.length > 0) {
    //   const converted = tracks.map((track: any) => convertToRxDBFormat(track, 'tracks'));
    //   await rxdb.tracks.bulkInsert(converted);
    //   console.log(`[Migration] Migrated ${converted.length} tracks`);
    // }

    // Migrate user_preferences
    console.log('[Migration] Migrating user_preferences...');
    const preferences = normalizeRows(await powerSyncDb.getAll('SELECT * FROM user_preferences').catch(() => []));
    if (preferences.length > 0) {
      const converted = preferences.map((pref: any) => convertToRxDBFormat(pref, 'user_preferences'));
      await rxdb.user_preferences.bulkInsert(converted);
      console.log(`[Migration] Migrated ${converted.length} user_preferences entries`);
    }

    // DEPRECATED: learning_path collection removed (Task 3.3)
    // Position-based model computes path from current_content_index in user_preferences
    // No longer need to migrate thousands of learning_path rows
    console.log('[Migration] Skipping learning_path migration (position-based model)');

    // Migrate quiz_questions
    console.log('[Migration] Migrating quiz_questions...');
    const quizQuestions = normalizeRows(await powerSyncDb.getAll('SELECT * FROM quiz_questions').catch(() => []));
    if (quizQuestions.length > 0) {
      const converted = quizQuestions.map((quiz: any) => convertToRxDBFormat(quiz, 'quiz_questions'));
      await rxdb.quiz_questions.bulkInsert(converted);
      console.log(`[Migration] Migrated ${converted.length} quiz_questions entries`);
    }

    console.log('[Migration] Migration completed successfully');
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}
