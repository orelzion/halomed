/**
 * Content Generation During Sync
 * Ensures all content and quizzes in the upcoming window are generated
 * Uses position-based model - computes content refs from user preferences
 * Reference: Migration Plan Phase 3, Task 3.5, TDD Section 8.3
 */

import type { RxDatabase } from 'rxdb';
import type { DatabaseCollections } from '../database/schemas';
import { supabase } from '../supabase/client';
import { 
  getContentRefsForRange, 
  getItemsPerDay,
  type Pace 
} from '@shared/lib/path-generator';

const WINDOW_DAYS = 14; // Days ahead to pre-generate content

/**
 * Ensure all content in the upcoming window is generated
 * Uses position-based model: computes content refs from current_content_index + pace
 */
export async function ensureContentGenerated(
  db: RxDatabase<DatabaseCollections>,
  userId: string
): Promise<void> {
  console.log('[Content Generation] Ensuring content is generated for upcoming window...');

  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('[Content Generation] No session, skipping content generation');
      return;
    }

    // 1. Get user preferences from local RxDB
    const prefsDoc = await db.user_preferences.findOne({
      selector: { user_id: userId }
    }).exec();

    if (!prefsDoc) {
      console.log('[Content Generation] No user preferences found, skipping');
      return;
    }

    const currentIndex = prefsDoc.current_content_index ?? 0;
    const pace = (prefsDoc.pace as Pace) ?? 'two_mishna';

    // 2. Calculate how many items to pre-generate based on pace
    const itemsPerDay = getItemsPerDay(pace, currentIndex);
    const itemsToPregenerate = Math.ceil(WINDOW_DAYS * itemsPerDay);
    
    // Pre-generate from current position to WINDOW_DAYS ahead
    const startIndex = currentIndex;
    const endIndex = currentIndex + itemsToPregenerate;

    console.log(`[Content Generation] Pre-generating content for indices ${startIndex} to ${endIndex} (${itemsToPregenerate} items)`);

    // 3. Get content refs for the window using path generator
    const contentRefs = getContentRefsForRange(startIndex, endIndex);

    if (contentRefs.length === 0) {
      console.log('[Content Generation] No content refs to generate');
      return;
    }

    // 4. Check which content already exists in local cache
    const existingContent = await db.content_cache
      .find({ selector: { ref_id: { $in: contentRefs } } })
      .exec();
    
    const existingRefs = new Set(existingContent.map(c => c.ref_id));
    const missingRefs = contentRefs.filter(ref => !existingRefs.has(ref));

    console.log(`[Content Generation] Found ${existingRefs.size} existing, ${missingRefs.length} missing`);

    // 5. Generate missing content (batch, max 3 at a time to avoid overwhelming the API)
    if (missingRefs.length > 0) {
      console.log(`[Content Generation] Generating ${missingRefs.length} content entries...`);
      
      for (let i = 0; i < missingRefs.length; i += 3) {
        const batch = missingRefs.slice(i, i + 3);
        await Promise.all(
          batch.map(async (ref: string) => {
            try {
              const response = await fetch('/api/generate-content', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ ref_id: ref }),
              });
              
              if (!response.ok) {
                console.warn(`[Content Generation] Failed to generate content for ${ref}: ${response.status}`);
              }
            } catch (error) {
              console.error(`[Content Generation] Failed to generate content for ${ref}:`, error);
            }
          })
        );
      }
    }

    // 6. Check which quizzes already exist
    const existingQuizzes = await db.quiz_questions
      .find({ selector: { content_ref: { $in: contentRefs } } })
      .exec();
    
    const existingQuizRefs = new Set(existingQuizzes.map(q => q.content_ref));
    const missingQuizRefs = contentRefs.filter(ref => !existingQuizRefs.has(ref));

    // 7. Generate missing quizzes (batch, max 3 at a time)
    if (missingQuizRefs.length > 0) {
      console.log(`[Content Generation] Generating ${missingQuizRefs.length} quizzes...`);
      
      for (let i = 0; i < missingQuizRefs.length; i += 3) {
        const batch = missingQuizRefs.slice(i, i + 3);
        await Promise.all(
          batch.map(async (ref: string) => {
            try {
              const response = await fetch('/api/generate-quiz', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ content_ref: ref }),
              });
              
              if (!response.ok) {
                console.warn(`[Content Generation] Failed to generate quiz for ${ref}: ${response.status}`);
              }
            } catch (error) {
              console.error(`[Content Generation] Failed to generate quiz for ${ref}:`, error);
            }
          })
        );
      }
    }

    console.log('[Content Generation] Content generation completed');
  } catch (error) {
    console.error('[Content Generation] Error during content generation:', error);
    // Don't throw - content generation is non-blocking
  }
}
