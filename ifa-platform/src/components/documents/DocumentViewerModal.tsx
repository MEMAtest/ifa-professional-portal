// src/components/documents/DocumentViewerModal.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  X, 
  Download, 
  Printer, 
  Mail, 
  Share2, 
  Maximize2,
  Minimize2,
  Loader2,
  FileText,
  User,
  Calendar,
  CheckCircle
} from 'lucide-react'
import clientLogger from '@/lib/logging/clientLogger'
import { safeWriteToClipboard } from '@/lib/utils'

interface DocumentViewerModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentUrl?: string
  documentName?: string
  clientName?: string
  clientEmail?: string
  defaultFullscreen?: boolean
}

interface DocumentData {
  id: string
  name: string
  client_name: string
  client_id: string
  file_size: number
  file_type: string
  type: string
  category: string
  status: string
  created_at: string
  metadata?: {
    assessmentType?: string
    score?: number
    riskCategory?: string
    clientEmail?: string
    [key: string]: any
  }
}

export default function DocumentViewerModal({
  isOpen,
  onClose,
  documentId,
  documentUrl,
  documentName = 'Document',
  clientName,
  clientEmail,
  defaultFullscreen = false
}: DocumentViewerModalProps) {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen)
  const [downloading, setDownloading] = useState(false)
  const [sending, setSending] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)

  const fetchDocument = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}`)
      if (response.ok) {
        const data = await response.json()
        setDocumentData(data)
        setPreviewUrl(`/api/documents/preview/${documentId}`)
        setFallbackUrl(documentUrl || null)
        setPreviewError(false)
      }
    } catch (error) {
      clientLogger.error('Error fetching document:', error)
    } finally {
      setLoading(false)
    }
  }, [documentId, documentUrl])

  useEffect(() => {
    if (isOpen && documentId) {
      fetchDocument()
      setPreviewError(false)
      setIsFullscreen(defaultFullscreen)
    }
  }, [isOpen, documentId, fetchDocument, defaultFullscreen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.document.body.style.overflow = isOpen ? 'hidden' : 'auto'
      
      return () => {
        window.document.body.style.overflow = 'auto'
      }
    }
  }, [isOpen])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      window.open(`/api/documents/download/${documentId}`, '_blank')
    } catch (err) {
      clientLogger.error('Download error:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    if (previewUrl) {
      const printWindow = window.open(previewUrl, '_blank')
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print()
        })
      }
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/documents/view/${documentId}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: documentName,
          text: `View document: ${documentName}`,
          url: shareUrl
        })
      } catch (err) {
      }
    } else {
      const ok = await safeWriteToClipboard(shareUrl)
      alert(ok ? 'Link copied to clipboard!' : 'Clipboard not available in this browser')
    }
  }

  const handleSendEmail = async () => {
    const email = clientEmail || documentData?.metadata?.clientEmail
    if (!email) {
      alert('Client email not available')
      return
    }

    setSending(true)
    try {
      const documentLink = `${window.location.origin}/documents/view/${documentId}`
      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'documentSent',
          recipient: email,
          data: {
            clientName: clientName || documentData?.client_name || 'Client',
            documentName: documentData?.name || documentName,
            documentLink
          }
        })
      })

      if (response.ok) {
        alert('Document sent successfully!')
      }
    } catch (err) {
      clientLogger.error('Email error:', err)
      alert('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 KB'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div
        className={`
          ${isFullscreen
            ? 'fixed inset-0'
            : 'fixed left-1/2 top-1/2 w-[96vw] h-[88vh] max-w-6xl -translate-x-1/2 -translate-y-1/2'}
          bg-white rounded-lg shadow-2xl flex flex-col
          transition-all duration-300 ease-in-out
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-600" />
            <div>
              <h2 className="font-semibold text-gray-900">
                {documentData?.name || documentName}
              </h2>
              {(clientName || documentData?.client_name) && (
                <p className="text-sm text-gray-600">
                  Client: {clientName || documentData?.client_name}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Print"
            >
              <Printer className="h-4 w-4 text-gray-600" />
            </button>

            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Share"
            >
              <Share2 className="h-4 w-4 text-gray-600" />
            </button>

            {(clientEmail || documentData?.metadata?.clientEmail) && (
              <button
                onClick={handleSendEmail}
                disabled={sending}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Send Email"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 text-gray-600" />
                )}
              </button>
            )}

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">Download</span>
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-gray-600" />
              ) : (
                <Maximize2 className="h-4 w-4 text-gray-600" />
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* PDF Viewer */}
          <div className="flex-1 bg-gray-100">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading document...</p>
                </div>
              </div>
            ) : previewUrl && !previewError ? (
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="Document Preview"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600">Preview not available</p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={() => window.open(fallbackUrl || previewUrl || '#', '_blank')}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Open in New Tab
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Info (optional - collapsible on mobile) */}
          <div className="hidden lg:block w-80 border-l bg-white overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Document Details */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Document Details
                </h3>
                
                {documentData && (
                  <>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-500">Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Generated</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-500">Type</p>
                        <p className="font-medium">{documentData.type || 'Assessment Report'}</p>
                      </div>

                      <div>
                        <p className="text-gray-500">Category</p>
                        <p className="font-medium">{documentData.category || 'Reports'}</p>
                      </div>

                      <div>
                        <p className="text-gray-500">File Size</p>
                        <p className="font-medium">{formatFileSize(documentData.file_size)}</p>
                      </div>

                      <div>
                        <p className="text-gray-500">Format</p>
                        <p className="font-medium uppercase">{documentData.file_type || 'PDF'}</p>
                      </div>
                    </div>

                    {/* Client Info */}
                    {documentData.client_name && (
                      <div className="pt-3 border-t space-y-2 text-sm">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Client Information
                        </h4>
                        
                        <div>
                          <p className="text-gray-500">Name</p>
                          <p className="font-medium">{documentData.client_name}</p>
                        </div>

                        {documentData.metadata?.clientEmail && (
                          <div>
                            <p className="text-gray-500">Email</p>
                            <p className="font-medium">{documentData.metadata.clientEmail}</p>
                          </div>
                        )}

                        {documentData.metadata?.score !== undefined && (
                          <div>
                            <p className="text-gray-500">Assessment Score</p>
                            <p className="font-medium">{documentData.metadata.score}/100</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="pt-3 border-t space-y-2 text-sm">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Timeline
                      </h4>
                      
                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="font-medium">{formatDate(documentData.created_at)}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
