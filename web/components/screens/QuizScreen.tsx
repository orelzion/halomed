'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import { supabase } from '@/lib/supabase/client';
import { StudyHeader } from '@/components/ui/StudyHeader';
import { Mascot } from '@/components/ui/Mascot';
import posthog from 'posthog-js';

interface QuizQuestion {
  id: string;
  content_ref: string;
  question_index: number;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

/**
 * Check if content_ref is a weekly quiz
 */
function isWeeklyQuiz(contentRef: string): boolean {
  return contentRef?.startsWith('weekly_quiz_');
}

/**
 * Parse weekly quiz content_ref to get all covered dates
 * Format: weekly_quiz_YYYY-MM-DD or weekly_quiz_YYYY-MM-DD+YYYY-MM-DD+... (multiple weeks)
 * Returns the primary quiz date and any additional week dates
 */
function parseWeeklyQuizDates(contentRef: string): Date[] {
  // Remove the prefix
  const datesPart = contentRef.replace('weekly_quiz_', '');
  // Split by + to get all dates
  const dateStrings = datesPart.split('+');
  return dateStrings.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
}

/**
 * Get the week range (Sunday to Thursday) for a given quiz date (Friday or Thursday)
 * Israeli work week: Sunday-Thursday
 */
function getWeekRange(quizDate: Date): { start: string; end: string } {
  const dayOfWeek = quizDate.getDay();
  
  // Calculate days to go back to reach Sunday
  // Friday (5) -> -5 to get Sunday, Thursday (4) -> -4 to get Sunday
  const daysToSunday = dayOfWeek === 5 ? 5 : 4;
  
  const sunday = new Date(quizDate);
  sunday.setDate(quizDate.getDate() - daysToSunday);
  
  // Thursday is always day before Friday, or same day if quiz is on Thursday
  const thursday = new Date(quizDate);
  if (dayOfWeek === 5) {
    thursday.setDate(quizDate.getDate() - 1); // Friday - 1 = Thursday
  }
  // If quiz is on Thursday, thursday = quizDate (but we still include content through Wednesday)
  // Actually, if quiz is Thursday, the week content is Sunday-Wednesday
  if (dayOfWeek === 4) {
    thursday.setDate(quizDate.getDate() - 1); // Thursday - 1 = Wednesday (last learning day before quiz)
  }
  
  return {
    start: sunday.toISOString().split('T')[0],
    end: thursday.toISOString().split('T')[0],
  };
}

/**
 * Get all week ranges for a weekly quiz (handles multi-week quizzes)
 */
function getAllWeekRanges(contentRef: string): { start: string; end: string }[] {
  const dates = parseWeeklyQuizDates(contentRef);
  return dates.map(date => getWeekRange(date));
}

export function QuizScreen() {
  const params = useParams();
  const nodeId = params.nodeId as string;
  const router = useRouter();
  const { t } = useTranslation();
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Map<number, number>>(new Map());
  const [showExplanations, setShowExplanations] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [quizComplete, setQuizComplete] = useState(false);
  const [quizContentRef, setQuizContentRef] = useState<string | null>(null);
  const hasTrackedQuizStart = useRef(false);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const db = getPowerSyncDatabase();
        if (!db) return;

        // Get path node to find content_ref
        const nodeResult = await db.getAll<{ content_ref: string | null }>(
          'SELECT content_ref FROM learning_path WHERE id = ?',
          [nodeId]
        );
        
        if (!nodeResult || nodeResult.length === 0) {
          setLoading(false);
          return;
        }

        const node = nodeResult[0];
        if (!node.content_ref) {
          setLoading(false);
          return;
        }

        // Store content ref for tracking
        setQuizContentRef(node.content_ref);

        // Check if this is a weekly quiz
        if (isWeeklyQuiz(node.content_ref)) {
          await loadWeeklyQuiz(db, node.content_ref);
        } else {
          await loadRegularQuiz(db, node.content_ref);
        }
      } catch (error) {
        console.error('Error loading quiz:', error);
        posthog.captureException(error);
      } finally {
        setLoading(false);
      }
    };

    const loadWeeklyQuiz = async (db: any, contentRef: string) => {
      // Get all week ranges (handles multi-week quizzes)
      const weekRanges = getAllWeekRanges(contentRef);
      if (weekRanges.length === 0) {
        console.error('[QuizScreen] Invalid weekly quiz content_ref:', contentRef);
        return;
      }

      console.log(`[QuizScreen] Loading weekly quiz for ${contentRef}, covering ${weekRanges.length} week(s)`);

      // Get all learning nodes from all covered weeks
      let allLearningNodes: any[] = [];
      for (const { start, end } of weekRanges) {
        console.log(`[QuizScreen] Fetching content from ${start} to ${end}`);
        const learningNodesResult = await db.getAll(
          `SELECT DISTINCT content_ref FROM learning_path 
           WHERE node_type = 'learning' 
           AND unlock_date >= ? AND unlock_date <= ?
           ORDER BY unlock_date, node_index`,
          [start, end]
        );

        const weekNodes = Array.isArray(learningNodesResult) 
          ? learningNodesResult 
          : learningNodesResult.rows 
            ? Array.from({ length: learningNodesResult.rows.length }, (_, i) => learningNodesResult.rows.item(i)) 
            : [];
        
        allLearningNodes = [...allLearningNodes, ...weekNodes];
      }

      if (allLearningNodes.length === 0) {
        console.log('[QuizScreen] No learning nodes found for this quiz');
        setAllQuestions([]);
        return;
      }

      // Get unique content_refs from learning nodes
      const contentRefs = [...new Set(allLearningNodes.map((n: any) => n.content_ref).filter(Boolean))];
      console.log(`[QuizScreen] Found ${contentRefs.length} content refs for weekly quiz`);

      // Get quiz questions for all content_refs
      const placeholders = contentRefs.map(() => '?').join(',');
      const quizResult = await db.getAll(
        `SELECT * FROM quiz_questions WHERE content_ref IN (${placeholders}) ORDER BY content_ref, question_index ASC`,
        contentRefs
      );

      let quizzes = Array.isArray(quizResult) 
        ? quizResult 
        : quizResult.rows 
          ? Array.from({ length: quizResult.rows.length }, (_, i) => quizResult.rows.item(i)) 
          : [];

      // If no questions exist, generate them for each content_ref
      if (quizzes.length === 0) {
        console.log('[QuizScreen] No quiz questions found, generating...');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Generate quizzes for each content_ref (in parallel, max 3 at a time)
        for (let i = 0; i < contentRefs.length; i += 3) {
          const batch = contentRefs.slice(i, i + 3);
          await Promise.all(batch.map(async (ref: string) => {
            try {
              await fetch('/api/generate-quiz', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ content_ref: ref }),
              });
            } catch (err) {
              console.error(`[QuizScreen] Failed to generate quiz for ${ref}:`, err);
            }
          }));
        }

        // Wait for sync and retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        const newQuizResult = await db.getAll(
          `SELECT * FROM quiz_questions WHERE content_ref IN (${placeholders}) ORDER BY content_ref, question_index ASC`,
          contentRefs
        );
        quizzes = Array.isArray(newQuizResult) 
          ? newQuizResult 
          : newQuizResult.rows 
            ? Array.from({ length: newQuizResult.rows.length }, (_, i) => newQuizResult.rows.item(i)) 
            : [];
      }

      // Format questions
      const formatted = quizzes.map((q: any) => ({
        id: q.id,
        content_ref: q.content_ref,
        question_index: q.question_index || 0,
        question_text: q.question_text,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
      }));

      console.log(`[QuizScreen] Weekly quiz loaded with ${formatted.length} questions`);
      setAllQuestions(formatted);
    };

    const loadRegularQuiz = async (db: any, contentRef: string) => {
      // Get all quiz questions from PowerSync (ordered by question_index)
      const quizResult = await db.getAll(
        'SELECT * FROM quiz_questions WHERE content_ref = ? ORDER BY question_index ASC',
        [contentRef]
      );

      const quizzes = Array.isArray(quizResult) ? quizResult : quizResult.rows ? Array.from({ length: quizResult.rows.length }, (_, i) => quizResult.rows.item(i)) : [];
      
      if (quizzes.length === 0) {
        // Generate quiz questions
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/generate-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ content_ref: contentRef }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate quiz');
        }

        // Wait for PowerSync to sync the new data
        // Poll until data is available (max 10 seconds)
        let newQuizzes: any[] = [];
        const maxAttempts = 20;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          // Small delay to allow PowerSync to sync
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const newQuizResult = await db.getAll(
            'SELECT * FROM quiz_questions WHERE content_ref = ? ORDER BY question_index ASC',
            [contentRef]
          );
          newQuizzes = Array.isArray(newQuizResult) ? newQuizResult : newQuizResult.rows ? Array.from({ length: newQuizResult.rows.length }, (_, i) => newQuizResult.rows.item(i)) : [];
          
          if (newQuizzes.length > 0) {
            console.log(`[QuizScreen] Quiz synced after ${attempt + 1} attempts`);
            break;
          }
        }
        
        if (newQuizzes.length > 0) {
          const formatted = newQuizzes.map(q => ({
            id: q.id,
            content_ref: q.content_ref,
            question_index: q.question_index || 0,
            question_text: q.question_text,
            options: JSON.parse(q.options),
            correct_answer: q.correct_answer,
            explanation: q.explanation || '',
          }));
          setAllQuestions(formatted);
        } else {
          console.error('[QuizScreen] Quiz not synced after max attempts');
          throw new Error('Quiz generated but not yet synced. Please reload.');
        }
      } else {
        const formatted = quizzes.map(q => ({
          id: q.id,
          content_ref: q.content_ref,
          question_index: q.question_index || 0,
          question_text: q.question_text,
          options: JSON.parse(q.options),
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
        }));
        setAllQuestions(formatted);
      }
    };

    if (nodeId) {
      loadQuiz();
    }
  }, [nodeId]);

  // Track quiz start when questions are loaded
  useEffect(() => {
    if (allQuestions.length > 0 && !hasTrackedQuizStart.current) {
      hasTrackedQuizStart.current = true;
      posthog.capture('quiz_started', {
        node_id: nodeId,
        content_ref: quizContentRef,
        is_weekly_quiz: quizContentRef ? isWeeklyQuiz(quizContentRef) : false,
        total_questions: allQuestions.length,
      });
    }
  }, [allQuestions.length, nodeId, quizContentRef]);

  const handleAnswerSelect = (answerIndex: number) => {
    const question = allQuestions[currentQuestionIndex];
    if (!question) return;

    // Already answered this question
    if (selectedAnswers.has(currentQuestionIndex)) return;

    const isAnswerCorrect = answerIndex === question.correct_answer;

    // Capture answer submission event
    posthog.capture('quiz_answer_submitted', {
      node_id: nodeId,
      content_ref: question.content_ref,
      question_index: currentQuestionIndex,
      is_correct: isAnswerCorrect,
      total_questions: allQuestions.length,
    });

    // Record answer
    const newAnswers = new Map(selectedAnswers);
    newAnswers.set(currentQuestionIndex, answerIndex);
    setSelectedAnswers(newAnswers);

    // Show explanation
    const newExplanations = new Set(showExplanations);
    newExplanations.add(currentQuestionIndex);
    setShowExplanations(newExplanations);
  };

  const handleNext = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered - capture completion event
      const finalScore = Array.from(selectedAnswers.entries()).filter(
        ([idx, answer]) => allQuestions[idx]?.correct_answer === answer
      ).length;
      const percentage = Math.round((finalScore / allQuestions.length) * 100);

      posthog.capture('quiz_completed', {
        node_id: nodeId,
        content_ref: quizContentRef,
        is_weekly_quiz: quizContentRef ? isWeeklyQuiz(quizContentRef) : false,
        score: finalScore,
        total_questions: allQuestions.length,
        percentage: percentage,
      });

      setQuizComplete(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleFinish = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <StudyHeader 
          title={t('quiz_title')}
          onBack={() => router.push('/')}
        />
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
          <p className="text-desert-oasis-accent">{t('loading_content')}</p>
        </div>
      </div>
    );
  }

  if (allQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <StudyHeader 
          title={t('quiz_title')}
          onBack={() => router.push('/')}
        />
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
          <p className="text-[var(--text-primary)]">שגיאה בטעינת החידון</p>
        </div>
      </div>
    );
  }

  const currentQuestion = allQuestions[currentQuestionIndex];
  const selectedAnswer = selectedAnswers.get(currentQuestionIndex) ?? null;
  const showExplanation = showExplanations.has(currentQuestionIndex);
  const isCorrect = selectedAnswer === currentQuestion.correct_answer;
  
  // Calculate score
  const score = Array.from(selectedAnswers.entries()).filter(
    ([idx, answer]) => allQuestions[idx]?.correct_answer === answer
  ).length;
  const totalQuestions = allQuestions.length;

  // Quiz complete screen
  if (quizComplete) {
    const percentage = Math.round((score / totalQuestions) * 100);
    
    // Determine mascot mood based on score
    const getMascotMood = () => {
      if (percentage === 100) return 'celebrating';
      if (percentage >= 70) return 'happy';
      return 'encouraging';
    };
    
    return (
      <div className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <StudyHeader 
          title={t('quiz_title')}
          onBack={() => router.push('/')}
        />

        <div className="max-w-2xl mx-auto p-4">
          <div className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card rounded-2xl p-8 text-center">
            <div className="mb-6">
              {/* Mascot with score-based mood */}
              <div className="mb-4">
                <Mascot mood={getMascotMood()} size="lg" />
              </div>
              
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-desert-oasis-accent to-orange-500 flex items-center justify-center">
                <span className="text-3xl font-source font-bold text-white">
                  {percentage}%
                </span>
              </div>
              <p className="font-source text-2xl font-bold text-[var(--text-primary)] mb-2">
                {percentage === 100 ? 'מושלם!' : percentage >= 80 ? 'מצוין!' : percentage >= 60 ? 'טוב מאוד!' : 'ממשיכים להתקדם!'}
              </p>
              <p className="font-explanation text-lg text-[var(--text-secondary)]">
                ענית נכון על {score} מתוך {totalQuestions} שאלות
              </p>
            </div>

            <button
              onClick={handleFinish}
              className="w-full px-6 py-3 bg-desert-oasis-accent text-white rounded-xl font-explanation text-lg font-semibold"
            >
              {t('quiz_continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
      <StudyHeader 
        title={t('quiz_title')}
        onBack={() => router.push('/')}
      />

      <div className="max-w-2xl mx-auto p-4">
        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-explanation text-sm text-[var(--text-secondary)]">
              שאלה {currentQuestionIndex + 1} מתוך {totalQuestions}
            </span>
            <span className="font-explanation text-sm font-semibold text-desert-oasis-accent">
              {score} נכון
            </span>
          </div>
          <div className="h-2 bg-desert-oasis-muted/30 dark:bg-gray-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-desert-oasis-accent to-orange-400 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card rounded-2xl p-6 mb-4">
          <h2 className="font-explanation text-xl font-semibold mb-4 text-[var(--text-primary)]">
            {t('quiz_question')}
          </h2>
          <p className="font-source text-lg mb-6 text-[var(--text-primary)]">
            {currentQuestion.question_text}
          </p>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = index === currentQuestion.correct_answer;
              
              let bgClass = 'bg-desert-oasis-muted/20 dark:bg-gray-700/30';
              if (isSelected) {
                bgClass = isCorrect 
                  ? 'bg-green-500/20 dark:bg-green-500/30 ring-2 ring-green-500'
                  : 'bg-red-500/20 dark:bg-red-500/30 ring-2 ring-red-500';
              } else if (showExplanation && isCorrectOption) {
                bgClass = 'bg-green-500/20 dark:bg-green-500/30 ring-2 ring-green-500';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-4 rounded-xl text-right transition-all ${bgClass} ${
                    selectedAnswer === null ? 'hover:shadow-md cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold
                      ${isSelected && isCorrect ? 'bg-green-500 text-white' :
                        isSelected && !isCorrect ? 'bg-red-500 text-white' :
                        showExplanation && isCorrectOption ? 'bg-green-500 text-white' :
                        'bg-desert-oasis-muted/30 dark:bg-gray-600'
                      }
                    `}>
                      {String.fromCharCode(0x05D0 + index)} {/* Hebrew letters: א, ב, ג, ד */}
                    </div>
                    <span className="font-explanation text-[var(--text-primary)] flex-1">
                      {option}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="mt-6 p-4 rounded-xl bg-desert-oasis-accent/10 dark:bg-desert-oasis-accent/20">
              <p className="font-explanation font-semibold mb-2 text-[var(--text-primary)]">
                {isCorrect ? t('quiz_correct') : t('quiz_incorrect')}
              </p>
              <p className="font-explanation text-sm text-[var(--text-secondary)]">
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-6 flex items-center gap-3">
            {currentQuestionIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="flex-1 px-4 py-3 bg-desert-oasis-muted/20 dark:bg-gray-700/30 text-[var(--text-primary)] rounded-xl font-explanation font-semibold hover:bg-desert-oasis-muted/30 transition-colors"
              >
                הקודם
              </button>
            )}
            
            {showExplanation && (
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 bg-desert-oasis-accent text-white rounded-xl font-explanation text-lg font-semibold hover:bg-desert-oasis-accent/90 transition-colors"
              >
                {currentQuestionIndex < allQuestions.length - 1 ? 'הבא' : 'סיים'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
