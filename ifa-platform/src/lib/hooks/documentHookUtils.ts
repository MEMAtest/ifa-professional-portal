import type { DocumentCategory, DocumentFilters, DocumentListParams } from '@/types/document'

export function buildDocumentSearchParams(params?: DocumentListParams, filters?: DocumentFilters): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (params?.page) searchParams.append('page', params.page.toString())
  if (params?.limit) searchParams.append('limit', params.limit.toString())
  if (params?.category_id) searchParams.append('category_id', params.category_id)
  if (params?.client_id) searchParams.append('client_id', params.client_id)
  if (params?.status) searchParams.append('status', params.status)
  if (params?.compliance_status) searchParams.append('compliance_status', params.compliance_status)
  if (params?.search) searchParams.append('search', params.search)
  if (params?.sort_by) searchParams.append('sort_by', params.sort_by)
  if (params?.sort_order) searchParams.append('sort_order', params.sort_order)

  if (filters?.categories?.length) {
    filters.categories.forEach(cat => searchParams.append('categories', cat))
  }
  if (filters?.statuses?.length) {
    filters.statuses.forEach(status => searchParams.append('statuses', status))
  }
  if (filters?.compliance_statuses?.length) {
    filters.compliance_statuses.forEach(status => searchParams.append('compliance_statuses', status))
  }
  if (filters?.search) {
    searchParams.append('search', filters.search)
  }

  return searchParams
}

export function formatDocumentCategories(categories: any[]): DocumentCategory[] {
  return categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    icon: cat.icon,
    color: cat.color,
    is_system: cat.is_system,
    requires_signature: cat.requires_signature || false,
    compliance_level: cat.compliance_level || 'standard',
    created_at: cat.created_at,
    updated_at: cat.updated_at
  }))
}
