'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDatabase } from '@/lib/database/database';
import { supabase } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n';
import { usePathStudyUnit } from '@/lib/hooks/usePathStudyUnit';
import { formatContentRef } from '@/lib/utils/date-format';
import { isPlaceholderContent } from '@/lib/utils/content-validation';
import { ExpandableSection } from '@/components/ui/ExpandableSection';
import { DoneButton } from '@/components/ui/DoneButton';
import { StudyHeader } from '@/components/ui/StudyHeader';
import { Mascot } from '@/components/ui/Mascot';
import { CompletionToast } from '@/components/ui/CompletionToast';
import ReactMarkdown from 'react-markdown';
import { getContentRefForIndex } from '@shared/lib/path-generator';

interface PathNode {
  id: string;
  content_ref: string | null;
  node_type: string;
  contentIndex: number | null;
}

export default function PathStudyPage() {
  const params = useParams();
  const nodeId = params.nodeId as string;
  const router = useRouter();
  const { t } = useTranslation();
  const [node, setNode] = useState<PathNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReview, setIsReview] = useState(false);

  useEffect(() => {
    const loadNode = async () => {
      // Only support computed node IDs (position-based model)
      if (nodeId.startsWith('computed-')) {
        const index = parseInt(nodeId.replace('computed-', ''), 10);
        if (!isNaN(index)) {
          const contentRef = getContentRefForIndex(index);
          setNode({
            id: nodeId,
            content_ref: contentRef,
            node_type: 'learning',
            contentIndex: index,
          });
          setIsReview(false);
          setLoading(false);
          return;
        }
      }

      // No longer support old learning_path lookup
      console.error('[PathStudyPage] Invalid node ID format:', nodeId);
      setLoading(false);
    };

    if (nodeId) {
      loadNode();
    }
  }, [nodeId]);

  const handleCompletion = async (isCompleted: boolean) => {
    if (!node) return;

    try {
      const db = await getDatabase();
      if (!db) return;

      // For position-based model: update current_content_index in user_preferences
      if (node.contentIndex !== null) {
        if (!db.user_preferences) {
          console.error('[Study] user_preferences collection not available');
          router.push('/');
          return;
        }
        const userPrefs = await db.user_preferences.find().exec();
        if (userPrefs.length > 0) {
          const pref = userPrefs[0];
          const currentIndex = pref.current_content_index ?? 0;
          
          // Only increment if completing and this is the current item
          if (isCompleted && node.contentIndex === currentIndex) {
            const newIndex = currentIndex + 1;
            console.log(`[Study] Completing item ${node.contentIndex}, updating current_content_index: ${currentIndex} -> ${newIndex}`);
            
            await pref.patch({
              current_content_index: newIndex,
              last_study_date: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString(),
            });
            
            // Verify the update
            const updatedPref = await db.user_preferences.findOne(pref.id).exec();
            console.log(`[Study] Updated current_content_index: ${updatedPref?.current_content_index}`);
          } else {
            console.log(`[Study] Not incrementing: isCompleted=${isCompleted}, nodeIndex=${node.contentIndex}, currentIndex=${currentIndex}`);
          }
        }
      } else {
        console.warn('[Study] No user_preferences found');
      }

      router.push('/');
    } catch (error) {
      console.error('Error updating completion:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <div className="text-center">
          <Mascot mood="reading" size="md" />
          <p className="text-desert-oasis-accent font-explanation mt-4">{t('loading_content')}</p>
        </div>
      </div>
    );
  }

  if (!node || !node.content_ref) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <div className="text-center">
          <Mascot mood="sad" size="md" />
          <p className="text-[var(--text-primary)] font-explanation mt-4">שגיאה בטעינת התוכן</p>
        </div>
      </div>
    );
  }

  return (
    <PathStudyScreen 
      contentRef={node.content_ref!}
      nodeId={nodeId}
      contentIndex={node.contentIndex}
      isReview={isReview}
      onCompletion={handleCompletion}
    />
  );
}

