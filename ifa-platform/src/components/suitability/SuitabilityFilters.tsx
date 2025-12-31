// components/suitability/SuitabilityFilters.tsx
'use client'
import { Search, Filter, BarChart3, Users } from 'lucide-react'

interface SuitabilityFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  clientCount: number
}

export default function SuitabilityFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  clientCount
}: SuitabilityFiltersProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients, references, or occupations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center space-x-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="review_needed">Review Needed</option>
            <option value="draft">Draft</option>
            <option value="not_started">Not Started</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
          >
            <option value="name">Sort by Name</option>
            <option value="value">Sort by Value</option>
            <option value="risk">Sort by Risk</option>
            <option value="performance">Sort by Performance</option>
            <option value="priority">Sort by Priority</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`px-3 py-2 rounded-lg transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-600'
              }`}
              title="Grid View"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`px-3 py-2 rounded-lg transition-all ${
                viewMode === 'list' 
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-600'
              }`}
              title="List View"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {searchTerm && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Showing {clientCount} result{clientCount !== 1 ? 's' : ''} for &quot;{searchTerm}&quot;
          </p>
        </div>
      )}
    </div>
  )
}
