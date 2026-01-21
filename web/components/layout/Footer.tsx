'use client';

import Link from 'next/link';

export function Footer() {
  const handleDoNotSell = () => {
    // Trigger the consent settings modal
    window.dispatchEvent(new CustomEvent('open-consent-settings'));
  };

  return (
    <footer className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card border-t border-desert-oasis-accent/10 py-6 mt-auto">
      <div className="max-w-4xl mx-auto px-4">
        <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
          <Link href="/privacy" className="hover:text-desert-oasis-accent transition-colors">
            מדיניות פרטיות
          </Link>
          <Link href="/cookies" className="hover:text-desert-oasis-accent transition-colors">
            מדיניות עוגיות
          </Link>
          <Link href="/accessibility" className="hover:text-desert-oasis-accent transition-colors">
            הצהרת נגישות
          </Link>
          <Link href="/credits" className="hover:text-desert-oasis-accent transition-colors">
            קרדיטים
          </Link>
          <button
            onClick={handleDoNotSell}
            className="hover:text-desert-oasis-accent transition-colors"
            aria-label="אל תמכור/שתף את המידע שלי"
          >
            אל תמכור/שתף את המידע שלי
          </button>
        </nav>
        <p className="text-center text-xs text-[var(--text-secondary)] opacity-60 mt-4">
          © {new Date().getFullYear()} הלומד. כל הזכויות שמורות.
        </p>
      </div>
    </footer>
  );
}
