'use client'

import React from 'react'
import { Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface FilterOption {
  value: string
  label: string
}

interface FilterConfig {
  id: string
  label: string
  value: string
  options: FilterOption[]
}

interface WorkflowSearchBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  filters?: FilterConfig[]
  onFilterChange?: (id: string, value: string) => void
  viewMode?: 'board' | 'list' | 'table'
  onViewModeChange?: (mode: 'board' | 'list' | 'table') => void
  myItemsOnly?: boolean
  onToggleMyItems?: (value: boolean) => void
}

export default function WorkflowSearchBar({
  searchValue,
  onSearchChange,
  filters = [],
  onFilterChange,
  viewMode,
  onViewModeChange,
  myItemsOnly,
  onToggleMyItems,
}: WorkflowSearchBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="pl-9"
          />
        </div>
        {filters.map((filter) => (
          <select
            key={filter.id}
            value={filter.value}
            onChange={(e) => onFilterChange?.(filter.id, e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}
        {onToggleMyItems && (
          <Button
            variant={myItemsOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggleMyItems(!myItemsOnly)}
          >
            <Filter className="mr-2 h-4 w-4" />
            My Items
          </Button>
        )}
      </div>

      {onViewModeChange && (
        <div className="flex items-center gap-2">
          {(['board', 'list', 'table'] as const).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
