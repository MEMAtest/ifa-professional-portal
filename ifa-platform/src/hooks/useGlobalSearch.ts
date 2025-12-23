'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchResponse, SearchResult } from '@/types/search'

interface UseGlobalSearchOptions {
  debounceMs?: number
  minQueryLength?: number
  limit?: number
}

export function useGlobalSearch(options: UseGlobalSearchOptions = {}) {
  const { debounceMs = 300, minQueryLength = 2, limit = 5 } = options
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get flat list of all results for keyboard navigation
  const getAllResults = useCallback((): SearchResult[] => {
    if (!results) return []
    return [...results.clients, ...results.documents, ...results.assessments]
  }, [results])

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults(null)
      setLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`,
        {
          signal: abortControllerRef.current.signal,
          credentials: 'include'
        }
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data: SearchResponse = await response.json()
      setResults(data)
      setSelectedIndex(-1)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return // Ignore abort errors
      }
      console.error('Search error:', err)
      setError('Search failed. Please try again.')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [minQueryLength, limit])

  // Debounced search
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (query.length >= minQueryLength) {
      debounceTimeoutRef.current = setTimeout(() => {
        performSearch(query)
      }, debounceMs)
    } else {
      setResults(null)
      setLoading(false)
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [query, debounceMs, minQueryLength, performSearch])

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('')
    setResults(null)
    setError(null)
    setIsOpen(false)
    setSelectedIndex(-1)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // Navigate to result
  const navigateToResult = useCallback((result: SearchResult) => {
    router.push(result.url)
    clearSearch()
  }, [router, clearSearch])

  // Navigate to full search results
  const navigateToFullSearch = useCallback(() => {
    if (query.length >= minQueryLength) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
      clearSearch()
    }
  }, [query, minQueryLength, router, clearSearch])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const allResults = getAllResults()

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < allResults.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : allResults.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < allResults.length) {
          navigateToResult(allResults[selectedIndex])
        } else if (query.length >= minQueryLength) {
          navigateToFullSearch()
        }
        break
      case 'Escape':
        e.preventDefault()
        clearSearch()
        break
    }
  }, [getAllResults, selectedIndex, navigateToResult, query, minQueryLength, navigateToFullSearch, clearSearch])

  // Open dropdown when typing
  useEffect(() => {
    if (query.length >= minQueryLength) {
      setIsOpen(true)
    }
  }, [query, minQueryLength])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
    clearSearch,
    navigateToResult,
    navigateToFullSearch,
    handleKeyDown,
    getAllResults
  }
}
