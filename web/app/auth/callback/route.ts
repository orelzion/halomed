/**
 * OAuth Callback Route
 * Handles OAuth redirects from Google/Apple
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Exchange code for session
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to home page
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
