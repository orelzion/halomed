'use client';

import Image from 'next/image';

export type MascotMood = 
  | 'default'
  | 'celebrating'
  | 'happy'
  | 'encouraging'
  | 'thinking'
  | 'reading'
  | 'sad'
  | 'peaceful';

interface MascotProps {
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
}

const moodToImage: Record<MascotMood, string> = {
  default: '/mascot/main.png',
  celebrating: '/mascot/celebrating.png',
  happy: '/mascot/happy.png',
  encouraging: '/mascot/encouraging.png',
  thinking: '/mascot/thinking.png',
  reading: '/mascot/reading.png',
  sad: '/mascot/sad.png',
  peaceful: '/mascot/peaceful.png',
};

const sizeToPixels: Record<string, { width: number; height: number }> = {
  sm: { width: 80, height: 80 },
  md: { width: 120, height: 120 },
  lg: { width: 180, height: 180 },
  xl: { width: 240, height: 240 },
};

/**
 * Mascot component - displays the HaLomeid sheep mascot with different moods
 * 
 * Usage:
 * <Mascot mood="celebrating" size="lg" message="מזל טוב!" />
 */
export function Mascot({ 
  mood = 'default', 
  size = 'md', 
  message,
  className = '' 
}: MascotProps) {
  const imageSrc = moodToImage[mood];
  const dimensions = sizeToPixels[size];
  
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative">
        <Image
          src={imageSrc}
          alt="כבשון - המדריך שלך ללימוד"
          width={dimensions.width}
          height={dimensions.height}
          className="object-contain"
          priority={mood === 'celebrating'} // Prioritize loading for celebrations
        />
      </div>
      
      {message && (
        <div className="relative max-w-[200px]">
          {/* Speech bubble */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-2 shadow-lg border border-gray-200 dark:border-gray-700">
            <p className="text-center font-explanation text-sm text-[var(--text-primary)]">
              {message}
            </p>
          </div>
          {/* Bubble pointer */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 rotate-45" />
        </div>
      )}
    </div>
  );
}

/**
 * Preset mascot configurations for common use cases
 */
export const MascotPresets = {
  tractateComplete: (tractate: string) => (
    <Mascot 
      mood="celebrating" 
      size="xl" 
      message={`מזל טוב! סיימת את מסכת ${tractate}!`}
    />
  ),
  
  lessonComplete: () => (
    <Mascot 
      mood="happy" 
      size="lg" 
      message="כל הכבוד!"
    />
  ),
  
  quizPerfect: () => (
    <Mascot 
      mood="celebrating" 
      size="lg" 
      message="מושלם! 100%!"
    />
  ),
  
  quizGood: (score: number) => (
    <Mascot 
      mood="happy" 
      size="lg" 
      message={`יפה מאוד! ${score}%`}
    />
  ),
  
  quizEncourage: (score: number) => (
    <Mascot 
      mood="encouraging" 
      size="lg" 
      message={`${score}% - בפעם הבאה יהיה יותר טוב!`}
    />
  ),
  
  loading: () => (
    <Mascot 
      mood="thinking" 
      size="md"
    />
  ),
  
  error: () => (
    <Mascot 
      mood="sad" 
      size="md" 
      message="אופס! משהו השתבש"
    />
  ),
  
  shabbat: () => (
    <Mascot 
      mood="peaceful" 
      size="lg" 
      message="שבת שלום!"
    />
  ),
  
  welcome: () => (
    <Mascot 
      mood="happy" 
      size="xl" 
      message="ברוכים הבאים להלומד!"
    />
  ),
};
