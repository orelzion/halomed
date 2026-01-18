// supabase/functions/generate-path/index.ts
// Edge Function to generate full learning path for a user based on pace and review intensity
// Reference: Plan Section "Implementation Phases", scheduling.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { isScheduledDay, addDays, formatDate, parseDate } from '../_shared/calendar.ts';
import { getContentRefForIndex } from '../_shared/content-order.ts';

interface GeneratePathRequest {
  user_id: string;
}

interface PathNode {
  node_index: number;
  node_type: 'learning' | 'review' | 'quiz' | 'divider';
  content_ref: string | null;
  tractate: string | null;
  chapter: number | null;
  is_divider: boolean;
  unlock_date: string; // ISO date (YYYY-MM-DD)
  review_of_node_id?: string | null;
}

interface GeneratePathResponse {
  success: boolean;
  nodes_created: number;
  message: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = createCorsHeaders();

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body
    const body: GeneratePathRequest = await req.json();

    // Validate request
    if (!body.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Security: This function is deployed with --no-verify-jwt
    // Authentication is handled by the API route which validates the user's JWT
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('pace, review_intensity')
      .eq('user_id', body.user_id)
      .single();

    if (prefError || !preferences) {
      return new Response(
        JSON.stringify({ error: 'User preferences not found. User must complete onboarding first.' }),
        { status: 404, headers: corsHeaders }
      );
    }

    const { pace, review_intensity } = preferences;

    // Check if path already exists
    const { data: existingPath, error: pathError } = await supabase
      .from('learning_path')
      .select('id')
      .eq('user_id', body.user_id)
      .limit(1);

    if (pathError) {
      console.error('Error checking existing path:', pathError);
    }

    if (existingPath && existingPath.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Learning path already exists for this user. Use update-path to modify.',
          nodes_created: 0
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate path nodes
    const nodes: PathNode[] = [];
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Start of today
    
    let nodeIndex = 0;
    let contentIndex = 0;
    let scheduledDaysCount = 0;
    let currentChapter = 0;
    let currentTractate = 'Berakhot';
    
    // For MVP: Generate path for Berakhot only (9 chapters)
    // For full Shas: This would loop through all tractates
    const MAX_CHAPTERS = 9; // Berakhot has 9 chapters
    const MAX_CONTENT_ITEMS = 57; // Total mishnayot in Berakhot

    // Track learning nodes for quiz scheduling (intensive intervals: 1,3,7,14,30 days)
    const quizIntervals = [1, 3, 7, 14, 30];
    const learningNodeDates: Map<number, Date> = new Map(); // Map contentIndex -> date
    
    // Generate learning nodes
    while (contentIndex < MAX_CONTENT_ITEMS) {
      // Find next scheduled weekday
      let date = new Date(currentDate);
      date.setDate(date.getDate() + scheduledDaysCount);
      
      // Skip to next weekday if needed
      while (!(await isScheduledDay(date, 'DAILY_WEEKDAYS_ONLY'))) {
        scheduledDaysCount++;
        date = new Date(currentDate);
        date.setDate(date.getDate() + scheduledDaysCount);
      }

      // Get content references based on pace
      let contentRefs: string[] = [];
      let chapter: number;
      
      if (pace === 'one_chapter') {
        // Chapter-per-day: each scheduled day = one chapter
        chapter = Math.floor(contentIndex) + 1;
        if (chapter > MAX_CHAPTERS) break; // Done with all chapters
        const contentRef = getContentRefForIndex(contentIndex, 'DAILY_CHAPTER_PER_DAY');
        contentRefs = [contentRef];
        contentIndex += 1; // Move to next chapter
      } else if (pace === 'two_mishna') {
        // Two mishnayot per day: create 2 learning nodes for this day
        const firstRef = getContentRefForIndex(contentIndex, 'DAILY_WEEKDAYS_ONLY');
        const secondRef = getContentRefForIndex(contentIndex + 1, 'DAILY_WEEKDAYS_ONLY');
        contentRefs = [firstRef, secondRef];
        // Extract chapter from first ref
        const match = firstRef.match(/Mishnah_Berakhot\.(\d+)/);
        chapter = match ? parseInt(match[1]) : 1;
        contentIndex += 2; // Move forward by 2 mishnayot
      } else {
        // One mishna per day
        const contentRef = getContentRefForIndex(contentIndex, 'DAILY_WEEKDAYS_ONLY');
        contentRefs = [contentRef];
        // Extract chapter from contentRef (e.g., "Mishnah_Berakhot.2.3" -> chapter 2)
        const match = contentRef.match(/Mishnah_Berakhot\.(\d+)/);
        chapter = match ? parseInt(match[1]) : 1;
        contentIndex += 1;
      }

      // Insert divider before new chapter (except first)
      if (chapter !== currentChapter && currentChapter > 0) {
        nodes.push({
          node_index: nodeIndex++,
          node_type: 'divider',
          content_ref: null,
          tractate: currentTractate,
          chapter: currentChapter,
          is_divider: true,
          unlock_date: formatDate(date), // Unlock on same day as first node of new chapter
        });
      }

      // Create learning nodes for each content ref (1 for one_mishna/one_chapter, 2 for two_mishna)
      for (let i = 0; i < contentRefs.length; i++) {
        const contentRef = contentRefs[i];
        
        // Track this learning node for quiz scheduling (use first content ref for tracking)
        if (i === 0) {
          // Calculate the content index for tracking based on pace
          let learningNodeContentIndex: number;
          if (pace === 'one_chapter') {
            learningNodeContentIndex = chapter - 1;
          } else if (pace === 'two_mishna') {
            learningNodeContentIndex = contentIndex - 2; // Before we added 2
          } else {
            learningNodeContentIndex = contentIndex - 1; // Before we added 1
          }
          learningNodeDates.set(learningNodeContentIndex, new Date(date));
        }

        // Add learning node
        const learningNode: PathNode = {
          node_index: nodeIndex++,
          node_type: 'learning',
          content_ref: contentRef,
          tractate: currentTractate,
          chapter: chapter,
          is_divider: false,
          unlock_date: formatDate(date),
        };
        nodes.push(learningNode);

        // Schedule quiz nodes for this learning node at intensive intervals (1,3,7,14,30 days) - non-blocking
        // Quiz nodes appear for all users regardless of review_intensity
        for (const interval of quizIntervals) {
          const quizDate = addDays(date, interval);
          // Find next scheduled weekday for quiz date
          let quizScheduledDate = new Date(quizDate);
          let quizDaysOffset = 0;
          while (!(await isScheduledDay(quizScheduledDate, 'DAILY_WEEKDAYS_ONLY'))) {
            quizDaysOffset++;
            quizScheduledDate = addDays(quizDate, quizDaysOffset);
          }
          
          // Add quiz node (non-blocking - same unlock_date as learning node, or slightly after)
          nodes.push({
            node_index: nodeIndex++,
            node_type: 'quiz',
            content_ref: contentRef, // Quiz is about this content
            tractate: currentTractate,
            chapter: chapter,
            is_divider: false,
            unlock_date: formatDate(quizScheduledDate),
          });
        }
      }

      currentChapter = chapter;
      scheduledDaysCount++;

      // Break if we've generated enough content for MVP
      if (pace === 'one_chapter' && chapter >= MAX_CHAPTERS) break;
      if (pace !== 'one_chapter' && contentIndex >= MAX_CONTENT_ITEMS) break;
    }

    // Insert final divider after last chapter
    if (currentChapter > 0) {
      const lastDate = nodes.length > 0 ? parseDate(nodes[nodes.length - 1].unlock_date) : currentDate;
      nodes.push({
        node_index: nodeIndex++,
        node_type: 'divider',
        content_ref: null,
        tractate: currentTractate,
        chapter: currentChapter,
        is_divider: true,
        unlock_date: formatDate(addDays(lastDate, 1)),
      });
    }

    // Insert nodes into database
    const pathNodes = nodes.map(node => ({
      user_id: body.user_id,
      node_index: node.node_index,
      node_type: node.node_type === 'divider' ? 'learning' : node.node_type, // dividers stored as 'learning' type
      content_ref: node.content_ref,
      tractate: node.tractate,
      chapter: node.chapter,
      is_divider: node.is_divider,
      unlock_date: node.unlock_date,
      review_of_node_id: node.review_of_node_id || null,
    }));

    const { error: insertError } = await supabase
      .from('learning_path')
      .insert(pathNodes);

    if (insertError) {
      console.error('Error inserting path nodes:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create learning path',
          details: insertError.message 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Pre-generate content for the next 14 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourteenDaysLater = new Date(today);
    fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);
    const todayStr = formatDate(today);
    const fourteenDaysLaterStr = formatDate(fourteenDaysLater);

    // Get all learning nodes (not quiz/review/divider) within next 14 days
    const learningNodesInWindow = nodes.filter(node => 
      node.node_type === 'learning' && 
      !node.is_divider &&
      node.content_ref &&
      node.unlock_date >= todayStr &&
      node.unlock_date <= fourteenDaysLaterStr
    );

    // Extract unique content_ref values
    const uniqueContentRefs = Array.from(new Set(
      learningNodesInWindow
        .map(node => node.content_ref)
        .filter((ref): ref is string => ref !== null)
    ));

    console.log(`[generate-path] Pre-generating content for ${uniqueContentRefs.length} unique content items in next 14 days`);

    // Check which content already exists and generate missing ones
    let contentGenerated = 0;
    let contentSkipped = 0;
    let contentErrors = 0;

    for (const contentRef of uniqueContentRefs) {
      try {
        // Check if content exists in cache
        const { data: existingContent } = await supabase
          .from('content_cache')
          .select('id')
          .eq('ref_id', contentRef)
          .single();

        if (existingContent) {
          console.log(`[generate-path] Content already exists: ${contentRef}`);
          contentSkipped++;
          continue;
        }

        // Content doesn't exist - generate it
        console.log(`[generate-path] Generating content for: ${contentRef}`);
        const contentResponse = await fetch(`${supabaseUrl}/functions/v1/generate-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ ref_id: contentRef }),
        });

        if (contentResponse.ok) {
          const generated = await contentResponse.json();
          if (generated?.id) {
            console.log(`[generate-path] Successfully generated content: ${contentRef} (id: ${generated.id})`);
            contentGenerated++;
          } else {
            console.warn(`[generate-path] Content generation returned no ID for: ${contentRef}`);
            contentErrors++;
          }
        } else {
          const errorText = await contentResponse.text();
          console.warn(`[generate-path] Failed to generate content for ${contentRef}:`, errorText);
          contentErrors++;
        }
      } catch (error) {
        console.error(`[generate-path] Error generating content for ${contentRef}:`, error);
        contentErrors++;
      }
    }

    console.log(`[generate-path] Content generation summary: ${contentGenerated} generated, ${contentSkipped} already existed, ${contentErrors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        nodes_created: nodes.length,
        message: `Learning path generated with ${nodes.length} nodes. Content: ${contentGenerated} generated, ${contentSkipped} cached, ${contentErrors} errors.`
      } as GeneratePathResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating path:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
