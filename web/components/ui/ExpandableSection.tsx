'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function ExpandableSection({
  title,
  children,
  defaultExpanded = false,
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-t border-desert-oasis-muted dark:border-desert-oasis-dark-card mt-6 pt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-desert-oasis-muted hover:text-desert-oasis-accent transition-colors font-explanation"
      >
        <span>{title}</span>
        <span className="text-xl">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <div
          id="deep_dive_content"
          data-testid="deep_dive_content"
          className="mt-4 text-[var(--text-secondary)] font-explanation space-y-4 animate-in fade-in duration-200"
        >
          {children}
        </div>
      )}
    </div>
  );
}
