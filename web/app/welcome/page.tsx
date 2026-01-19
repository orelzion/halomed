'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { Mascot, MascotMood } from '@/components/ui/Mascot';

// Intro slide data
const introSlides: { 
  mood: MascotMood; 
  title: string; 
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    mood: 'reading',
    title: 'למד את כל המשנה',
    description: 'מסע שלם דרך ששה סדרי משנה, צעד אחר צעד. כל יום לימוד קטן שמצטבר לידע גדול.',
    icon: (
      <svg className="w-8 h-8 text-desert-oasis-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    mood: 'thinking',
    title: 'חזרה מרווחת',
    description: 'השיטה המדעית לזכירה לטווח ארוך. נחזור על החומר במרווחי זמן אופטימליים כדי שהלימוד יישאר איתך.',
    icon: (
      <svg className="w-8 h-8 text-desert-oasis-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12c0-1.232.046-2.453.138-3.662a4.006 4.006 0 013.7-3.7 48.678 48.678 0 017.324 0 4.006 4.006 0 013.7 3.7c.017.22.032.441.046.662M4.5 12l-3-3m3 3l3-3m12 3c0 1.232-.046 2.453-.138 3.662a4.006 4.006 0 01-3.7 3.7 48.678 48.678 0 01-7.324 0 4.006 4.006 0 01-3.7-3.7c-.017-.22-.032-.441-.046-.662M19.5 12l3 3m-3-3l-3 3" />
      </svg>
    ),
  },
  {
    mood: 'celebrating',
    title: 'מבחנים שבועיים',
    description: 'בכל יום שישי מבחן קצר על מה שלמדת השבוע. דרך מהנה לבדוק את עצמך ולחגוג את ההתקדמות.',
    icon: (
      <svg className="w-8 h-8 text-desert-oasis-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
];

export default function WelcomePage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  // If user is already logged in, redirect to home
  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const goToLogin = () => {
    // Mark intro as seen
    localStorage.setItem('halomed_seen_intro', 'true');
    router.push('/login');
  };

  const handleNext = () => {
    if (currentSlide < introSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Last slide - go to login
      goToLogin();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    goToLogin();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary">
        <Mascot mood="thinking" size="md" />
      </div>
    );
  }

  // Already logged in - will redirect
  if (user) {
    return null;
  }

  const slide = introSlides[currentSlide];

  return (
    <div className="min-h-screen bg-desert-oasis-secondary dark:bg-desert-oasis-dark-secondary p-4 flex flex-col">
      <div className="max-w-2xl mx-auto flex-1 flex flex-col w-full">
        
        <div className="flex-1 flex flex-col justify-center">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-8">
            {introSlides.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentSlide 
                    ? 'w-6 bg-desert-oasis-accent' 
                    : i < currentSlide 
                      ? 'bg-desert-oasis-accent/50' 
                      : 'bg-desert-oasis-muted/30'
                }`}
              />
            ))}
          </div>

          {/* Mascot */}
          <div className="flex justify-center mb-6">
            <Mascot mood={slide.mood} size="xl" />
          </div>

          {/* Icon badge */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-desert-oasis-accent/10 flex items-center justify-center">
              {slide.icon}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-source text-center mb-4 text-[var(--text-primary)]">
            {slide.title}
          </h1>

          {/* Description */}
          <p className="text-center text-lg font-explanation text-[var(--text-secondary)] mb-8 px-4 leading-relaxed">
            {slide.description}
          </p>

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-auto">
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 py-4 px-6 bg-desert-oasis-muted/20 hover:bg-desert-oasis-muted/30 text-[var(--text-primary)] rounded-xl font-explanation text-lg transition-colors"
              >
                הקודם
              </button>
            )}
            <button
              onClick={handleNext}
              className={`${currentSlide > 0 ? 'flex-1' : 'w-full'} py-4 px-6 bg-desert-oasis-accent hover:bg-desert-oasis-accent/90 text-white rounded-xl font-explanation text-lg font-semibold transition-colors`}
            >
              {currentSlide === introSlides.length - 1 ? 'בואו נתחיל!' : 'הבא'}
            </button>
          </div>

          {/* Skip link */}
          <button
            onClick={handleSkip}
            className="mt-4 text-sm text-[var(--text-secondary)] hover:text-desert-oasis-accent transition-colors"
          >
            דלג להתחברות
          </button>
        </div>
      </div>
    </div>
  );
}
