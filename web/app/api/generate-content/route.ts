import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isPlaceholderContent } from '@/lib/utils/content-validation';

type CacheStatus = 'cached' | 'generated';

interface GenerateContentApiResponse {
  id: string;
  ref_id: string;
  source_text_he: string;
  ai_explanation_json: unknown;
  he_ref?: string | null;
  created_at?: string;
  updated_at?: string;
  cache_status: CacheStatus;
}

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
  const { ref_id } = body;

  if (!ref_id) {
    return NextResponse.json({ error: 'Missing ref_id' }, { status: 400 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingContent, error: existingError } = await serviceClient
    .from('content_cache')
    .select('*')
    .eq('ref_id', ref_id)
    .maybeSingle();

  if (!existingError && existingContent && !isPlaceholderContent(existingContent.ai_explanation_json)) {
    return NextResponse.json({
      ...existingContent,
      cache_status: 'cached',
    } satisfies GenerateContentApiResponse);
  }

  // Security: Service role key is only used server-side
  // User authentication is validated above before calling the Edge Function
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({ ref_id }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    let errorDetails: { error?: string; details?: string } = {};
    try {
      errorDetails = JSON.parse(responseBody);
    } catch {
      errorDetails = { error: responseBody || 'Unknown error' };
    }
    return NextResponse.json(
      { error: 'Content generation failed', details: errorDetails.error || errorDetails.details || responseBody },
      { status: response.status }
    );
  }

  const generatedContent = JSON.parse(responseBody);

  // Return the full content_cache row (includes created_at/updated_at) so
  // client-side local persistence has all required fields.
  const generatedRefId = generatedContent?.ref_id as string | undefined;
  if (generatedRefId) {
    const { data: storedContent, error: storedContentError } = await serviceClient
      .from('content_cache')
      .select('*')
      .eq('ref_id', generatedRefId)
      .maybeSingle();

    if (!storedContentError && storedContent) {
      return NextResponse.json({
        ...storedContent,
        cache_status: 'generated',
      } satisfies GenerateContentApiResponse);
    }
  }

  return NextResponse.json({
    ...generatedContent,
    cache_status: 'generated',
  } satisfies GenerateContentApiResponse);
}
