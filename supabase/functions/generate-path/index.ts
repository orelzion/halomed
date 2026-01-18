// supabase/functions/generate-path/index.ts
// Edge Function to generate full learning path for a user based on pace and review intensity
// Reference: Plan Section "Implementation Phases", scheduling.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { isScheduledDay, addDays, formatDate, parseDate, isJewishHoliday } from '../_shared/calendar.ts';
import { 
  getContentRefForIndex, 
  getCurrentTractate, 
  getCurrentChapter,
  isChapterEndIndex,
  isTractateEndIndex,
  TOTAL_MISHNAYOT,
  TOTAL_CHAPTERS,
} from '../_shared/content-order.ts';

interface GeneratePathRequest {
  user_id: string;
  force?: boolean; // If true, delete existing path and regenerate
  dev_offset_days?: number; // In dev mode: offset start date backwards to simulate progress
}

interface PathNode {
  node_index: number;
  node_type: 'learning' | 'review' | 'quiz' | 'weekly_quiz' | 'divider';
  content_ref: string | null;
  tractate: string | null;
  chapter: number | null;
  is_divider: boolean;
  unlock_date: string; // ISO date (YYYY-MM-DD)
  review_of_node_id?: string | null;
}

/**
 * Checks if a date is Friday (day 5 in JavaScript Date.getDay())
 */
function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

/**
 * Checks if a date is Thursday (day 4 in JavaScript Date.getDay())
 */
function isThursday(date: Date): boolean {
  return date.getDay() === 4;
}

/**
 * Get the Thursday before a given Friday
 */
function getThursdayBefore(friday: Date): Date {
  const thursday = new Date(friday);
  thursday.setDate(friday.getDate() - 1);
  return thursday;
}

/**
 * Get the Friday of next week
 */
