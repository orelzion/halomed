'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import { supabase } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n';
import { usePathStudyUnit } from '@/lib/hooks/usePathStudyUnit';
import { formatContentRef } from '@/lib/utils/date-format';
import { ExpandableSection } from '@/components/ui/ExpandableSection';
import { DoneButton } from '@/components/ui/DoneButton';
import { StudyHeader } from '@/components/ui/StudyHeader';
import { Mascot } from '@/components/ui/Mascot';
import { CompletionToast } from '@/components/ui/CompletionToast';

interface PathNode {
  id: string;
  content_ref: string | null;
  node_type: string;
  review_of_node_id: string | null;
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
      try {
        const db = getPowerSyncDatabase();
        if (!db) return;

        const nodes = await db.getAll<PathNode>(
          'SELECT * FROM learning_path WHERE id = ?',
          [nodeId]
        );

        if (nodes.length === 0) {
          setLoading(false);
          return;
        }

        const pathNode = nodes[0];
        setNode(pathNode);
        setIsReview(pathNode.node_type === 'review' || pathNode.review_of_node_id !== null);
        setLoading(false);
      } catch (error) {
        console.error('Error loading path node:', error);
        setLoading(false);
      }
    };

    if (nodeId) {
      loadNode();
    }
  }, [nodeId]);

  const handleCompletion = async (isCompleted: boolean) => {
    if (!node) return;

    try {
      const db = getPowerSyncDatabase();
      if (!db) return;

      const completedAt = isCompleted ? new Date().toISOString() : null;

      // Update in PowerSync (will sync to server)
      await db.execute(
        'UPDATE learning_path SET completed_at = ? WHERE id = ?',
        [completedAt, nodeId]
      );

      // If this is a learning node and was just completed, schedule reviews
      if (isCompleted && node.node_type === 'learning' && !node.review_of_node_id) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Call schedule-review API
          await fetch('/api/schedule-review', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ completed_node_id: nodeId }),
          });
        }
      }

      // Navigate back to path
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
      isReview={isReview}
      onCompletion={handleCompletion}
    />
  );
}

// Simplified study screen for path nodes
function PathStudyScreen({ 
  contentRef, 
  nodeId, 
  isReview, 
  onCompletion 
}: { 
  contentRef: string; 
  nodeId: string; 
  isReview: boolean; 
  onCompletion: (isCompleted: boolean) => void;
}) {
  const { content, node, explanationData, loading } = usePathStudyUnit(contentRef, nodeId);
  const { t } = useTranslation();
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showCompletionToast, setShowCompletionToast] = useState(false);

  useEffect(() => {
    setIsCompleted(node?.completed_at !== null);
  }, [node]);

  // Trigger content generation if missing
  useEffect(() => {
    if (!loading && !content && contentRef && !isGenerating && !generationError) {
      const generateContent = async () => {
        setIsGenerating(true);
        setGenerationError(null);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            setGenerationError('לא מאומת');
            setIsGenerating(false);
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
          } else {
            // Content generated, wait a moment for PowerSync to sync
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        } catch (error) {
          console.error('Error generating content:', error);
          setGenerationError(error instanceof Error ? error.message : 'שגיאה ביצירת תוכן');
        } finally {
          setIsGenerating(false);
        }
      };

      generateContent();
    }
  }, [loading, content, contentRef, isGenerating, generationError]);

  const handleDone = async () => {
    const newState = !isCompleted;
    setIsCompleted(newState);
    
    // Show celebration toast when completing (not when unchecking)
    if (newState) {
      setShowCompletionToast(true);
    }
    
    await onCompletion(newState);
  };

  if (loading || isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <div className="text-center">
          <Mascot mood={isGenerating ? 'thinking' : 'reading'} size="md" />
          <p className="text-desert-oasis-accent font-explanation mt-4">
            {isGenerating ? 'יוצר תוכן...' : t('loading_content')}
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
        {/* Source text - BOLD */}
        {content.source_text_he && (
          <div
            id="mishna_text"
            data-testid="mishna_text"
            className="text-2xl font-source font-bold text-[var(--text-primary)] leading-relaxed"
          >
            {content.source_text_he}
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
