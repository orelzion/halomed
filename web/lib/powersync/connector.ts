/**
 * PowerSync Backend Connector
 * Handles authentication and data upload to Supabase
 * Reference: powersync/INTEGRATION.md
 */

import type { PowerSyncBackendConnector, AbstractPowerSyncDatabase } from '@powersync/common';
import { UpdateType } from '@powersync/web';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

const POWERSYNC_INSTANCE_ID = process.env.NEXT_PUBLIC_POWERSYNC_INSTANCE_ID || '';

if (!POWERSYNC_INSTANCE_ID) {
  console.warn('Missing NEXT_PUBLIC_POWERSYNC_INSTANCE_ID environment variable');
}

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    // Get current session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      throw new Error('Not authenticated');
    }

    // PowerSync endpoint
    const endpoint = `https://${POWERSYNC_INSTANCE_ID}.powersync.journeyapps.com`;
    
    // Use Supabase JWT token for PowerSync authentication
    return {
      endpoint,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    console.log('[PowerSync] uploadData called');
    
    // Ensure we have a valid session before uploading
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[PowerSync] Not authenticated - cannot upload data', sessionError);
      throw new Error('Not authenticated - cannot upload data');
    }
    
    console.log('[PowerSync] Session valid, starting upload');
    
    // Use the existing Supabase client with the current session
    // The session is already set on the singleton client, so we can use it directly
    // This avoids creating multiple GoTrueClient instances
    const authenticatedClient = supabase;
    
    // Process all pending transactions
    let transaction = await database.getNextCrudTransaction();
    let transactionCount = 0;
    
    if (!transaction) {
      console.log('[PowerSync] No pending transactions');
      return;
    }
    
    console.log('[PowerSync] Processing transactions...');
    
    while (transaction) {
      transactionCount++;
      console.log(`[PowerSync] Processing transaction ${transactionCount} with ${transaction.crud.length} operations`);
      try {
        // Process each CRUD operation in the transaction
        for (const operation of transaction.crud) {
          const { table, op, id, opData } = operation;
          
          switch (op) {
            case UpdateType.PUT:
            case UpdateType.PATCH:
              // Normalize helper for PowerSync getAll results
              const normalizeRows = <T,>(result: any): T[] => {
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
              };
              
              let record: any = { id };
              
              if (op === UpdateType.PUT) {
                // PUT (insert) - opData should contain all fields
                if (opData) {
                  record = { ...opData, id };
                }
              } else if (op === UpdateType.PATCH) {
                // PATCH (update) - opData only contains changed fields
                // Fetch full record from local database to get all required fields
                const fullRecordResult = await database.getAll(
                  `SELECT * FROM ${table} WHERE id = ?`,
                  [id]
                );
                
                const rows = normalizeRows<any>(fullRecordResult);
                
                if (rows.length > 0) {
                  // Start with the full record from local database
                  record = { ...rows[0] };
                  // Merge opData changes on top
                  if (opData) {
                    record = { ...record, ...opData };
                  }
                } else {
                  console.warn(`Record ${id} not found in local database for PATCH operation`);
                  continue;
                }
              }
              
              // For user_study_log, ensure user_id matches authenticated user (RLS requirement)
              if (table === 'user_study_log') {
                const userId = record.user_id;
                if (userId && userId !== session.user.id) {
                  console.warn(`Skipping operation: user_id mismatch (${userId} vs ${session.user.id})`);
                  continue;
                }
                // Ensure user_id is set correctly
                record.user_id = session.user.id;
              }
              
              // For user_study_log, use UPDATE instead of UPSERT to ensure RLS policies work correctly
              // UPSERT can sometimes fail silently with RLS if it tries to INSERT instead of UPDATE
              if (table === 'user_study_log') {
                console.log(`[PowerSync] Updating ${table} record:`, { id, ...record });
                
                // Convert is_completed from INTEGER (0/1) to BOOLEAN for PostgreSQL
                const isCompletedBoolean = record.is_completed === 1 || record.is_completed === true;
                
                // Use UPDATE explicitly to ensure RLS UPDATE policy is used
                const { data: updateData, error: updateError } = await authenticatedClient
                  .from(table)
                  .update({
                    is_completed: isCompletedBoolean, // Ensure it's a boolean, not integer
                    completed_at: record.completed_at,
                    // Include other fields that might have changed
                    content_id: record.content_id,
                  })
                  .eq('id', id)
                  .select()
                  .single();
                
                if (updateError) {
                  console.error(`[PowerSync] Failed to update ${table}:`, updateError);
                  throw new Error(`Failed to update ${table}: ${updateError.message}`);
                }
                
                // Verify the data was actually saved
                console.log(`[PowerSync] Successfully updated ${table} record ${id}:`, JSON.stringify(updateData, null, 2));
                
                const expectedCompleted = record.is_completed === 1 || record.is_completed === true;
                const actualCompleted = updateData.is_completed === true || updateData.is_completed === 1;
                console.log(`[PowerSync] Completion check - Expected: ${expectedCompleted} (${record.is_completed}), Actual: ${actualCompleted} (${updateData.is_completed})`);
                
                if (expectedCompleted !== actualCompleted) {
                  console.error(`[PowerSync] ERROR: is_completed mismatch! Expected: ${expectedCompleted}, Got: ${actualCompleted}`);
                  throw new Error(`Failed to update is_completed - Supabase returned different value`);
                }
                
                // Immediately verify the data is actually in Supabase
                const { data: verifyData, error: verifyError } = await authenticatedClient
                  .from(table)
                  .select('is_completed, completed_at')
                  .eq('id', id)
                  .single();
                
                if (verifyError) {
                  console.error(`[PowerSync] Failed to verify update:`, verifyError);
                } else {
                  const verifyCompleted = verifyData.is_completed === true || verifyData.is_completed === 1;
                  console.log(`[PowerSync] Immediate verification - is_completed: ${verifyCompleted} (${verifyData.is_completed}), completed_at: ${verifyData.completed_at}`);
                  if (verifyCompleted !== actualCompleted) {
                    console.error(`[PowerSync] CRITICAL ERROR: Data not persisted! Expected: ${actualCompleted}, Got: ${verifyCompleted}`);
                    throw new Error(`Update verification failed - data not persisted in Supabase`);
                  }
                  
                  // Wait a bit and verify again to catch if something overwrites it
                  setTimeout(async () => {
                    const { data: verifyData2, error: verifyError2 } = await authenticatedClient
                      .from(table)
                      .select('is_completed, completed_at')
                      .eq('id', id)
                      .single();
                    
                    if (!verifyError2 && verifyData2) {
                      const verifyCompleted2 = verifyData2.is_completed === true || verifyData2.is_completed === 1;
                      console.log(`[PowerSync] Verification after 3s - is_completed: ${verifyCompleted2} (${verifyData2.is_completed}), completed_at: ${verifyData2.completed_at}`);
                      if (verifyCompleted2 !== actualCompleted) {
                        console.error(`[PowerSync] CRITICAL: Data was overwritten! Was: ${actualCompleted}, Now: ${verifyCompleted2}`);
                        console.error(`[PowerSync] This suggests something is overwriting the completion status after we save it`);
                      }
                    }
                  }, 3000);
                }
              } else {
                // For other tables, use upsert
                console.log(`[PowerSync] Upserting ${table} record:`, { id, ...record });
                const { data: upsertData, error: upsertError } = await authenticatedClient
                  .from(table)
                  .upsert(record, { onConflict: 'id' })
                  .select()
                  .single();
                
                if (upsertError) {
                  console.error(`[PowerSync] Failed to upsert ${table}:`, upsertError);
                  throw new Error(`Failed to upsert ${table}: ${upsertError.message}`);
                }
                
                console.log(`[PowerSync] Successfully upserted ${table} record ${id}`);
              }
              break;
              
            case UpdateType.DELETE:
              const { error: deleteError } = await authenticatedClient
                .from(table)
                .delete()
                .eq('id', id);
              
              if (deleteError) {
                throw new Error(`Failed to delete ${table}: ${deleteError.message}`);
              }
              break;
              
            default:
              console.warn(`Unknown operation type: ${op}`);
          }
        }
        
        // Mark transaction as complete
        await transaction.complete();
        console.log(`[PowerSync] Transaction ${transactionCount} completed successfully`);
      } catch (error) {
        console.error(`[PowerSync] Error uploading transaction ${transactionCount}:`, error);
        // Re-throw to let PowerSync handle the retry
        throw error;
      }
      
      // Get next transaction
      transaction = await database.getNextCrudTransaction();
    }
    
    console.log(`[PowerSync] Upload complete. Processed ${transactionCount} transactions`);
  }
}
