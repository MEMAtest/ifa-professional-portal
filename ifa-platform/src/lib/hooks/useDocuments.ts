// ===================================================================
// src/lib/hooks/useDocuments.ts - FIXED Import Issue
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

// Main document management hook
export function useDocuments(initialParams?: DocumentListParams) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [metrics, setMetrics] = useState<DocumentMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DocumentError | null>(null);
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Fetch documents with filters
  const fetchDocuments = useCallback(async (params?: DocumentListParams) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.category_id) searchParams.append('category_id', params.category_id);
      if (params?.client_id) searchParams.append('client_id', params.client_id);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.compliance_status) searchParams.append('compliance_status', params.compliance_status);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
      if (params?.sort_order) searchParams.append('sort_order', params.sort_order);

      // Add filter parameters
      if (filters.categories?.length) {
        filters.categories.forEach(cat => searchParams.append('categories', cat));
      }
      if (filters.statuses?.length) {
        filters.statuses.forEach(status => searchParams.append('statuses', status));
      }
      if (filters.compliance_statuses?.length) {
        filters.compliance_statuses.forEach(status => searchParams.append('compliance_statuses', status));
      }
      if (filters.search) {
        searchParams.append('search', filters.search);
      }

      const response = await fetch(`/api/documents?${searchParams.toString()}`);

      if (!response.ok) {
        throw new DocumentError('Failed to fetch documents', 'FETCH_ERROR', response.status);
      }

      const result: DocumentListResponse = await response.json();
      setDocuments(result.documents);

    } catch (err) {
      setError(new DocumentError(
        err instanceof Error ? err.message : 'Failed to fetch documents',
        'FETCH_ERROR',
        undefined,
        err
      ));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch document categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/categories');

      if (!response.ok) {
        throw new DocumentError('Failed to fetch categories', 'FETCH_ERROR', response.status);
      }

      const result = await response.json();
      
      // Transform the response to match our interface
      const formattedCategories = result.categories.map((cat: any) => ({
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
      }));

      setCategories(formattedCategories);

    } catch (err) {
      setError(new DocumentError(
        err instanceof Error ? err.message : 'Failed to fetch categories',
        'FETCH_ERROR',
        undefined,
        err
      ));
    }
  }, []);

  // Fetch document metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/metrics');

      if (!response.ok) {
        throw new DocumentError('Failed to fetch metrics', 'FETCH_ERROR', response.status);
      }

      const result = await response.json();
      setMetrics(result.metrics);

    } catch (err) {
      setError(new DocumentError(
        err instanceof Error ? err.message : 'Failed to fetch metrics',
        'FETCH_ERROR',
        undefined,
        err
      ));
    }
  }, []);

  // Upload document
  const uploadDocument = useCallback(async (request: DocumentUploadRequest): Promise<Document | null> => {
    try {
      setUploading(true);
      setError(null);

      const fileId = `${Date.now()}-${request.file.name}`;
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

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

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
          }
        };

        xhr.onload = () => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });

          if (xhr.status === 200) {
            try {
              const result: DocumentUploadResponse = JSON.parse(xhr.responseText);
              if (result.success && result.document) {
                resolve(result.document);
              } else {
                reject(new DocumentError(result.error || 'Upload failed', 'UPLOAD_ERROR'));
              }
            } catch (parseError) {
              reject(new DocumentError('Invalid response format', 'UPLOAD_ERROR'));
            }
          } else {
            reject(new DocumentError('Upload failed', 'UPLOAD_ERROR', xhr.status));
          }
        };

        xhr.onerror = () => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
          reject(new DocumentError('Upload failed', 'UPLOAD_ERROR'));
        };

        xhr.open('POST', '/api/documents/upload');
        xhr.send(formData);
      });

    } catch (err) {
      const errorResponse = {
        message: err instanceof Error ? err.message : 'Upload failed',
        code: 'UPLOAD_ERROR'
      };
      
      setError(new DocumentError(
        errorResponse.message,
        errorResponse.code,
        undefined,
        errorResponse
      ));
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  // Delete document
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

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      return true;

    } catch (err) {
      setError(new DocumentError(
        err instanceof Error ? err.message : 'Delete failed',
        'DELETE_ERROR',
        undefined,
        err
      ));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update document
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
      const updatedDocument = result.document;

      // Update local state
      setDocuments(prev => 
        prev.map(doc => doc.id === documentId ? updatedDocument : doc)
      );

      return updatedDocument;

    } catch (err) {
      setError(new DocumentError(
        err instanceof Error ? err.message : 'Update failed',
        'UPDATE_ERROR',
        undefined,
        err
      ));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Search documents
  const searchDocuments = useCallback(async (query: string): Promise<DocumentSearchResult | null> => {
    try {
      setLoading(true);
      setError(null);
      setSearchQuery(query);

      if (!query.trim()) {
        await fetchDocuments();
        return null;
      }

      const searchParams = new URLSearchParams();
      searchParams.append('q', query);

      const response = await fetch(`/api/documents/search?${searchParams.toString()}`);

      if (!response.ok) {
        throw new DocumentError('Search failed', 'SEARCH_ERROR', response.status);
      }

      const result: DocumentSearchResult = await response.json();
      setDocuments(result.documents);

      return result;

    } catch (err) {
      setError(new DocumentError(
        err instanceof Error ? err.message : 'Search failed',
        'SEARCH_ERROR',
        undefined,
        err
      ));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchDocuments]);

  // Bulk operations
  const deleteSelectedDocuments = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/documents/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds: selectedDocuments }),
      });

      if (!response.ok) {
        throw new DocumentError('Bulk delete failed', 'DELETE_ERROR', response.status);
      }

      // Remove from local state
      setDocuments(prev => prev.filter(doc => !selectedDocuments.includes(doc.id)));
      setSelectedDocuments([]);
      
      return true;

    } catch (err) {
      setError(new DocumentError(
        err instanceof Error ? err.message : 'Bulk delete failed',
        'DELETE_ERROR',
        undefined,
        err
      ));
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedDocuments]);

  // Filter operations
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
    setSearchQuery('');
  }, []);

  // Selection operations
  const toggleDocumentSelection = useCallback((documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  }, []);

  const selectAllDocuments = useCallback(() => {
    setSelectedDocuments(documents.map(doc => doc.id));
  }, [documents]);

  const clearSelection = useCallback(() => {
    setSelectedDocuments([]);
  }, []);

  // Create signature request
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
      setError(new DocumentError(
        err instanceof Error ? err.message : 'Failed to create signature request',
        'SIGNATURE_ERROR',
        undefined,
        err
      ));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    fetchDocuments(initialParams);
    fetchCategories();
    fetchMetrics();
  }, [fetchDocuments, fetchCategories, fetchMetrics, initialParams]);

  // Initialize data on mount
  useEffect(() => {
    refresh();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchDocuments(initialParams);
  }, [filters, fetchDocuments, initialParams]);

  return {
    // Data
    documents,
    categories,
    metrics,
    filters,
    searchQuery,
    selectedDocuments,
    
    // State
    loading,
    uploading,
    uploadProgress,
    error,
    
    // Operations
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    updateDocument,
    searchDocuments,
    deleteSelectedDocuments,
    createSignatureRequest,
    
    // Filters
    addCategoryFilter,
    removeCategoryFilter,
    toggleStatusFilter,
    clearFilters,
    
    // Selection
    toggleDocumentSelection,
    selectAllDocuments,
    clearSelection,
    
    // Utilities
    refresh,
    clearError: () => setError(null)
  };
}