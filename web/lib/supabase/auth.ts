/**
 * Supabase Auth Utilities
 * Helper functions for authentication
 */

import { supabase } from './client';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Sign in anonymously
 */
export async function signInAnonymously(): Promise<{ user: User | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      return { user: null, error: new Error(error.message) };
    }
    return { user: data.user, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to connect to authentication service';
    return { user: null, error: new Error(errorMessage) };
  }
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error ? new Error(error.message) : null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Sign in with Apple OAuth
 */
export async function signInWithApple(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error ? new Error(error.message) : null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? new Error(error.message) : null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}
