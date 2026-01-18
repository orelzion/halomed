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

const user_preferences = new Table({
  user_id: column.text,
  pace: column.text,
  review_intensity: column.text,
  streak_count: column.integer,
  last_study_date: column.text,
  created_at: column.text,
  updated_at: column.text,
}, {
  indexes: {
    user_id: ['user_id'],
  },
});

const learning_path = new Table({
  user_id: column.text,
  node_index: column.integer,
  node_type: column.text,
  content_ref: column.text,
  tractate: column.text,
  chapter: column.integer,
  is_divider: column.integer,
  unlock_date: column.text,
  completed_at: column.text,
  review_of_node_id: column.text,
  created_at: column.text,
}, {
  indexes: {
    user_id: ['user_id'],
    unlock_date: ['unlock_date'],
    node_index: ['user_id', 'node_index'],
    user_unlock: ['user_id', 'unlock_date'],
  },
});

const quiz_questions = new Table({
  content_ref: column.text,
  question_index: column.integer,
  question_text: column.text,
  options: column.text, // JSONB stored as JSON string
  correct_answer: column.integer,
  explanation: column.text,
  created_at: column.text,
}, {
  indexes: {
    content_ref: ['content_ref'],
    content_ref_question_index: ['content_ref', 'question_index'],
  },
});

export const AppSchema = new Schema({
  user_study_log,
  content_cache,
  tracks,
  user_preferences,
  learning_path,
  quiz_questions,
});

// Export types for use in hooks
export type Database = (typeof AppSchema)['types'];
