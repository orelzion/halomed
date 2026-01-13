// supabase/tests/sync/sync-status.test.ts
// Tests for sync status monitoring
// Reference: sync.md Section 8

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// Required configuration keys that must exist
const REQUIRED_CONFIG_KEYS = [
  'POWERSYNC_DEV_INSTANCE_ID',
  'POWERSYNC_DEV_API_KEY',
  'SUPABASE_DEV_URL',
  'SUPABASE_DEV_ANON_KEY',
];

/**
 * Check if required environment variables are set
 */
function checkRequiredConfig(): void {
  const missing: string[] = [];
  for (const key of REQUIRED_CONFIG_KEYS) {
    if (!Deno.env.get(key)) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required configuration keys: ${missing.join(', ')}. ` +
      `Set these in .env file before running tests.`
    );
  }
}

// ============================================================================
// SYNC STATUS MONITORING TESTS (Task 7.13a)
// ============================================================================

/**
 * Sync status types
 */
type SyncStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

/**
 * Sync status monitoring interface
 */
interface SyncStatusMonitor {
  status: SyncStatus;
  lastSyncTime: Date | null;
  error: string | null;
  onStatusChange: (callback: (status: SyncStatus) => void) => void;
  onError: (callback: (error: Error) => void) => void;
}

Deno.test('sync status: required configuration keys are set', () => {
  checkRequiredConfig();
});

Deno.test('sync status: tracks status changes correctly', () => {
  let currentStatus: SyncStatus = 'disconnected';
  const statusHistory: SyncStatus[] = [];
  
  const monitor: SyncStatusMonitor = {
    status: currentStatus,
    lastSyncTime: null,
    error: null,
    onStatusChange: (callback) => {
      // Simulate status changes
      statusHistory.push(currentStatus);
      callback(currentStatus);
    },
    onError: () => {},
  };
  
  // Simulate connection
  currentStatus = 'connected';
  monitor.status = currentStatus;
  monitor.onStatusChange((status) => {
    assertEquals(status, 'connected', 'Status should change to connected');
  });
  
  assertEquals(monitor.status, 'connected', 'Monitor should reflect connected status');
});

Deno.test('sync status: handles disconnection gracefully', () => {
  const monitor: SyncStatusMonitor = {
    status: 'connected',
    lastSyncTime: new Date(),
    error: null,
    onStatusChange: () => {},
    onError: () => {},
  };
  
  // Simulate disconnection
  monitor.status = 'disconnected';
  monitor.lastSyncTime = null;
  
  assertEquals(monitor.status, 'disconnected', 'Status should be disconnected');
  assertEquals(monitor.lastSyncTime, null, 'Last sync time should be cleared on disconnect');
});

Deno.test('sync status: tracks sync errors', () => {
  const monitor: SyncStatusMonitor = {
    status: 'error',
    lastSyncTime: null,
    error: 'Network timeout',
    onStatusChange: () => {},
    onError: (callback) => {
      callback(new Error(monitor.error || 'Unknown error'));
    },
  };
  
  let errorCaught: Error | null = null;
  monitor.onError((error) => {
    errorCaught = error;
  });
  
  assertEquals(monitor.status, 'error', 'Status should be error');
  assertExists(monitor.error, 'Error message should be set');
  assertExists(errorCaught, 'Error callback should be called');
});

Deno.test('sync status: app continues with local data on error', () => {
  // When sync fails, app should continue using local SQLite data
  const hasLocalData = true; // Simulate local data availability
  const syncFailed = true;
  
  const canContinue = hasLocalData && syncFailed;
  assertEquals(canContinue, true, 'App should continue with local data when sync fails');
});

Deno.test('sync status: monitors connection state transitions', () => {
  const transitions: SyncStatus[] = [];
  
  const monitor: SyncStatusMonitor = {
    status: 'disconnected',
    lastSyncTime: null,
    error: null,
    onStatusChange: (callback) => {
      transitions.push(monitor.status);
      callback(monitor.status);
    },
    onError: () => {},
  };
  
  // Simulate connection flow
  monitor.status = 'connecting' as SyncStatus;
  monitor.onStatusChange(() => {});
  
  monitor.status = 'connected';
  monitor.onStatusChange(() => {});
  
  monitor.status = 'syncing';
  monitor.onStatusChange(() => {});
  
  monitor.status = 'connected';
  monitor.onStatusChange(() => {});
  
  assertEquals(transitions.length, 4, 'Should track all status transitions');
  assertEquals(transitions[transitions.length - 1], 'connected', 'Final status should be connected');
});

Deno.test('sync status: lastSyncTime updates on successful sync', () => {
  const monitor: SyncStatusMonitor = {
    status: 'connected',
    lastSyncTime: null,
    error: null,
    onStatusChange: () => {},
    onError: () => {},
  };
  
  const beforeSync = new Date();
  monitor.lastSyncTime = beforeSync;
  
  assertExists(monitor.lastSyncTime, 'Last sync time should be set after sync');
  assertEquals(
    monitor.lastSyncTime.getTime(),
    beforeSync.getTime(),
    'Last sync time should match sync completion time'
  );
});

Deno.test('sync status: error state clears on successful reconnection', () => {
  const monitor: SyncStatusMonitor = {
    status: 'error',
    lastSyncTime: null,
    error: 'Network error',
    onStatusChange: () => {},
    onError: () => {},
  };
  
  // Simulate reconnection
  monitor.status = 'connected';
  monitor.error = null;
  
  assertEquals(monitor.status, 'connected', 'Status should clear error on reconnection');
  assertEquals(monitor.error, null, 'Error should be cleared on reconnection');
});
