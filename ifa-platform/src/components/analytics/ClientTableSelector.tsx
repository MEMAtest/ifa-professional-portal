'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Users,
  Eye,
  ChevronDown
} from 'lucide-react'
import type { ClientImpact } from './ClientImpactHeatMap'

interface ClientTableSelectorProps {
  clients: ClientImpact[]
  onClientSelect: (clientId: string) => void
  selectedClientId?: string | null
  impactType?: 'rate' | 'inflation' | 'equity'
}

type SortField = 'name' | 'aum' | 'riskProfile' | 'impact'
type SortDirection = 'asc' | 'desc'
type ImpactFilter = 'all' | 'high' | 'medium' | 'low'

const riskProfileLabels: Record<number, string> = {
  1: 'Cautious',
  2: 'Conservative',
  3: 'Balanced',
  4: 'Growth',
  5: 'Aggressive'
}

const impactColors = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-green-100 text-green-700 border-green-200'
}

export function ClientTableSelector({
  clients,
  onClientSelect,
  selectedClientId,
  impactType = 'rate'
}: ClientTableSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('impact')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Get impact level for a client based on type
  const getImpactLevel = useCallback((client: ClientImpact): 'high' | 'medium' | 'low' => {
    switch (impactType) {
      case 'rate':
        return client.rateImpact
      case 'inflation':
        return client.inflationImpact
      case 'equity':
        return client.equityImpact
    }
  }, [impactType])

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(client =>
        client.clientName.toLowerCase().includes(term)
      )
    }

    // Apply impact filter
    if (impactFilter !== 'all') {
      result = result.filter(client => getImpactLevel(client) === impactFilter)
    }

    // Apply sorting
    const impactPriority = { high: 0, medium: 1, low: 2 }

    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.clientName.localeCompare(b.clientName)
          break
        case 'aum':
          comparison = a.aum - b.aum
          break
        case 'riskProfile':
          comparison = a.riskProfile - b.riskProfile
          break
        case 'impact':
          comparison = impactPriority[getImpactLevel(a)] - impactPriority[getImpactLevel(b)]
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [clients, searchTerm, impactFilter, sortField, sortDirection, getImpactLevel])

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Get sort icon for column
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-gray-400" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 text-blue-600" />
      : <ArrowDown className="h-3 w-3 text-blue-600" />
  }

  // Impact filter counts
  const filterCounts = useMemo(() => {
    return {
      all: clients.length,
      high: clients.filter(c => getImpactLevel(c) === 'high').length,
      medium: clients.filter(c => getImpactLevel(c) === 'medium').length,
      low: clients.filter(c => getImpactLevel(c) === 'low').length
    }
  }, [clients, getImpactLevel])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-blue-600" />
          Select Client for Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Impact Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4 text-gray-500" />
              <span>
                {impactFilter === 'all' ? 'All Impact Levels' : `${impactFilter.charAt(0).toUpperCase() + impactFilter.slice(1)} Impact`}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {showFilters && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                {(['all', 'high', 'medium', 'low'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => {
                      setImpactFilter(filter)
                      setShowFilters(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex items-center justify-between ${
                      impactFilter === filter ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    <span className="capitalize">
                      {filter === 'all' ? 'All Impact Levels' : `${filter} Impact`}
                    </span>
                    <span className="text-xs text-gray-500">({filterCounts[filter]})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th
                  onClick={() => handleSort('name')}
                  className="text-left py-3 px-4 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    Client
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('aum')}
                  className="text-left py-3 px-4 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    AUM
                    {getSortIcon('aum')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('riskProfile')}
                  className="text-left py-3 px-4 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    Risk Profile
                    {getSortIcon('riskProfile')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('impact')}
                  className="text-left py-3 px-4 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    Impact
                    {getSortIcon('impact')}
                  </div>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedClients.map(client => {
                const impactLevel = getImpactLevel(client)
                const isSelected = selectedClientId === client.clientId

                return (
                  <tr
                    key={client.clientId}
                    onClick={() => onClientSelect(client.clientId)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                          impactLevel === 'high' ? 'bg-red-100 text-red-700' :
                          impactLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {client.initials}
                        </div>
                        <span className="font-medium text-gray-900">{client.clientName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatCurrency(client.aum)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                        {riskProfileLabels[client.riskProfile] || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border capitalize ${impactColors[impactLevel]}`}>
                        {impactLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onClientSelect(client.clientId)
                        }}
                        className="h-8 px-3"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                )
              })}

              {filteredAndSortedClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    {searchTerm || impactFilter !== 'all'
                      ? 'No clients match your filters'
                      : 'No clients available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Results Summary */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {filteredAndSortedClients.length} of {clients.length} clients
          </span>
          {(searchTerm || impactFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setImpactFilter('all')
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ClientTableSelector
