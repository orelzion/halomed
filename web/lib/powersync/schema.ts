/**
 * PowerSync Schema Definition
 * Matches SQLite schemas from powersync/schemas/
 * Reference: powersync/INTEGRATION.md, TDD Section 8
 * 
 * Note: PowerSync automatically creates an 'id' column for each table
 */

import { Schema, Table, column } from '@powersync/web';

const user_study_log = new Table({
  user_id: column.text,
  track_id: column.text,
  study_date: column.text,
  content_id: column.text,
  is_completed: column.integer,
  completed_at: column.text,
}, {
  indexes: {
    user_date: ['user_id', 'study_date'],
    track: ['track_id'],
  },
});

const content_cache = new Table({
  ref_id: column.text,
  source_text_he: column.text,
  ai_explanation_json: column.text,
  he_ref: column.text,
  created_at: column.text,
}, {
  indexes: {
    ref_id: ['ref_id'],
  },
});

const tracks = new Table({
  title: column.text,
  source_endpoint: column.text,
  schedule_type: column.text,
  start_date: column.text,
});

export const AppSchema = new Schema({
  user_study_log,
  content_cache,
  tracks,
});

// Export types for use in hooks
export type Database = (typeof AppSchema)['types'];
