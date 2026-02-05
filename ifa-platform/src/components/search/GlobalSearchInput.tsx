'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Search, X, Command } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { SearchResultsDropdown } from './SearchResultsDropdown'
import { usePathname } from 'next/navigation'

interface GlobalSearchInputProps {
  className?: string
}

export function GlobalSearchInput({ className }: GlobalSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  const {
    query,
    setQuery,
    results,
    loading,
    error,
    isOpen,
    setIsOpen,
    selectedIndex,
    clearSearch,
    navigateToResult,
    navigateToFullSearch,
    handleKeyDown
  } = useGlobalSearch()

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [setIsOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setIsOpen])

  // Close and blur search on route changes to prevent stray input capture
  useEffect(() => {
    setIsOpen(false)
    if (document.activeElement === inputRef.current) {
      inputRef.current?.blur()
    }
  }, [pathname, setIsOpen])

  const handleFocus = useCallback(() => {
    if (query.length >= 2) {
      setIsOpen(true)
    }
  }, [query, setIsOpen])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }, [setQuery])

  const handleClear = useCallback(() => {
    clearSearch()
    inputRef.current?.focus()
  }, [clearSearch])

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        {/* Search icon */}
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          name="global-search"
          placeholder="Search... (⌘K)"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
          className={cn(
            'w-full pl-10 pr-20 py-2 border border-gray-300 rounded-md',
            'focus:ring-2 focus:ring-plannetic-primary focus:border-transparent',
            'placeholder:text-gray-400 text-sm'
          )}
        />

        {/* Clear button and keyboard hint */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              type="button"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!query && (
            <div className="hidden sm:flex items-center gap-1 text-gray-400">
              <kbd className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 border border-gray-200 rounded">
                <Command className="h-3 w-3 inline" />
              </kbd>
              <kbd className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 border border-gray-200 rounded">
                K
              </kbd>
            </div>
          )}
        </div>
      </div>

      {/* Results dropdown */}
      {isOpen && (query.length >= 2 || loading) && (
        <SearchResultsDropdown
          results={results}
          loading={loading}
          error={error}
          query={query}
          selectedIndex={selectedIndex}
          onResultClick={navigateToResult}
          onViewAllClick={navigateToFullSearch}
        />
      )}
    </div>
  )
}
