// supabase/functions/delete-account/index.ts
// Edge Function to delete user account and all associated data
// Reference: tasks.md Section 12, Task 12.10

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateAuth } from '../_shared/auth.ts';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

interface DeleteAccountResponse {
  success: boolean;
  message: string;
  deleted_at: string;
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
    const userId = user.id;

    // Delete all user data from all tables
    // Note: Due to CASCADE constraints, deleting from auth.users will automatically
    // delete related rows in: user_preferences, user_consent_preferences
    // Note: user_study_log and learning_path tables were removed in Phase 1
    // We attempt to delete them but ignore errors if tables don't exist

    // Try to delete user_study_log (may not exist)
    try {
      const { error: studyLogsError } = await supabase
        .from('user_study_log')
        .delete()
        .eq('user_id', userId);

      if (studyLogsError && !studyLogsError.message.includes('does not exist')) {
        console.error('Error deleting user_study_log:', studyLogsError);
      }
    } catch (e) {
      // Table may not exist, ignore
    }

    // Delete user_preferences
    const { error: preferencesError } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);

    if (preferencesError) {
      console.error('Error deleting user_preferences:', preferencesError);
    }

    // Delete user_consent_preferences
    const { error: consentError } = await supabase
      .from('user_consent_preferences')
      .delete()
      .eq('user_id', userId);

    if (consentError && consentError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error deleting user_consent_preferences:', consentError);
    }

    // Note: learning_path deletion removed in Phase 1 position-based implementation
    console.log('[delete-account] Skipping learning_path deletion (Phase 1: position-based implementation)');

    // Delete the Supabase Auth user using admin API
    // This will trigger CASCADE deletions for any remaining data
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return new Response(
        JSON.stringify({
          error: 'Failed to delete user account',
          message: deleteUserError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Success response
    const response: DeleteAccountResponse = {
      success: true,
      message: 'Account and all associated data have been deleted successfully',
      deleted_at: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in delete-account:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
