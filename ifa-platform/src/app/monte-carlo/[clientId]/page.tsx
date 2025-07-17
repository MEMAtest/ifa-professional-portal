// src/app/monte-carlo/[clientId]/page.tsx
// DEBUG VERSION - Replace your entire file with this

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ClientMonteCarloPage() {
  const router = useRouter();
  const params = useParams();
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  useEffect(() => {
    console.log('=== MONTE CARLO PAGE MOUNTED ===');
    console.log('1. Raw params:', params);
    console.log('2. Params type:', typeof params);
    console.log('3. Params keys:', params ? Object.keys(params) : 'params is null');
    
    // Try different ways to get the clientId
    const clientId1 = params?.clientId;
    const clientId2 = (params as any)?.clientId;
    const clientId3 = params ? (params as Record<string, string>).clientId : null;
    
    console.log('4. clientId attempt 1 (params?.clientId):', clientId1);
    console.log('5. clientId attempt 2 ((params as any)?.clientId):', clientId2);
    console.log('6. clientId attempt 3 (params[clientId]):', clientId3);
    
    // Get the current URL
    console.log('7. Current pathname:', window.location.pathname);
    console.log('8. Current URL:', window.location.href);
    
    // Try to extract clientId from URL manually
    const urlParts = window.location.pathname.split('/');
    const manualClientId = urlParts[urlParts.length - 1];
    console.log('9. Manual extraction from URL:', manualClientId);
    
    setDebugInfo({
      params,
      paramsType: typeof params,
      paramsKeys: params ? Object.keys(params) : [],
      clientId1,
      clientId2,
      clientId3,
      manualClientId,
      pathname: window.location.pathname,
      url: window.location.href
    });
    
    // If we have a clientId, try to fetch
    const finalClientId = clientId1 || clientId2 || clientId3 || manualClientId;
    if (finalClientId && finalClientId !== 'monte-carlo') {
      console.log('10. ATTEMPTING FETCH with clientId:', finalClientId);
      testFetch(finalClientId);
    } else {
      console.log('10. NO VALID CLIENT ID FOUND');
    }
  }, [params]);
  
  const testFetch = async (clientId: string) => {
    try {
      console.log('=== TESTING FETCH ===');
      const url = `/api/clients/${clientId}`;
      console.log('Fetching URL:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      setDebugInfo((prev: any) => ({
        ...prev,
        fetchStatus: response.status,
        fetchOk: response.ok,
        fetchData: data
      }));
    } catch (error) {
      console.error('Fetch error:', error);
      setDebugInfo((prev: any) => ({
        ...prev,
        fetchError: error instanceof Error ? error.message : String(error)
      }));
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Monte Carlo Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          
          <div className="mt-4 space-y-2">
            <Button 
              onClick={() => router.push('/monte-carlo')}
              variant="outline"
            >
              Back to Monte Carlo List
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="ml-2"
            >
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}