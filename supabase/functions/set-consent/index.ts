// supabase/functions/set-consent/index.ts
// Edge Function to update user consent preferences
// Reference: tasks.md Section 12, Task 12.2

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateAuth } from '../_shared/auth.ts';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

interface SetConsentRequest {
  analytics_consent?: boolean;
  marketing_consent?: boolean;
  functional_consent?: boolean;
  consent_version?: string;
}

interface ConsentPreferences {
  id: string;
  user_id: string;
  analytics_consent: boolean;
  marketing_consent: boolean;
  functional_consent: boolean;
  consent_timestamp: string;
  consent_version: string;
  ip_country: string | null;
  created_at: string;
  updated_at: string;
}

interface SetConsentResponse {
  consent: ConsentPreferences;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = createCorsHeaders();

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Authenticate the user
    const { user, error: authError } = await validateAuth(req, supabaseUrl, supabaseAnonKey);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: authError?.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const body: SetConsentRequest = await req.json();

    // Use service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert consent preferences
    // Default values: false for all consents, '1.0' for version
    const { data, error } = await supabase
      .from('user_consent_preferences')
      .upsert({
        user_id: user.id,
        analytics_consent: body.analytics_consent ?? false,
        marketing_consent: body.marketing_consent ?? false,
        functional_consent: body.functional_consent ?? false,
        consent_version: body.consent_version ?? '1.0',
        consent_timestamp: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user_consent_preferences:', error);
      throw error;
    }

    const response: SetConsentResponse = {
      consent: data,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in set-consent:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
