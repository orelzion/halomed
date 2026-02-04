import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { captureServerEvent, getPostHogClient } from '@/lib/posthog-server';

type Pace = 'two_mishna' | 'one_chapter' | 'seder_per_year';
type ReviewIntensity = 'none' | 'light' | 'medium' | 'intensive';

interface UpdatePreferencesBody {
  pace: Pace;
  review_intensity: ReviewIntensity;
}

const VALID_PACES: Pace[] = ['two_mishna', 'one_chapter', 'seder_per_year'];
const VALID_REVIEW_INTENSITIES: ReviewIntensity[] = ['none', 'light', 'medium', 'intensive'];

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

  // Validate user session
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
  }

  // Parse and validate request body
  let body: UpdatePreferencesBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.pace || !VALID_PACES.includes(body.pace)) {
    return NextResponse.json(
      { error: `Invalid pace value. Must be one of: ${VALID_PACES.join(', ')}` },
      { status: 400 }
    );
  }

  if (!body.review_intensity || !VALID_REVIEW_INTENSITIES.includes(body.review_intensity)) {
    return NextResponse.json(
      { error: `Invalid review_intensity value. Must be one of: ${VALID_REVIEW_INTENSITIES.join(', ')}` },
      { status: 400 }
    );
  }

  // Call the Edge Function to update preferences
  const response = await fetch(`${supabaseUrl}/functions/v1/update-preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
    },
    body: JSON.stringify({
      user_id: user.id,
      pace: body.pace,
      review_intensity: body.review_intensity,
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
      { error: 'Preferences update failed', details: errorDetails.error || errorDetails.details || responseBody },
      { status: response.status }
    );
  }

  // Capture preferences updated event
  const updateData = JSON.parse(responseBody);
  captureServerEvent(user.id, 'preferences_updated', {
    new_pace: body.pace,
    new_review_intensity: body.review_intensity,
    nodes_preserved: updateData.nodes_preserved || 0,
    nodes_created: updateData.nodes_created || 0,
  });
  const posthogClient = getPostHogClient();
  if (posthogClient) {
    await posthogClient.shutdown();
  }

  return NextResponse.json(updateData);
}
