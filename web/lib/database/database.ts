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
  contentCacheSchema,
  userPreferencesSchema,
  quizQuestionsSchema,
  type DatabaseCollections,
} from './schemas';


let rxdbDatabase: RxDatabase<DatabaseCollections> | null = null;
let databasePromise: Promise<RxDatabase<DatabaseCollections> | null> | null = null;

// Migration flag keys
const MIGRATION_FLAG_KEY = 'halomeid_migration_complete_v1';
const LEARNING_PATH_CLEANUP_KEY = 'halomeid_learning_path_cleanup_complete_v2';

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
      console.log('[RxDB] Adding collections...');
      try {
await rxdbDatabase.addCollections({
          content_cache: {
            schema: contentCacheSchema as any,
          },
          user_preferences: {
            schema: userPreferencesSchema as any,
            // Migration strategy for version 0 -> 1 (position-based storage)
            migrationStrategies: {
              1: function(oldDoc: any) {
                console.log('[RxDB] Migrating user_preferences doc from v0 to v1:', oldDoc?.id);
                return {
                  ...oldDoc,
                  current_content_index: oldDoc.current_content_index ?? 0,
                  path_start_date: oldDoc.path_start_date ?? null,
                  // Ensure all required fields exist
                  skip_friday: oldDoc.skip_friday ?? true,
                  skip_yom_tov: oldDoc.skip_yom_tov ?? true,
                  israel_mode: oldDoc.israel_mode ?? false,
                  yom_tov_dates: oldDoc.yom_tov_dates ?? [],
                  yom_tov_dates_until: oldDoc.yom_tov_dates_until ?? null,
                };
              },
            },
            autoMigrate: true, // Ensure migration runs automatically
          },
          quiz_questions: {
            schema: quizQuestionsSchema as any,
          },
        });
        console.log('[RxDB] Collections added successfully');
      } catch (collectionError) {
        console.error('[RxDB] Error adding collections:', collectionError);
        // Try to continue - some collections may have been added
      }

      // Validate that all required collections were created
      const requiredCollections = ['content_cache', 'user_preferences', 'quiz_questions'];
      const missingCollections = requiredCollections.filter(name => !rxdbDatabase?.[name as keyof DatabaseCollections]);
      if (missingCollections.length > 0) {
        console.error('[RxDB] Missing collections after initialization:', missingCollections);
        // Don't throw - continue with available collections, but log for debugging
      }

      // Legacy migration from PowerSync has been completed and removed
      // The migration flag is kept for backward compatibility
      console.log('[RxDB] PowerSync to RxDB migration already completed');

      // Clean up learning_path collection if it exists (Task 3.3)
      const learningPathCleanupComplete = localStorage.getItem(LEARNING_PATH_CLEANUP_KEY) === 'true';
      
      if (!learningPathCleanupComplete) {
        console.log('[RxDB] Cleaning up legacy learning_path collection...');
        try {
          await cleanupLearningPathCollection(rxdbDatabase);
          localStorage.setItem(LEARNING_PATH_CLEANUP_KEY, 'true');
          console.log('[RxDB] Learning path cleanup completed successfully');
        } catch (cleanupError) {
          console.error('[RxDB] Learning path cleanup failed:', cleanupError);
          // Don't throw - app continues without learning_path
        }
      } else {
        console.log('[RxDB] Learning path cleanup already completed, skipping');
      }

      return rxdbDatabase;
    } catch (error) {
      console.error('[RxDB] Failed to initialize database:', error);
      // Reset the database reference so next call will retry
      rxdbDatabase = null;
      return null;
    } finally {
      // Clear the promise so we can retry if needed
      databasePromise = null;
    }
  })();

  return databasePromise;
}

/**
 * Clean up learning_path collection from existing databases
 * This removes the large collection that's no longer needed (Task 3.3)
 */
async function cleanupLearningPathCollection(db: RxDatabase<DatabaseCollections>): Promise<void> {
  try {
    // Check if learning_path collection exists (from previous versions)
    const collections = db.collections;
    
    if ('learning_path' in collections) {
      console.log('[RxDB] Found legacy learning_path collection, removing...');
      // @ts-ignore - learning_path may not be in current DatabaseCollections type
      const learningPathCollection = collections.learning_path as any;
      
      // Drop the collection
      await learningPathCollection.remove();
      console.log('[RxDB] Successfully removed learning_path collection');
    } else {
      console.log('[RxDB] No learning_path collection found, nothing to clean up');
    }
  } catch (error) {
    console.error('[RxDB] Error cleaning up learning_path collection:', error);
    throw error;
  }
}

/**
 * Clear database instance (for testing or reset)
 */
export function clearDatabase(): void {
  rxdbDatabase = null;
  databasePromise = null;
  localStorage.removeItem(MIGRATION_FLAG_KEY);
  localStorage.removeItem(LEARNING_PATH_CLEANUP_KEY);
}
