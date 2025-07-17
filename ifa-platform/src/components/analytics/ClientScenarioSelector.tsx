'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Users, Plus, TrendingUp } from 'lucide-react';
import { CashFlowScenarioService } from '@/services/CashFlowScenarioService';
import type { ClientOption, CashFlowScenario } from '@/types/cash-flow-scenario';

interface ClientScenarioSelectorProps {
  onClientSelect: (clientId: string) => void;
  onScenarioSelect: (scenario: CashFlowScenario) => void;
  selectedClientId?: string;
  selectedScenarioId?: string;
}

export function ClientScenarioSelector({
  onClientSelect,
  onScenarioSelect,
  selectedClientId,
  selectedScenarioId
}: ClientScenarioSelectorProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [scenarios, setScenarios] = useState<CashFlowScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [scenariosLoading, setScenariosLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadClientScenarios(selectedClientId);
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await CashFlowScenarioService.getClientsWithScenarios();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientScenarios = async (clientId: string) => {
    try {
      setScenariosLoading(true);
      const scenariosData = await CashFlowScenarioService.getClientScenarios(clientId);
      
      // If no scenarios exist, ensure client has a default scenario
      if (scenariosData.length === 0) {
        const defaultScenario = await CashFlowScenarioService.ensureClientHasScenario(clientId);
        setScenarios([defaultScenario]);
        onScenarioSelect(defaultScenario);
      } else {
        setScenarios(scenariosData);
        // Auto-select first scenario if none selected
        if (!selectedScenarioId) {
          onScenarioSelect(scenariosData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setScenariosLoading(false);
    }
  };

  const handleCreateScenario = async () => {
    if (!selectedClientId) return;
    
    try {
      const newScenario = await CashFlowScenarioService.createBasicScenario(selectedClientId, {
        scenario_name: `New Scenario ${scenarios.length + 1}`,
        scenario_type: 'base'
      });
      
      setScenarios(prev => [newScenario, ...prev]);
      onScenarioSelect(newScenario);
    } catch (error) {
      console.error('Error creating scenario:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => onClientSelect(client.id)}
                className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                  selectedClientId === client.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-gray-600 flex items-center justify-between mt-1">
                  {client.age && <span>Age {client.age}</span>}
                  <Badge variant="outline" className="text-xs">
                    {client.scenarioCount} scenario{client.scenarioCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scenario Selection */}
      {selectedClientId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Cash Flow Scenarios
              </CardTitle>
              <Button onClick={handleCreateScenario} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Scenario
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {scenariosLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => onScenarioSelect(scenario)}
                    className={`w-full p-3 rounded-lg border text-left transition-all duration-200 ${
                      selectedScenarioId === scenario.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{scenario.scenario_name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {scenario.scenario_type.charAt(0).toUpperCase() + scenario.scenario_type.slice(1)} Case
                          • Age {scenario.client_age} → {scenario.retirement_age}
                          • {scenario.projection_years} years
                        </div>
                      </div>
                      <Badge 
                        variant={scenario.scenario_type === 'base' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {scenario.scenario_type}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}