// ===================================================================
// src/lib/hooks/useDocuments.ts - ENHANCED with Analytics
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

// ===================================================================
// ENHANCED ANALYTICS TYPES
// ===================================================================

interface DocumentAnalytics {
  totalDocuments: number
  pendingSignatures: number
  completedSignatures: number
  complianceScore: number
  documentsThisMonth: number
  documentsThisWeek: number
  documentsToday: number
  
  // Advanced metrics
  averageProcessingTime: number
  clientSatisfactionScore: number
  riskScore: number
  
  // Trending data
  trends?: {
    documents: {
      current: number
      previous: number
      change: number
      changePercent: number
      direction: 'up' | 'down' | 'neutral'
    }
    signatures: {
      current: number
      previous: number
      change: number
      changePercent: number
      direction: 'up' | 'down' | 'neutral'
    }
    compliance: {
      current: number
      previous: number
      change: number
      changePercent: number
      direction: 'up' | 'down' | 'neutral'
    }
  }
  
  // Activity feed
  recentActivity?: Array<{
    id: string
    user_name: string
    action: string
    document_title: string
    created_at: string
    document_id: string
    type: 'upload' | 'update' | 'delete' | 'signature' | 'review'
  }>
  
  // Compliance breakdown
  complianceBreakdown?: {
    compliant: number
    non_compliant: number
    pending: number
    under_review: number
    exempt: number
  }
  
  // Category analytics
  categoryPerformance?: Array<{
    category_name: string
    document_count: number
    avg_processing_time: number
    compliance_rate: number
    trend: 'up' | 'down' | 'neutral'
  }>
  
  // Client analytics
  clientMetrics?: {
    totalClients: number
    activeClients: number
    topClients: Array<{
      client_name: string
      document_count: number
      last_activity: string
      compliance_score: number
    }>
  }
}

interface AnalyticsFilters {
  dateRange?: {
    start: string
    end: string
  }
  categories?: string[]
  clients?: string[]
  statuses?: string[]
  includeArchived?: boolean
}

// ===================================================================
// MAIN DOCUMENT MANAGEMENT HOOK (EXISTING)
// ===================================================================

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

// ===================================================================
// NEW: DOCUMENT ANALYTICS HOOK
// ===================================================================

