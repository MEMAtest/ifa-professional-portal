// src/components/ui/NavigationGuard.tsx
// ===================================================================
// ROUTE PROTECTION COMPONENT
// ===================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Users } from 'lucide-react';

interface NavigationGuardProps {
  children: React.ReactNode;
  requireClient?: boolean;
  redirectTo?: string;
}

export function NavigationGuard({ 
  children, 
  requireClient = true,
  redirectTo = '/clients'
}: NavigationGuardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);
  const [hasClient, setHasClient] = useState(false);
  
  const clientId = searchParams?.get('clientId');
  const prospectId = searchParams?.get('prospectId');
  const isProspect = searchParams?.get('isProspect') === 'true';

  useEffect(() => {
    if (requireClient) {
      const hasValidContext = !!(clientId || (prospectId && isProspect));
      setHasClient(hasValidContext);
      
      if (!hasValidContext) {
        // Show error state instead of immediate redirect
        setIsChecking(false);
      } else {
        setIsChecking(false);
      }
    } else {
      setIsChecking(false);
      setHasClient(true);
    }
  }, [clientId, prospectId, isProspect, requireClient]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (requireClient && !hasClient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Client Selection Required</h2>
            <p className="text-gray-600 mb-6">
              Please select a client before accessing this assessment.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/clients')}
                className="w-full flex items-center justify-center gap-2"
              >
                <Users className="h-4 w-4" />
                Select a Client
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/clients/new')}
                className="w-full"
              >
                Create New Client
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}