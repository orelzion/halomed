// supabase/functions/_shared/auth.ts
// Authentication validation helper for Edge Functions
// Reference: backend.md Section 6

import { createClient } from 'npm:@supabase/supabase-js@2';

export interface AuthResult {
  user: any;
  error: Error | null;
}

/**
 * Validates authentication from Edge Function request
 * Extracts and validates JWT token from Authorization header
 */
export async function validateAuth(
  request: Request,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return {
      user: null,
      error: new Error('Missing Authorization header'),
    };
  }

  // Extract Bearer token
  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return {
      user: null,
      error: new Error('Invalid Authorization header format'),
    };
  }

  // Create Supabase client and verify token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  // Get user from token
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: error || new Error('Invalid or expired token'),
    };
  }

  return {
    user,
    error: null,
  };
}

/**
 * Validates that user is authenticated (not anonymous)
 */
export function requireAuthenticated(user: any): Error | null {
  if (!user) {
    return new Error('User not authenticated');
  }

  if (user.is_anonymous) {
    return new Error('Anonymous users not allowed for this operation');
  }

  return null;
}
