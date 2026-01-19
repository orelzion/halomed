'use client';

import { useEffect, useRef, useState } from 'react';
import { usePath } from '@/lib/hooks/usePath';
import { usePathStreak } from '@/lib/hooks/usePathStreak';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { formatContentRef, formatHebrewNumber, getTractateHebrew, isLastChapter } from '@/lib/utils/date-format';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { Mascot } from '@/components/ui/Mascot';
import posthog from 'posthog-js';

/**
 * Get week range (Sunday to Thursday) for a weekly quiz date
 */
function getWeekRangeForQuiz(contentRef: string): { start: string; end: string } | null {
  // Parse weekly_quiz_YYYY-MM-DD or weekly_quiz_YYYY-MM-DD+YYYY-MM-DD...
  const match = contentRef.match(/^weekly_quiz_(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  
  const quizDate = new Date(match[1]);
  const dayOfWeek = quizDate.getDay();
  
  // Calculate days to go back to reach Sunday
  const daysToSunday = dayOfWeek === 5 ? 5 : dayOfWeek === 4 ? 4 : dayOfWeek;
  
  const sunday = new Date(quizDate);
  sunday.setDate(quizDate.getDate() - daysToSunday);
  
  const thursday = new Date(quizDate);
  thursday.setDate(quizDate.getDate() - (dayOfWeek === 5 ? 1 : dayOfWeek === 4 ? 1 : 0));
  
  return {
    start: sunday.toISOString().split('T')[0],
    end: thursday.toISOString().split('T')[0],
  };
}

/**
 * Get the Mishnayot range covered by a weekly quiz
 */
function getWeeklyQuizMishnayot(
  contentRef: string, 
  allNodes: Array<{ node_type: string | null; content_ref: string | null; unlock_date: string | null }>
): string {
  const weekRange = getWeekRangeForQuiz(contentRef);
  if (!weekRange) return '';
  
  // Find learning nodes in this week's date range
  const weekLearningNodes = allNodes.filter(n => 
    n.node_type === 'learning' && 
    n.content_ref &&
    n.unlock_date &&
    n.unlock_date >= weekRange.start && 
    n.unlock_date <= weekRange.end
  );
  
  if (weekLearningNodes.length === 0) return '';
  
  // Get first and last content_ref
  const firstRef = weekLearningNodes[0].content_ref;
  const lastRef = weekLearningNodes[weekLearningNodes.length - 1].content_ref;
  
  if (!firstRef || !lastRef) return '';
  
  // Format the range
  const firstFormatted = formatContentRef(firstRef);
  const lastFormatted = formatContentRef(lastRef);
  
  if (firstFormatted === lastFormatted) {
    return firstFormatted;
  }
  
  return `${firstFormatted} - ${lastFormatted}`;
}

// Icon components for different study types
function BookOpenIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

// Brain icon for review/memory recall
function BrainIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M12 18v-5" />
    </svg>
  );
}

// Clipboard checklist icon for quiz
function ClipboardCheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function FlameIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

// Shabbat candles icon
function CandlesIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Left candle */}
      <rect x="5" y="10" width="4" height="10" rx="1" />
      <path d="M7 10 C7 8 6 6 7 4 C8 6 7 8 7 10" fill="currentColor" />
      {/* Right candle */}
      <rect x="15" y="10" width="4" height="10" rx="1" />
      <path d="M17 10 C17 8 16 6 17 4 C18 6 17 8 17 10" fill="currentColor" />
    </svg>
  );
}

function TrophyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function StarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// User/Profile icon
function UserCircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
    </svg>
  );
}

function SparklesIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_COUNT = 15;

