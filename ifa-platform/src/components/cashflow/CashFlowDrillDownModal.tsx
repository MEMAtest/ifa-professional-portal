// ================================================================
// src/components/cashflow/CashFlowDrillDownModal.tsx
// Drill-down modal for cash flow command center widgets
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
  Search,
  ArrowUpDown,
  Users,
  PoundSterling,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import type { Client } from '@/types/client';

type SortField = 'name' | 'aum' | 'income' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface CashFlowDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  clients: Client[];
  onSelectClient: (clientId: string) => void;
  defaultSort?: SortField;
  highlightLabel?: string;
  showOnboarded?: boolean;
}

export const CashFlowDrillDownModal = ({
  isOpen,
  onClose,
  title,
  description,
  clients,
  onSelectClient,
  defaultSort = 'aum',
  highlightLabel,
  showOnboarded = false
}: CashFlowDrillDownModalProps) => {
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
    let result = clients.filter((client) => {
      const name = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });

    result.sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      const getValue = (client: Client, field: SortField) => {
        if (field === 'name') {
          return `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim();
        }
        if (field === 'aum') {
          return client.financialProfile?.netWorth || 0;
        }
        if (field === 'income') {
          return client.financialProfile?.annualIncome || 0;
        }
        return new Date(client.createdAt || client.updatedAt || 0).getTime();
      };

      const valueA = getValue(a, sortField);
      const valueB = getValue(b, sortField);

      if (sortField === 'name') {
        return multiplier * String(valueA).localeCompare(String(valueB));
      }

      return multiplier * (Number(valueA) - Number(valueB));
    });

    return result;
  }, [clients, searchQuery, sortDirection, sortField]);

  const totalAum = clients.reduce((sum, client) => sum + (client.financialProfile?.netWorth || 0), 0);
  const avgIncome =
    clients.length > 0
      ? clients.reduce((sum, client) => sum + (client.financialProfile?.annualIncome || 0), 0) / clients.length
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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <PoundSterling className="h-4 w-4" />
              {formatCurrency(totalAum)} AUM
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              {formatCurrency(avgIncome)} avg income
            </span>
            {highlightLabel && <Badge variant="outline">{highlightLabel}</Badge>}
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
                {showOnboarded && (
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">
                    <button
                      className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                      onClick={() => handleSort('createdAt')}
                    >
                      Onboarded
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                )}
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
                    onClick={() => handleSort('income')}
                  >
                    Income
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Risk</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={showOnboarded ? 7 : 6} className="py-8 text-center text-gray-500 text-sm">
                    {searchQuery ? 'No clients match your search' : 'No clients found for this segment'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim();
                  const riskLabel = client.riskProfile?.riskTolerance || 'Unrated';
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
                      {showOnboarded && (
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(client.createdAt || client.updatedAt || '').toLocaleDateString('en-GB')}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatCurrency(client.financialProfile?.netWorth || 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {formatCurrency(client.financialProfile?.annualIncome || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{riskLabel}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                            {client.status}
                          </Badge>
                          {client.integrationStatus?.hasAssessment && (
                            <UserCheck className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors inline-flex"
                          onClick={() => {
                            onSelectClient(client.id);
                            onClose();
                          }}
                        >
                          <TrendingUp className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
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
