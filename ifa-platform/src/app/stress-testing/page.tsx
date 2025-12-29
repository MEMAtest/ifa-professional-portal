// ================================================================
// src/app/stress-testing/page.tsx
// Dedicated Stress Testing Page
// ================================================================

'use client';

import { Suspense } from 'react';
import StressTestingPage from '@/components/stress-testing/StressTestingPage';

export default function StressTestingRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-16 w-16 text-orange-600 animate-pulse mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-gray-600">Loading Stress Testing...</p>
        </div>
      </div>
    }>
      <StressTestingPage />
    </Suspense>
  );
}
