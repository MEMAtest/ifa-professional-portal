// DocumentGenerationButton.tsx - Complete Updated Version
import React, { useState } from 'react'
import { FileText, Download, Send, Eye, CheckCircle, AlertCircle, Loader2, FileCheck } from 'lucide-react'

interface DocumentGenerationButtonProps {
  assessmentType: 'suitability' | 'atr' | 'cfl' | 'vulnerability'
  assessmentId: string
  clientId: string
  clientName?: string
  clientEmail?: string
  onSuccess?: (documentId: string, documentUrl: string) => void
  onError?: (error: string) => void
}

interface GeneratedDocument {
  id: string
  url: string
  pdfUrl?: string
  metadata?: any
}

export default function DocumentGenerationButton({
  assessmentType,
  assessmentId,
  clientId,
  clientName = 'Client',
  clientEmail,
  onSuccess,
  onError
}: DocumentGenerationButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sendingSignature, setSendingSignature] = useState(false)

  const handleGenerateDocument = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/documents/generate-from-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assessmentType,
          assessmentId,
          clientId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate document')
      }

      setGeneratedDocument({
        id: data.documentId,
        url: data.documentUrl,
        pdfUrl: data.pdfUrl,
        metadata: data.metadata
      })

      setShowOptions(true)
      onSuccess?.(data.documentId, data.documentUrl)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate document'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendForSignature = async () => {
    if (!generatedDocument || !clientEmail) {
      setError('Client email required for signature')
      return
    }

    setSendingSignature(true)
    setError(null)

    try {
      const response = await fetch('/api/documents/send-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId: generatedDocument.id,
          clientEmail,
          clientName,
          templateName: `${getAssessmentTypeName(assessmentType)} Report`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send for signature')
      }

      // Update document status
      await fetch(`/api/documents/status/${generatedDocument.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'pending_signature',
          signatureRequestId: data.signatureRequestId
        })
      })

      setShowOptions(false)
      
      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50'
      successMessage.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-green-800">Document sent for signature successfully!</span>
        </div>
      `
      document.body.appendChild(successMessage)
      setTimeout(() => successMessage.remove(), 5000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send for signature'
      setError(errorMessage)
    } finally {
      setSendingSignature(false)
    }
  }

  const handlePreview = () => {
    if (generatedDocument?.url) {
      window.open(generatedDocument.url, '_blank')
    }
  }

  const handleDownload = () => {
    if (generatedDocument?.pdfUrl) {
      window.open(generatedDocument.pdfUrl, '_blank')
    } else if (generatedDocument?.url) {
      // Fallback to HTML download if PDF not available
      const link = document.createElement('a')
      link.href = generatedDocument.url
      link.download = `${assessmentType}_report_${clientName.replace(/\s+/g, '_')}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleSendEmail = async () => {
    if (!generatedDocument || !clientEmail) {
      setError('Client email required')
      return
    }

    try {
      const response = await fetch('/api/documents/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId: generatedDocument.id,
          clientEmail,
          clientName,
          documentType: assessmentType
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed top-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg z-50'
      successMessage.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
          <span class="text-blue-800">Document emailed successfully!</span>
        </div>
      `
      document.body.appendChild(successMessage)
      setTimeout(() => successMessage.remove(), 5000)
      
    } catch (err) {
      setError('Failed to send email')
    }
  }

  const getAssessmentTypeName = (type: string): string => {
    const names = {
      suitability: 'Suitability',
      atr: 'Attitude to Risk',
      cfl: 'Capacity for Loss',
      vulnerability: 'Vulnerability'
    }
    return names[type as keyof typeof names] || type
  }

  const getButtonVariant = () => {
    if (generatedDocument) return 'success'
    if (error) return 'error'
    return 'primary'
  }

  return (
    <div className="relative">
      {/* Main Generate Button */}
      <button
        onClick={handleGenerateDocument}
        disabled={isGenerating}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200 
          ${getButtonVariant() === 'success' 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : getButtonVariant() === 'error'
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
          ${isGenerating ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        `}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : generatedDocument ? (
          <>
            <CheckCircle className="h-4 w-4" />
            Document Generated
          </>
        ) : error ? (
          <>
            <AlertCircle className="h-4 w-4" />
            Retry Generation
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            Generate Document
          </>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="absolute top-full mt-2 left-0 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 max-w-sm z-10">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Options Panel */}
      {showOptions && generatedDocument && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[280px] z-10">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-medium text-gray-900">Document Ready</h3>
              <button
                onClick={() => setShowOptions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={handlePreview}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
              >
                <Eye className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Preview Document (HTML)</span>
              </button>

              <button
                onClick={handleDownload}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
              >
                <Download className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Download PDF</span>
              </button>

              {clientEmail && (
                <>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs text-gray-500 mb-2">Send to: {clientEmail}</p>
                  </div>

                  <button
                    onClick={handleSendEmail}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <Send className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Email Document</span>
                  </button>

                  <button
                    onClick={handleSendForSignature}
                    disabled={sendingSignature}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
                  >
                    {sendingSignature ? (
                      <Loader2 className="h-4 w-4 text-gray-500 animate-spin" />
                    ) : (
                      <FileCheck className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm">
                      {sendingSignature ? 'Sending...' : 'Send for Signature'}
                    </span>
                  </button>
                </>
              )}
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-gray-500">
                Document ID: {generatedDocument.id}
              </p>
              <p className="text-xs text-gray-500">
                Generated: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showOptions && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  )
}