'use client';

import { Children, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';

export type MishnaTextSize = 'full' | 'folded' | 'preview' | 'pinned';

interface MishnaTextProps {
  /** The mishna as Markdown (source_text_he). */
  source: string;
  size: MishnaTextSize;
  id?: string;
}

const SIZE_CLASSES: Record<MishnaTextSize, string> = {
  full: 'text-[1.5625rem] leading-[1.9] text-[var(--text-primary)]',
  folded: 'line-clamp-3 text-[1.375rem] leading-[1.75] text-[var(--text-secondary)]',
  preview: 'line-clamp-2 text-[1.375rem] leading-[1.75] text-[var(--text-primary)]',
  pinned: 'text-[1.3125rem] leading-[1.7] text-[var(--text-primary)]',
};

/** Sets the first word of a paragraph larger, as printed editions do. */
function withEnlargedFirstWord(children: ReactNode): ReactNode {
  const nodes = Children.toArray(children);
  const first = nodes[0];
  if (typeof first !== 'string') return children;

  const match = first.match(/^(\s*)(\S+)([\s\S]*)$/u);
  if (!match) return children;

  return (
    <>
      {match[1]}
      <span className="text-[1.36em] font-bold leading-none">{match[2]}</span>
      {match[3]}
      {nodes.slice(1)}
    </>
  );
}

function createComponents(enlargeFirstWord: boolean): Components {
  return {
    p: ({ node, children }) => (
      <p className="mb-3 last:mb-0">
        {enlargeFirstWord && node?.position?.start.line === 1 ? withEnlargedFirstWord(children) : children}
      </p>
    ),
    strong: ({ children }) => <strong className="font-bold text-study-ink">{children}</strong>,
    hr: () => <hr className="my-4 border-t border-study-ink opacity-40" />,
  };
}

const ENLARGED_COMPONENTS = createComponents(true);
const PLAIN_COMPONENTS = createComponents(false);

/** The text of a mishna in large serif type, justified. */
export function MishnaText({ source, size, id }: MishnaTextProps) {
  return (
    <div
      id={id}
      data-testid={id}
      className={`font-source font-medium text-justify [text-align-last:start] text-pretty ${SIZE_CLASSES[size]}`}
    >
      <ReactMarkdown components={size === 'pinned' ? PLAIN_COMPONENTS : ENLARGED_COMPONENTS}>{source}</ReactMarkdown>
    </div>
  );
}
