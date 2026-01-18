import { NextRequest, NextResponse } from 'next/server';
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

  // Security: Service role key is only used server-side
  // User authentication is validated above before calling the Edge Function
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-path`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      user_id: user.id,
    }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    let errorDetails: any = {};
    try {
      errorDetails = JSON.parse(responseBody);
    } catch {
      errorDetails = { error: responseBody || 'Unknown error' };
    }
    return NextResponse.json(
      { error: 'Path generation failed', details: errorDetails.error || errorDetails.details || responseBody },
      { status: response.status }
    );
  }

  return NextResponse.json(JSON.parse(responseBody));
}
