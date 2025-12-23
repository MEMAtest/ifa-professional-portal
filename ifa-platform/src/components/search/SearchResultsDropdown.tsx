'use client'

import { useRouter } from 'next/navigation'
import { Users, FileText, ClipboardCheck, Loader2, Search, ArrowRight } from 'lucide-react'
import { SearchResultItem } from './SearchResultItem'
import type { SearchResponse, SearchResult } from '@/types/search'

interface SearchResultsDropdownProps {
  results: SearchResponse | null
  loading: boolean
  error: string | null
  query: string
  selectedIndex: number
  onResultClick: (result: SearchResult) => void
  onViewAllClick: () => void
}

interface ResultSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  results: SearchResult[]
  query: string
  selectedIndex: number
  startIndex: number
  onResultClick: (result: SearchResult) => void
}

function ResultSection({
  title,
  icon: Icon,
  results,
  query,
  selectedIndex,
  startIndex,
  onResultClick
}: ResultSectionProps) {
  if (results.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <Icon className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </span>
        <span className="text-xs text-gray-400">({results.length})</span>
      </div>
      <div>
        {results.map((result, index) => (
          <SearchResultItem
            key={result.id}
            result={result}
            query={query}
            isSelected={selectedIndex === startIndex + index}
            onClick={() => onResultClick(result)}
          />
        ))}
      </div>
    </div>
  )
}

export function SearchResultsDropdown({
  results,
  loading,
  error,
  query,
  selectedIndex,
  onResultClick,
  onViewAllClick
}: SearchResultsDropdownProps) {
  // Loading state
  if (loading) {
    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Searching...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden">
        <div className="px-4 py-6 text-center text-red-500">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // No results
  if (results && results.total === 0) {
    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden">
        <div className="px-4 py-8 text-center">
          <Search className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No results found for &ldquo;{query}&rdquo;</p>
          <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
        </div>
      </div>
    )
  }

  // No query yet
  if (!results) {
    return null
  }

  // Calculate start indices for keyboard navigation
  const clientsStartIndex = 0
  const documentsStartIndex = results.clients.length
  const assessmentsStartIndex = documentsStartIndex + results.documents.length

  return (
    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
      {/* Results sections */}
      <ResultSection
        title="Clients"
        icon={Users}
        results={results.clients}
        query={query}
        selectedIndex={selectedIndex}
        startIndex={clientsStartIndex}
        onResultClick={onResultClick}
      />

      <ResultSection
        title="Documents"
        icon={FileText}
        results={results.documents}
        query={query}
        selectedIndex={selectedIndex}
        startIndex={documentsStartIndex}
        onResultClick={onResultClick}
      />

      <ResultSection
        title="Assessments"
        icon={ClipboardCheck}
        results={results.assessments}
        query={query}
        selectedIndex={selectedIndex}
        startIndex={assessmentsStartIndex}
        onResultClick={onResultClick}
      />

      {/* View all footer */}
      {results.total > 0 && (
        <button
          onClick={onViewAllClick}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-blue-600 hover:bg-gray-100 transition-colors"
        >
          <span>View all {results.total} results</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
