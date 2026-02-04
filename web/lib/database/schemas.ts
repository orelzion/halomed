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
  quiz_completion_dates?: string[]; // Dates when weekly quizzes were completed (YYYY-MM-DD)
  review_completion_dates?: string[]; // Dates when review sessions were completed (YYYY-MM-DD)
  created_at: string;
  updated_at: string;
  _deleted: boolean;
}

export interface ReviewItem {
  content_ref: string;
  title: string;
  heRef?: string;
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
  version: 2, // Bumped for completion dates arrays
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
    quiz_completion_dates: { type: 'array', items: { type: 'string' } }, // Quiz completion dates
    review_completion_dates: { type: 'array', items: { type: 'string' } }, // Review completion dates
    created_at: { type: 'string' }, // ISO timestamp
    updated_at: { type: 'string' }, // ISO timestamp
    _deleted: { type: 'boolean' }, // Soft delete flag
  },
  required: ['id', 'user_id', 'pace', 'review_intensity', 'streak_count', 'current_content_index', 'created_at', 'updated_at', '_deleted'],
  indexes: ['user_id'],
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
export type QuizQuestionsCollection = RxCollection<QuizQuestionsDoc>;

// RxDB document types
export type ContentCacheDocument = RxDocument<ContentCacheDoc>;
export type UserPreferencesDocument = RxDocument<UserPreferencesDoc>;
export type QuizQuestionsDocument = RxDocument<QuizQuestionsDoc>;

// Database collections type
export interface DatabaseCollections {
  content_cache: ContentCacheCollection;
  user_preferences: UserPreferencesCollection;
  quiz_questions: QuizQuestionsCollection;
}
