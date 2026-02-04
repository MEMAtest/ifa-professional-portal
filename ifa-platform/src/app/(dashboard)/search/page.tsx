'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Users, FileText, ClipboardCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchResultItem } from '@/components/search/SearchResultItem'
import type { SearchResponse, SearchResult, SearchEntityType } from '@/types/search'
import clientLogger from '@/lib/logging/clientLogger'

type FilterType = 'all' | SearchEntityType

function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialQuery = searchParams.get('q') || ''
  const initialType = (searchParams.get('type') as FilterType) || 'all'

  const [query, setQuery] = useState(initialQuery)
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialType)
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=50`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data: SearchResponse = await response.json()
      setResults(data)
    } catch (err) {
      clientLogger.error('Search error:', err)
      setError('Failed to load search results. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Search on mount and when query changes
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [initialQuery, performSearch])

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(query)}&type=${activeFilter}`)
      performSearch(query)
    }
  }

  // Handle filter change
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter)
    router.push(`/search?q=${encodeURIComponent(query)}&type=${filter}`)
  }

  // Get filtered results
  const getFilteredResults = (): SearchResult[] => {
    if (!results) return []

    switch (activeFilter) {
      case 'client':
        return results.clients
      case 'document':
        return results.documents
      case 'assessment':
        return results.assessments
      default:
        return [...results.clients, ...results.documents, ...results.assessments]
    }
  }

  // Get counts for tabs
  const getCounts = () => ({
    all: results ? results.total : 0,
    client: results?.clients.length || 0,
    document: results?.documents.length || 0,
    assessment: results?.assessments.length || 0
  })

  const counts = getCounts()
  const filteredResults = getFilteredResults()

  const filters: { id: FilterType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all', label: 'All', icon: Search },
    { id: 'client', label: 'Clients', icon: Users },
    { id: 'document', label: 'Documents', icon: FileText },
    { id: 'assessment', label: 'Assessments', icon: ClipboardCheck }
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
        {results && (
          <p className="text-gray-500 mt-1">
            {results.total} result{results.total !== 1 ? 's' : ''} for &ldquo;{results.query}&rdquo;
          </p>
        )}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search clients, documents, assessments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-plannetic-primary focus:border-transparent"
          />
        </div>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleFilterChange(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              activeFilter === id
                ? 'bg-plannetic-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs',
              activeFilter === id ? 'bg-white/20' : 'bg-gray-200'
            )}>
              {counts[id]}
            </span>
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">Searching...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => performSearch(query)}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              Try again
            </button>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            {initialQuery ? (
              <>
                <p className="text-gray-500 text-lg">No results found</p>
                <p className="text-gray-400 text-sm mt-1">
                  Try different keywords or check your spelling
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-lg">Start searching</p>
                <p className="text-gray-400 text-sm mt-1">
                  Enter at least 2 characters to search
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredResults.map((result) => (
              <SearchResultItem
                key={`${result.type}-${result.id}`}
                result={result}
                query={results?.query || ''}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
