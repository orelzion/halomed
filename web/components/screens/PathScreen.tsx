'use client';

import { useEffect, useRef } from 'react';
import { usePath } from '@/lib/hooks/usePath';
import { usePathStreak } from '@/lib/hooks/usePathStreak';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { formatContentRef } from '@/lib/utils/date-format';
import { useAuthContext } from '@/components/providers/AuthProvider';

export function PathScreen() {
  const { nodes, loading, currentNodeIndex } = usePath();
  const { streak } = usePathStreak();
  const { t } = useTranslation();
  const router = useRouter();
  const currentRef = useRef<HTMLDivElement>(null);
  const { session } = useAuthContext();
  const hasEnsuredContent = useRef(false);

  // Ensure content for next 14 days when path loads
  useEffect(() => {
    if (!loading && nodes.length > 0 && session && !hasEnsuredContent.current) {
      hasEnsuredContent.current = true;
      
      // Call ensure-content in background (don't block UI)
      fetch('/api/ensure-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          return null;
        })
        .then(data => {
          if (data) {
            console.log('[PathScreen] Content ensured:', data);
          }
        })
        .catch(error => {
          console.error('[PathScreen] Error ensuring content:', error);
        });
    }
  }, [loading, nodes.length, session]);

  // Scroll to current node on load
  useEffect(() => {
    if (currentNodeIndex !== null && currentRef.current) {
      setTimeout(() => {
        currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [currentNodeIndex]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <p className="text-desert-oasis-accent">טוען...</p>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <div className="text-center">
          <p className="text-[var(--text-primary)] mb-4">אין דרך לימוד עדיין</p>
          <p className="text-[var(--text-secondary)] text-sm">השלם את ההרשמה כדי להתחיל</p>
        </div>
      </div>
    );
  }

  const handleNodeClick = (node: typeof nodes[0]) => {
    if (node.isLocked) return;
    
    if (node.node_type === 'quiz') {
      router.push(`/quiz/${node.id}`);
    } else if (node.content_ref) {
      router.push(`/study/path/${node.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-source text-[var(--text-primary)]">
            {t('path_title')}
          </h1>
          {streak > 0 && (
            <div className="text-desert-oasis-accent font-explanation font-semibold">
              {t('streak_count', { count: streak })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {nodes.map((node, idx) => {
            const isDivider = node.is_divider === 1;
            const isCompleted = node.completed_at !== null;
            const isCurrent = node.isCurrent;
            const isLocked = node.isLocked;
            
            // Calculate cycle number for this specific Mishna (content_ref)
            // Counts how many times (learning or review) this content_ref has appeared before + this occurrence
            let mishnaCycle = null;
            if ((node.node_type === 'learning' || node.node_type === 'review') && !isDivider && node.content_ref) {
              // Count how many times this content_ref appears in learning/review nodes up to and including this one
              mishnaCycle = nodes
                .slice(0, idx + 1)
                .filter(n => 
                  (n.node_type === 'learning' || n.node_type === 'review') && 
                  n.is_divider === 0 && 
                  n.content_ref === node.content_ref
                ).length;
            }

            if (isDivider) {
              return (
                <div
                  key={node.id}
                  className="py-4 text-center border-t border-b border-desert-oasis-accent/30 my-4"
                >
                  <p className="font-explanation text-desert-oasis-accent font-semibold">
                    {t('path_divider_completed', {
                      tractate: node.tractate || '',
                      chapter: node.chapter || 0,
                    })}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={node.id}
                ref={isCurrent ? currentRef : null}
                onClick={() => handleNodeClick(node)}
                className={`
                  relative p-4 rounded-2xl transition-all cursor-pointer
                  ${isLocked 
                    ? 'bg-gray-300 dark:bg-gray-700 opacity-50 cursor-not-allowed' 
                    : isCompleted
                      ? 'bg-gradient-to-br from-desert-oasis-card to-desert-oasis-accent/10 dark:from-desert-oasis-dark-card dark:to-desert-oasis-accent/20 ring-2 ring-desert-oasis-accent/30'
                      : isCurrent
                        ? 'bg-desert-oasis-accent/20 dark:bg-desert-oasis-accent/30 ring-2 ring-desert-oasis-accent animate-pulse'
                        : 'bg-desert-oasis-card dark:bg-desert-oasis-dark-card hover:shadow-md'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Node icon/status */}
                  <div className={`
                    flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                    ${isCompleted 
                      ? 'bg-desert-oasis-accent/20 dark:bg-desert-oasis-accent/30' 
                      : isCurrent
                        ? 'bg-desert-oasis-accent text-white'
                        : isLocked
                          ? 'bg-gray-400 dark:bg-gray-600'
                          : 'bg-desert-oasis-muted/20 dark:bg-gray-700/30'
                    }
                  `}>
                    {isCompleted ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-desert-oasis-accent">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isLocked ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    ) : node.node_type === 'quiz' ? (
                      <span className="text-lg font-bold">?</span>
                    ) : node.node_type === 'review' ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                      </svg>
                    ) : (
                      <span className="text-lg font-bold">{mishnaCycle ?? node.node_index + 1}</span>
                    )}
                  </div>

                  {/* Node content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-explanation text-sm text-[var(--text-secondary)]">
                        {node.node_type === 'learning' && t('path_node_learning')}
                        {node.node_type === 'review' && t('path_node_review')}
                        {node.node_type === 'quiz' && t('path_node_quiz')}
                      </span>
                      {isCurrent && (
                        <span className="text-xs bg-desert-oasis-accent text-white px-2 py-1 rounded">
                          {t('path_node_current')}
                        </span>
                      )}
                    </div>
                    {node.content_ref && (
                      <p className="font-source text-lg text-[var(--text-primary)]">
                        {formatContentRef(node.content_ref)}
                      </p>
                    )}
                    <p className="font-explanation text-sm text-[var(--text-secondary)]">
                      {node.unlock_date}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
