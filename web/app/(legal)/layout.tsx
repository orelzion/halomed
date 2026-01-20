import { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex',
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
