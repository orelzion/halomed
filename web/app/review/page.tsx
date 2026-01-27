/**
 * Review Page - Tinder-style review session
 */

'use client';

import { Suspense } from 'react';
import { ReviewScreen } from '@/components/screens/ReviewScreen';

function ReviewPageContent() {
  return <ReviewScreen />;
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">טוען...</div>}>
      <ReviewPageContent />
    </Suspense>
  );
}