export function PathScreen() {
  const { nodes, loading, currentNodeIndex } = usePath();
  const { streak } = usePathStreak();
  const { t } = useTranslation();
  const router = useRouter();
  const currentRef = useRef<HTMLDivElement>(null);
  const { session } = useAuthContext();
  const hasEnsuredContent = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Pagination state
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  
  // Path generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  
  // Reset visible count when nodes change significantly
  useEffect(() => {
    if (nodes.length > 0 && currentNodeIndex !== null) {
      // Show at least up to current node + some buffer
      const minVisible = Math.min(currentNodeIndex + 10, nodes.length);
      setVisibleCount(Math.max(INITIAL_VISIBLE_COUNT, minVisible));
    }
  }, [nodes.length, currentNodeIndex]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < nodes.length) {
          setVisibleCount(prev => Math.min(prev + LOAD_MORE_COUNT, nodes.length));
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    observer.observe(loadMoreRef.current);
    
    return () => observer.disconnect();
  }, [visibleCount, nodes.length]);

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

  // Wait for sync when nodes is empty (path might be generating/syncing)
  const [waitingForSync, setWaitingForSync] = useState(true);
  
  useEffect(() => {
    if (!loading && nodes.length === 0) {
      // Wait up to 8 seconds for data to sync
      const timer = setTimeout(() => {
        setWaitingForSync(false);
      }, 8000);
      
      return () => clearTimeout(timer);
    } else if (nodes.length > 0) {
      setWaitingForSync(false);
    }
  }, [loading, nodes.length]);

  // Show loading with mascot
  if (loading || (nodes.length === 0 && waitingForSync)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-desert-oasis-primary to-desert-oasis-secondary dark:from-desert-oasis-dark-primary dark:to-desert-oasis-dark-secondary">
        <div className="text-center">
          <Mascot mood="thinking" size="lg" />
          <p className="text-desert-oasis-accent font-explanation mt-4">מכין את דרך הלימוד...</p>
        </div>
      </div>
    );
  }

  const handleGeneratePath = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setGenerateError(null);
    
    try {
      const response = await fetch('/api/generate-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ 
          force: false, // Don't force if path exists
          dev_offset_days: 4, // Start 4 days ago in dev mode
        }),
      });
      
      const result = await response.json();
      console.log('Path generation response:', { status: response.status, result });
      
      if (response.ok) {
        alert(`Path generated! ${result.message || 'Refresh the page to see your learning path.'}`);
        window.location.reload();
      } else {
        console.error('Path generation error:', result);
        setGenerateError(result.error || result.details || result.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Path generation error:', error);
      setGenerateError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-desert-oasis-primary to-desert-oasis-secondary dark:from-desert-oasis-dark-primary dark:to-desert-oasis-dark-secondary">
        <div className="text-center p-8 max-w-md">
          <Mascot mood="encouraging" size="lg" />
          <p className="text-[var(--text-primary)] text-xl font-source mb-2 mt-4">אין דרך לימוד עדיין</p>
          <p className="text-[var(--text-secondary)] text-sm font-explanation mb-6">
            {session ? 'בוא נתחיל את המסע שלך!' : 'השלם את ההרשמה כדי להתחיל'}
          </p>
          
          {session && (
            <div className="space-y-3">
              <button
                onClick={handleGeneratePath}
                disabled={isGenerating}
                className="w-full px-6 py-3 bg-desert-oasis-accent hover:bg-desert-oasis-accent/90 text-white rounded-xl font-explanation font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? 'יוצר דרך לימוד...' : 'צור דרך לימוד'}
              </button>
              
              {generateError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-red-700 dark:text-red-300 text-sm font-explanation">
                    שגיאה: {generateError}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleNodeClick = (node: typeof nodes[0]) => {
    if (node.isLocked) return;

    // Capture path node click event
    posthog.capture('path_node_clicked', {
      node_id: node.id,
      node_type: node.node_type,
      content_ref: node.content_ref,
      is_completed: node.completed_at !== null,
    });

    if (node.node_type === 'quiz' || node.node_type === 'weekly_quiz') {
      router.push(`/quiz/${node.id}`);
    } else if (node.content_ref) {
      router.push(`/study/path/${node.id}`);
    }
  };

  // Calculate stats
  const completedCount = nodes.filter(n => n.completed_at !== null && n.is_divider !== 1).length;
  const totalCount = nodes.filter(n => n.is_divider !== 1).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-desert-oasis-primary to-desert-oasis-secondary dark:from-desert-oasis-dark-primary dark:to-desert-oasis-dark-secondary">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-desert-oasis-primary/95 dark:bg-desert-oasis-dark-primary/95 backdrop-blur-sm border-b border-desert-oasis-muted/20 dark:border-gray-700/30">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-source font-bold text-[var(--text-primary)]">
              {t('path_title')}
            </h1>
            <div className="flex items-center gap-3">
              {streak > 0 && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 dark:from-orange-500/30 dark:to-red-500/30 px-4 py-2 rounded-full">
                  <FlameIcon className="text-orange-500" />
                  <span className="text-orange-600 dark:text-orange-400 font-explanation font-bold">
                    {streak}
                  </span>
                </div>
              )}
              {/* Dev: Regenerate path button - always show in dev */}
              <button
                onClick={async () => {
                  if (!confirm('Regenerate path with full Shas? This will delete your current path and all progress.')) {
                    return;
                  }
                  try {
                      const response = await fetch('/api/generate-path', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`,
                        },
                        body: JSON.stringify({ 
                          force: true,
                          dev_offset_days: 4, // Start 4 days ago in dev mode
                        }),
                      });
                    const result = await response.json();
                    console.log('Path regeneration response:', { status: response.status, result });
                    if (response.ok) {
                      alert(`Path regenerated! ${result.message || 'Refresh the page to see changes.'}`);
                      window.location.reload();
                    } else {
                      console.error('Path regeneration error:', result);
                      const errorMsg = result.error || result.details || result.message || `HTTP ${response.status}`;
                      alert(`Error: ${errorMsg}\n\nMake sure the generate-path Edge Function is deployed with the latest code.`);
                    }
                  } catch (error) {
                    console.error('Path regeneration error:', error);
                    alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }}
                className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-full font-explanation"
                title="Regenerate learning path with full Shas (all 63 tractates)"
              >
                🔄 Regenerate
              </button>
              
              {/* Profile button */}
              <button
                onClick={() => router.push('/profile')}
                className="p-2 -m-1 rounded-full hover:bg-desert-oasis-muted/20 dark:hover:bg-gray-700/30 transition-colors"
                title="פרופיל"
              >
                <UserCircleIcon className="text-[var(--text-primary)]" />
              </button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-explanation text-[var(--text-secondary)]">
                התקדמות
              </span>
              <span className="text-sm font-explanation text-desert-oasis-accent font-semibold">
                {completedCount} / {totalCount}
              </span>
            </div>
            <div className="h-2 bg-desert-oasis-muted/30 dark:bg-gray-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-desert-oasis-accent to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Path content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="relative">
          {/* Vertical path line */}
          <div className="absolute right-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-desert-oasis-accent/50 via-desert-oasis-muted/30 to-transparent dark:from-desert-oasis-accent/30 dark:via-gray-600/30" />
          
          <div className="space-y-4">
            {nodes.slice(0, visibleCount).map((node, idx) => {
              const isDivider = node.is_divider === 1;
              const isCompleted = node.completed_at !== null;
              const isCurrent = node.isCurrent;
              const isLocked = node.isLocked;
              
              // Check if we need a date separator (use full nodes array for prev check)
              const prevNode = idx > 0 ? nodes[idx - 1] : null;
              const showDateSeparator = !isDivider && (!prevNode || prevNode.unlock_date !== node.unlock_date || prevNode.is_divider === 1);
              
              // Format date for separator
              const formatDateSeparator = (dateStr: string) => {
                const today = new Date().toISOString().split('T')[0];
                const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                
                if (dateStr === today) return 'היום';
                if (dateStr === tomorrow) return 'מחר';
                if (dateStr === yesterday) return 'אתמול';
                
                return new Date(dateStr).toLocaleDateString('he-IL', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                });
              };
              
              if (isDivider) {
                // Debug: Log divider info
                console.log('[PathScreen] Divider node:', {
                  id: node.id,
                  tractate: node.tractate,
                  chapter: node.chapter,
                  unlock_date: node.unlock_date,
                  node_index: node.node_index,
                  idx: idx,
                });
                
                // Convert tractate to Hebrew and chapter to Hebrew numeral
                const tractateHebrew = node.tractate ? getTractateHebrew(node.tractate) || node.tractate : '';
                const chapterHebrew = node.chapter ? formatHebrewNumber(node.chapter) : '';
                const isTractateComplete = node.tractate && node.chapter && isLastChapter(node.tractate, node.chapter);
                
                // Check if this is the first tractate completion divider for this tractate
                // (to avoid showing duplicate banners)
                const isFirstTractateCompletionDivider = isTractateComplete && 
                  !nodes.slice(0, idx).some(n => 
                    n.is_divider === 1 && 
                    n.tractate === node.tractate && 
                    n.chapter === node.chapter &&
                    isLastChapter(n.tractate!, n.chapter!)
                  );
                
                // Special celebration for completing an entire tractate (only show once)
                if (isTractateComplete && isFirstTractateCompletionDivider) {
                  return (
                    <div
                      key={node.id}
                      className="relative py-8 mr-8"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/50 to-yellow-500/70" />
                          <SparklesIcon className="text-yellow-500 animate-pulse" />
                          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-yellow-400/50 to-yellow-500/70" />
                        </div>
                        
                        <div className="relative">
                          {/* Glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-orange-400/30 to-yellow-400/30 blur-xl rounded-full" />
                          
                          <div className="relative flex flex-col items-center gap-4 px-8 py-6 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50 dark:from-yellow-900/40 dark:via-orange-900/30 dark:to-yellow-900/40 rounded-2xl border-2 border-yellow-400/50 dark:border-yellow-500/50 shadow-lg">
                            {/* Mascot celebrating */}
                            <Mascot mood="celebrating" size="lg" />
                            
                            <div className="text-center">
                              <p className="font-source text-xl font-bold text-yellow-700 dark:text-yellow-300">
                                מזל טוב!
                              </p>
                              <p className="font-explanation text-yellow-600 dark:text-yellow-400 font-semibold mt-1">
                                סיימת את מסכת {tractateHebrew}!
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/50 to-yellow-500/70" />
                          <SparklesIcon className="text-yellow-500 animate-pulse" />
                          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-yellow-400/50 to-yellow-500/70" />
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Regular chapter completion (skip if this is a tractate completion - already shown above)
                if (isTractateComplete) {
                  return null; // Don't show chapter banner for tractate completion
                }
                
                return (
                  <div
                    key={node.id}
                    className="relative py-6 mr-8"
                  >
                    <div className="flex items-center gap-3 justify-center">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-desert-oasis-accent/50" />
                      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-desert-oasis-accent/20 to-orange-400/20 dark:from-desert-oasis-accent/30 dark:to-orange-400/30 rounded-full">
                        <TrophyIcon className="text-desert-oasis-accent" />
                        <p className="font-explanation text-desert-oasis-accent font-semibold text-sm">
                          סיימת {tractateHebrew} פרק {chapterHebrew}!
                        </p>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-desert-oasis-accent/50" />
                    </div>
                  </div>
                );
              }

              // Get icon and colors based on node type
              const getNodeStyle = () => {
                if (isCompleted) {
                  return {
                    icon: <CheckIcon className="text-white" />,
                    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
                    cardBg: 'bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/10',
                    ring: 'ring-2 ring-green-500/30',
                    badge: null,
                  };
                }
                if (isLocked) {
                  // Show regular icon but greyed out (card already has opacity-60)
                  const lockedIcon = node.node_type === 'quiz' 
                    ? <ClipboardCheckIcon className="text-gray-400 dark:text-gray-500" />
                    : node.node_type === 'weekly_quiz'
                      ? <TrophyIcon className="text-gray-400 dark:text-gray-500 w-7 h-7" />
                      : node.node_type === 'review'
                        ? <BrainIcon className="text-gray-400 dark:text-gray-500" />
                        : <BookOpenIcon className="text-gray-400 dark:text-gray-500" />;
                  
                  return {
                    icon: lockedIcon,
                    iconBg: 'bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary',
                    cardBg: 'bg-gray-100/80 dark:bg-gray-800/50',
                    ring: '',
                    badge: null,
                  };
                }
                if (node.node_type === 'quiz') {
                  return {
                    icon: <ClipboardCheckIcon className={isCurrent ? 'text-white' : 'text-purple-600 dark:text-purple-400'} />,
                    iconBg: isCurrent 
                      ? 'bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/30' 
                      : 'bg-purple-100 dark:bg-purple-900/30',
                    cardBg: isCurrent 
                      ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-800/20' 
                      : 'bg-white/80 dark:bg-gray-800/50',
                    ring: isCurrent ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-desert-oasis-primary dark:ring-offset-desert-oasis-dark-primary' : '',
                    badge: <span className="inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                      <ClipboardCheckIcon className="w-3 h-3" />
                      {t('path_node_quiz')}
                    </span>,
                  };
                }
                if (node.node_type === 'weekly_quiz') {
                  return {
                    icon: <TrophyIcon className={isCurrent ? 'text-white w-7 h-7' : 'text-amber-600 dark:text-amber-400 w-7 h-7'} />,
                    iconBg: isCurrent 
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30' 
                      : 'bg-amber-100 dark:bg-amber-900/30',
                    cardBg: isCurrent 
                      ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20' 
                      : 'bg-white/80 dark:bg-gray-800/50',
                    ring: isCurrent ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-desert-oasis-primary dark:ring-offset-desert-oasis-dark-primary' : '',
                    badge: <span className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                      <TrophyIcon className="w-3 h-3" />
                      מבחן שבועי
                    </span>,
                  };
                }
                if (node.node_type === 'review') {
                  return {
                    icon: <BrainIcon className={isCurrent ? 'text-white' : 'text-blue-600 dark:text-blue-400'} />,
                    iconBg: isCurrent 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30' 
                      : 'bg-blue-100 dark:bg-blue-900/30',
                    cardBg: isCurrent 
                      ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20' 
                      : 'bg-white/80 dark:bg-gray-800/50',
                    ring: isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-desert-oasis-primary dark:ring-offset-desert-oasis-dark-primary' : '',
                    badge: <span className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                      <BrainIcon className="w-3 h-3" />
                      {t('path_node_review')}
                    </span>,
                  };
                }
                // Learning
                return {
                  icon: <BookOpenIcon className={isCurrent ? 'text-white' : 'text-desert-oasis-accent'} />,
                  iconBg: isCurrent 
                    ? 'bg-gradient-to-br from-desert-oasis-accent to-orange-500 shadow-lg shadow-desert-oasis-accent/30' 
                    : 'bg-desert-oasis-accent/20 dark:bg-desert-oasis-accent/30',
                  cardBg: isCurrent 
                    ? 'bg-gradient-to-br from-desert-oasis-card to-orange-50 dark:from-desert-oasis-dark-card dark:to-orange-900/20' 
                    : 'bg-white/80 dark:bg-gray-800/50',
                  ring: isCurrent ? 'ring-2 ring-desert-oasis-accent ring-offset-2 ring-offset-desert-oasis-primary dark:ring-offset-desert-oasis-dark-primary' : '',
                  badge: <span className="inline-flex items-center gap-1 text-xs bg-desert-oasis-accent/20 dark:bg-desert-oasis-accent/30 text-desert-oasis-accent px-2 py-0.5 rounded-full font-semibold">
                    <BookOpenIcon className="w-3 h-3" />
                    {t('path_node_learning')}
                  </span>,
                };
              };

              const style = getNodeStyle();

              return (
                <div key={node.id}>
                  {/* Date separator */}
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 mb-4 mr-8">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-desert-oasis-muted/20 dark:bg-gray-700/30 rounded-full">
                        <svg className="w-4 h-4 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                          <line x1="16" x2="16" y1="2" y2="6" />
                          <line x1="8" x2="8" y1="2" y2="6" />
                          <line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                        <span className="font-explanation text-sm font-semibold text-[var(--text-secondary)]">
                          {formatDateSeparator(node.unlock_date!)}
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-desert-oasis-muted/30 dark:bg-gray-600/30" />
                    </div>
                  )}
                  
                  {/* Node card */}
                  <div
                    ref={isCurrent ? currentRef : null}
                    onClick={() => handleNodeClick(node)}
                    className={`
                      relative flex items-start gap-4 transition-all duration-300
                      ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-[1.02]'}
                    `}
                  >
                  {/* Icon circle on the timeline */}
                  <div className="relative z-10 flex-shrink-0">
                    {/* Solid background to cover the path line */}
                    <div className="absolute inset-0 rounded-2xl bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary" />
                    <div className={`
                      relative w-16 h-16 rounded-2xl flex items-center justify-center
                      transition-all duration-300 ${style.iconBg}
                      ${isCurrent ? 'animate-pulse' : ''}
                    `}>
                      {style.icon}
                    </div>
                  </div>

                  {/* Card content */}
                  <div className={`
                    flex-1 p-4 rounded-2xl transition-all duration-300
                    ${style.cardBg} ${style.ring}
                    ${!isLocked && !isCompleted ? 'hover:shadow-lg dark:hover:shadow-black/20' : ''}
                  `}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {style.badge}
                      {isCurrent && (
                        <span className="inline-flex items-center text-xs bg-gradient-to-r from-desert-oasis-accent to-orange-500 text-white px-3 py-1 rounded-full font-semibold shadow-sm">
                          {t('path_node_current')}
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold">
                          <CheckIcon className="w-3 h-3" />
                          {t('path_node_completed')}
                        </span>
                      )}
                    </div>
                    
                    {node.node_type === 'weekly_quiz' && node.content_ref ? (
                      <div>
                        <p className={`font-source text-lg mb-1 ${isLocked ? 'text-gray-400 dark:text-gray-500' : 'text-[var(--text-primary)]'}`}>
                          {getWeeklyQuizMishnayot(node.content_ref, nodes)}
                        </p>
                        <p className={`font-explanation text-sm ${isLocked ? 'text-gray-400 dark:text-gray-500' : 'text-[var(--text-secondary)]'}`}>
                          סקירה על כל מה שלמדת השבוע
                        </p>
                      </div>
                    ) : node.content_ref && (
                      <p className={`font-source text-xl mb-1 ${isLocked ? 'text-gray-400 dark:text-gray-500' : 'text-[var(--text-primary)]'}`}>
                        {formatContentRef(node.content_ref)}
                      </p>
                    )}
                    
                  </div>
                </div>
                
                {/* Shabbat Shalom separator after weekly quiz */}
                {node.node_type === 'weekly_quiz' && (
                  <div className="mt-6 mb-2 mr-8">
                    <div className="flex flex-col items-center gap-2">
                      <Mascot mood="peaceful" size="sm" />
                      <div className="flex items-center gap-3 w-full">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-desert-oasis-accent/50" />
                        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-desert-oasis-accent/20 to-orange-400/20 dark:from-desert-oasis-accent/30 dark:to-orange-400/30 rounded-full">
                          <CandlesIcon className="text-desert-oasis-accent w-5 h-5" />
                          <span className="font-source text-desert-oasis-accent font-semibold">
                            שבת שלום
                          </span>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-desert-oasis-accent/50" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
            
            {/* Load more indicator */}
            {visibleCount < nodes.length && (
              <div 
                ref={loadMoreRef}
                className="flex flex-col items-center justify-center py-8 mr-8"
              >
                <div className="w-8 h-8 rounded-full border-3 border-desert-oasis-accent/30 border-t-desert-oasis-accent animate-spin mb-3" />
                <p className="text-sm font-explanation text-[var(--text-secondary)]">
                  טוען עוד... ({nodes.length - visibleCount} נותרו)
                </p>
              </div>
            )}
            
            {/* End of path indicator */}
            {visibleCount >= nodes.length && nodes.length > 0 && (
              <div className="flex flex-col items-center justify-center py-8 mr-8 text-center">
                <div className="w-12 h-12 rounded-full bg-desert-oasis-muted/20 dark:bg-gray-700/30 flex items-center justify-center mb-3">
                  <CheckIcon className="w-6 h-6 text-desert-oasis-accent" />
                </div>
                <p className="text-sm font-explanation text-[var(--text-secondary)]">
                  סוף דרך הלימוד ({nodes.length} פריטים)
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom padding for safe area */}
        <div className="h-20" />
      </div>
    </div>
  );
}
