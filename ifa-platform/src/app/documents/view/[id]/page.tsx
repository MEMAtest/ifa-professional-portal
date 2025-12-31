// src/app/documents/view/[id]/page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  FileText, 
  Download, 
  Send, 
  Eye, 
  ArrowLeft,
  Loader2,
  Calendar,
  User,
  FileType,
  CheckCircle,
  AlertCircle,
  Share2,
  Printer,
  Mail
} from 'lucide-react'
import { safeWriteToClipboard } from '@/lib/utils'

// Type definitions
interface DocumentData {
  id: string
  name: string
  client_name: string
  client_id: string
  file_name: string
  file_path: string
  storage_path?: string
  file_size: number
  file_type: string
  mime_type: string
  type: string
  category: string
  document_type: string
  status: string
  compliance_status: string
  created_at: string
  updated_at: string
  metadata?: {
    assessmentType?: string
    assessmentId?: string
    clientName?: string
    clientEmail?: string
    score?: number
    riskCategory?: string
    riskLevel?: number
    generatedAt?: string
    reportType?: string
    [key: string]: any
  }
}

export default function DocumentViewerPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  // State management
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [sending, setSending] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fetchDocument = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch document metadata
      const response = await fetch(`/api/documents/${documentId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found')
        }
        throw new Error('Failed to load document')
      }

      const data = await response.json()
      setDocument(data)
      
      // Set preview URL
      setPreviewUrl(`/api/documents/preview/${documentId}`)
    } catch (err) {
      console.error('Error fetching document:', err)
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }, [documentId])

  // Fetch document data on mount
  useEffect(() => {
    if (documentId) {
      fetchDocument()
    }
  }, [documentId, fetchDocument])

  const handleDownload = async () => {
    if (!document) return

    setDownloading(true)
    try {
      // Open download URL in new window
      window.open(`/api/documents/download/${documentId}`, '_blank')
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download document')
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
    if (!document) return

    const shareUrl = `${window.location.origin}/documents/view/${documentId}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.name,
          text: `View document: ${document.name}`,
          url: shareUrl
        })
      } catch (err) {
        console.log('Share cancelled or failed')
      }
    } else {
      // Fallback - copy to clipboard
      const ok = await safeWriteToClipboard(shareUrl)
      alert(ok ? 'Link copied to clipboard!' : 'Clipboard not available in this browser')
    }
  }

  const handleSendEmail = async () => {
    if (!document || !document.metadata?.clientEmail) {
      setError('Client email not available')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/documents/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          clientEmail: document.metadata.clientEmail,
          clientName: document.client_name,
          documentType: document.type
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      // Show success message
      alert('Document sent successfully!')
    } catch (err) {
      console.error('Email error:', err)
      setError('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !document) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => router.back()} 
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Document Viewer</h1>
                {document && (
                  <p className="text-sm text-gray-600 mt-1">{document.name}</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>

              {document?.metadata?.clientEmail && (
                <Button
                  onClick={handleSendEmail}
                  variant="outline"
                  size="sm"
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Email
                </Button>
              )}

              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Preview */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-gray-100 rounded-b-lg" style={{ height: '800px' }}>
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full rounded-b-lg"
                      title="Document Preview"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p>Preview not available</p>
                        <Button
                          onClick={handleDownload}
                          className="mt-4"
                          variant="outline"
                        >
                          Download to View
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Document Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={getStatusColor(document?.status || '')}>
                      {document?.status || 'Unknown'}
                    </Badge>
                    <Badge className={getStatusColor(document?.compliance_status || '')}>
                      {document?.compliance_status || 'Pending'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium">{document?.type || 'Document'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium">{document?.category || 'General'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">File Size</p>
                  <p className="font-medium">{formatFileSize(document?.file_size || 0)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Format</p>
                  <p className="font-medium uppercase">{document?.file_type || 'PDF'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            {document && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Client Name</p>
                    <p className="font-medium">{document.client_name}</p>
                  </div>

                  {document.metadata?.clientEmail && (
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{document.metadata.clientEmail}</p>
                    </div>
                  )}

                  {document.metadata?.score !== undefined && (
                    <div>
                      <p className="text-sm text-gray-600">Assessment Score</p>
                      <p className="font-medium">{document.metadata.score}/100</p>
                    </div>
                  )}

                  {document.metadata?.riskCategory && (
                    <div>
                      <p className="text-sm text-gray-600">Risk Category</p>
                      <Badge variant="outline">{document.metadata.riskCategory}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">{formatDate(document?.created_at || '')}</p>
                </div>

                {document?.updated_at && document.updated_at !== document?.created_at && (
                  <div>
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="font-medium">{formatDate(document.updated_at)}</p>
                  </div>
                )}

                {document?.metadata?.generatedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Generated</p>
                    <p className="font-medium">{formatDate(document.metadata.generatedAt)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
