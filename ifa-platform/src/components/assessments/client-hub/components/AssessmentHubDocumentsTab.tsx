'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, Download, Eye, FileText, Loader2, AlertCircle } from 'lucide-react'

import type { ComplianceAlert } from '@/types/assessment'
import { Card, Badge, Button } from '@/components/assessments/client-hub/ui'
import DocumentViewerModal from '@/components/documents/DocumentViewerModal'

type DocumentRow = {
  id: string
  name?: string
  file_name?: string
  document_type?: string
  category?: string
  type?: string
  status?: string
  created_at?: string
  assessment_id?: string
  assessment_info?: {
    assessment_id?: string
  }
  metadata?: Record<string, any>
}

export function AssessmentHubDocumentsTab(props: {
  clientId: string
  complianceAlerts: ComplianceAlert[]
}) {
  const { clientId, complianceAlerts } = props
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    if (!clientId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/client/${clientId}`)
      if (!res.ok) {
        throw new Error('Failed to load documents')
      }
      const data = await res.json()
      const docs = Array.isArray(data?.documents) ? data.documents : []
      setDocuments(docs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const normalizeType = useCallback((value?: string | null) => {
    if (!value) return ''
    return value.toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_')
  }, [])

  const isAssessmentDocument = useCallback((doc: DocumentRow) => {
    if (doc.assessment_id || doc.assessment_info?.assessment_id || doc.metadata?.assessmentId || doc.metadata?.assessmentType) {
      return true
    }
    const category = (doc.category || '').toLowerCase()
    if (category.includes('assessment')) return true
    const normalizedType = normalizeType(doc.document_type || doc.type)
    if (!normalizedType) return false
    if (normalizedType.endsWith('_report')) return true
    return normalizedType.includes('assessment')
  }, [normalizeType])

  const assessmentDocs = useMemo(() => {
    return documents.filter(isAssessmentDocument)
  }, [documents, isAssessmentDocument])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return 'N/A'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getStatusBadge = (status?: string) => {
    const normalized = (status || '').toLowerCase()
    if (normalized === 'completed' || normalized === 'generated') return <Badge className="bg-green-100 text-green-700">Generated</Badge>
    if (normalized === 'pending') return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
    if (normalized === 'failed') return <Badge className="bg-red-100 text-red-700">Failed</Badge>
    return <Badge className="bg-gray-100 text-gray-600">Draft</Badge>
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Checks</h2>
          {complianceAlerts.length > 0 && (
            <Badge className="bg-red-100 text-red-700">Action needed</Badge>
          )}
        </div>
        {complianceAlerts.length === 0 ? (
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span>All assessments are current and aligned.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {complianceAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 p-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-red-900">{alert.message}</div>
                  <div className="text-xs text-red-700 mt-1">Severity: {alert.severity}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assessment Documents</h2>
            <p className="text-sm text-gray-600">Generated reports and client-facing documents.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadDocuments}>
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading documents...
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : assessmentDocs.length === 0 ? (
          <div className="text-sm text-gray-600">No assessment documents found for this client.</div>
        ) : (
          <div className="space-y-3">
            {assessmentDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {doc.name || doc.file_name || 'Assessment Document'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {doc.document_type || doc.type || 'assessment_report'} • {formatDate(doc.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(doc.status)}
                  <Button size="sm" variant="outline" onClick={() => setSelectedDocId(doc.id)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(`/api/documents/download/${doc.id}`, '_blank')}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedDocId && (
        <DocumentViewerModal
          isOpen={!!selectedDocId}
          onClose={() => setSelectedDocId(null)}
          documentId={selectedDocId}
          defaultFullscreen={false}
        />
      )}
    </div>
  )
}
