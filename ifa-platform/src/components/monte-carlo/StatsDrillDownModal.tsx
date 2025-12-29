// ================================================================
// src/components/monte-carlo/StatsDrillDownModal.tsx
// Drill-down modal for dashboard stat cards
// Shows filtered list of scenarios/clients when a stat card is clicked
// ================================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Search,
  X,
  ChevronRight,
  Activity,
  Users,
  TrendingUp,
  Calendar,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  User
} from 'lucide-react';
import { StatType, StatClickData } from './DashboardStats';

interface StatsDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StatClickData | null;
  onSelectClient: (clientId: string, scenarioId?: string) => void;
  clientNames: Map<string, string>;
}

// Get icon for stat type
const getStatIcon = (statType: StatType) => {
  const icons: Record<StatType, React.ReactNode> = {
    total_simulations: <Activity className="h-5 w-5 text-blue-600" />,
    clients_analyzed: <Users className="h-5 w-5 text-green-600" />,
    avg_success_rate: <TrendingUp className="h-5 w-5 text-purple-600" />,
    last_assessment: <Calendar className="h-5 w-5 text-purple-600" />,
    this_month: <BarChart3 className="h-5 w-5 text-indigo-600" />,
    scenarios_created: <Target className="h-5 w-5 text-cyan-600" />,
    high_risk: <AlertTriangle className="h-5 w-5 text-red-600" />,
    safe_scenarios: <CheckCircle className="h-5 w-5 text-green-600" />,
    avg_time_horizon: <Clock className="h-5 w-5 text-blue-600" />,
  };
  return icons[statType] || <Activity className="h-5 w-5" />;
};

// Format currency
const formatCurrency = (value: number) => {
  if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `£${(value / 1000).toFixed(0)}K`;
  return `£${value.toLocaleString()}`;
};

// Format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const StatsDrillDownModal: React.FC<StatsDrillDownModalProps> = ({
  isOpen,
  onClose,
  data,
  onSelectClient,
  clientNames
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Get filtered items based on stat type
  const filteredItems = useMemo(() => {
    if (!data) return [];

    const { statType, scenarios, results } = data;

    // Build scenario-result map for quick lookup
    const resultMap = new Map<string, any>();
    results.forEach(r => {
      resultMap.set(r.scenario_id, r);
    });

    // Filter scenarios based on stat type
    let filtered = scenarios.map(scenario => {
      const result = resultMap.get(scenario.id);
      return {
        ...scenario,
        result,
        clientName: clientNames.get(scenario.client_id) || 'Unknown Client',
        successRate: result?.success_probability ?? null,
      };
    });

    // Apply stat-specific filtering
    switch (statType) {
      case 'high_risk':
        filtered = filtered.filter(s => s.successRate !== null && s.successRate < 50);
        break;
      case 'safe_scenarios':
        filtered = filtered.filter(s => s.successRate !== null && s.successRate >= 85);
        break;
      case 'this_month':
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        filtered = filtered.filter(s => {
          const resultDate = s.result?.created_at ? new Date(s.result.created_at) : null;
          return resultDate && resultDate >= monthStart;
        });
        break;
      case 'clients_analyzed':
        // Return unique clients instead of scenarios
        const uniqueClients = new Map<string, any>();
        filtered.forEach(s => {
          if (!uniqueClients.has(s.client_id)) {
            uniqueClients.set(s.client_id, {
              id: s.client_id,
              clientName: s.clientName,
              scenarioCount: 1,
              latestScenario: s,
            });
          } else {
            const existing = uniqueClients.get(s.client_id)!;
            existing.scenarioCount++;
            if (s.result?.created_at > existing.latestScenario?.result?.created_at) {
              existing.latestScenario = s;
            }
          }
        });
        return Array.from(uniqueClients.values())
          .filter(c => c.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
          .sort((a, b) => b.scenarioCount - a.scenarioCount);
      default:
        // All scenarios
        break;
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.clientName.toLowerCase().includes(search) ||
        (s.scenario_name || '').toLowerCase().includes(search)
      );
    }

    // Sort by created date (most recent first)
    return filtered.sort((a, b) => {
      const dateA = a.result?.created_at || a.created_at || '';
      const dateB = b.result?.created_at || b.created_at || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [data, searchTerm, clientNames]);

  if (!data) return null;

  const isClientView = data.statType === 'clients_analyzed';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {getStatIcon(data.statType)}
            <span>{data.title}</span>
            <span className="text-gray-400 font-normal">({filteredItems.length})</span>
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={isClientView ? "Search clients..." : "Search scenarios..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 max-h-[50vh]">
          <div className="space-y-2 py-2">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No items found</p>
                {searchTerm && (
                  <p className="text-sm mt-1">Try adjusting your search</p>
                )}
              </div>
            ) : isClientView ? (
              // Client view
              filteredItems.map((client: any) => (
                <div
                  key={client.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => onSelectClient(client.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {client.clientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{client.clientName}</p>
                        <p className="text-sm text-gray-500">
                          {client.scenarioCount} scenario{client.scenarioCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                  </div>
                </div>
              ))
            ) : (
              // Scenario view
              filteredItems.map((scenario: any) => (
                <div
                  key={scenario.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => onSelectClient(scenario.client_id, scenario.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{scenario.clientName}</span>
                        {scenario.scenario_name && (
                          <>
                            <span className="text-gray-400">-</span>
                            <span className="text-gray-600">{scenario.scenario_name}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {scenario.successRate !== null && (
                          <span className={`font-medium ${
                            scenario.successRate >= 85 ? 'text-green-600' :
                            scenario.successRate >= 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {scenario.successRate.toFixed(1)}% success
                          </span>
                        )}
                        {scenario.initial_portfolio && (
                          <span>{formatCurrency(scenario.initial_portfolio)}</span>
                        )}
                        {scenario.time_horizon && (
                          <span>{scenario.time_horizon} years</span>
                        )}
                        {scenario.result?.created_at && (
                          <span>{formatDate(scenario.result.created_at)}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatsDrillDownModal;
