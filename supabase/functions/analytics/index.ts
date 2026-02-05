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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: prefsData } = await supabase
      .from("user_preferences")
      .select("pace, streak_count, review_intensity");

    const totalUsers = (prefsData || []).length;
    const paceCounts: Record<string, number> = {};
    const streakRanges: Record<string, number> = { "0": 0, "1-7": 0, "8-30": 0, "30+": 0 };
    const reviewCounts: Record<string, number> = {};
    
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

    // Calculate active users from study log
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: logData } = await supabase
      .from("user_study_log")
      .select("user_id, study_date, is_completed, node_type")
      .gte("study_date", thirtyDaysAgo);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers7d = new Set(
      (logData || []).filter((l) => new Date(l.study_date) >= sevenDaysAgo).map((l) => l.user_id)
    ).size;
    const activeUsers30d = new Set((logData || []).map((l) => l.user_id)).size;

    const learningComplete = (logData || []).filter((l) => l.node_type === "learning" && l.is_completed).length;
    const learningTotal = (logData || []).filter((l) => l.node_type === "learning").length;
    const quizComplete = (logData || []).filter((l) => l.node_type === "quiz" && l.is_completed).length;
    const quizTotal = (logData || []).filter((l) => l.node_type === "quiz").length;
    const reviewCompleteCount = (logData || []).filter((l) => l.node_type === "review" && l.is_completed).length;
    const reviewTotal = (logData || []).filter((l) => l.node_type === "review").length;

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
      completion_rate_30d: learningTotal > 0 ? Math.round((learningComplete / learningTotal) * 1000) / 10 : 0,
      quiz_completion_rate_30d: quizTotal > 0 ? Math.round((quizComplete / quizTotal) * 1000) / 10 : 0,
      review_completion_rate_30d: reviewTotal > 0 ? Math.round((reviewCompleteCount / reviewTotal) * 1000) / 10 : 0,
      week_over_week_change: 0,
      month_over_month_change: 0,
      users_with_preferences: totalUsers,
      onboarding_completion_rate: 100,
      refreshed_at: new Date().toISOString(),
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