export function useDocumentAnalytics(filters?: AnalyticsFilters) {
  const [analytics, setAnalytics] = useState<DocumentAnalytics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<DocumentError | string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ===================================================================
  // ANALYTICS FETCHING FUNCTION
  // ===================================================================

  const fetchAnalytics = useCallback(async (customFilters?: AnalyticsFilters) => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const searchParams = new URLSearchParams()
      const finalFilters = { ...filters, ...customFilters }

      if (finalFilters?.dateRange) {
        searchParams.append('start_date', finalFilters.dateRange.start)
        searchParams.append('end_date', finalFilters.dateRange.end)
      }

      if (finalFilters?.categories?.length) {
        searchParams.append('categories', finalFilters.categories.join(','))
      }

      if (finalFilters?.clients?.length) {
        searchParams.append('clients', finalFilters.clients.join(','))
      }

      if (finalFilters?.statuses?.length) {
        searchParams.append('statuses', finalFilters.statuses.join(','))
      }

      if (finalFilters?.includeArchived) {
        searchParams.append('include_archived', 'true')
      }

      // Make API request
      const response = await fetch(`/api/documents/analytics?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        // Handle authentication errors gracefully
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required. Please log in.')
        }
        throw new DocumentError(
          'Failed to fetch analytics',
          'ANALYTICS_FETCH_ERROR',
          response.status
        )
      }

      const data = await response.json()

      // Enhanced analytics processing with fallbacks
      const processedAnalytics: DocumentAnalytics = {
        // Basic metrics with fallbacks
        totalDocuments: data.totalDocuments || 0,
        pendingSignatures: data.pendingSignatures || 0,
        completedSignatures: data.completedSignatures || 0,
        complianceScore: data.complianceScore || 0,
        documentsThisMonth: data.documentsThisMonth || 0,
        documentsThisWeek: data.documentsThisWeek || 0,
        documentsToday: data.documentsToday || 0,

        // Advanced metrics with fallbacks
        averageProcessingTime: data.averageProcessingTime || 0,
        clientSatisfactionScore: data.clientSatisfactionScore || 85, // Mock fallback
        riskScore: data.riskScore || calculateRiskScore(data),

        // Trends calculation with safeguards
        trends: {
          documents: calculateTrend(data.documentsThisMonth || 0, data.documentsLastMonth || 0),
          signatures: calculateTrend(data.completedSignatures || 0, data.lastMonthSignatures || 0),
          compliance: calculateTrend(data.complianceScore || 0, data.lastMonthCompliance || 0),
        },

        // Recent activity with fallbacks
        recentActivity: data.recentActivity || [],

        // Compliance breakdown with fallbacks
        complianceBreakdown: {
          compliant: data.complianceBreakdown?.compliant || 0,
          non_compliant: data.complianceBreakdown?.non_compliant || 0,
          pending: data.complianceBreakdown?.pending || 0,
          under_review: data.complianceBreakdown?.under_review || 0,
          exempt: data.complianceBreakdown?.exempt || 0,
        },

        // Category performance with fallbacks
        categoryPerformance: data.categoryPerformance || [],

        // Client metrics with fallbacks
        clientMetrics: {
          totalClients: data.clientMetrics?.totalClients || 0,
          activeClients: data.clientMetrics?.activeClients || 0,
          topClients: data.clientMetrics?.topClients || [],
        },
      }

      setAnalytics(processedAnalytics)
      setLastUpdated(new Date())

    } catch (err) {
      // Enhanced error handling for different error types
      if (err instanceof Error && err.message.includes('Authentication')) {
        setError('Authentication required. Please refresh the page.')
      } else if (err instanceof DocumentError) {
        setError(err)
      } else {
        setError(new DocumentError(
          err instanceof Error ? err.message : 'Failed to fetch analytics',
          'ANALYTICS_ERROR',
          undefined,
          err
        ))
      }
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // ===================================================================
  // UTILITY FUNCTIONS
  // ===================================================================

  const calculateTrend = (current: number, previous: number) => {
    const change = current - previous
    const changePercent = previous > 0 ? (change / previous) * 100 : 0
    
    return {
      current,
      previous,
      change,
      changePercent: Math.round(changePercent * 100) / 100,
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const
    }
  }

  const calculateRiskScore = (data: any): number => {
    // Calculate risk score based on compliance data
    const totalDocs = data.totalDocuments || 1
    const nonCompliant = data.complianceBreakdown?.non_compliant || 0
    const pending = data.complianceBreakdown?.pending || 0
    
    const riskFactor = (nonCompliant * 2 + pending) / totalDocs
    return Math.max(0, Math.min(100, Math.round(100 - (riskFactor * 50))))
  }

  // ===================================================================
  // ADDITIONAL HOOK FUNCTIONS
  // ===================================================================

  const refreshAnalytics = useCallback(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const updateFilters = useCallback((newFilters: AnalyticsFilters) => {
    fetchAnalytics(newFilters)
  }, [fetchAnalytics])

  const getMetricTrend = useCallback((metric: keyof DocumentAnalytics['trends']) => {
    return analytics?.trends?.[metric] || null
  }, [analytics])

  const getComplianceRate = useCallback(() => {
    if (!analytics?.complianceBreakdown) return 0
    const { compliant, non_compliant, pending, under_review, exempt } = analytics.complianceBreakdown
    const total = compliant + non_compliant + pending + under_review + exempt
    return total > 0 ? Math.round((compliant / total) * 100) : 0
  }, [analytics])

  const getRiskLevel = useCallback(() => {
    if (!analytics) return 'unknown'
    const riskScore = analytics.riskScore
    if (riskScore >= 80) return 'low'
    if (riskScore >= 60) return 'medium'
    return 'high'
  }, [analytics])

  // ===================================================================
  // EFFECT HOOKS
  // ===================================================================

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Auto-refresh every 5 minutes if no error
  useEffect(() => {
    if (error) return

    const interval = setInterval(() => {
      fetchAnalytics()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [fetchAnalytics, error])

  // ===================================================================
  // RETURN HOOK INTERFACE
  // ===================================================================

  return {
    // Data
    analytics,
    loading,
    error,
    lastUpdated,

    // Actions
    refresh: refreshAnalytics,
    updateFilters,
    fetchAnalytics,

    // Computed values
    getMetricTrend,
    getComplianceRate,
    getRiskLevel,

    // Utilities
    clearError: () => setError(null),
    isStale: lastUpdated ? (Date.now() - lastUpdated.getTime()) > 5 * 60 * 1000 : true, // 5 minutes
  }
}

// ===================================================================
// ADDITIONAL ANALYTICS HOOKS
// ===================================================================

// Hook for document categories with analytics
export function useDocumentCategories() {
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<DocumentError | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/documents/categories')
        
        if (!response.ok) {
          throw new DocumentError('Failed to fetch categories', 'FETCH_ERROR', response.status)
        }
        
        const result = await response.json()
        setCategories(result.categories || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories'
        setError(new DocumentError(errorMessage, 'FETCH_ERROR'))
        console.error('Error fetching categories:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  return {
    categories,
    loading,
    error
  }
}

// Hook for signature requests
export function useSignatureRequests() {
  const [signatureRequests, setSignatureRequests] = useState<SignatureRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<DocumentError | null>(null)

  const createSignatureRequest = async (request: {
    document_id: string
    signers: Array<{
      email: string
      name: string
      role?: string
    }>
    subject?: string
    message?: string
    expiresInDays?: number
  }) => {
    try {
      setError(null)
      const response = await fetch('/api/documents/signatures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })
      
      if (!response.ok) {
        throw new DocumentError('Failed to create signature request', 'SIGNATURE_ERROR', response.status)
      }
      
      const result = await response.json()
      const newRequest = result.signatureRequest
      setSignatureRequests(prev => [newRequest, ...prev])
      return newRequest
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create signature request'
      setError(new DocumentError(errorMessage, 'SIGNATURE_ERROR'))
      throw err
    }
  }

  return {
    signatureRequests,
    loading,
    error,
    createSignatureRequest
  }
}

// Export all hooks
export default {
  useDocuments,
  useDocumentAnalytics,
  useDocumentCategories,
  useSignatureRequests
}