'use client'

import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import Image from 'next/image'
import {
  X,
  Loader2,
  FileText,
  Tag,
  Sparkles,
  Download,
  User,
  Building,
  Hash,
  Calendar,
  DollarSign,
  MapPin,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

interface DocumentData {
  id: string
  name: string
  file_name: string
  file_type: string
  mime_type: string
  file_size: number
  status: string
  client_id?: string
  metadata?: {
    extracted_text?: string
    extracted_text_length?: number
    extraction_method?: string
    extracted_at?: string
    ai_analysis?: {
      summary: string
      classification: string
      confidence: number
      entities: {
        clientNames?: string[]
        dates?: string[]
        providerNames?: string[]
        policyNumbers?: string[]
        financialAmounts?: { amount: number; currency: string; context: string }[]
        addresses?: string[]
        referenceNumbers?: string[]
      }
    }
    ai_analyzed_at?: string
    ai_provider?: string
    ai_error?: string
    extraction_error?: string
  }
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  pension_statement: 'Pension Statement',
  bank_statement: 'Bank Statement',
  investment_report: 'Investment Report',
  insurance_policy: 'Insurance Policy',
  tax_document: 'Tax Document',
  identity_document: 'Identity Document',
  correspondence: 'Correspondence',
  transfer_form: 'Transfer Form',
  valuation_report: 'Valuation Report',
  fund_factsheet: 'Fund Factsheet',
  application_form: 'Application Form',
  meeting_notes: 'Meeting Notes',
  compliance_document: 'Compliance Document',
  other: 'Other',
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency || 'GBP',
  }).format(amount)
}

export interface DocumentPreviewModalProps {
  documentId: string | null
  onClose: () => void
  onReuploaded?: () => void
}

const MAX_REUPLOAD_SIZE = 15 * 1024 * 1024

