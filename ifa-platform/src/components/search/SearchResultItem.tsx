'use client'

import Link from 'next/link'
import { Users, FileText, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchResult, SearchEntityType } from '@/types/search'

const ICONS: Record<SearchEntityType, React.ComponentType<{ className?: string }>> = {
  client: Users,
  document: FileText,
  assessment: ClipboardCheck
}

const TYPE_LABELS: Record<SearchEntityType, string> = {
  client: 'Client',
  document: 'Document',
  assessment: 'Assessment'
}

const TYPE_COLORS: Record<SearchEntityType, string> = {
  client: 'bg-blue-100 text-blue-600',
  document: 'bg-green-100 text-green-600',
  assessment: 'bg-purple-100 text-purple-600'
}

interface SearchResultItemProps {
  result: SearchResult
  isSelected?: boolean
  onClick?: () => void
  query?: string
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export function SearchResultItem({
  result,
  isSelected = false,
  onClick,
  query = ''
}: SearchResultItemProps) {
  const Icon = ICONS[result.type]

  return (
    <Link
      href={result.url}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors',
        isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        TYPE_COLORS[result.type]
      )}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {highlightMatch(result.title, query)}
        </p>
        {result.subtitle && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {highlightMatch(result.subtitle, query)}
          </p>
        )}
      </div>

      {/* Type badge */}
      <span className="text-xs text-gray-400 shrink-0">
        {TYPE_LABELS[result.type]}
      </span>
    </Link>
  )
}
