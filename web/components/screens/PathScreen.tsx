'use client';

import { useEffect, useRef } from 'react';
import { usePath } from '@/lib/hooks/usePath';
import { usePathStreak } from '@/lib/hooks/usePathStreak';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { formatContentRef, formatHebrewNumber, getTractateHebrew, isLastChapter } from '@/lib/utils/date-format';
import { useAuthContext } from '@/components/providers/AuthProvider';

// Icon components for different study types
function BookOpenIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function RepeatIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function QuizIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function LockIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-desert-oasis-primary to-desert-oasis-secondary dark:from-desert-oasis-dark-primary dark:to-desert-oasis-dark-secondary">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-desert-oasis-accent border-t-transparent animate-spin" />
          <p className="text-desert-oasis-accent font-explanation">טוען...</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-desert-oasis-primary to-desert-oasis-secondary dark:from-desert-oasis-dark-primary dark:to-desert-oasis-dark-secondary">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-desert-oasis-muted/30 flex items-center justify-center">
            <BookOpenIcon className="text-desert-oasis-accent" />
          </div>
          <p className="text-[var(--text-primary)] text-xl font-source mb-2">אין דרך לימוד עדיין</p>
          <p className="text-[var(--text-secondary)] text-sm font-explanation">השלם את ההרשמה כדי להתחיל</p>
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

  // Calculate stats
  const completedCount = nodes.filter(n => n.completed_at !== null && n.is_divider !== 1).length;
  const totalCount = nodes.filter(n => n.is_divider !== 1).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-desert-oasis-primary to-desert-oasis-secondary dark:from-desert-oasis-dark-primary dark:to-desert-oasis-dark-secondary">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-desert-oasis-primary/95 dark:bg-desert-oasis-dark-primary/95 backdrop-blur-sm border-b border-desert-oasis-muted/20 dark:border-gray-700/30">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-source font-bold text-[var(--text-primary)]">
              {t('path_title')}
            </h1>
            {streak > 0 && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 dark:from-orange-500/30 dark:to-red-500/30 px-4 py-2 rounded-full">
                <FlameIcon className="text-orange-500" />
                <span className="text-orange-600 dark:text-orange-400 font-explanation font-bold">
                  {streak}
                </span>
              </div>
            )}
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
            {nodes.map((node, idx) => {
              const isDivider = node.is_divider === 1;
              const isCompleted = node.completed_at !== null;
              const isCurrent = node.isCurrent;
              const isLocked = node.isLocked;
              
              if (isDivider) {
                // Convert tractate to Hebrew and chapter to Hebrew numeral
                const tractateHebrew = node.tractate ? getTractateHebrew(node.tractate) || node.tractate : '';
                const chapterHebrew = node.chapter ? formatHebrewNumber(node.chapter) : '';
                const isTractateComplete = node.tractate && node.chapter && isLastChapter(node.tractate, node.chapter);
                
                // Special celebration for completing an entire tractate
                if (isTractateComplete) {
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
                          
                          <div className="relative flex flex-col items-center gap-3 px-8 py-5 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50 dark:from-yellow-900/40 dark:via-orange-900/30 dark:to-yellow-900/40 rounded-2xl border-2 border-yellow-400/50 dark:border-yellow-500/50 shadow-lg">
                            <div className="flex items-center gap-2">
                              <StarIcon className="text-yellow-500 w-6 h-6" />
                              <StarIcon className="text-yellow-400 w-8 h-8" />
                              <StarIcon className="text-yellow-500 w-6 h-6" />
                            </div>
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
                
                // Regular chapter completion
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
                  return {
                    icon: <LockIcon className="text-gray-400 dark:text-gray-500" />,
                    iconBg: 'bg-gray-200 dark:bg-gray-700',
                    cardBg: 'bg-gray-100/80 dark:bg-gray-800/50',
                    ring: '',
                    badge: null,
                  };
                }
                if (node.node_type === 'quiz') {
                  return {
                    icon: <QuizIcon className={isCurrent ? 'text-white' : 'text-purple-600 dark:text-purple-400'} />,
                    iconBg: isCurrent 
                      ? 'bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/30' 
                      : 'bg-purple-100 dark:bg-purple-900/30',
                    cardBg: isCurrent 
                      ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-800/20' 
                      : 'bg-white/80 dark:bg-gray-800/50',
                    ring: isCurrent ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-desert-oasis-primary dark:ring-offset-desert-oasis-dark-primary' : '',
                    badge: <span className="inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                      <QuizIcon className="w-3 h-3" />
                      {t('path_node_quiz')}
                    </span>,
                  };
                }
                if (node.node_type === 'review') {
                  return {
                    icon: <RepeatIcon className={isCurrent ? 'text-white' : 'text-blue-600 dark:text-blue-400'} />,
                    iconBg: isCurrent 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30' 
                      : 'bg-blue-100 dark:bg-blue-900/30',
                    cardBg: isCurrent 
                      ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20' 
                      : 'bg-white/80 dark:bg-gray-800/50',
                    ring: isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-desert-oasis-primary dark:ring-offset-desert-oasis-dark-primary' : '',
                    badge: <span className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                      <RepeatIcon className="w-3 h-3" />
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
                <div
                  key={node.id}
                  ref={isCurrent ? currentRef : null}
                  onClick={() => handleNodeClick(node)}
                  className={`
                    relative flex items-start gap-4 transition-all duration-300
                    ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-[1.02]'}
                  `}
                >
                  {/* Icon circle on the timeline */}
                  <div className={`
                    relative z-10 flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center
                    transition-all duration-300 ${style.iconBg}
                    ${isCurrent ? 'animate-pulse' : ''}
                  `}>
                    {style.icon}
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
                    
                    {node.content_ref && (
                      <p className={`font-source text-xl mb-1 ${isLocked ? 'text-gray-400 dark:text-gray-500' : 'text-[var(--text-primary)]'}`}>
                        {formatContentRef(node.content_ref)}
                      </p>
                    )}
                    
                    <p className={`font-explanation text-sm ${isLocked ? 'text-gray-400 dark:text-gray-500' : 'text-[var(--text-secondary)]'}`}>
                      {new Date(node.unlock_date).toLocaleDateString('he-IL', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long' 
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Bottom padding for safe area */}
        <div className="h-20" />
      </div>
    </div>
  );
}
