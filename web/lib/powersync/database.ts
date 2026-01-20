/**
 * PowerSync Database Instance
 * Creates and exports PowerSync database with schema
 * Reference: powersync/INTEGRATION.md
 */

import { PowerSyncDatabase, WASQLiteOpenFactory } from '@powersync/web';
import { AppSchema } from './schema';

let powerSyncDatabase: PowerSyncDatabase | null = null;

export function getPowerSyncDatabase() {
  if (!powerSyncDatabase) {
    if (typeof window === 'undefined') {
      return null;
    }

    // Create factory with explicit worker paths pointing to copied assets
    const factory = new WASQLiteOpenFactory({
      dbFilename: 'halomed.db',
      worker: '/@powersync/worker/WASQLiteDB.umd.js',
    });

    powerSyncDatabase = new PowerSyncDatabase({
      schema: AppSchema,
      database: factory,
      sync: {
        worker: '/@powersync/worker/SharedSyncImplementation.umd.js',
      },
    });
  }

  return powerSyncDatabase;
}
