/**
 * RxDB Supabase Replication Setup
 * Configures two-way sync between RxDB collections and Supabase tables
 * Uses generic replicateRxCollection with Supabase PostgREST handlers
 * Reference: Migration Plan Phase 3, Tasks 3.2-3.4
 */

// Dynamic import to avoid webpack/SSR issues
// import { replicateRxCollection } from 'rxdb/plugins/replication';
import type { RxDatabase, RxReplicationWriteToMasterRow } from 'rxdb';
import type { DatabaseCollections } from '../database/schemas';
import { supabase } from '../supabase/client';
import { getDateWindow } from './date-window';
import { getContentRefsForRange } from '@shared/lib/path-generator';

interface SupabaseCheckpoint {
  id: string;
  updated_at: string;
}

interface LearningPathCheckpoint extends SupabaseCheckpoint {
  node_index: number;
}

/**
 * Setup replication for all collections
 * Returns replication states for monitoring
 */
export async function setupReplication(
  db: RxDatabase<DatabaseCollections>,
  userId: string
): Promise<{
  userStudyLog: any;
  contentCache: any;
  tracks: any;
  userPreferences: any;
  learningPath: any | null; // Deprecated: position-based model doesn't need learning_path sync
  quizQuestions: any;
}> {
  console.log('[Replication] Setting up RxDB Supabase replications...');
  
  // Dynamically import replicateRxCollection to avoid webpack issues
  const replicationModule = await import('rxdb/plugins/replication');
  const { replicateRxCollection } = replicationModule;
  
  const window = getDateWindow();

  // Helper to convert Supabase row to RxDB doc
  const rowToDoc = (row: any, tableName: string): any => {
    const doc = { ...row };
    // Convert boolean fields
    if (tableName === 'user_study_log' && typeof doc.is_completed === 'boolean') {
      doc.is_completed = doc.is_completed ? 1 : 0;
    }
    if (tableName === 'learning_path' && typeof doc.is_divider === 'boolean') {
      doc.is_divider = doc.is_divider ? 1 : 0;
    }
    // Preserve null values for nullable fields (don't delete them)
    // Nullable fields that should be preserved: completed_at, content_ref, review_of_node_id, etc.
    // Only delete null for fields that shouldn't exist at all
    const nullableFields = ['completed_at', 'content_ref', 'review_of_node_id', 'tractate', 'chapter', 'explanation'];
    Object.keys(doc).forEach((key) => {
      // Keep null values for nullable fields, convert others to undefined (which RxDB will ignore)
      if (doc[key] === null && !nullableFields.includes(key)) {
        delete doc[key];
      }
    });
    return doc;
  };

  // Fields that exist only in RxDB (not in Supabase schema)
  // These are computed/cached locally and don't need to sync
  const LOCAL_ONLY_FIELDS: Record<string, string[]> = {
    user_preferences: [
      'yom_tov_dates',        // Computed from API, cached locally
      'yom_tov_dates_until',  // Tracks when to refresh yom_tov_dates
      'skip_friday',          // Local preference (future: add to Supabase)
      'skip_yom_tov',         // Local preference (future: add to Supabase)
      'israel_mode',          // Local preference (future: add to Supabase)
      // Note: current_content_index and path_start_date now sync to Supabase
      // (migration 20260126114703 applied)
    ],
  };

  // Helper to convert RxDB doc to Supabase row
  const docToRow = (doc: any, tableName: string, isUpdate: boolean = false): any => {
    const row = { ...doc };
    
    // Remove local-only fields that Supabase doesn't know about
    const localFields = LOCAL_ONLY_FIELDS[tableName] || [];
    localFields.forEach(field => delete row[field]);
    
    // Convert integer back to boolean
    if (tableName === 'user_study_log' && typeof row.is_completed === 'number') {
      row.is_completed = row.is_completed !== 0;
    }
    if (tableName === 'learning_path' && typeof row.is_divider === 'number') {
      row.is_divider = row.is_divider !== 0;
    }
    // Remove RxDB internal fields
    delete row._deleted;
    
    // For updates, remove read-only fields that shouldn't be sent
    // (triggers will handle updated_at, created_at is immutable)
    if (isUpdate) {
      delete row.created_at;
      delete row.updated_at; // Trigger will set this automatically
    }
    
    return row;
  };

  // Setup user_study_log replication with 14-day window filtering
  const userStudyLogReplication = replicateRxCollection({
    collection: db.user_study_log,
    replicationIdentifier: 'user_study_log-supabase',
    live: true,
    pull: {
      handler: async (checkpoint, batchSize: number) => {
        let query = supabase
          .from('user_study_log')
          .select('*')
          .eq('user_id', userId)
          .gte('study_date', window.start)
          .lte('study_date', window.end)
          .order('id', { ascending: true }) // Use id for ordering (updated_at may not exist if migration not run)
          .limit(batchSize);

        if (checkpoint) {
          query = query.gt('id', (checkpoint as SupabaseCheckpoint).id);
        }

        const { data, error } = await query;
        if (error) {
          console.error('[Replication] user_study_log pull error:', error);
          throw error;
        }

        const documents = (data || []).map((row) => rowToDoc(row, 'user_study_log'));
        const lastDoc = data && data.length > 0 ? data[data.length - 1] : null;
        const newCheckpoint: SupabaseCheckpoint | null = lastDoc
          ? { id: lastDoc.id, updated_at: lastDoc.updated_at }
          : (checkpoint as SupabaseCheckpoint | null) ?? null;

        return {
          documents,
          checkpoint: newCheckpoint,
        };
      },
      batchSize: 50,
    },
    push: {
      handler: async (rows: RxReplicationWriteToMasterRow<any>[]) => {
        const conflicts: any[] = [];

        for (const row of rows) {
          const isUpdate = !!row.assumedMasterState;
          const doc = docToRow(row.newDocumentState, 'user_study_log', isUpdate);

          if (!row.assumedMasterState) {
            // Insert
            const { error } = await supabase.from('user_study_log').insert(doc);
            if (error && error.code !== '23505') {
              // 23505 is unique violation (conflict)
              throw error;
            }
          } else {
            // Update with optimistic concurrency
            let updateQuery = supabase
              .from('user_study_log')
              .update(doc)
              .eq('id', doc.id);
            
            // Only add updated_at filter if it exists (for optimistic concurrency)
            if (row.assumedMasterState.updated_at) {
              updateQuery = updateQuery.eq('updated_at', row.assumedMasterState.updated_at);
            }
            
            const { error } = await updateQuery;

            if (error) {
              // Conflict - fetch current state
              const { data } = await supabase
                .from('user_study_log')
                .select('*')
                .eq('id', doc.id)
                .single();
              if (data) conflicts.push(rowToDoc(data, 'user_study_log'));
            }
          }
        }

        return conflicts;
      },
      batchSize: 50,
    },
    deletedField: '_deleted',
  });

  // Setup content_cache replication with position-based filtering
  // Compute which content refs to sync based on user's current position from LOCAL RxDB
  // This keeps local storage small while showing relevant content
  const contentCacheReplication = replicateRxCollection({
    collection: db.content_cache,
    replicationIdentifier: 'content_cache-supabase',
    live: true,
    pull: {
      handler: async (checkpoint, batchSize: number) => {
        const typedCheckpoint = checkpoint as SupabaseCheckpoint | null | undefined;
        
        // Get user preferences from LOCAL RxDB (not Supabase API)
        let currentIndex = 0;
        try {
          const localPrefs = await db.user_preferences.find({ selector: { user_id: userId } }).exec();
          if (localPrefs.length > 0) {
            const prefs = localPrefs[0].toJSON();
            currentIndex = prefs.current_content_index ?? 0;
          }
        } catch (e) {
          // If local prefs not available yet, use default starting position
          console.log('[Replication] Local prefs not available, using default position');
        }
        
        // Get content refs for 14 items back (reviews) and 30 items ahead (upcoming)
        const startIndex = Math.max(0, currentIndex - 14);
        const endIndex = currentIndex + 30;
        const contentRefs = getContentRefsForRange(startIndex, endIndex);
        
        if (contentRefs.length === 0) {
          return { documents: [], checkpoint: typedCheckpoint ?? null };
        }

        // Only sync content_cache entries that match these ref_ids
        let query = supabase
          .from('content_cache')
          .select('*')
          .in('ref_id', contentRefs)
          .order('id', { ascending: true })
          .limit(batchSize);

        if (typedCheckpoint) {
          query = query.gt('id', typedCheckpoint.id);
        }

        const { data, error } = await query;
        if (error) {
          console.error('[Replication] content_cache pull error:', error);
          throw error;
        }

        const documents = (data || []).map((row) => rowToDoc(row, 'content_cache'));
        const lastDoc = data && data.length > 0 ? data[data.length - 1] : null;
        const newCheckpoint: SupabaseCheckpoint | null = lastDoc
          ? { id: lastDoc.id, updated_at: lastDoc.updated_at }
          : typedCheckpoint ?? null;

        return {
          documents,
          checkpoint: newCheckpoint,
        };
      },
      batchSize: 50,
    },
    // No push handler - content_cache is read-only (RLS only allows SELECT)
    // Content is generated server-side via Edge Functions, not by clients
    push: {
      handler: async () => {
        // Return empty conflicts - we never push to content_cache
        // This prevents 403 errors when RxDB tries to sync local changes
        return [];
      },
      batchSize: 50,
    },
    deletedField: '_deleted',
  });

  // Setup tracks replication (all tracks, no filtering)
  const tracksReplication = replicateRxCollection({
    collection: db.tracks,
    replicationIdentifier: 'tracks-supabase',
    live: true,
    pull: {
      handler: async (checkpoint, batchSize: number) => {
        const typedCheckpoint = checkpoint as SupabaseCheckpoint | null | undefined;
        let query = supabase
          .from('tracks')
          .select('*')
          .order('id', { ascending: true }) // Use id as fallback if updated_at doesn't exist
          .limit(batchSize);

        if (typedCheckpoint) {
          query = query.gt('id', typedCheckpoint.id);
        }

        const { data, error } = await query;
        if (error) {
          console.error('[Replication] tracks pull error:', error);
          throw error;
        }

        const documents = (data || []).map((row) => rowToDoc(row, 'tracks'));
        const lastDoc = data && data.length > 0 ? data[data.length - 1] : null;
        const newCheckpoint: SupabaseCheckpoint | null = lastDoc
          ? { id: lastDoc.id, updated_at: lastDoc.updated_at }
          : typedCheckpoint ?? null;

        return {
          documents,
          checkpoint: newCheckpoint,
        };
      },
      batchSize: 50,
    },
    push: {
      handler: async (rows: RxReplicationWriteToMasterRow<any>[]) => {
        const conflicts: any[] = [];

        for (const row of rows) {
          const isUpdate = !!row.assumedMasterState;
          const doc = docToRow(row.newDocumentState, 'tracks', isUpdate);

          if (!row.assumedMasterState) {
            const { error } = await supabase.from('tracks').insert(doc);
            if (error && error.code !== '23505') throw error;
          } else {
            let updateQuery = supabase
              .from('tracks')
              .update(doc)
              .eq('id', doc.id);
            
            // Only add updated_at filter if it exists (for optimistic concurrency)
            if (row.assumedMasterState.updated_at) {
              updateQuery = updateQuery.eq('updated_at', row.assumedMasterState.updated_at);
            }
            
            const { error } = await updateQuery;

            if (error) {
              const { data } = await supabase.from('tracks').select('*').eq('id', doc.id).single();
              if (data) conflicts.push(rowToDoc(data, 'tracks'));
            }
          }
        }

        return conflicts;
      },
      batchSize: 50,
    },
    deletedField: '_deleted',
  });

  // Setup user_preferences replication
  const userPreferencesReplication = replicateRxCollection({
    collection: db.user_preferences,
    replicationIdentifier: 'user_preferences-supabase',
    live: true,
    pull: {
      handler: async (checkpoint, batchSize: number) => {
        const typedCheckpoint = checkpoint as SupabaseCheckpoint | null | undefined;
        let query = supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: true })
          .limit(batchSize);

        if (typedCheckpoint) {
          query = query.or(
            `updated_at.gt.${typedCheckpoint.updated_at},and(updated_at.eq.${typedCheckpoint.updated_at},id.gt.${typedCheckpoint.id})`
          );
        }

        const { data, error } = await query;
        if (error) throw error;

        const documents = (data || []).map((row) => rowToDoc(row, 'user_preferences'));
        const lastDoc = data && data.length > 0 ? data[data.length - 1] : null;
        const newCheckpoint: SupabaseCheckpoint | null = lastDoc
          ? { id: lastDoc.id, updated_at: lastDoc.updated_at }
          : typedCheckpoint ?? null;

        return {
          documents,
          checkpoint: newCheckpoint,
        };
      },
      batchSize: 50,
    },
    push: {
      handler: async (rows: RxReplicationWriteToMasterRow<any>[]) => {
        const conflicts: any[] = [];

        for (const row of rows) {
          const isUpdate = !!row.assumedMasterState;
          const doc = docToRow(row.newDocumentState, 'user_preferences', isUpdate);

          if (!row.assumedMasterState) {
            const { error } = await supabase.from('user_preferences').insert(doc);
            if (error && error.code !== '23505') throw error;
          } else {
            // For user_preferences, don't use optimistic concurrency (updated_at filter)
            // It's a single-user document, and the filter causes silent update failures
            const { error } = await supabase
              .from('user_preferences')
              .update(doc)
              .eq('id', doc.id);

            if (error) {
              console.error('[Replication] user_preferences update error:', error);
              const { data } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('id', doc.id)
                .single();
              if (data) conflicts.push(rowToDoc(data, 'user_preferences'));
            }
          }
        }

        return conflicts;
      },
      batchSize: 50,
    },
    deletedField: '_deleted',
  });

  // DEPRECATED: learning_path replication disabled
  // Position-based model computes path from current_content_index in user_preferences
  // No need to sync thousands of learning_path rows anymore
  // Keeping the collection for backwards compatibility but not syncing it
  const learningPathReplication = null;
  console.log('[Replication] learning_path sync disabled (position-based model)');

  // Setup quiz_questions replication
  const quizQuestionsReplication = replicateRxCollection({
    collection: db.quiz_questions,
    replicationIdentifier: 'quiz_questions-supabase',
    live: true,
    pull: {
      handler: async (checkpoint, batchSize: number) => {
        const typedCheckpoint = checkpoint as SupabaseCheckpoint | null | undefined;
        let query = supabase
          .from('quiz_questions')
          .select('*')
          .order('id', { ascending: true }) // Use id for ordering (updated_at may not exist if migration not run)
          .limit(batchSize);

        if (typedCheckpoint) {
          query = query.gt('id', typedCheckpoint.id);
        }

        const { data, error } = await query;
        if (error) {
          console.error('[Replication] quiz_questions pull error:', error);
          throw error;
        }

        const documents = (data || []).map((row) => rowToDoc(row, 'quiz_questions'));
        const lastDoc = data && data.length > 0 ? data[data.length - 1] : null;
        const newCheckpoint: SupabaseCheckpoint | null = lastDoc
          ? { id: lastDoc.id, updated_at: lastDoc.updated_at }
          : typedCheckpoint ?? null;

        return {
          documents,
          checkpoint: newCheckpoint,
        };
      },
      batchSize: 50,
    },
    push: {
      handler: async (rows: RxReplicationWriteToMasterRow<any>[]) => {
        const conflicts: any[] = [];

        for (const row of rows) {
          const isUpdate = !!row.assumedMasterState;
          const doc = docToRow(row.newDocumentState, 'quiz_questions', isUpdate);

          if (!row.assumedMasterState) {
            const { error } = await supabase.from('quiz_questions').insert(doc);
            if (error && error.code !== '23505') throw error;
          } else {
            let updateQuery = supabase
              .from('quiz_questions')
              .update(doc)
              .eq('id', doc.id);
            
            // Only add updated_at filter if it exists (for optimistic concurrency)
            if (row.assumedMasterState.updated_at) {
              updateQuery = updateQuery.eq('updated_at', row.assumedMasterState.updated_at);
            }
            
            const { error } = await updateQuery;

            if (error) {
              const { data } = await supabase
                .from('quiz_questions')
                .select('*')
                .eq('id', doc.id)
                .single();
              if (data) conflicts.push(rowToDoc(data, 'quiz_questions'));
            }
          }
        }

        return conflicts;
      },
      batchSize: 50,
    },
    deletedField: '_deleted',
  });

  // Wait for initial replication to complete
  console.log('[Replication] Waiting for initial replication...');
  await Promise.all([
    userStudyLogReplication.awaitInitialReplication(),
    contentCacheReplication.awaitInitialReplication(),
    tracksReplication.awaitInitialReplication(),
    userPreferencesReplication.awaitInitialReplication(),
    // learningPathReplication disabled - position-based model
    quizQuestionsReplication.awaitInitialReplication(),
  ]);

  console.log('[Replication] Initial replication completed');

  // Clean up old content_cache entries outside the computed window
  // This keeps local storage small while preserving relevant content
  try {
    // Get user preferences to determine valid content range
    const userPrefs = await db.user_preferences.find({ selector: { user_id: userId } }).exec();
    const prefs = userPrefs.length > 0 ? userPrefs[0].toJSON() : null;
    
    if (prefs) {
      const currentIndex = prefs.current_content_index ?? 0;
      const startIndex = Math.max(0, currentIndex - 14);
      const endIndex = currentIndex + 30;
      const validContentRefs = new Set(getContentRefsForRange(startIndex, endIndex));
      
      // Get all local content_cache entries
      const allContent = await db.content_cache.find().exec();
      
      // Find content that's outside the window
      const contentToRemove = allContent.filter((doc) => {
        const content = doc.toJSON();
        return content.ref_id && !validContentRefs.has(content.ref_id);
      });

      // Remove old content
      if (contentToRemove.length > 0) {
        console.log(`[Replication] Cleaning up ${contentToRemove.length} old content_cache entries outside position window`);
        for (const doc of contentToRemove) {
          await doc.remove();
        }
      }
    }
  } catch (cleanupError) {
    console.error('[Replication] Error cleaning up old content:', cleanupError);
    // Don't fail replication if cleanup fails
  }

  // Return replication states for monitoring
  return {
    userStudyLog: userStudyLogReplication,
    contentCache: contentCacheReplication,
    tracks: tracksReplication,
    userPreferences: userPreferencesReplication,
    learningPath: learningPathReplication,
    quizQuestions: quizQuestionsReplication,
  };
}
