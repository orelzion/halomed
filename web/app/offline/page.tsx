'use client';

import { Mascot } from '@/components/ui/Mascot';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <Mascot 
        mood="sad" 
        size="lg" 
        className="mb-6"
      />
      <h1 className="text-2xl font-bold mb-4 text-center">
        אין חיבור לאינטרנט
      </h1>
      <p className="text-muted-foreground text-center mb-6">
        נראה שאתה לא מחובר לאינטרנט כרגע.
        <br />
        בדוק את החיבור שלך ונסה שוב.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
      >
        נסה שוב
      </button>
    </div>
  );
}
