// supabase/functions/export-user-data/index.ts
// Edge Function to export all user data for GDPR compliance
// Reference: tasks.md Section 12, Task 12.9

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateAuth } from '../_shared/auth.ts';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

interface ExportDataResponse {
  user_id: string;
  exported_at: string;
  data: {
    user_study_log: any[];
    user_preferences: any[];
    user_consent_preferences: any[];
    learning_path: any[];
  };
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
        { status: 401, headers: corsHeaders }
      );
    }

    // Use service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: Check if user has exported data in the last 24 hours
    // Store last export timestamp in user_consent_preferences or a separate table
    // For simplicity, we'll check user_consent_preferences.updated_at as a proxy
    // In production, you might want a dedicated export_log table
    const { data: consentData } = await supabase
      .from('user_consent_preferences')
      .select('updated_at')
      .eq('user_id', user.id)
      .single();

    // If consent exists and was updated less than 24 hours ago, check for recent export
    // For MVP, we'll use a simple approach: allow one export per day based on consent update
    // In production, add a dedicated export_log table with proper rate limiting
    if (consentData?.updated_at) {
      const lastUpdate = new Date(consentData.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      
      // If updated less than 24 hours ago, check if this might be a duplicate export request
      // For now, we'll allow exports but log a warning
      if (hoursSinceUpdate < 24) {
        console.warn(`User ${user.id} requested export within 24 hours of last update`);
      }
    }

    // Fetch all user data from all tables
    const userId = user.id;

    // Fetch user_study_log
    const { data: studyLogs, error: studyLogsError } = await supabase
      .from('user_study_log')
      .select('*')
      .eq('user_id', userId);

    if (studyLogsError) {
      console.error('Error fetching user_study_log:', studyLogsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch study logs', details: studyLogsError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch user_preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId);

    if (preferencesError) {
      console.error('Error fetching user_preferences:', preferencesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch preferences', details: preferencesError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch user_consent_preferences
    const { data: consentPreferences, error: consentError } = await supabase
      .from('user_consent_preferences')
      .select('*')
      .eq('user_id', userId);

    if (consentError && consentError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user_consent_preferences:', consentError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch consent preferences', details: consentError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch learning_path
    const { data: learningPath, error: learningPathError } = await supabase
      .from('learning_path')
      .select('*')
      .eq('user_id', userId)
      .order('node_index', { ascending: true });

    if (learningPathError) {
      console.error('Error fetching learning_path:', learningPathError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch learning path', details: learningPathError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Construct response
    const response: ExportDataResponse = {
      user_id: userId,
      exported_at: new Date().toISOString(),
      data: {
        user_study_log: studyLogs || [],
        user_preferences: preferences || [],
        user_consent_preferences: consentPreferences || [],
        learning_path: learningPath || [],
      },
    };

    return new Response(
      JSON.stringify(response, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="halomed-export-${userId}-${Date.now()}.json"`,
        },
      }
    );

  } catch (error) {
    console.error('Error in export-user-data:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
