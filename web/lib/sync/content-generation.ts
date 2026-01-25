/**
 * Content Generation During Sync
 * Ensures all content and quizzes in 14-day window are generated
 * Reference: Migration Plan Phase 3, Task 3.5, TDD Section 8.3
 */

import type { RxDatabase } from 'rxdb';
import type { DatabaseCollections } from '../database/schemas';
import { supabase } from '../supabase/client';
import { getDateWindow } from './date-window';

/**
 * Check if content is a placeholder (empty or minimal)
 */
function isPlaceholderContent(aiExplanationJson: string | null | undefined): boolean {
  if (!aiExplanationJson) return true;
  try {
    const parsed = JSON.parse(aiExplanationJson);
    // Check if explanation is empty or just has empty structure
    return !parsed.summary || parsed.summary.trim() === '';
  } catch {
    return true;
  }
}

/**
 * Ensure all content in 14-day window is generated
 */
export async function ensureContentGenerated(
  db: RxDatabase<DatabaseCollections>,
  userId: string
): Promise<void> {
  console.log('[Content Generation] Ensuring content is generated for 14-day window...');
  const window = getDateWindow();

  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('[Content Generation] No session, skipping content generation');
      return;
    }

    // 1. Generate schedule to ensure all user_study_log entries exist
    console.log('[Content Generation] Generating schedule for 14-day window...');
    const { data: tracks } = await supabase.from('tracks').select('id, start_date');
    
    if (tracks && tracks.length > 0) {
      for (const track of tracks) {
        const startDate = track.start_date || window.start;
        try {
          await fetch('/api/generate-schedule', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              track_id: track.id,
              start_date: startDate,
              days_ahead: 14,
            }),
          });
        } catch (error) {
          console.error(`[Content Generation] Failed to generate schedule for track ${track.id}:`, error);
        }
      }
    }

    // 2. Get all user_study_log entries in window
    const studyLogs = await db.user_study_log
      .find({
        selector: {
          user_id: userId,
          study_date: { $gte: window.start, $lte: window.end },
        },
      })
      .exec();

    // 3. Get unique content_ids that need content
    const contentIds = studyLogs
      .map((log) => log.content_id)
      .filter((id): id is string => id !== null && id !== undefined);

    if (contentIds.length === 0) {
      console.log('[Content Generation] No content IDs found in window');
      return;
    }

    // 4. Check which content_cache entries are missing or placeholders
    const contents = await db.content_cache
      .find({ selector: { id: { $in: contentIds } } })
      .exec();

    const existingContentIds = new Set(contents.map((c) => c.id));
    const missingContentIds = contentIds.filter((id) => !existingContentIds.has(id));
    const placeholderContentIds = contents
      .filter((c) => isPlaceholderContent(c.ai_explanation_json))
      .map((c) => c.id);

    // 5. Get content_refs from learning_path for missing content
    const learningPathNodes = await db.learning_path
      .find({
        selector: {
          user_id: userId,
          unlock_date: { $gte: window.start, $lte: window.end },
          content_ref: { $ne: null },
        },
      })
      .exec();

    const contentRefsToGenerate = new Set<string>();
    
    // For missing content, get ref_id from learning_path
    for (const node of learningPathNodes) {
      if (node.content_ref) {
        contentRefsToGenerate.add(node.content_ref);
      }
    }

    // 6. Generate missing content (batch, max 3 at a time)
    console.log(`[Content Generation] Generating ${contentRefsToGenerate.size} content entries...`);
    const contentRefsArray = Array.from(contentRefsToGenerate);
    for (let i = 0; i < contentRefsArray.length; i += 3) {
      const batch = contentRefsArray.slice(i, i + 3);
      await Promise.all(
        batch.map(async (ref: string) => {
          try {
            // Check if content already exists
            const { data: existing } = await supabase
              .from('content_cache')
              .select('id')
              .eq('ref_id', ref)
              .limit(1)
              .single();

            if (!existing) {
              await fetch('/api/generate-content', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ ref_id: ref }),
              });
            }
          } catch (error) {
            console.error(`[Content Generation] Failed to generate content for ${ref}:`, error);
          }
        })
      );
    }

    // 7. Generate quizzes for all content_refs in window (batch, max 3 at a time)
    console.log(`[Content Generation] Generating quizzes for ${contentRefsToGenerate.size} content entries...`);
    for (let i = 0; i < contentRefsArray.length; i += 3) {
      const batch = contentRefsArray.slice(i, i + 3);
      await Promise.all(
        batch.map(async (ref: string) => {
          try {
            // Check if quiz already exists
            const { data: existingQuiz } = await supabase
              .from('quiz_questions')
              .select('id')
              .eq('content_ref', ref)
              .limit(1)
              .single();

            if (!existingQuiz) {
              await fetch('/api/generate-quiz', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ content_ref: ref }),
              });
            }
          } catch (error) {
            console.error(`[Content Generation] Failed to generate quiz for ${ref}:`, error);
          }
        })
      );
    }

    console.log('[Content Generation] Content generation completed');
  } catch (error) {
    console.error('[Content Generation] Error during content generation:', error);
    // Don't throw - content generation is non-blocking
  }
}
