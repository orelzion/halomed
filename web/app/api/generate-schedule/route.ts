import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization token' }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
  }

  const body = await request.json();
  const { track_id, start_date, days_ahead } = body ?? {};

  if (!track_id || !start_date || !days_ahead) {
    return NextResponse.json(
      { error: 'Missing required fields: track_id, start_date, days_ahead' },
      { status: 400 }
    );
  }

  // Security: Service role key is only used server-side (not exposed to client)
  // User authentication is validated above before calling the Edge Function
  // The Edge Function is deployed with --no-verify-jwt, but it's only accessible
  // via this authenticated API route, so user_id is trusted after JWT validation
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey, // Server-side only, never exposed to client
    },
    body: JSON.stringify({
      user_id: user.id, // Validated via JWT above
      track_id,
      start_date,
      days_ahead,
    }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    return NextResponse.json(
      { error: 'Schedule generation failed', details: responseBody },
      { status: response.status }
    );
  }

  return NextResponse.json({ ok: true });
}
