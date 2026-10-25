import type { ReactNode } from 'react';

/** A thin rule with a small diamond, between mishnayot and under chapter headings. */
export function Ornament() {
  return (
    <div aria-hidden="true" className="mx-5 my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-study-ink opacity-40" />
      <span className="size-2 rotate-45 bg-study-ink" />
      <span className="h-px flex-1 bg-study-ink opacity-40" />
    </div>
  );
}

/** Centered text between two rules, such as the end of a chapter or of the day. */
export function PageMark({ children }: { children: ReactNode }) {
  return (
    <div className="mx-5 mt-8 flex items-center gap-3 font-source text-base font-medium text-study-ink">
      <span aria-hidden="true" className="h-px flex-1 bg-study-ink opacity-40" />
      <p>{children}</p>
      <span aria-hidden="true" className="h-px flex-1 bg-study-ink opacity-40" />
    </div>
  );
}
