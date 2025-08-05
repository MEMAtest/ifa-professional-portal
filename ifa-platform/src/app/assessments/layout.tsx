// src/app/assessments/layout.tsx
// ===================================================================
// CONTAINED ASSESSMENT NAVIGATION LAYOUT
// ===================================================================

'use client';

import { useClientContext } from '@/hooks/useClientContext';
import { Badge } from '@/components/ui/Badge';
import { AlertCircle } from 'lucide-react';

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { client, isProspect } = useClientContext();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Assessment Context Bar */}
      {client && (
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Assessment for:</span>
              <span className="font-medium">
                {client.personalDetails?.firstName} {client.personalDetails?.lastName}
              </span>
              {isProspect && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Prospect Mode
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Client Ref: {client.clientRef || 'N/A'}
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}