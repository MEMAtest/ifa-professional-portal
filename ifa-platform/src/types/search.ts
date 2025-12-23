// =====================================================
// GLOBAL SEARCH TYPES
// =====================================================

export type SearchEntityType = 'client' | 'document' | 'assessment'

export interface SearchResult {
  id: string
  type: SearchEntityType
  title: string
  subtitle?: string
  url: string
  metadata?: Record<string, unknown>
}

export interface SearchResponse {
  clients: SearchResult[]
  documents: SearchResult[]
  assessments: SearchResult[]
  total: number
  query: string
}

// For paginated full search results
export interface FullSearchResponse {
  results: SearchResult[]
  total: number
  page: number
  limit: number
  query: string
  type?: SearchEntityType | 'all'
}
