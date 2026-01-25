/**
 * OAuth Callback Route
 * Handles OAuth redirects from Google/Apple
 * Also handles account linking for anonymous users
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { captureServerEvent, getPostHogClient } from '@/lib/posthog-server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const isLinking = requestUrl.searchParams.get('linking') === 'true';

  if (code) {
    const cookieStore = await cookies();
    
    // Create server-side Supabase client that can access cookies for PKCE
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Exchange code for session (needs access to cookies for PKCE code_verifier)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (data?.user) {
      const posthog = getPostHogClient();

      // Identify user on server side
      posthog?.identify({
        distinctId: data.user.id,
        properties: {
          email: data.user.email,
          provider: data.user.app_metadata?.provider,
          is_anonymous: false, // User is no longer anonymous after linking
        },
      });

      if (isLinking) {
        // This was an account linking flow (anonymous user connecting OAuth)
        captureServerEvent(data.user.id, 'account_linked', {
          provider: data.user.app_metadata?.provider,
        });
      } else {
        // Regular sign-in flow
        // Capture auth callback event
        captureServerEvent(data.user.id, 'auth_callback_completed', {
          provider: data.user.app_metadata?.provider,
          is_new_user: !data.user.last_sign_in_at ||
            new Date(data.user.last_sign_in_at).getTime() === new Date(data.user.created_at).getTime(),
        });

        // Also capture the sign-in event
        captureServerEvent(data.user.id, 'user_signed_in', {
          method: data.user.app_metadata?.provider || 'oauth',
        });
      }

      if (posthog) {
        await posthog.shutdown();
      }
    }

    if (error) {
      console.error('OAuth callback error:', error);
    }
  }

  // Redirect to profile page if linking, otherwise to home
  const redirectPath = isLinking ? '/profile' : '/';
  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
