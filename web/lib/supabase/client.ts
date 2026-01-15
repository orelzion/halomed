/**
 * Supabase Client
 * Creates and exports Supabase client instance
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Create client - will fail at runtime if env vars are not set properly
// This allows the app to build, but connection will fail at runtime if not configured
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log warning if using placeholders (only in development)
if (process.env.NODE_ENV === 'development' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.warn('⚠️  Supabase environment variables not set. Using placeholder values. Authentication will fail.');
}
