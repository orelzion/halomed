'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { getPowerSyncDatabase } from '@/lib/powersync/database';
import { supabase } from '@/lib/supabase/client';
import { StudyHeader } from '@/components/ui/StudyHeader';

interface QuizQuestion {
  id: string;
  content_ref: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export function QuizScreen() {
  const params = useParams();
  const nodeId = params.nodeId as string;
  const router = useRouter();
  const { t } = useTranslation();
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const db = getPowerSyncDatabase();
        if (!db) return;

        // Get path node to find content_ref
        const nodeResult = await db.getAll(
          'SELECT content_ref FROM learning_path WHERE id = ?',
          [nodeId]
        );
        
        if (!nodeResult || (Array.isArray(nodeResult) && nodeResult.length === 0)) {
          setLoading(false);
          return;
        }

        const node = Array.isArray(nodeResult) ? nodeResult[0] : nodeResult.rows?.[0];
        if (!node?.content_ref) {
          setLoading(false);
          return;
        }

        // Get quiz question from PowerSync
        const quizResult = await db.getAll(
          'SELECT * FROM quiz_questions WHERE content_ref = ? LIMIT 1',
          [node.content_ref]
        );

        const quizzes = Array.isArray(quizResult) ? quizResult : quizResult.rows ? Array.from({ length: quizResult.rows.length }, (_, i) => quizResult.rows.item(i)) : [];
        
        if (quizzes.length === 0) {
          // Generate quiz question
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const response = await fetch('/api/generate-quiz', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ content_ref: node.content_ref }),
          });

          if (!response.ok) {
            throw new Error('Failed to generate quiz');
          }

          // Reload quiz
          const newQuizResult = await db.getAll(
            'SELECT * FROM quiz_questions WHERE content_ref = ? LIMIT 1',
            [node.content_ref]
          );
          const newQuizzes = Array.isArray(newQuizResult) ? newQuizResult : newQuizResult.rows ? Array.from({ length: newQuizResult.rows.length }, (_, i) => newQuizResult.rows.item(i)) : [];
          
          if (newQuizzes.length > 0) {
            const q = newQuizzes[0];
            setQuiz({
              id: q.id,
              content_ref: q.content_ref,
              question_text: q.question_text,
              options: JSON.parse(q.options),
              correct_answer: q.correct_answer,
              explanation: q.explanation || '',
            });
          }
        } else {
          const q = quizzes[0];
          setQuiz({
            id: q.id,
            content_ref: q.content_ref,
            question_text: q.question_text,
            options: JSON.parse(q.options),
            correct_answer: q.correct_answer,
            explanation: q.explanation || '',
          });
        }
      } catch (error) {
        console.error('Error loading quiz:', error);
      } finally {
        setLoading(false);
      }
    };

    if (nodeId) {
      loadQuiz();
    }
  }, [nodeId]);

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null) return; // Already answered
    setSelectedAnswer(index);
    setShowExplanation(true);
  };

  const handleContinue = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <p className="text-desert-oasis-accent">{t('loading_content')}</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <p className="text-[var(--text-primary)]">שגיאה בטעינת החידון</p>
      </div>
    );
  }

  const isCorrect = selectedAnswer === quiz.correct_answer;

  return (
    <div className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
      <StudyHeader 
        title={t('quiz_title')}
        onBack={() => router.push('/')}
      />

      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card rounded-2xl p-6 mb-4">
          <h2 className="font-explanation text-xl font-semibold mb-4 text-[var(--text-primary)]">
            {t('quiz_question')}
          </h2>
          <p className="font-source text-lg mb-6 text-[var(--text-primary)]">
            {quiz.question_text}
          </p>

          <div className="space-y-3">
            {quiz.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = index === quiz.correct_answer;
              
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
                {quiz.explanation}
              </p>
            </div>
          )}

          {showExplanation && (
            <button
              onClick={handleContinue}
              className="w-full mt-6 p-4 bg-desert-oasis-accent text-white rounded-xl font-explanation text-lg font-semibold"
            >
              {t('quiz_continue')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
