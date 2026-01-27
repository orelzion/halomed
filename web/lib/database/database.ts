/**
 * RxDB Database Instance
 * Creates and exports RxDB database with collections
 * Reference: Migration Plan Phase 2, Tasks 2.2, 2.5
 */

// Import polyfills first
import './polyfill';

import type { RxDatabase } from 'rxdb';
// Note: RxDB core functions are imported dynamically to avoid webpack/SSR issues
import {
  userStudyLogSchema,
  contentCacheSchema,
  tracksSchema,
  userPreferencesSchema,
  learningPathSchema,
  quizQuestionsSchema,
  type DatabaseCollections,
} from './schemas';
import { migrateFromPowerSync } from '../migration/powersync-to-rxdb';

let rxdbDatabase: RxDatabase<DatabaseCollections> | null = null;
let databasePromise: Promise<RxDatabase<DatabaseCollections> | null> | null = null;

// Migration flag key
const MIGRATION_FLAG_KEY = 'halomeid_migration_complete_v1';

/**
 * Get or create RxDB database instance
 * Runs migration from legacy database automatically on first load if needed
 * Uses a promise to prevent multiple simultaneous initializations
 */
export async function getDatabase(): Promise<RxDatabase<DatabaseCollections> | null> {
  if (typeof window === 'undefined') {
    return null; // SSR
  }

  if (rxdbDatabase) {
    return rxdbDatabase;
  }

  // If database is being created, wait for that promise
  if (databasePromise) {
    return databasePromise;
  }

  // Create a promise for database initialization
  databasePromise = (async () => {
    try {
      // Dynamically import RxDB to avoid SSR/webpack issues
      // Using dynamic import ensures it's only loaded client-side
      const { createRxDatabase, addRxPlugin } = await import('rxdb');
      const { getRxStorageDexie } = await import('rxdb/plugins/storage-dexie');
      const { RxDBQueryBuilderPlugin } = await import('rxdb/plugins/query-builder');
      const { RxDBUpdatePlugin } = await import('rxdb/plugins/update');
      const { RxDBMigrationSchemaPlugin } = await import('rxdb/plugins/migration-schema');

      // Add query-builder plugin (required for .limit(), .exec(), etc.)
      addRxPlugin(RxDBQueryBuilderPlugin);
      
      // Add update plugin (required for .update() method)
      addRxPlugin(RxDBUpdatePlugin);
      
      // Add migration plugin (required for schema version changes)
      addRxPlugin(RxDBMigrationSchemaPlugin);

      // Create database with Dexie storage
      // Note: getRxStorageDexie is a storage adapter, not a plugin, so we don't use addRxPlugin
      rxdbDatabase = await createRxDatabase<DatabaseCollections>({
        name: 'halomeid',
        storage: getRxStorageDexie(),
        ignoreDuplicate: true, // Prevent errors if database already exists
      });

      // Add collections
      await rxdbDatabase.addCollections({
        user_study_log: {
          schema: userStudyLogSchema as any,
        },
        content_cache: {
          schema: contentCacheSchema as any,
        },
        tracks: {
          schema: tracksSchema as any,
        },
        user_preferences: {
          schema: userPreferencesSchema as any,
          // Migration strategy for version 0 -> 1 (position-based storage)
          migrationStrategies: {
            1: function(oldDoc: any) {
              return {
                ...oldDoc,
                current_content_index: oldDoc.current_content_index ?? 0,
                path_start_date: oldDoc.path_start_date ?? null,
              };
            },
          },
        },
        learning_path: {
          schema: learningPathSchema as any,
          // Migration strategy for version 0 -> 1 (added review_items, review_count)
          migrationStrategies: {
            1: function(oldDoc: any) {
              // Add new fields with default values
              return {
                ...oldDoc,
                review_items: oldDoc.review_items || null,
                review_count: oldDoc.review_count || null,
              };
            },
          },
        },
        quiz_questions: {
          schema: quizQuestionsSchema as any,
        },
      });

      // Check if migration is needed
      const migrationComplete = localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
      
      if (!migrationComplete) {
        console.log('[RxDB] Migration not completed, running legacy migration...');
        try {
          await migrateFromPowerSync(rxdbDatabase);
          localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
          console.log('[RxDB] Migration completed successfully');
        } catch (migrationError) {
          console.error('[RxDB] Migration failed, app will continue with RxDB:', migrationError);
          // Don't throw - app continues with RxDB (may be empty for new users)
        }
      } else {
        console.log('[RxDB] Migration already completed, skipping');
      }

      return rxdbDatabase;
    } catch (error) {
      console.error('[RxDB] Failed to initialize database:', error);
      return null;
    } finally {
      // Clear the promise so we can retry if needed
      databasePromise = null;
    }
  })();

  return databasePromise;
}

/**
 * Clear database instance (for testing or reset)
 */
export function clearDatabase(): void {
  rxdbDatabase = null;
  databasePromise = null;
  localStorage.removeItem(MIGRATION_FLAG_KEY);
}
