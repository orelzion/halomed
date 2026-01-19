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

  const body = await request.json();
  const { content_ref } = body ?? {};

  if (!content_ref) {
    return NextResponse.json(
      { error: 'Missing required field: content_ref' },
      { status: 400 }
    );
  }

  // Security: Service role key is only used server-side
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-quiz`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      content_ref,
    }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    console.error('Edge Function error:', {
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
      url: `${supabaseUrl}/functions/v1/generate-quiz`,
    });
    let errorDetails: any = {};
    try {
      errorDetails = JSON.parse(responseBody);
    } catch {
      errorDetails = { error: responseBody || 'Unknown error' };
    }
    return NextResponse.json(
      { error: 'Quiz generation failed', details: errorDetails.error || errorDetails.details || responseBody },
      { status: response.status }
    );
  }

  // Capture quiz generated event
  const quizData = JSON.parse(responseBody);
  captureServerEvent(user.id, 'quiz_generated', {
    content_ref: content_ref,
    question_count: quizData.questions?.length || 0,
  });
  await getPostHogClient().shutdown();

  return NextResponse.json(quizData);
}
