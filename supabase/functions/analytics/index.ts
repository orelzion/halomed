import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create client with explicit JWT verification disabled
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Get user preferences (main data source)
    const { data: prefsData } = await supabase
      .from("user_preferences")
      .select("pace, streak_count, review_intensity, last_study_date, current_content_index, created_at");

    const totalUsers = (prefsData || []).length;
    const paceCounts: Record<string, number> = {};
    const streakRanges: Record<string, number> = { "0": 0, "1-7": 0, "8-30": 0, "30+": 0 };
    const reviewCounts: Record<string, number> = {};
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let activeUsers7d = 0;
    let activeUsers30d = 0;
    
    for (const pref of prefsData || []) {
      const p = pref.pace || "unknown";
      paceCounts[p] = (paceCounts[p] || 0) + 1;
      
      const streak = pref.streak_count || 0;
      if (streak === 0) streakRanges["0"]++;
      else if (streak <= 7) streakRanges["1-7"]++;
      else if (streak <= 30) streakRanges["8-30"]++;
      else streakRanges["30+"]++;
      
      const r = pref.review_intensity || "none";
      reviewCounts[r] = (reviewCounts[r] || 0) + 1;
      
      // Calculate active users based on last_study_date
      if (pref.last_study_date) {
        const lastStudy = new Date(pref.last_study_date);
        if (lastStudy >= sevenDaysAgo) activeUsers7d++;
        if (lastStudy >= thirtyDaysAgo) activeUsers30d++;
      }
    }

    const userPace = Object.entries(paceCounts).map(([pace, count]) => ({
      pace,
      user_count: count,
      percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0,
    }));

    const streakDistribution = Object.entries(streakRanges).map(([range, count]) => ({
      streak_range: range,
      user_count: count,
      percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0,
    }));

    const reviewCompletion = Object.entries(reviewCounts).map(([intensity, count]) => ({
      review_intensity: intensity,
      total_users: count,
      total_reviews_scheduled: 0,
      total_reviews_completed: 0,
      overall_completion_rate: 0,
    }));

    // Get content stats
    const { count: contentCount } = await supabase
      .from("content_cache")
      .select("*", { count: "exact", head: true });

    // Get quiz stats
    const { count: quizCount } = await supabase
      .from("quiz_questions")
      .select("*", { count: "exact", head: true });

    let avgStreak = 0;
    if (totalUsers > 0) {
      const sum = (prefsData || []).reduce((s, p) => s + (p.streak_count || 0), 0);
      avgStreak = Math.round((sum / totalUsers) * 10) / 10;
    }

    const summary = {
      total_users: totalUsers,
      active_users_7d: activeUsers7d,
      active_users_30d: activeUsers30d,
      avg_streak: avgStreak,
      users_with_streak_7plus: (prefsData || []).filter((p) => (p.streak_count || 0) >= 7).length,
      users_with_streak_30plus: (prefsData || []).filter((p) => (p.streak_count || 0) >= 30).length,
      retention_7d_rate: activeUsers30d > 0 ? Math.round((activeUsers7d / activeUsers30d) * 1000) / 10 : 0,
      completion_rate_30d: 0,
      quiz_completion_rate_30d: 0,
      review_completion_rate_30d: 0,
      week_over_week_change: 0,
      month_over_month_change: 0,
      users_with_preferences: totalUsers,
      onboarding_completion_rate: totalUsers > 0 ? Math.round(((prefsData || []).filter((p) => p.pace && p.review_intensity).length / totalUsers) * 1000) / 10 : 0,
      content_cached: contentCount || 0,
      quiz_questions: quizCount || 0,
      refreshed_at: new Date().toISOString(),
      // Additional fields for UI components
      passRate: 0,
      on_pace_pct: 0,
      behind_1_7_count: 0,
      behind_7_plus_count: 0,
      behind_7_plus_pct: 0,
      hardest: '-',
      hardest_label: '-',
      completion: 0,
      dropOff: 0,
      biggestDropOff: '-',
      retention: 0,
      retentionTrend: '-',
      paceAdherence: '-',
      paceTrend: '-',
      on_pace_count: 0,
    };

    return new Response(JSON.stringify({
      summary: [summary],
      userPace,
      streakDistribution,
      weeklyActivity: [],
      cohortRetention: [],
      paceAdherence: [],
      contentDifficulty: [],
      onboardingFunnel: null,
      reviewCompletion,
      refreshed_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json" 
      },
    });
  }
});
