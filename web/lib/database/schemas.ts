/**
 * RxDB Collection Schemas
 * Matches backend PostgreSQL schema
 * Reference: Migration Plan Phase 2, Task 2.3
 */

import type { RxJsonSchema, RxCollection, RxDocument } from 'rxdb';

// Document types for each collection
export interface UserStudyLogDoc {
  id: string;
  user_id: string;
  track_id: string;
  study_date: string;
  content_id?: string;
  is_completed: number;
  completed_at?: string;
  updated_at: string;
  _deleted: boolean;
}

export interface ContentCacheDoc {
  id: string;
  ref_id: string;
  source_text_he: string;
  ai_explanation_json: string;
  he_ref?: string;
  created_at: string;
  updated_at: string;
  _deleted: boolean;
}

export interface TracksDoc {
  id: string;
  title: string;
  source_endpoint?: string;
  schedule_type: string;
  start_date?: string;
  updated_at: string;
  _deleted: boolean;
}

export interface UserPreferencesDoc {
  id: string;
  user_id: string;
  pace: string;
  review_intensity: string;
  streak_count: number;
  last_study_date?: string;
  created_at: string;
  updated_at: string;
  _deleted: boolean;
}

export interface LearningPathDoc {
  id: string;
  user_id: string;
  node_index: number;
  node_type: string;
  content_ref?: string;
  tractate?: string;
  chapter?: number;
  is_divider: number;
  unlock_date: string;
  completed_at?: string;
  review_of_node_id?: string;
  created_at: string;
  updated_at: string;
  _deleted: boolean;
}

export interface QuizQuestionsDoc {
  id: string;
  content_ref: string;
  question_index: number;
  question_text: string;
  options: string;
  correct_answer: number;
  explanation?: string;
  created_at: string;
  updated_at: string;
  _deleted: boolean;
}

// User Study Log Schema
export const userStudyLogSchema: RxJsonSchema<UserStudyLogDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    user_id: { type: 'string' },
    track_id: { type: 'string' },
    study_date: { type: 'string' }, // YYYY-MM-DD
    content_id: { type: 'string' }, // nullable
    is_completed: { type: 'number' }, // 0 or 1 (boolean as integer)
    completed_at: { type: 'string' }, // ISO timestamp, nullable
    updated_at: { type: 'string' }, // ISO timestamp
    _deleted: { type: 'boolean' }, // Soft delete flag
  },
  required: ['id', 'user_id', 'track_id', 'study_date', 'updated_at', '_deleted'],
  indexes: ['user_id', 'track_id', 'study_date', ['user_id', 'study_date'], ['user_id', 'track_id']],
};

// Content Cache Schema
export const contentCacheSchema: RxJsonSchema<ContentCacheDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    ref_id: { type: 'string' },
    source_text_he: { type: 'string' },
    ai_explanation_json: { type: 'string' }, // JSONB stored as JSON string
    he_ref: { type: 'string' }, // nullable
    created_at: { type: 'string' }, // ISO timestamp
    updated_at: { type: 'string' }, // ISO timestamp
    _deleted: { type: 'boolean' }, // Soft delete flag
  },
  required: ['id', 'ref_id', 'source_text_he', 'ai_explanation_json', 'created_at', 'updated_at', '_deleted'],
  indexes: ['ref_id'],
};

// Tracks Schema
export const tracksSchema: RxJsonSchema<TracksDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    title: { type: 'string' },
    source_endpoint: { type: 'string' },
    schedule_type: { type: 'string' },
    start_date: { type: 'string' }, // YYYY-MM-DD, nullable
    updated_at: { type: 'string' }, // ISO timestamp
    _deleted: { type: 'boolean' }, // Soft delete flag
  },
  required: ['id', 'title', 'schedule_type', 'updated_at', '_deleted'],
};

// User Preferences Schema
export const userPreferencesSchema: RxJsonSchema<UserPreferencesDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    user_id: { type: 'string' },
    pace: { type: 'string' },
    review_intensity: { type: 'string' },
    streak_count: { type: 'number' },
    last_study_date: { type: 'string' }, // YYYY-MM-DD, nullable
    created_at: { type: 'string' }, // ISO timestamp
    updated_at: { type: 'string' }, // ISO timestamp
    _deleted: { type: 'boolean' }, // Soft delete flag
  },
  required: ['id', 'user_id', 'pace', 'review_intensity', 'streak_count', 'created_at', 'updated_at', '_deleted'],
  indexes: ['user_id'],
};

// Learning Path Schema
export const learningPathSchema: RxJsonSchema<LearningPathDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    user_id: { type: 'string' },
    node_index: { type: 'number' },
    node_type: { type: 'string' }, // 'learning', 'review', 'quiz'
    content_ref: { type: 'string' }, // nullable
    tractate: { type: 'string' }, // nullable
    chapter: { type: 'number' }, // nullable
    is_divider: { type: 'number' }, // 0 or 1 (boolean as integer)
    unlock_date: { type: 'string' }, // YYYY-MM-DD
    completed_at: { type: 'string' }, // ISO timestamp, nullable
    review_of_node_id: { type: 'string' }, // nullable
    created_at: { type: 'string' }, // ISO timestamp
    updated_at: { type: 'string' }, // ISO timestamp
    _deleted: { type: 'boolean' }, // Soft delete flag
  },
  required: ['id', 'user_id', 'node_index', 'node_type', 'is_divider', 'unlock_date', 'created_at', 'updated_at', '_deleted'],
  indexes: ['user_id', 'unlock_date', ['user_id', 'node_index'], ['user_id', 'unlock_date']],
};

// Quiz Questions Schema
export const quizQuestionsSchema: RxJsonSchema<QuizQuestionsDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    content_ref: { type: 'string' },
    question_index: { type: 'number' },
    question_text: { type: 'string' },
    options: { type: 'string' }, // JSONB stored as JSON string
    correct_answer: { type: 'number' },
    explanation: { type: 'string' }, // nullable
    created_at: { type: 'string' }, // ISO timestamp
    updated_at: { type: 'string' }, // ISO timestamp
    _deleted: { type: 'boolean' }, // Soft delete flag
  },
  required: ['id', 'content_ref', 'question_index', 'question_text', 'options', 'correct_answer', 'created_at', 'updated_at', '_deleted'],
  indexes: ['content_ref', ['content_ref', 'question_index']],
};

// RxDB collection types
export type UserStudyLogCollection = RxCollection<UserStudyLogDoc>;
export type ContentCacheCollection = RxCollection<ContentCacheDoc>;
export type TracksCollection = RxCollection<TracksDoc>;
export type UserPreferencesCollection = RxCollection<UserPreferencesDoc>;
export type LearningPathCollection = RxCollection<LearningPathDoc>;
export type QuizQuestionsCollection = RxCollection<QuizQuestionsDoc>;

// RxDB document types
export type UserStudyLogDocument = RxDocument<UserStudyLogDoc>;
export type ContentCacheDocument = RxDocument<ContentCacheDoc>;
export type TracksDocument = RxDocument<TracksDoc>;
export type UserPreferencesDocument = RxDocument<UserPreferencesDoc>;
export type LearningPathDocument = RxDocument<LearningPathDoc>;
export type QuizQuestionsDocument = RxDocument<QuizQuestionsDoc>;

// Database collections type
export interface DatabaseCollections {
  user_study_log: UserStudyLogCollection;
  content_cache: ContentCacheCollection;
  tracks: TracksCollection;
  user_preferences: UserPreferencesCollection;
  learning_path: LearningPathCollection;
  quiz_questions: QuizQuestionsCollection;
}
