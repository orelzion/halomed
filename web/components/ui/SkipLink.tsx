'use client';

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-50 focus:bg-desert-oasis-accent focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
    >
      דלג לתוכן הראשי
    </a>
  );
}
