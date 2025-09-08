// src/components/documents/DocumentPreviewModal.tsx
import React, { useState, useEffect } from 'react'
import { X, Download, Loader2 } from 'lucide-react'

interface DocumentPreviewModalProps {
  assessmentType: string
  assessmentId: string
  clientId: string
  isOpen: boolean
  onClose: () => void
  onDownload: () => void
}

export default function DocumentPreviewModal({
  assessmentType,
  assessmentId,
  clientId,
  isOpen,
  onClose,
  onDownload
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [htmlContent, setHtmlContent] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadPreview()
    }
  }, [isOpen])

  const loadPreview = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/documents/preview-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentType, assessmentId, clientId })
      })
      
      const data = await response.json()
      if (data.success) {
        setHtmlContent(data.htmlContent)
      }
    } catch (error) {
      console.error('Preview error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Document Preview</h3>
            <div className="flex gap-2">
              <button
                onClick={onDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Download className="h-4 w-4 inline mr-2" />
                Generate PDF
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4 overflow-y-auto" style={{ height: 'calc(90vh - 80px)' }}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div 
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                className="prose max-w-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}