function getNextFriday(friday: Date): Date {
  const nextFriday = new Date(friday);
  nextFriday.setDate(friday.getDate() + 7);
  return nextFriday;
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

    // If path exists and force is not true, return error
    if (existingPath && existingPath.length > 0 && !body.force) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Learning path already exists for this user. Set force=true to regenerate.',
          nodes_created: 0
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // If force is true, delete existing path
    if (existingPath && existingPath.length > 0 && body.force) {
      console.log(`[generate-path] Force regeneration: deleting existing path for user ${body.user_id}`);
      const { error: deleteError } = await supabase
        .from('learning_path')
        .delete()
        .eq('user_id', body.user_id);

      if (deleteError) {
        console.error('Error deleting existing path:', deleteError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to delete existing path',
            details: deleteError.message 
          }),
          { status: 500, headers: corsHeaders }
        );
      }
      console.log(`[generate-path] Deleted existing path, regenerating...`);
    }

    // Generate path nodes
    const nodes: PathNode[] = [];
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Start of today
    
    // In dev mode: offset start date backwards to simulate being a few days into the path
    const devOffsetDays = body.dev_offset_days || 0;
    if (devOffsetDays > 0) {
      currentDate.setDate(currentDate.getDate() - devOffsetDays);
      console.log(`[generate-path] Dev mode: Starting path ${devOffsetDays} days in the past (${formatDate(currentDate)})`);
    }
    
    let nodeIndex = 0;
    let contentIndex = 0;
    let scheduledDaysCount = 0;
    let currentChapter = 0;
    let currentTractate: string | undefined = undefined;
    let previousTractate: string | undefined = undefined;
    let previousDate: Date | undefined = undefined; // Track previous date for completion dividers
    let pendingQuizWeeks: string[] = []; // Track weeks where quiz was skipped due to holidays
    
    // Review intervals based on intensity setting
    const REVIEW_INTERVALS: Record<string, number[]> = {
      'none': [],
      'light': [7, 30],
      'medium': [3, 7, 30],
      'intensive': [1, 3, 7, 14, 30],
    };
    const reviewIntervals = REVIEW_INTERVALS[review_intensity] || [];
    
    // Track learning nodes for review scheduling
    const learningNodeDates: Map<number, { date: Date; contentRef: string; tractate: string; chapter: number }> = new Map();
    
    // Full Shas: Generate path for all 63 tractates (~4,192 mishnayot)
    // No limits - generate complete path
    
    // Generate learning nodes for complete Shas
    // Log progress every 100 nodes to track generation
    let lastLogIndex = 0;
    const LOG_INTERVAL = 100;
    
    while (contentIndex < TOTAL_MISHNAYOT) {
      // Log progress periodically
      if (nodes.length - lastLogIndex >= LOG_INTERVAL) {
        console.log(`[generate-path] Generated ${nodes.length} nodes so far (content index: ${contentIndex}/${TOTAL_MISHNAYOT})`);
        lastLogIndex = nodes.length;
      }
      
      // Find next scheduled weekday
      let date = new Date(currentDate);
      date.setDate(date.getDate() + scheduledDaysCount);
      
      // Skip to next weekday if needed
      while (!(await isScheduledDay(date, 'DAILY_WEEKDAYS_ONLY'))) {
        scheduledDaysCount++;
        date = new Date(currentDate);
        date.setDate(date.getDate() + scheduledDaysCount);
      }

      // If this is Friday, handle weekly quiz
      if (isFriday(date)) {
        const fridayIsHoliday = await isJewishHoliday(date);
        
        if (fridayIsHoliday) {
          // Friday is a holiday - check Thursday
          const thursday = getThursdayBefore(date);
          const thursdayIsHoliday = await isJewishHoliday(thursday);
          
          if (thursdayIsHoliday) {
            // Both Friday and Thursday are holidays - skip this week's quiz
            // The content will be included in next week's quiz
            console.log(`[generate-path] Skipping quiz for week of ${formatDate(date)} - both Fri and Thu are holidays`);
            // Mark that we're skipping (quiz will cover 2 weeks next time)
            pendingQuizWeeks.push(formatDate(date));
          } else {
            // Thursday is available - put quiz on Thursday
            console.log(`[generate-path] Moving quiz from Friday ${formatDate(date)} to Thursday ${formatDate(thursday)} (Friday is holiday)`);
            
            // Build content_ref with all covered weeks (this week + any pending)
            const allWeeks = [...pendingQuizWeeks, formatDate(date)];
            const contentRef = allWeeks.length > 1 
              ? `weekly_quiz_${formatDate(thursday)}+${pendingQuizWeeks.join('+')}` 
              : `weekly_quiz_${formatDate(thursday)}`;
            pendingQuizWeeks = []; // Clear pending
            
            nodes.push({
              node_index: nodeIndex++,
              node_type: 'weekly_quiz',
              content_ref: contentRef,
              tractate: null,
              chapter: null,
              is_divider: false,
              unlock_date: formatDate(thursday),
            });
          }
        } else {
          // Friday is not a holiday - add quiz normally
          // Build content_ref with all covered weeks (this week + any pending)
          const allWeeks = [...pendingQuizWeeks, formatDate(date)];
          const contentRef = allWeeks.length > 1 
            ? `weekly_quiz_${formatDate(date)}+${pendingQuizWeeks.join('+')}` 
            : `weekly_quiz_${formatDate(date)}`;
          pendingQuizWeeks = []; // Clear pending
          
          nodes.push({
            node_index: nodeIndex++,
            node_type: 'weekly_quiz',
            content_ref: contentRef,
            tractate: null,
            chapter: null,
            is_divider: false,
            unlock_date: formatDate(date),
          });
        }
        
        // Skip to next scheduled day (Sunday)
        scheduledDaysCount++;
        previousDate = date;
        continue;
      }

      // Get content indices for this day based on pace
      let contentIndices: number[] = [];
      
      if (pace === 'one_chapter') {
        // Chapter-per-day: each scheduled day = one chapter
        if (contentIndex >= TOTAL_CHAPTERS) break;
        contentIndices = [contentIndex];
        contentIndex += 1;
      } else if (pace === 'two_mishna') {
        // Two mishnayot per day
        if (contentIndex + 1 >= TOTAL_MISHNAYOT) {
          contentIndices = [contentIndex];
          contentIndex += 1;
        } else {
          contentIndices = [contentIndex, contentIndex + 1];
          contentIndex += 2;
        }
      } else {
        // One mishna per day
        contentIndices = [contentIndex];
        contentIndex += 1;
      }

      // Process each content item for this day, checking for tractate/chapter changes
      for (let i = 0; i < contentIndices.length; i++) {
        const idx = contentIndices[i];
        const contentRef = getContentRefForIndex(idx, pace === 'one_chapter' ? 'DAILY_CHAPTER_PER_DAY' : 'DAILY_WEEKDAYS_ONLY');
        const chapter = getCurrentChapter(idx);
        const tractate = getCurrentTractate(idx);
        
        if (!tractate || !chapter) {
          console.warn(`[generate-path] Could not determine tractate/chapter for index ${idx}`);
          continue;
        }
        
        // Debug: Log tracking state periodically
        if (nodeIndex % 50 === 0) {
          console.log(`[generate-path] Tracking state at node ${nodeIndex}: idx=${idx}, tractate=${tractate}, chapter=${chapter}, currentTractate=${currentTractate}, currentChapter=${currentChapter}`);
        }

        // Check for tractate completion (insert divider BEFORE this learning node)
        if (previousTractate && tractate !== previousTractate) {
          // Log tractate divider creation for debugging
          console.log(`[generate-path] Creating TRACTATE divider: ${previousTractate} chapter ${currentChapter}, date: ${formatDate(date)}, nodeIndex: ${nodeIndex}, contentIdx: ${idx}, newTractate: ${tractate}`);
          
          // Tractate completion divider - placed right after the last learning node
          nodes.push({
            node_index: nodeIndex++,
            node_type: 'divider',
            content_ref: null,
            tractate: previousTractate,
            chapter: currentChapter, // Last chapter of previous tractate
            is_divider: true,
            unlock_date: formatDate(date), // Same day, right before new tractate starts
          });
        }
        // Check for chapter completion (only if same tractate)
        else if (chapter !== currentChapter && currentChapter > 0 && tractate === currentTractate) {
          // Log chapter divider creation for debugging
          console.log(`[generate-path] Creating chapter divider: ${currentTractate} chapter ${currentChapter}, date: ${formatDate(date)}, nodeIndex: ${nodeIndex}, contentIdx: ${idx}, newChapter: ${chapter}`);
          
          // Chapter completion divider
          nodes.push({
            node_index: nodeIndex++,
            node_type: 'divider',
            content_ref: null,
            tractate: currentTractate,
            chapter: currentChapter,
            is_divider: true,
            unlock_date: formatDate(date), // Same day, right before new chapter starts
          });
        }

        // Add learning node
        const learningNode: PathNode = {
          node_index: nodeIndex++,
          node_type: 'learning',
          content_ref: contentRef,
          tractate: tractate,
          chapter: chapter,
          is_divider: false,
          unlock_date: formatDate(date),
        };
        nodes.push(learningNode);
        
        // Track this learning node for review scheduling
        learningNodeDates.set(idx, {
          date: new Date(date),
          contentRef: contentRef,
          tractate: tractate,
          chapter: chapter,
        });

        // Update tracking for next iteration
        // IMPORTANT: previousTractate must be set to THIS content's tractate,
        // not the old currentTractate, otherwise we'll create duplicate dividers
        // when a tractate change spans across days
        previousTractate = tractate;
        currentTractate = tractate;
        currentChapter = chapter;
      }

      previousDate = date; // Track this date for completion dividers
      scheduledDaysCount++;

      // Break if we've completed all content
      if (pace === 'one_chapter' && contentIndex >= TOTAL_CHAPTERS) break;
      if (pace !== 'one_chapter' && contentIndex >= TOTAL_MISHNAYOT) break;
    }

    // Generate review nodes based on review_intensity setting
    // Review nodes are scheduled at intervals after learning nodes
    if (reviewIntervals.length > 0) {
      console.log(`[generate-path] Generating review nodes with intensity '${review_intensity}' (intervals: ${reviewIntervals.join(', ')} days)`);
      
      let reviewNodesCount = 0;
      for (const [contentIdx, learningInfo] of learningNodeDates) {
        for (const interval of reviewIntervals) {
          const reviewDate = addDays(learningInfo.date, interval);
          
          // Find next scheduled weekday for review date (skip Shabbat, holidays, and Fridays which are quiz-only)
          let reviewScheduledDate = new Date(reviewDate);
          let daysOffset = 0;
          while (!(await isScheduledDay(reviewScheduledDate, 'DAILY_WEEKDAYS_ONLY')) || isFriday(reviewScheduledDate)) {
            daysOffset++;
            reviewScheduledDate = addDays(reviewDate, daysOffset);
            if (daysOffset > 7) break; // Safety limit
          }
          
          nodes.push({
            node_index: nodeIndex++,
            node_type: 'review',
            content_ref: learningInfo.contentRef,
            tractate: learningInfo.tractate,
            chapter: learningInfo.chapter,
            is_divider: false,
            unlock_date: formatDate(reviewScheduledDate),
          });
          reviewNodesCount++;
        }
      }
      console.log(`[generate-path] Generated ${reviewNodesCount} review nodes`);
    }

    // Insert final divider after last chapter/tractate
    if (currentChapter > 0 && currentTractate) {
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

    console.log(`[generate-path] Generated ${nodes.length} total nodes, preparing for batch insert...`);
    
    // Insert nodes into database in batches to avoid memory/compute limits
    const BATCH_SIZE = 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);
    
    const pathNodes = nodes.map(node => {
      // In dev mode: mark early nodes as completed to simulate progress
      // Only mark learning nodes (not quiz/review/divider) that are in the past
      const isCompleted = devOffsetDays > 0 && 
                         node.unlock_date < todayStr && 
                         node.node_type === 'learning' && 
                         !node.is_divider &&
                         Math.random() > 0.3; // 70% chance of completion for past learning nodes
      
      return {
        user_id: body.user_id,
        node_index: node.node_index,
        node_type: node.node_type === 'divider' ? 'learning' : node.node_type, // dividers stored as 'learning' type
        content_ref: node.content_ref,
        tractate: node.tractate,
        chapter: node.chapter,
        is_divider: node.is_divider,
        unlock_date: node.unlock_date,
        completed_at: isCompleted ? formatDate(today) : null,
        review_of_node_id: node.review_of_node_id || null,
      };
    });

    console.log(`[generate-path] Inserting ${pathNodes.length} nodes in batches of ${BATCH_SIZE}...`);
    
    let totalInserted = 0;
    for (let i = 0; i < pathNodes.length; i += BATCH_SIZE) {
      const batch = pathNodes.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('learning_path')
        .insert(batch);

      if (insertError) {
        console.error(`[generate-path] Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create learning path',
            details: `Error at batch ${i / BATCH_SIZE + 1}: ${insertError.message}`,
            nodes_inserted: totalInserted
          }),
          { status: 500, headers: corsHeaders }
        );
      }
      
      totalInserted += batch.length;
      console.log(`[generate-path] Inserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(pathNodes.length / BATCH_SIZE)} (${totalInserted}/${pathNodes.length} nodes)`);
    }
    
    console.log(`[generate-path] Successfully inserted all ${totalInserted} nodes`);

    // Pre-generate content for the next 14 days only
    const todayForContent = new Date();
    todayForContent.setHours(0, 0, 0, 0);
    const fourteenDaysLater = new Date(todayForContent);
    fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);
    const todayStrForContent = formatDate(todayForContent);
    const fourteenDaysLaterStr = formatDate(fourteenDaysLater);

    // Get all learning nodes (not quiz/review/divider) within next 14 days
    const learningNodesInWindow = nodes.filter(node => 
      node.node_type === 'learning' && 
      !node.is_divider &&
      node.content_ref &&
      node.unlock_date >= todayStrForContent &&
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
