'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { X, Filter, RotateCcw } from 'lucide-react';
import type { ClientFilters, ClientStatus } from '@/types/client';

export interface FilterPanelProps {
  filters: ClientFilters;
  onChange: (newFilters: ClientFilters) => void;
  onClear?: () => void;
  advisors?: Array<{
    id: string;
    name: string;
  }>;
}

// Production-ready status options matching database constraint
const STATUS_OPTIONS: Array<{
  value: ClientStatus;
  label: string;
  color: string;
}> = [
  { value: 'prospect', label: 'Prospect', color: 'bg-blue-100 text-blue-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'review_due', label: 'Review Due', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  { value: 'archived', label: 'Archived', color: 'bg-red-100 text-red-800' }
];

const RISK_LEVELS = [
  'Conservative',
  'Moderate',
  'Balanced',
  'Growth',
  'Aggressive'
] as const;

const VULNERABILITY_OPTIONS = [
  { value: 'all', label: 'All Clients' },
  { value: 'vulnerable', label: 'Vulnerable Only' },
  { value: 'not_vulnerable', label: 'Not Vulnerable' }
] as const;

export default function FilterPanel({ filters, onChange, onClear, advisors = [] }: FilterPanelProps) {
  const handleStatusChange = (status: ClientStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    
    onChange({
      ...filters,
      status: newStatuses
    });
  };

  const handleRiskLevelChange = (riskLevel: string) => {
    const currentRiskLevels = filters.riskLevel || [];
    const newRiskLevels = currentRiskLevels.includes(riskLevel)
      ? currentRiskLevels.filter((r) => r !== riskLevel)
      : [...currentRiskLevels, riskLevel];
    
    onChange({
      ...filters,
      riskLevel: newRiskLevels
    });
  };

  const handleVulnerabilityChange = (vulnerabilityStatus: 'vulnerable' | 'not_vulnerable' | 'all') => {
    onChange({
      ...filters,
      vulnerabilityStatus: vulnerabilityStatus
    });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    onChange({
      ...filters,
      dateRange: {
        start: field === 'start' ? value : filters.dateRange?.start || '',
        end: field === 'end' ? value : filters.dateRange?.end || ''
      }
    });
  };

  const handleSortChange = (sortBy: ClientFilters['sortBy']) => {
    onChange({
      ...filters,
      sortBy
    });
  };

  const handleSortOrderChange = (sortOrder: 'asc' | 'desc') => {
    onChange({
      ...filters,
      sortOrder
    });
  };

  const handleAdvisorChange = (advisorId: string) => {
    onChange({
      ...filters,
      advisorId: advisorId || undefined
    });
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.riskLevel && filters.riskLevel.length > 0) count++;
    if (filters.vulnerabilityStatus && filters.vulnerabilityStatus !== 'all') count++;
    if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) count++;
    if (filters.advisorId) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          {onClear && activeFilterCount > 0 && (
            <Button
              onClick={onClear}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Clear</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Filter */}
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-3">Status</h4>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status.value}
                onClick={() => handleStatusChange(status.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filters.status?.includes(status.value)
                    ? `${status.color} border-transparent`
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Level Filter */}
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-3">Risk Level</h4>
          <div className="flex flex-wrap gap-2">
            {RISK_LEVELS.map((risk) => (
              <button
                key={risk}
                onClick={() => handleRiskLevelChange(risk)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filters.riskLevel?.includes(risk)
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>

        {/* Vulnerability Filter */}
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-3">Vulnerability Status</h4>
          <div className="space-y-2">
            {VULNERABILITY_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="vulnerability"
                  value={option.value}
                  checked={filters.vulnerabilityStatus === option.value || (!filters.vulnerabilityStatus && option.value === 'all')}
                  onChange={() => handleVulnerabilityChange(option.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-3">Date Range</h4>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Sorting */}
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-3">Sort By</h4>
          <div className="space-y-2">
            <select
              value={filters.sortBy || 'created_at'}
              onChange={(e) => handleSortChange(e.target.value as ClientFilters['sortBy'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Name</option>
              <option value="created_at">Date Created</option>
              <option value="updated_at">Last Updated</option>
              <option value="status">Status</option>
            </select>
            <div className="flex space-x-2">
              <button
                onClick={() => handleSortOrderChange('asc')}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                  filters.sortOrder === 'asc'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Ascending
              </button>
              <button
                onClick={() => handleSortOrderChange('desc')}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                  filters.sortOrder === 'desc' || !filters.sortOrder
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Descending
              </button>
            </div>
          </div>
        </div>

        {/* Advisor Filter */}
        {advisors.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-3">Advisor</h4>
            <select
              value={filters.advisorId || ''}
              onChange={(e) => handleAdvisorChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Advisors</option>
              {advisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}