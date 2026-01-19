import { Mascot } from '@/components/ui/Mascot';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-desert-oasis-primary to-desert-oasis-secondary dark:from-desert-oasis-dark-primary dark:to-desert-oasis-dark-secondary p-4">
      <div className="text-center max-w-md">
        <Mascot mood="thinking" size="lg" />
        
        <h1 className="text-2xl font-source font-bold text-[var(--text-primary)] mt-6 mb-2">
          הדף לא נמצא
        </h1>
        
        <p className="text-[var(--text-secondary)] font-explanation mb-6">
          נראה שהגעת למקום לא קיים. בוא נחזור לדרך הלימוד.
        </p>
        
        <Link
          href="/"
          className="inline-block w-full px-6 py-3 bg-desert-oasis-accent hover:bg-desert-oasis-accent/90 text-white rounded-xl font-explanation font-semibold transition-colors text-center"
        >
          חזור לדף הבית
        </Link>
      </div>
    </div>
  );
}
