/**
 * PowerSync Database Instance
 * Creates and exports PowerSync database with schema
 * Reference: powersync/INTEGRATION.md
 */

import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './schema';

let powerSyncDatabase: PowerSyncDatabase | null = null;

export function getPowerSyncDatabase() {
  if (!powerSyncDatabase) {
    if (typeof window === 'undefined') {
      return null;
    }

    powerSyncDatabase = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'halomed.db',
      },
    });
  }

  return powerSyncDatabase;
}
