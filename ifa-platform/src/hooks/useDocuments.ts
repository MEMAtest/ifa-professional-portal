// hooks/useDocuments.ts
// FIXED: Proper error handling, loading states, and TypeScript types

import { useState, useEffect, useCallback } from 'react'
import { documentService, type Document, type DocumentCategory, type DocumentUpload, type DocumentAnalytics } from '../services/documentService'

// Hook for managing documents
export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const docs = await documentService.getDocuments()
      setDocuments(docs)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documents'
      setError(errorMessage)
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const uploadDocument = async (uploadData: DocumentUpload): Promise<Document> => {
    try {
      setError(null)
      const newDocument = await documentService.uploadDocument(uploadData)
      
      // Add to local state immediately for optimistic UI
      setDocuments(prev => [newDocument, ...prev])
      
      return newDocument
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document'
      setError(errorMessage)
      throw err
    }
  }

  const updateDocument = async (id: string, updates: Partial<Document>): Promise<Document> => {
    try {
      setError(null)
      const updatedDocument = await documentService.updateDocument(id, updates)
      
      // Update local state
      setDocuments(prev => 
        prev.map(doc => doc.id === id ? updatedDocument : doc)
      )
      
      return updatedDocument
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update document'
      setError(errorMessage)
      throw err
    }
  }

  const deleteDocument = async (id: string): Promise<void> => {
    try {
      setError(null)
      await documentService.deleteDocument(id)
      
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document'
      setError(errorMessage)
      throw err
    }
  }

  const searchDocuments = async (query: string, filters?: any): Promise<Document[]> => {
    try {
      setError(null)
      const results = await documentService.searchDocuments(query, filters)
      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
      throw err
    }
  }

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    uploadDocument,
    updateDocument,
    deleteDocument,
    searchDocuments,
    refresh: fetchDocuments
  }
}

// Hook for document categories
export function useDocumentCategories() {
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)
        const cats = await documentService.getDocumentCategories()
        setCategories(cats)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories'
        setError(errorMessage)
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

// Hook for document analytics (integrates with Analytics AI)
export function useDocumentAnalytics() {
  const [analytics, setAnalytics] = useState<DocumentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await documentService.getDocumentAnalytics()
      setAnalytics(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics'
      setError(errorMessage)
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    loading,
    error,
    refresh: fetchAnalytics
  }
}

// Hook for individual document
export function useDocument(id: string) {
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchDocument = async () => {
      try {
        setLoading(true)
        setError(null)
        const doc = await documentService.getDocument(id)
        setDocument(doc)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch document'
        setError(errorMessage)
        console.error('Error fetching document:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [id])

  return {
    document,
    loading,
    error
  }
}

// Hook for signature requests
export function useSignatureRequests(documentId?: string) {
  const [signatureRequests, setSignatureRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) return

    const fetchSignatureRequests = async () => {
      try {
        setLoading(true)
        setError(null)
        const requests = await documentService.getSignatureRequests(documentId)
        setSignatureRequests(requests)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch signature requests'
        setError(errorMessage)
        console.error('Error fetching signature requests:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSignatureRequests()
  }, [documentId])

  const createSignatureRequest = async (request: {
    documentId: string
    recipientEmail: string
    recipientName: string
    templateId?: string
    expiresInDays?: number
  }) => {
    try {
      setError(null)
      const newRequest = await documentService.createSignatureRequest(request)
      setSignatureRequests(prev => [newRequest, ...prev])
      return newRequest
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create signature request'
      setError(errorMessage)
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

// Hook for download URLs with caching
export function useDocumentDownload() {
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const getDownloadUrl = useCallback(async (filePath: string): Promise<string> => {
    // Return cached URL if available and not expired
    if (downloadUrls[filePath]) {
      return downloadUrls[filePath]
    }

    try {
      setLoading(prev => ({ ...prev, [filePath]: true }))
      const url = await documentService.getDownloadUrl(filePath)
      
      // Cache the URL
      setDownloadUrls(prev => ({ ...prev, [filePath]: url }))
      
      // Clear cache after 30 minutes (URLs expire after 1 hour)
      setTimeout(() => {
        setDownloadUrls(prev => {
          const newUrls = { ...prev }
          delete newUrls[filePath]
          return newUrls
        })
      }, 30 * 60 * 1000)
      
      return url
    } catch (err) {
      console.error('Error getting download URL:', err)
      throw err
    } finally {
      setLoading(prev => ({ ...prev, [filePath]: false }))
    }
  }, [downloadUrls])

  return {
    getDownloadUrl,
    loading
  }
}

// Export all hooks
export default {
  useDocuments,
  useDocumentCategories,
  useDocumentAnalytics,
  useDocument,
  useSignatureRequests,
  useDocumentDownload
}