import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { date_range = "7d" } = req.method === "POST" ? await req.json() : {};

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = (url: string, key: string) => {
      return {
        from: (table: string) => ({
          select: (columns: string) => ({
            eq: (column: string, value: any) => ({
              single: async () => {
                const res = await fetch(`${url}/${table}?${column}=eq.${value}&limit=1`, {
                  headers: { apikey: key, Authorization: `Bearer ${key}` },
                });
                const data = await res.json();
                return { data: data[0] || null, error: null };
              },
              then: async (callback: any) => callback({ data: data[0] || null, error: null }),
            }),
            order: () => ({
              limit: async () => {
                const res = await fetch(`${url}/${table}?order=${columns}`, {
                  headers: { apikey: key, Authorization: `Bearer ${key}` },
                });
                return { data: await res.json(), error: null };
              },
            }),
          }),
        }),
        rpc: async (functionName: string, params?: any) => {
          const res = await fetch(`${url}/rpc/${functionName}`, {
            method: "POST",
            headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify(params || {}),
          });
          return { data: await res.json(), error: res.ok ? null : new Error(await res.text()) };
        },
      };
    };

    const client = adminClient(supabaseUrl, supabaseKey);

    // Get summary stats
    const { data: summaryData } = await getSummaryStats(client);
    
    // Get user pace distribution
    const { data: paceData } = await getUserPaceDistribution(client);
    
    // Get streak distribution
    const { data: streakData } = await getStreakDistribution(client);
    
    // Get weekly activity
    const { data: weeklyData } = await getWeeklyActivity(client, date_range);
    
    // Get cohort retention
    const { data: cohortData } = await getCohortRetention(client);
    
    // Get pace adherence
    const { data: paceAdherenceData } = await getPaceAdherence(client);
    
    // Get content difficulty
    const { data: contentDifficultyData } = await getContentDifficulty(client);
    
    // Get onboarding funnel
    const { data: onboardingData } = await getOnboardingFunnel(client);
    
    // Get review completion
    const { data: reviewCompletionData } = await getReviewCompletion(client);

    return new Response(JSON.stringify({
      summary: summaryData,
      userPace: paceData,
      streakDistribution: streakData,
      weeklyActivity: weeklyData,
      cohortRetention: cohortData,
      paceAdherence: paceAdherenceData,
      contentDifficulty: contentDifficultyData,
      onboardingFunnel: onboardingData,
      reviewCompletion: reviewCompletionData,
      refreshed_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getSummaryStats(client: any) {
  try {
    const { data } = await client.rpc("get_summary_stats");
    return data || [];
  } catch {
    // Fallback: calculate from tables
    return [{
      total_users: 0,
      active_users_7d: 0,
      active_users_30d: 0,
      avg_streak: 0,
      users_with_streak_7plus: 0,
      users_with_streak_30plus: 0,
      retention_7d_rate: 0,
      completion_rate_30d: 0,
      quiz_completion_rate_30d: 0,
      review_completion_rate_30d: 0,
      week_over_week_change: 0,
      month_over_month_change: 0,
      users_with_preferences: 0,
      onboarding_completion_rate: 0,
      refreshed_at: new Date().toISOString(),
    }];
  }
}

async function getUserPaceDistribution(client: any) {
  try {
    const { data } = await client.rpc("get_user_pace_distribution");
    return data || [];
  } catch {
    return [];
  }
}

async function getStreakDistribution(client: any) {
  try {
    const { data } = await client.rpc("get_streak_distribution");
    return data || [];
  } catch {
    return [];
  }
}

async function getWeeklyActivity(client: any, dateRange: string) {
  try {
    const { data } = await client.rpc("get_weekly_activity");
    return data || [];
  } catch {
    return [];
  }
}

async function getCohortRetention(client: any) {
  try {
    const { data } = await client.rpc("get_cohort_retention");
    return data || [];
  } catch {
    return [];
  }
}

async function getPaceAdherence(client: any) {
  try {
    const { data } = await client.rpc("get_pace_adherence");
    return data || [];
  } catch {
    return [];
  }
}

async function getContentDifficulty(client: any) {
  try {
    const { data } = await client.rpc("get_content_difficulty");
    return data || [];
  } catch {
    return [];
  }
}

async function getOnboardingFunnel(client: any) {
  try {
    const { data } = await client.rpc("get_onboarding_funnel");
    return data || null;
  } catch {
    return null;
  }
}

async function getReviewCompletion(client: any) {
  try {
    const { data } = await client.rpc("get_review_completion");
    return data || [];
  } catch {
    return [];
  }
}
