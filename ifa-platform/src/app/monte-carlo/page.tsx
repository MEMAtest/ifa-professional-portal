// ===================================================================
// src/app/monte-carlo/page.tsx - Monte Carlo Client Selection
// ===================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { clientService } from '@/services/ClientService';
import { supabase } from '@/lib/supabase';
import { 
  LineChart, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  ChevronRight,
  AlertCircle,
  Users,
  BarChart3
} from 'lucide-react';
import type { Client, ClientListResponse } from '@/types/client';

interface MonteCarloCount {
  client_id: string;
  count: number;
}

export default function MonteCarloPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [monteCarloCount, setMonteCarloCount] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchQuery, clients]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load clients
      const clientsResponse: ClientListResponse = await clientService.getAllClients(
  { status: ['active'], sortBy: 'name', sortOrder: 'asc' },  // Changed to array
  1,
  100
);
      setClients(clientsResponse.clients);

      // Load Monte Carlo counts
      const { data: counts, error: countError } = await supabase
        .from('monte_carlo_results')
        .select('client_id')
        .not('client_id', 'is', null);

      if (!countError && counts) {
        const countMap: Record<string, number> = {};
        counts.forEach((record: any) => {
          countMap[record.client_id] = (countMap[record.client_id] || 0) + 1;
        });
        setMonteCarloCount(countMap);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(client => {
      const fullName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.toLowerCase();
      const email = client.contactInfo?.email?.toLowerCase() || '';
      const ref = client.clientRef?.toLowerCase() || '';
      
      return fullName.includes(query) || email.includes(query) || ref.includes(query);
    });

    setFilteredClients(filtered);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateRetirementYears = (client: Client): number => {
    if (!client.personalDetails?.dateOfBirth) return 30; // Default
    const birthDate = new Date(client.personalDetails.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const retirementAge = 65;
    return Math.max(retirementAge - age, 0);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading clients...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadData}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <LineChart className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Monte Carlo Analysis</h1>
        </div>
        <p className="text-gray-600">
          Run sophisticated probability simulations to assess portfolio sustainability and success rates
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Clients</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">With Simulations</p>
                <p className="text-2xl font-bold">
                  {Object.keys(monteCarloCount).length}
                </p>
              </div>
              <LineChart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Simulations</p>
                <p className="text-2xl font-bold">
                  {Object.values(monteCarloCount).reduce((sum, count) => sum + count, 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. per Client</p>
                <p className="text-2xl font-bold">
                  {Object.keys(monteCarloCount).length > 0
                    ? (Object.values(monteCarloCount).reduce((sum, count) => sum + count, 0) / Object.keys(monteCarloCount).length).toFixed(1)
                    : '0'}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search clients by name, email, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      <Card>
        <CardHeader>
          <CardTitle>Select Client for Monte Carlo Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No clients found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => {
                const yearsToRetirement = calculateRetirementYears(client);
                const simulationCount = monteCarloCount[client.id] || 0;

                return (
                  <div
                    key={client.id}
                    className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/monte-carlo/${client.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                          </h3>
                          <Badge variant="secondary" className="ml-3">
                            {client.status}
                          </Badge>
                          {simulationCount > 0 && (
                            <Badge variant="default" className="ml-2">
                              {simulationCount} simulation{simulationCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span>Net Worth: {formatCurrency(client.financialProfile?.netWorth || 0)}</span>
                          </div>
                          <div className="flex items-center">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            <span>Risk Score: {client.riskProfile?.attitudeToRisk || 'N/A'}/10</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Years to 65: {yearsToRetirement}</span>
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span>Annual Income: {formatCurrency(client.financialProfile?.annualIncome || 0)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-gray-400 ml-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}