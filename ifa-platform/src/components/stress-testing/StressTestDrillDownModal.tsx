// ================================================================
// src/components/stress-testing/StressTestDrillDownModal.tsx
// Drill-down modal for stress testing dashboard widgets
// ================================================================

'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowUpDown,
  Calendar,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import type { Client } from '@/types/client';

type SortField = 'name' | 'resilience' | 'shortfall' | 'lastTest' | 'aum';
type SortDirection = 'asc' | 'desc';

export interface StressTestClientMetrics {
  resilienceScore?: number | null;
  shortfallRisk?: number | null;
  testDate?: string | null;
  severity?: string | null;
  scenarioCount?: number | null;
  categories?: string[];
}

interface StressTestDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  clients: Client[];
  metricsByClient: Record<string, StressTestClientMetrics>;
  onSelectClient: (clientId: string) => void;
  defaultSort?: SortField;
}

const severityStyles: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  mild: { label: 'Mild', variant: 'secondary' },
  moderate: { label: 'Moderate', variant: 'default' },
  severe: { label: 'Severe', variant: 'destructive' }
};

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value)}%`;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Not tested';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not tested';
  return parsed.toLocaleDateString('en-GB');
};

export const StressTestDrillDownModal = ({
  isOpen,
  onClose,
  title,
  description,
  clients,
  metricsByClient,
  onSelectClient,
  defaultSort = 'resilience'
}: StressTestDrillDownModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(defaultSort);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSortField(defaultSort);
      setSortDirection(defaultSort === 'name' ? 'asc' : 'desc');
    }
  }, [isOpen, defaultSort]);

  const filteredClients = useMemo(() => {
    const result = clients.filter((client) => {
      const name = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.toLowerCase();
      const email = client.contactInfo?.email?.toLowerCase() || '';
      return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
    });

    result.sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      const metricsA = metricsByClient[a.id] || {};
      const metricsB = metricsByClient[b.id] || {};

      const getValue = (client: Client, metrics: StressTestClientMetrics, field: SortField) => {
        if (field === 'name') {
          return `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim();
        }
        if (field === 'aum') {
          return client.financialProfile?.netWorth || 0;
        }
        if (field === 'resilience') {
          return metrics.resilienceScore ?? -1;
        }
        if (field === 'shortfall') {
          return metrics.shortfallRisk ?? -1;
        }
        return new Date(metrics.testDate || client.updatedAt || client.createdAt || 0).getTime();
      };

      const valueA = getValue(a, metricsA, sortField);
      const valueB = getValue(b, metricsB, sortField);

      if (sortField === 'name') {
        return multiplier * String(valueA).localeCompare(String(valueB));
      }

      return multiplier * (Number(valueA) - Number(valueB));
    });

    return result;
  }, [clients, searchQuery, sortDirection, sortField, metricsByClient]);

  const metricsList = clients
    .map((client) => metricsByClient[client.id])
    .filter((metrics) => metrics?.resilienceScore !== null && metrics?.resilienceScore !== undefined);

  const averageResilience =
    metricsList.length > 0
      ? metricsList.reduce((sum, metrics) => sum + (metrics.resilienceScore || 0), 0) / metricsList.length
      : 0;

  const averageShortfall =
    metricsList.length > 0
      ? metricsList.reduce((sum, metrics) => sum + (metrics.shortfallRisk || 0), 0) / metricsList.length
      : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection(field === 'name' ? 'asc' : 'desc');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              {Math.round(averageResilience)} avg resilience
            </span>
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              {Math.round(averageShortfall)}% avg shortfall risk
            </span>
          </DialogDescription>
          {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">
                  <button
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    Client
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600">
                  <button
                    className="flex items-center gap-1 ml-auto hover:text-gray-900 transition-colors"
                    onClick={() => handleSort('aum')}
                  >
                    AUM
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600">
                  <button
                    className="flex items-center gap-1 ml-auto hover:text-gray-900 transition-colors"
                    onClick={() => handleSort('resilience')}
                  >
                    Resilience
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600">
                  <button
                    className="flex items-center gap-1 ml-auto hover:text-gray-900 transition-colors"
                    onClick={() => handleSort('shortfall')}
                  >
                    Shortfall
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">
                  <button
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                    onClick={() => handleSort('lastTest')}
                  >
                    Last Test
                    <Calendar className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Severity</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 text-sm">
                    {searchQuery ? 'No clients match your search' : 'No clients available for this segment'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim();
                  const metrics = metricsByClient[client.id] || {};
                  const severityKey = (metrics.severity || '').toLowerCase();
                  const severityStyle = severityStyles[severityKey] || { label: '—', variant: 'secondary' as const };

                  return (
                    <tr key={client.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors text-left"
                          onClick={() => {
                            onSelectClient(client.id);
                            onClose();
                          }}
                        >
                          {clientName || 'Unnamed Client'}
                        </button>
                        <div className="text-xs text-gray-500">{client.contactInfo?.email}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatCurrency(client.financialProfile?.netWorth || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatPercent(metrics.resilienceScore)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {formatPercent(metrics.shortfallRisk)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(metrics.testDate)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={severityStyle.variant}>{severityStyle.label}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors inline-flex"
                          onClick={() => {
                            onSelectClient(client.id);
                            onClose();
                          }}
                        >
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