// Simplified study screen for path nodes
function PathStudyScreen({ 
  contentRef, 
  nodeId, 
  contentIndex,
  isReview, 
  onCompletion 
}: { 
  contentRef: string; 
  nodeId: string; 
  contentIndex: number | null;
  isReview: boolean; 
  onCompletion: (isCompleted: boolean) => void;
}) {
  const { content, explanationData, loading } = usePathStudyUnit(contentRef);
  const { t } = useTranslation();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const hasAttemptedGeneration = useRef<string | null>(null); // Track which contentRef we've tried to generate

  // For position-based model, content is "completed" if we're past it
  // This is determined by the parent based on current_content_index
  const [isCompleted, setIsCompleted] = useState(false);

  // Calculate placeholder status - used in both effect and render
  const contentIsPlaceholder = content ? isPlaceholderContent(content.ai_explanation_json) : false;

  // Reset tracking when contentRef changes
  useEffect(() => {
    hasAttemptedGeneration.current = null;
  }, [contentRef]);

  // Trigger content generation if missing OR if content is placeholder
  useEffect(() => {
    // Skip if we've already attempted generation for this contentRef
    if (hasAttemptedGeneration.current === contentRef) {
      return;
    }

    // Skip if we're still loading or already generating
    if (loading || isGenerating) {
      return;
    }

    // Skip if no contentRef
    if (!contentRef) {
      return;
    }

    // Skip if content exists and is not a placeholder (real content loaded)
    // The reactive query in usePathStudyUnit will automatically update when content syncs
    if (content && !contentIsPlaceholder) {
      return;
    }

    // Only generate if content is missing or is placeholder
    const needsGeneration = !content || contentIsPlaceholder;
    
    if (needsGeneration) {
      // Mark as attempted IMMEDIATELY to prevent any re-triggering
      hasAttemptedGeneration.current = contentRef;
      
      const generateContent = async () => {
        setIsGenerating(true);
        setGenerationError(null);
        
        if (contentIsPlaceholder) {
          console.log('[PathStudyScreen] Detected placeholder content, regenerating:', contentRef);
        } else {
          console.log('[PathStudyScreen] Content missing, generating:', contentRef);
        }
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            setGenerationError('לא מאומת');
            setIsGenerating(false);
            hasAttemptedGeneration.current = null; // Allow retry
            return;
          }

          const response = await fetch('/api/generate-content', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ ref_id: contentRef }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            setGenerationError(errorText || 'שגיאה ביצירת תוכן');
            hasAttemptedGeneration.current = null; // Allow retry on error
          } else {
            // Content generation triggered successfully
            console.log('[PathStudyScreen] Content generation initiated, polling for content...');
            
            // Poll Supabase for the newly generated content (generation is async)
            // This bypasses replication delay and ensures immediate availability
            const maxAttempts = 30; // 30 attempts = ~30 seconds max
            const pollInterval = 1000; // 1 second between attempts
            
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              try {
                const { data: newContent, error: fetchError } = await supabase
                  .from('content_cache')
                  .select('*')
                  .eq('ref_id', contentRef)
                  .single();

                if (!fetchError && newContent) {
                  // Check if it's still a placeholder (generation might be in progress)
                  const isPlaceholder = isPlaceholderContent(newContent.ai_explanation_json);
                  
                  if (!isPlaceholder) {
                    // Real content is ready!
                    // Manually insert into RxDB without triggering push replication
                    // We use insertLocal or directly manipulate the collection
                    const db = await getDatabase();
                    if (db) {
                      // Convert Supabase row to RxDB format (same as replication does)
                      const doc = { ...newContent };
                      // Remove any null values that shouldn't exist (except nullable fields)
                      const nullableFields = ['tractate', 'chapter', 'explanation'];
                      Object.keys(doc).forEach((key) => {
                        if (doc[key] === null && !nullableFields.includes(key)) {
                          delete doc[key];
                        }
                      });

                      // Insert directly - the push handler now returns empty, so no 403 error
                      await db.content_cache.upsert(doc);
                      console.log('[PathStudyScreen] Content synced to RxDB, UI will update automatically');
                      return; // Success - exit polling loop
                    }
                  } else if (attempt < maxAttempts - 1) {
                    // Still placeholder, wait and retry
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                    continue;
                  }
                } else if (attempt < maxAttempts - 1) {
                  // Content not found yet, wait and retry
                  await new Promise(resolve => setTimeout(resolve, pollInterval));
                  continue;
                }
              } catch (syncError) {
                console.error(`[PathStudyScreen] Error polling for content (attempt ${attempt + 1}):`, syncError);
                if (attempt < maxAttempts - 1) {
                  await new Promise(resolve => setTimeout(resolve, pollInterval));
                  continue;
                }
              }
            }
            
            // If we get here, polling timed out
            console.warn('[PathStudyScreen] Content generation taking longer than expected, will sync via replication');
          }
        } catch (error) {
          console.error('Error generating content:', error);
          setGenerationError(error instanceof Error ? error.message : 'שגיאה ביצירת תוכן');
          hasAttemptedGeneration.current = null; // Allow retry on error
        } finally {
          setIsGenerating(false);
        }
      };

      generateContent();
    }
    // Depend on contentIsPlaceholder to detect when content changes from placeholder to real
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, contentIsPlaceholder, contentRef, isGenerating]);

  const handleDone = async () => {
    const newState = !isCompleted;
    setIsCompleted(newState);
    
    // Show celebration toast when completing (not when unchecking)
    if (newState) {
      setShowCompletionToast(true);
    }
    
    await onCompletion(newState);
  };

  if (loading || isGenerating || contentIsPlaceholder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <div className="text-center">
          <Mascot mood={isGenerating || contentIsPlaceholder ? 'thinking' : 'reading'} size="md" />
          <p className="text-desert-oasis-accent font-explanation mt-4">
            {isGenerating || contentIsPlaceholder ? 'יוצר תוכן...' : t('loading_content')}
          </p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <div className="text-center p-4">
          <Mascot mood="sad" size="md" />
          <p className="text-[var(--text-primary)] mt-4 mb-4">
            {generationError ? `שגיאה: ${generationError}` : 'תוכן לא נמצא'}
          </p>
          {generationError && (
            <button
              onClick={() => {
                setGenerationError(null);
                setIsGenerating(false);
              }}
              className="px-6 py-3 bg-desert-oasis-accent text-white rounded-xl font-explanation"
            >
              נסה שוב
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary pb-20">
      <StudyHeader 
        title={isReview ? t('review_badge') : formatContentRef(contentRef)}
        onBack={() => router.push('/')}
      />

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Source text - BOLD, rendered as Markdown for structured display */}
        {content.source_text_he && (
          <div
            id="mishna_text"
            data-testid="mishna_text"
            className="text-2xl font-source font-bold text-[var(--text-primary)] leading-relaxed"
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <span className="text-[#8B4513]">{children}</span>
                ),
                hr: () => (
                  <hr className="my-4 border-t border-[#D4A373] opacity-50" />
                ),
              }}
            >
              {content.source_text_he}
            </ReactMarkdown>
          </div>
        )}

        {/* AI Explanation */}
        {explanationData?.summary && (
          <div
            id="explanation_text"
            data-testid="explanation_text"
            className="text-lg font-explanation text-[var(--text-secondary)] leading-relaxed"
          >
            {explanationData.summary}
          </div>
        )}

        {/* Halakha Section - Same level with warning */}
        {explanationData?.halakha && explanationData.halakha.trim() && (
          <div className="space-y-3">
            <h2 className="text-xl font-source font-bold text-[var(--text-primary)]">
              הלכה
            </h2>
            <div className="text-lg font-explanation text-[var(--text-secondary)] leading-relaxed">
              {explanationData.halakha}
            </div>
            {/* AI Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-r-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-lg">
              <p className="text-sm font-explanation text-[var(--text-secondary)] mb-2">
                <span className="font-bold">⚠️ אזהרה:</span> תוכן זה נוצר על ידי בינה מלאכותית. מומלץ לבדוק את המקור המקורי ב-
                <a
                  href={`https://www.sefaria.org/${contentRef}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-desert-oasis-accent underline hover:text-desert-oasis-accent/80"
                >
                  Sefaria
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {/* Expandable Section: Summary of Commentaries */}
        {explanationData?.opinions && explanationData.opinions.length > 0 && (
          <ExpandableSection title={t('summary_of_commentaries')}>
            <div className="space-y-4">
              {explanationData.opinions.map((opinion: any, index: number) => (
                <div key={index} className="border-r-2 border-desert-oasis-muted pr-4">
                  <p className="font-source font-bold text-[var(--text-primary)] mb-2">
                    {opinion.source}
                  </p>
                  <p className="font-explanation text-[var(--text-secondary)]">
                    {opinion.details}
                  </p>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Expansions */}
        {explanationData?.expansions && explanationData.expansions.length > 0 && (
          <ExpandableSection title="הרחבות">
            <div className="space-y-4">
              {explanationData.expansions.map((expansion: any, index: number) => (
                <div key={index}>
                  <p className="font-source font-bold text-[var(--text-primary)] mb-2">
                    {expansion.topic}
                  </p>
                  <p className="font-explanation text-[var(--text-secondary)]">
                    {expansion.explanation}
                  </p>
                  {expansion.source && (
                    <p className="font-explanation text-sm text-desert-oasis-muted mt-2">
                      מקור: {expansion.source}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Spacer */}
        <div className="h-12"/>
        {/* Done Button */}
        <div className="mt-16">
          <DoneButton
            isCompleted={isCompleted}
            onClick={handleDone}
            disabled={false}
          />
        </div>
      </div>
      
      {/* Completion celebration toast */}
      <CompletionToast 
        show={showCompletionToast} 
        onComplete={() => setShowCompletionToast(false)} 
      />
    </div>
  );
}