export function DocumentPreviewModal({ documentId, onClose, onReuploaded }: DocumentPreviewModalProps) {
  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reuploading, setReuploading] = useState(false)
  const [reuploadError, setReuploadError] = useState<string | null>(null)
  const [reuploadSuccess, setReuploadSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!documentId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/documents/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) {
          setError(data.error)
        } else {
          setDoc(data)
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load document') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [documentId])

  if (!documentId) return null

  const isPreviewable = doc
    ? doc.mime_type?.startsWith('image/') ||
      doc.mime_type === 'application/pdf' ||
      doc.file_type === 'pdf' ||
      doc.file_type === 'image'
    : false

  const analysis = doc?.metadata?.ai_analysis
  const extractedText = doc?.metadata?.extracted_text
  const extractionMethod = doc?.metadata?.extraction_method
  const hasEntities = analysis?.entities
    ? (analysis.entities.clientNames?.length ?? 0) > 0 ||
      (analysis.entities.dates?.length ?? 0) > 0 ||
      (analysis.entities.providerNames?.length ?? 0) > 0 ||
      (analysis.entities.policyNumbers?.length ?? 0) > 0 ||
      (analysis.entities.financialAmounts?.length ?? 0) > 0 ||
      (analysis.entities.addresses?.length ?? 0) > 0 ||
      (analysis.entities.referenceNumbers?.length ?? 0) > 0
    : false

  const handleReuploadFile = async (file: File) => {
    if (!doc) return
    setReuploadError(null)
    setReuploadSuccess(null)

    if (file.size > MAX_REUPLOAD_SIZE) {
      setReuploadError(`File exceeds ${MAX_REUPLOAD_SIZE / 1024 / 1024}MB limit.`)
      return
    }

    if (!doc.client_id) {
      setReuploadError('Client ID missing for this document. Please retry from the client documents page.')
      return
    }

    setReuploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', doc.name || file.name)
      formData.append('client_id', doc.client_id)
      formData.append('metadata', JSON.stringify({
        replaced_document_id: doc.id,
        original_file_name: doc.file_name,
      }))

      const uploadRes = await fetch('/api/documents/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json().catch(() => ({}))
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData?.error || 'Failed to upload replacement file')
      }

      await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
      setReuploadSuccess('Replacement uploaded. The new document will reprocess shortly.')
      onReuploaded?.()
      setTimeout(() => {
        onClose()
      }, 800)
    } catch (err) {
      setReuploadError(err instanceof Error ? err.message : 'Failed to replace file')
    } finally {
      setReuploading(false)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    handleReuploadFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[95vw] max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {doc?.file_name || doc?.name || 'Document Preview'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xlsx,.msg,.eml,.txt,.png,.jpg,.jpeg,.gif"
            />
            {doc && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={reuploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reuploading ? 'animate-spin' : ''}`} />
                Replace file
              </button>
            )}
            {doc && (
              <a
                href={`/api/documents/download/${doc.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left panel: Original document */}
            <div className="flex-1 border-r border-gray-200 flex flex-col min-w-0">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500 uppercase">Original Document</span>
              </div>
              <div className="flex-1 overflow-auto">
                {isPreviewable ? (
                  doc?.mime_type?.startsWith('image/') || doc?.file_type === 'image' ? (
                    <div className="flex items-center justify-center h-full p-4">
                      <div className="relative h-full w-full">
                        <Image
                          src={`/api/documents/preview/${doc!.id}`}
                          alt={doc!.file_name || doc!.name || 'Document preview'}
                          fill
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    <iframe
                      src={`/api/documents/preview/${doc!.id}`}
                      className="w-full h-full border-0"
                      title="Document preview"
                    />
                  )
                ) : (
                  <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 mb-2">
                        Preview not available for this file type
                      </p>
                      <a
                        href={`/api/documents/download/${doc!.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download file
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right panel: Extracted content & analysis */}
            <div className="w-[420px] flex-shrink-0 flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500 uppercase">Extracted Content & Analysis</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(reuploadError || reuploadSuccess) && (
                  <div className={`p-3 rounded-lg ${reuploadError ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    <p className={`text-sm ${reuploadError ? 'text-red-600' : 'text-emerald-700'}`}>
                      {reuploadError || reuploadSuccess}
                    </p>
                  </div>
                )}
                {/* AI Analysis section */}
                {analysis ? (
                  <>
                    {/* Summary */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-1.5">Summary</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
                    </div>

                    {/* Classification + Confidence */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-1.5">Classification</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <Tag className="h-3 w-3" />
                          {CLASSIFICATION_LABELS[analysis.classification] || analysis.classification}
                        </span>
                        <span className="text-xs text-gray-400">
                          {Math.round(analysis.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>

                    {/* Entities */}
                    {hasEntities && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1.5">Entities</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.entities.clientNames?.map((name, i) => (
                            <span key={`n-${i}`} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                              <User className="h-3 w-3 text-gray-500" />
                              {name}
                            </span>
                          ))}
                          {analysis.entities.providerNames?.map((name, i) => (
                            <span key={`p-${i}`} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                              <Building className="h-3 w-3 text-gray-500" />
                              {name}
                            </span>
                          ))}
                          {analysis.entities.policyNumbers?.map((num, i) => (
                            <span key={`pol-${i}`} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                              <Hash className="h-3 w-3 text-gray-500" />
                              {num}
                            </span>
                          ))}
                          {analysis.entities.financialAmounts?.map((fa, i) => (
                            <span key={`fa-${i}`} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                              <DollarSign className="h-3 w-3 text-gray-500" />
                              {formatCurrency(fa.amount, fa.currency)} — {fa.context}
                            </span>
                          ))}
                          {analysis.entities.dates?.map((d, i) => (
                            <span key={`d-${i}`} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                              <Calendar className="h-3 w-3 text-gray-500" />
                              {d}
                            </span>
                          ))}
                          {analysis.entities.addresses?.map((addr, i) => (
                            <span key={`a-${i}`} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                              <MapPin className="h-3 w-3 text-gray-500" />
                              {addr}
                            </span>
                          ))}
                          {analysis.entities.referenceNumbers?.map((ref, i) => (
                            <span key={`r-${i}`} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                              <Hash className="h-3 w-3 text-gray-500" />
                              {ref}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : doc?.metadata?.ai_error ? (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">AI analysis failed: {doc.metadata.ai_error}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">No AI analysis available.</p>
                  </div>
                )}

                {/* Extraction method badge */}
                {extractionMethod && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1.5">Extraction Method</h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <Sparkles className="h-3 w-3" />
                      {extractionMethod}
                    </span>
                  </div>
                )}

                {/* Extracted text */}
                {extractedText ? (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1.5">
                      Extracted Text
                      {doc?.metadata?.extracted_text_length && (
                        <span className="ml-1 font-normal text-gray-400">
                          ({doc.metadata.extracted_text_length.toLocaleString()} chars)
                        </span>
                      )}
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-[400px] overflow-y-auto">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
                        {extractedText}
                      </pre>
                    </div>
                  </div>
                ) : doc?.metadata?.extraction_error ? (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">Extraction failed: {doc.metadata.extraction_error}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentPreviewModal
