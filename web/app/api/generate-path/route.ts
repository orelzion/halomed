import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { captureServerEvent, getPostHogClient } from '@/lib/posthog-server';

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

  const body = await request.json().catch(() => ({}));
  const force = body.force === true;
  const { pace, review_intensity } = body;
  
  // In dev mode: offset start date by a few days to simulate progress
  const isDev = process.env.NODE_ENV === 'development';
  const devOffsetDays = isDev && body.dev_offset_days !== undefined 
    ? body.dev_offset_days 
    : (isDev ? 4 : 0); // Default to 4 days in dev mode

  // Security: Service role key is only used server-side
  // User authentication is validated above before calling the Edge Function
  // Pass pace and review_intensity if provided (for offline-first flow where
  // client saves to RxDB and API saves to Supabase + generates path in one call)
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-path`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
    },
    body: JSON.stringify({
      user_id: user.id,
      force: force,
      dev_offset_days: devOffsetDays,
      ...(pace && { pace }),
      ...(review_intensity && { review_intensity }),
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

  // Capture learning path generated event
  const pathData = JSON.parse(responseBody);
  captureServerEvent(user.id, 'learning_path_generated', {
    is_forced: force,
    node_count: pathData.nodes?.length || 0,
  });
  const posthogClient = getPostHogClient();
  if (posthogClient) {
    await posthogClient.shutdown();
  }

  return NextResponse.json(pathData);
}
