// ===================================================================
// src/lib/hooks/documentHooks.ts - FIXED Import Issue
// ===================================================================

import { useState, useEffect, useCallback } from 'react';
import type {
  Document,
  DocumentCategory,
  DocumentMetrics,
  DocumentListParams,
  DocumentUploadRequest,
  DocumentUploadResponse,
  DocumentFilters,
  DocumentListResponse,
  DocumentSearchResult,
  SignatureRequest,
  SignatureRequestCreate,
  DocumentStatus,
  ComplianceStatus,
} from '@/types/document';
// ✅ FIXED: Change from import type to regular import for constructor usage
import { DocumentError } from '@/types/document';

// Rest of the file stays exactly the same...
// Hook for managing document operations
export function useDocumentOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DocumentError | null>(null);

  const uploadDocument = useCallback(async (request: DocumentUploadRequest): Promise<Document | null> => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', request.file);
      formData.append('name', request.name);
      
      if (request.description) formData.append('description', request.description);
      if (request.category_id) formData.append('category_id', request.category_id);
      if (request.client_id) formData.append('client_id', request.client_id);
      if (request.compliance_level) formData.append('compliance_level', request.compliance_level);
      if (request.expiry_date) formData.append('expiry_date', request.expiry_date);
      if (request.tags) formData.append('tags', JSON.stringify(request.tags));
      if (request.metadata) formData.append('metadata', JSON.stringify(request.metadata));

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new DocumentError('Upload failed', 'UPLOAD_ERROR', response.status);
      }

      const result: DocumentUploadResponse = await response.json();
      
      if (!result.success || !result.document) {
        throw new DocumentError(result.error || 'Upload failed', 'UPLOAD_ERROR');
      }

      return result.document;
    } catch (err) {
      const error = err instanceof DocumentError ? err : new DocumentError(
        err instanceof Error ? err.message : 'Upload failed',
        'UPLOAD_ERROR'
      );
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (documentId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new DocumentError('Delete failed', 'DELETE_ERROR', response.status);
      }

      return true;
    } catch (err) {
      const error = err instanceof DocumentError ? err : new DocumentError(
        err instanceof Error ? err.message : 'Delete failed',
        'DELETE_ERROR'
      );
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDocument = useCallback(async (
    documentId: string, 
    updates: Partial<Document>
  ): Promise<Document | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new DocumentError('Update failed', 'UPDATE_ERROR', response.status);
      }

      const result = await response.json();
      return result.document;
    } catch (err) {
      const error = err instanceof DocumentError ? err : new DocumentError(
        err instanceof Error ? err.message : 'Update failed',
        'UPDATE_ERROR'
      );
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    uploadDocument,
    deleteDocument,
    updateDocument,
    loading,
    error,
    clearError: () => setError(null)
  };
}

