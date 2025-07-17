// ================================================================
// src/app/cashflow/page.tsx - Complete Cash Flow Page
// Fixed import syntax and provides complete page functionality
// ================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// FIX: Use default import instead of named import
import CashFlowDashboard from '@/components/cashflow/CashFlowDashboard';
import { CashFlowDataService } from '@/services/CashFlowDataService';
import { clientService } from '@/services/ClientService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Client, ClientListResponse } from '@/types/client';
import type { CashFlowScenario } from '@/types/cashflow';

export default function CashFlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams?.get('clientId');

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [scenarios, setScenarios] = useState<CashFlowScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (clientId) {
      loadClientAndScenarios(clientId);
    }
  }, [clientId]);

const loadInitialData = async () => {
  try {
    setIsLoading(true);
    setError(null);

    // Load clients list for selection
    const clientsResponse: ClientListResponse = await clientService.getAllClients(
      { status: ['active'] }, // Remove sortBy: 'name' to fix the 500 error
      1,
      100
    );
    setClients(clientsResponse.clients); // Use clientsResponse here, not response

    // If we have a clientId in URL, load that client
    if (clientId) {
      await loadClientAndScenarios(clientId);
    }

  } catch (err) {
    console.error('Error loading initial data:', err);
    setError(err instanceof Error ? err.message : 'Failed to load data');
  } finally {
    setIsLoading(false);
  }
};

  const loadClientAndScenarios = async (clientId: string) => {
    try {
      // Load selected client
      const client = await clientService.getClientById(clientId);
      setSelectedClient(client);

      // Load scenarios for this client - FIX: Use correct method name
      const clientScenarios = await CashFlowDataService.getScenariosForClient(clientId);
      setScenarios(clientScenarios);

    } catch (err) {
      console.error('Error loading client and scenarios:', err);
      setError(err instanceof Error ? err.message : 'Failed to load client data');
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    // Update URL with selected client
    router.push(`/cashflow?clientId=${client.id}`);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading cash flow system...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.888-.833-2.598 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Cash Flow System</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={loadInitialData} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cash Flow Analysis</h1>
        <p className="text-gray-600">
          Professional cash flow modeling and financial planning for your clients
        </p>
      </div>

      {/* Main Content */}
      {!selectedClient ? (
        // Client Selection View
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select a Client</CardTitle>
              <p className="text-sm text-gray-600">
                Choose a client to begin cash flow analysis and financial planning
              </p>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clients Found</h3>
                  <p className="text-gray-600 mb-4">
                    You need to create clients before you can perform cash flow analysis.
                  </p>
                  <Button onClick={() => router.push('/clients/new')}>
                    Create New Client
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => handleClientSelect(client)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">
                          {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                        </h3>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>
                          📧 {client.contactInfo?.email}
                        </div>
                        {client.financialProfile?.annualIncome && (
                          <div>
                            💰 {formatCurrency(client.financialProfile.annualIncome)} annual income
                          </div>
                        )}
                        {client.financialProfile?.netWorth && (
                          <div>
                            📊 {formatCurrency(client.financialProfile.netWorth)} net worth
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          Click to start cash flow analysis
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats for All Clients */}
          {clients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{clients.length}</div>
                    <div className="text-sm text-gray-600">Total Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {clients.filter(c => c.status === 'active').length}
                    </div>
                    <div className="text-sm text-gray-600">Active Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {scenarios.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Scenarios</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(
                        clients.reduce((sum, client) => 
                          sum + (client.financialProfile?.netWorth || 0), 0
                        )
                      )}
                    </div>
                    <div className="text-sm text-gray-600">Total AUM</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Client Cash Flow Dashboard View
        <div className="space-y-6">
          {/* Client Header with Back Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedClient(null);
                  router.push('/cashflow');
                }}
                className="flex items-center space-x-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Client List</span>
              </Button>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedClient.personalDetails?.firstName} {selectedClient.personalDetails?.lastName}
                </h2>
                <p className="text-gray-600">
                  {selectedClient.contactInfo?.email} • {selectedClient.status}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant={selectedClient.status === 'active' ? 'default' : 'secondary'}>
                {selectedClient.status}
              </Badge>
              {scenarios.length > 0 && (
                <Badge variant="outline">
                  {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {/* Cash Flow Dashboard Component */}
          <CashFlowDashboard clientId={selectedClient.id} />
        </div>
      )}
    </div>
  );
}