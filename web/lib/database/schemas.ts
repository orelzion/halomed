/**
 * RxDB Collection Schemas
 * Matches backend PostgreSQL schema
 * Reference: Migration Plan Phase 2, Task 2.3
 */

import type { RxJsonSchema, RxCollection, RxDocument } from 'rxdb';

// Document types for each collection
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

export interface UserPreferencesDoc{
  id: string;
  user_id: string;
  pace: string; // 'one_chapter' | 'seder_per_year' | 'two_mishna'
  review_intensity: string;
  streak_count: number;
  last_study_date?: string;
  current_content_index: number; // Position in learning sequence (0-based)
  path_start_date?: string; // When user started, YYYY-MM-DD
  skip_friday?: boolean; // Skip study on Fridays (default: true)
  skip_yom_tov?: boolean; // Skip study on Jewish holidays (default: true)
  israel_mode?: boolean; // true = Israel (1 day Yom Tov), false = Diaspora (2 days)
  yom_tov_dates?: string[]; // Pre-computed Yom Tov dates from backend (YYYY-MM-DD)
  yom_tov_dates_until?: string; // Last date covered by yom_tov_dates
  created_at: string;
  updated_at: string;
  _deleted: boolean;
}

export interface ReviewItem {
  content_ref: string;
  title: string;
  heRef?: string;
}

export interface LearningPathDoc {
  id: string;
  user_id: string;
  node_index: number;
  node_type: string; // 'learn', 'review_session', 'quiz', 'weekly_quiz'
  content_ref?: string;
  tractate?: string;
  chapter?: number;
  is_divider: number;
  unlock_date: string;
  completed_at?: string;
  review_of_node_id?: string;
  // New fields for review sessions (Task 15.4)
  review_items?: string; // JSON string of ReviewItem[]
  review_count?: number;
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

// User Preferences Schema
export const userPreferencesSchema: RxJsonSchema<UserPreferencesDoc> = {
  version: 1, // Bumped for position-based storage
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    user_id: { type: 'string' },
    pace: { type: 'string' }, // 'one_chapter' | 'seder_per_year' | 'two_mishna'
    review_intensity: { type: 'string' },
    streak_count: { type: 'number' },
    last_study_date: { type: 'string' }, // YYYY-MM-DD, nullable
    current_content_index: { type: 'number' }, // Position in learning sequence
    path_start_date: { type: 'string' }, // YYYY-MM-DD, nullable
    skip_friday: { type: 'boolean' }, // Skip study on Fridays
    skip_yom_tov: { type: 'boolean' }, // Skip study on Jewish holidays
    israel_mode: { type: 'boolean' }, // Israel (1 day) vs Diaspora (2 days)
    yom_tov_dates: { type: 'array', items: { type: 'string' } }, // Pre-computed Yom Tov dates
    yom_tov_dates_until: { type: 'string' }, // Last date covered
    created_at: { type: 'string' }, // ISO timestamp
    updated_at: { type: 'string' }, // ISO timestamp
    _deleted: { type: 'boolean' }, // Soft delete flag
  },
  required: ['id', 'user_id', 'pace', 'review_intensity', 'streak_count', 'current_content_index', 'created_at', 'updated_at', '_deleted'],
  indexes: ['user_id'],
};

// Learning Path Schema
export const learningPathSchema: RxJsonSchema<LearningPathDoc> = {
  version: 1, // Bumped for review_items and review_count (Task 15.4)
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    user_id: { type: 'string' },
    node_index: { type: 'number' },
    node_type: { type: 'string' }, // 'learn', 'review_session', 'quiz', 'weekly_quiz'
    content_ref: { type: 'string' }, // nullable
    tractate: { type: 'string' }, // nullable
    chapter: { type: 'number' }, // nullable
    is_divider: { type: 'number' }, // 0 or 1 (boolean as integer)
    unlock_date: { type: 'string' }, // YYYY-MM-DD
    completed_at: { type: 'string' }, // ISO timestamp, nullable
    review_of_node_id: { type: 'string' }, // nullable
    // New fields for review sessions (Task 15.4)
    review_items: { type: 'string' }, // JSONB as JSON string (ReviewItem[])
    review_count: { type: 'number' }, // Quick access count of items in review_session
    created_at: { type: 'string' }, // ISO timestamp
    updated_at: { type: 'string' }, // ISO timestamp
    _deleted: { type: 'boolean' }, // Soft delete flag
  },
  required: ['id', 'user_id', 'node_index', 'node_type', 'is_divider', 'unlock_date', 'created_at', 'updated_at', '_deleted'],
  indexes: ['user_id', 'unlock_date', ['user_id', 'node_index'], ['user_id', 'unlock_date'], 'node_type'],
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
export type ContentCacheCollection = RxCollection<ContentCacheDoc>;
export type UserPreferencesCollection = RxCollection<UserPreferencesDoc>;
export type LearningPathCollection = RxCollection<LearningPathDoc>;
export type QuizQuestionsCollection = RxCollection<QuizQuestionsDoc>;

// RxDB document types
export type ContentCacheDocument = RxDocument<ContentCacheDoc>;
export type UserPreferencesDocument = RxDocument<UserPreferencesDoc>;
export type LearningPathDocument = RxDocument<LearningPathDoc>;
export type QuizQuestionsDocument = RxDocument<QuizQuestionsDoc>;

// Database collections type
export interface DatabaseCollections {
  content_cache: ContentCacheCollection;
  user_preferences: UserPreferencesCollection;
  learning_path: LearningPathCollection;
  quiz_questions: QuizQuestionsCollection;
}