// Hook for document listing and filtering
export function useDocumentList(initialParams?: DocumentListParams) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DocumentError | null>(null);
  const [params, setParams] = useState<DocumentListParams>(initialParams || {});
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchDocuments = useCallback(async (newParams?: DocumentListParams) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      const finalParams = { ...params, ...newParams };

      Object.entries(finalParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/documents?${searchParams.toString()}`);

      if (!response.ok) {
        throw new DocumentError('Failed to fetch documents', 'FETCH_ERROR', response.status);
      }

      const result: DocumentListResponse = await response.json();
      
      setDocuments(result.documents);
      setTotal(result.total);
      setTotalPages(result.total_pages);
      setParams(finalParams);

    } catch (err) {
      const error = err instanceof DocumentError ? err : new DocumentError(
        err instanceof Error ? err.message : 'Failed to fetch documents',
        'FETCH_ERROR'
      );
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const updateParams = useCallback((newParams: Partial<DocumentListParams>) => {
    fetchDocuments(newParams);
  }, [fetchDocuments]);

  const refresh = useCallback(() => {
    fetchDocuments(params);
  }, [fetchDocuments, params]);

  return {
    documents,
    loading,
    error,
    params,
    totalPages,
    total,
    updateParams,
    refresh,
    clearError: () => setError(null)
  };
}

// Hook for document search
export function useDocumentSearch() {
  const [results, setResults] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DocumentError | null>(null);
  const [query, setQuery] = useState('');
  const [totalMatches, setTotalMatches] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const search = useCallback(async (searchQuery: string, filters?: DocumentFilters) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalMatches(0);
      setSearchTime(0);
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setQuery(searchQuery);

      const searchParams = new URLSearchParams();
      searchParams.append('q', searchQuery);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(item => searchParams.append(key, item.toString()));
            } else {
              searchParams.append(key, value.toString());
            }
          }
        });
      }

      const response = await fetch(`/api/documents/search?${searchParams.toString()}`);

      if (!response.ok) {
        throw new DocumentError('Search failed', 'SEARCH_ERROR', response.status);
      }

      const result: DocumentSearchResult = await response.json();
      
      setResults(result.documents);
      setTotalMatches(result.total_matches);
      setSearchTime(result.search_time_ms);
      setSuggestions(result.suggestions || []);

    } catch (err) {
      const error = err instanceof DocumentError ? err : new DocumentError(
        err instanceof Error ? err.message : 'Search failed',
        'SEARCH_ERROR'
      );
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setResults([]);
    setQuery('');
    setTotalMatches(0);
    setSearchTime(0);
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    query,
    totalMatches,
    searchTime,
    suggestions,
    search,
    clearSearch,
    clearError: () => setError(null)
  };
}

// Hook for document filters
export function useDocumentFilters(initialFilters?: DocumentFilters) {
  const [filters, setFilters] = useState<DocumentFilters>(initialFilters || {});

  const updateFilter = useCallback((key: keyof DocumentFilters, value: any) => {
    setFilters((prev: DocumentFilters) => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const addCategoryFilter = useCallback((categoryId: string) => {
    setFilters((prev: DocumentFilters) => ({
      ...prev,
      categories: prev.categories 
        ? [...prev.categories, categoryId]
        : [categoryId]
    }));
  }, []);

  const removeCategoryFilter = useCallback((categoryId: string) => {
    setFilters((prev: DocumentFilters) => ({
      ...prev,
      categories: prev.categories
        ? prev.categories.filter((id: string) => id !== categoryId)
        : []
    }));
  }, []);

  const toggleStatusFilter = useCallback((status: DocumentStatus) => {
    setFilters((prev: DocumentFilters) => ({
      ...prev,
      statuses: prev.statuses?.includes(status)
        ? prev.statuses.filter((s: DocumentStatus) => s !== status)
        : [...(prev.statuses || []), status]
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = useCallback(() => {
    return Object.keys(filters).some(key => {
      const value = filters[key as keyof DocumentFilters];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== '';
    });
  }, [filters]);

  return {
    filters,
    updateFilter,
    addCategoryFilter,
    removeCategoryFilter,
    toggleStatusFilter,
    clearFilters,
    hasActiveFilters
  };
}

// Hook for signature requests
export function useSignatureRequests() {
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DocumentError | null>(null);

  const createSignatureRequest = useCallback(async (
    request: SignatureRequestCreate
  ): Promise<SignatureRequest | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/documents/signatures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new DocumentError('Failed to create signature request', 'SIGNATURE_ERROR', response.status);
      }

      const result = await response.json();
      return result.signatureRequest;
    } catch (err) {
      const error = err instanceof DocumentError ? err : new DocumentError(
        err instanceof Error ? err.message : 'Failed to create signature request',
        'SIGNATURE_ERROR'
      );
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSignatureRequests = useCallback(async (documentId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = documentId 
        ? `/api/documents/${documentId}/signatures`
        : '/api/documents/signatures';

      const response = await fetch(url);

      if (!response.ok) {
        throw new DocumentError('Failed to fetch signature requests', 'FETCH_ERROR', response.status);
      }

      const result = await response.json();
      setRequests(result.signatureRequests || []);
    } catch (err) {
      const error = err instanceof DocumentError ? err : new DocumentError(
        err instanceof Error ? err.message : 'Failed to fetch signature requests',
        'FETCH_ERROR'
      );
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    requests,
    loading,
    error,
    createSignatureRequest,
    fetchSignatureRequests,
    clearError: () => setError(null)
  };
}