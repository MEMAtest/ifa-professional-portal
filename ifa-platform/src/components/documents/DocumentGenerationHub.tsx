import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  FileText, 
  Download, 
  Send, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Plus,
  FileStack,
  RefreshCw,
  Filter,
  X
} from 'lucide-react'
import clientLogger from '@/lib/logging/clientLogger'
import { FileReviewModal } from './FileReviewModal'
import { renderMarkdown } from '@/lib/documents/markdownRenderer'
import { generateFileReviewPDF, generateFileReviewDOCX } from '@/lib/documents/fileReviewExport'

interface Assessment {
  id: string
  type: 'suitability' | 'atr' | 'cfl' | 'vulnerability'
  completedAt: string
  score?: number
  status?: string
  hasDocument?: boolean
  documentId?: string
}

interface DocumentGenerationHubProps {
  clientId: string
  clientName: string
  clientEmail?: string
}

interface FileReviewDoc {
  id: string
  name: string
  file_name: string
  created_at: string
  metadata?: {
    type?: string
    reviewMarkdown?: string
    generatedAt?: string
    documentsAnalyzed?: number
    totalDocuments?: number
    aiProvider?: string
    workflow?: {
      steps?: Array<{
        id: string
        label: string
        done: boolean
        completedAt?: string | null
      }>
    }
  }
}

export default function DocumentGenerationHub({
  clientId,
  clientName,
  clientEmail
}: DocumentGenerationHubProps) {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([])
  const [generatingBatch, setGeneratingBatch] = useState(false)
  const [generatingCombined, setGeneratingCombined] = useState(false)
  const [generatingIndividual, setGeneratingIndividual] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileReviews, setFileReviews] = useState<FileReviewDoc[]>([])
  const [showFileReviewModal, setShowFileReviewModal] = useState(false)
  const [reviewPreview, setReviewPreview] = useState<{
    id: string
    title: string
    markdown: string
    workflowSteps: Array<{
      id: string
      label: string
      done: boolean
      completedAt?: string | null
    }>
  } | null>(null)
  const [workflowUpdatingId, setWorkflowUpdatingId] = useState<string | null>(null)
  const [workflowError, setWorkflowError] = useState<string | null>(null)

  const fetchAssessments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all assessment types for the client
      const assessmentTypes = ['suitability', 'atr', 'cfl', 'vulnerability']
      const allAssessments: Assessment[] = []

      for (const type of assessmentTypes) {
        try {
          const response = await fetch(`/api/assessments/${type}?clientId=${clientId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.data) {
              allAssessments.push({
                id: data.data.id,
                type: type as Assessment['type'],
                completedAt: data.data.created_at || data.data.assessment_date,
                score: data.data.total_score || data.data.suitability_score,
                status: data.data.is_current ? 'Current' : 'Historical',
                hasDocument: false // Will be updated later
              })
            }
          }
        } catch (err) {
          clientLogger.error(`Error fetching ${type} assessment:`, err)
        }
      }

      // Check for existing documents
      const docsResponse = await fetch(`/api/documents/client/${clientId}`)
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        const documents = docsData.documents || []
        const reviews = documents.filter((doc: any) => doc.metadata?.type === 'file_review')
        reviews.sort((a: any, b: any) => {
          const aDate = new Date(a.metadata?.generatedAt || a.created_at || 0).getTime()
          const bDate = new Date(b.metadata?.generatedAt || b.created_at || 0).getTime()
          return bDate - aDate
        })
        setFileReviews(reviews)
        
        // Mark assessments that have documents
        allAssessments.forEach(assessment => {
          const hasDoc = documents.some((doc: any) => 
            doc.metadata?.assessmentId === assessment.id ||
            doc.name.toLowerCase().includes(assessment.type)
          )
          if (hasDoc) {
            assessment.hasDocument = true
            assessment.documentId = documents.find((doc: any) => 
              doc.metadata?.assessmentId === assessment.id
            )?.id
          }
        })
      }

      setAssessments(allAssessments)
    } catch (err) {
      setError('Failed to load assessments')
      clientLogger.error('Error loading assessments:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  const workflowLinks = useMemo(() => ({
    suitability: `/assessments/suitability?clientId=${clientId}`,
    atr: `/assessments/atr?clientId=${clientId}`,
    cfl: `/assessments/cfl?clientId=${clientId}`,
  }), [clientId])

  const handleWorkflowToggle = useCallback(async (stepId: string) => {
    if (!reviewPreview) return
    const currentStep = reviewPreview.workflowSteps.find((step) => step.id === stepId)
    if (!currentStep) return
    const nextDone = !currentStep.done
    const previousSteps = reviewPreview.workflowSteps
    const nextSteps = reviewPreview.workflowSteps.map((step) =>
      step.id === stepId
        ? { ...step, done: nextDone, completedAt: nextDone ? new Date().toISOString() : null }
        : step
    )

    setReviewPreview({ ...reviewPreview, workflowSteps: nextSteps })
    setWorkflowUpdatingId(stepId)
    setWorkflowError(null)

    try {
      const response = await fetch(`/api/documents/${reviewPreview.id}/workflow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, done: nextDone }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update workflow')
      }
      const updatedSteps = data.document?.metadata?.workflow?.steps
      if (Array.isArray(updatedSteps)) {
        setReviewPreview({ ...reviewPreview, workflowSteps: updatedSteps })
      }
    } catch (err) {
      setReviewPreview({ ...reviewPreview, workflowSteps: previousSteps })
      setWorkflowError(err instanceof Error ? err.message : 'Failed to update workflow')
    } finally {
      setWorkflowUpdatingId(null)
    }
  }, [reviewPreview])

  const handleSelectAll = () => {
    if (selectedAssessments.length === assessments.length) {
      setSelectedAssessments([])
    } else {
      setSelectedAssessments(assessments.map(a => a.id))
    }
  }

  const handleSelectAssessment = (assessmentId: string) => {
    setSelectedAssessments(prev => 
      prev.includes(assessmentId)
        ? prev.filter(id => id !== assessmentId)
        : [...prev, assessmentId]
    )
  }

  const handleGenerateIndividual = async (assessment: Assessment) => {
    setGeneratingIndividual(assessment.id)
    setError(null)

    try {
      const response = await fetch('/api/documents/generate-from-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assessmentType: assessment.type,
          assessmentId: assessment.id,
          clientId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate document')
      }

      // Update assessment to show it has a document
      setAssessments(prev => prev.map(a => 
        a.id === assessment.id 
          ? { ...a, hasDocument: true, documentId: data.documentId }
          : a
      ))

      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGeneratingIndividual(null)
    }
  }

  const handleGenerateBatch = async () => {
    if (selectedAssessments.length === 0) {
      setError('Please select assessments to generate documents')
      return
    }

    setGeneratingBatch(true)
    setError(null)

    try {
      const selectedAssessmentData = assessments.filter(a => 
        selectedAssessments.includes(a.id)
      )

      // Generate documents for each selected assessment
      const promises = selectedAssessmentData.map(assessment => 
        fetch('/api/documents/generate-from-assessment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            assessmentType: assessment.type,
            assessmentId: assessment.id,
            clientId
          })
        })
      )

      const results = await Promise.allSettled(promises)
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (failed > 0) {
        setError(`Generated ${successful} documents, ${failed} failed`)
      } else {
        setShowSuccessMessage(true)
        setTimeout(() => setShowSuccessMessage(false), 3000)
      }

      // Refresh assessments to show updated document status
      await fetchAssessments()
      setSelectedAssessments([])
    } catch (err) {
      setError('Batch generation failed')
    } finally {
      setGeneratingBatch(false)
    }
  }

  const handleGenerateCombined = async () => {
    setGeneratingCombined(true)
    setError(null)

    try {
      const assessmentIds = selectedAssessments.length > 0 
        ? selectedAssessments 
        : assessments.map(a => a.id)

      const response = await fetch('/api/documents/generate-combined', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId,
          assessmentIds,
          reportType: 'annual_review'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate combined report')
      }

      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 3000)
      
      // Refresh to show new document
      await fetchAssessments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Combined report generation failed')
    } finally {
      setGeneratingCombined(false)
    }
  }

  const getAssessmentIcon = (type: string) => {
    const icons = {
      suitability: '📋',
      atr: '📊',
      cfl: '💰',
      vulnerability: '🛡️'
    }
    return icons[type as keyof typeof icons] || '📄'
  }

  const getAssessmentName = (type: string) => {
    const names = {
      suitability: 'Suitability Assessment',
      atr: 'Attitude to Risk',
      cfl: 'Capacity for Loss',
      vulnerability: 'Vulnerability Assessment'
    }
    return names[type as keyof typeof names] || type
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Document Generation Hub</h2>
            <p className="text-sm text-gray-500 mt-1">
              Generate documents from {clientName}&apos;s assessments
            </p>
          </div>
          <button
            onClick={fetchAssessments}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh assessments"
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800">Documents generated successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}
      </div>

      {/* File Review Section */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Client File Review</h3>
            <p className="text-xs text-gray-500 mt-1">
              Comprehensive intelligence-driven review of all uploaded documents and assessments.
            </p>
          </div>
          <button
            onClick={() => setShowFileReviewModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            {fileReviews.length === 0 ? 'Generate File Review' : 'Generate New File Review'}
          </button>
        </div>

        {fileReviews.length > 0 && (
          <div className="mt-4 border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {fileReviews[0].name || fileReviews[0].file_name || 'File Review'}
              </p>
              <p className="text-xs text-gray-500">
                Generated {formatDate(fileReviews[0].metadata?.generatedAt || fileReviews[0].created_at)} ·
                {' '}Documents analysed: {fileReviews[0].metadata?.documentsAnalyzed ?? '—'} ·
                {' '}{fileReviews[0].metadata?.documentsAnalyzed ? `Coverage: ${fileReviews[0].metadata.documentsAnalyzed} docs` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const markdown = fileReviews[0].metadata?.reviewMarkdown || ''
                  if (!markdown) return
                  setWorkflowError(null)
                  setWorkflowUpdatingId(null)
                  setReviewPreview({
                    id: fileReviews[0].id,
                    title: fileReviews[0].name || 'File Review',
                    markdown,
                    workflowSteps: fileReviews[0].metadata?.workflow?.steps || [],
                  })
                }}
                disabled={!fileReviews[0].metadata?.reviewMarkdown}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <button
                onClick={() => {
                  const markdown = fileReviews[0].metadata?.reviewMarkdown || ''
                  if (markdown) generateFileReviewPDF(markdown, clientName, fileReviews[0].metadata)
                }}
                disabled={!fileReviews[0].metadata?.reviewMarkdown}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </button>
              <button
                onClick={() => {
                  const markdown = fileReviews[0].metadata?.reviewMarkdown || ''
                  if (markdown) generateFileReviewDOCX(markdown, clientName, fileReviews[0].metadata)
                }}
                disabled={!fileReviews[0].metadata?.reviewMarkdown}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                DOCX
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerateBatch}
            disabled={selectedAssessments.length === 0 || generatingBatch}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generatingBatch ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileStack className="h-4 w-4" />
            )}
            Generate Selected ({selectedAssessments.length})
          </button>

          <button
            onClick={handleGenerateCombined}
            disabled={assessments.length === 0 || generatingCombined}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generatingCombined ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Generate Combined Report
          </button>

          <button
            onClick={handleSelectAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Filter className="h-4 w-4" />
            {selectedAssessments.length === assessments.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {/* Assessments List */}
      <div className="divide-y divide-gray-200">
        {assessments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No assessments found for this client</p>
          </div>
        ) : (
          assessments.map(assessment => (
            <div key={assessment.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedAssessments.includes(assessment.id)}
                    onChange={() => handleSelectAssessment(assessment.id)}
                    className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />

                  {/* Assessment Info */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getAssessmentIcon(assessment.type)}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {getAssessmentName(assessment.type)}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Completed: {formatDate(assessment.completedAt)}</span>
                        {assessment.score !== undefined && (
                          <span>Score: {assessment.score}</span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          assessment.status === 'Current' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {assessment.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {assessment.hasDocument ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-600">Document exists</span>
                      <button
                        onClick={() => window.open(`/documents/${assessment.documentId}`, '_blank')}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="View document"
                      >
                        <Eye className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateIndividual(assessment)}
                      disabled={generatingIndividual === assessment.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {generatingIndividual === assessment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Generate Document
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer with tips */}
      <div className="p-4 bg-gray-50 text-sm text-gray-600">
        <p>💡 Tip: Select multiple assessments to generate documents in batch, or use &quot;Generate Combined Report&quot; for a comprehensive annual review.</p>
      </div>

      <FileReviewModal
        clientId={clientId}
        clientName={clientName}
        isOpen={showFileReviewModal}
        onClose={() => setShowFileReviewModal(false)}
      />

      {reviewPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setReviewPreview(null)
              setWorkflowError(null)
              setWorkflowUpdatingId(null)
            }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-[95vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{reviewPreview.title}</h3>
              <button
                onClick={() => {
                  setReviewPreview(null)
                  setWorkflowError(null)
                  setWorkflowUpdatingId(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close file review preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-6 space-y-4 bg-white">
              {reviewPreview.workflowSteps.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Workflow Checklist</h4>
                    {workflowError && <span className="text-xs text-red-600">{workflowError}</span>}
                  </div>
                  <div className="space-y-2">
                    {reviewPreview.workflowSteps.map((step) => {
                      const link = workflowLinks[step.id as keyof typeof workflowLinks]
                      return (
                        <label key={step.id} className="flex items-start gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={step.done}
                            disabled={workflowUpdatingId === step.id || step.id === 'review_complete'}
                            onChange={() => handleWorkflowToggle(step.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={step.done ? 'line-through text-gray-400' : ''}>{step.label}</span>
                              {workflowUpdatingId === step.id && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                              )}
                            </div>
                            {link && (
                              <button
                                type="button"
                                onClick={() => window.open(link, '_blank')}
                                className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                              >
                                Open
                              </button>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              {renderMarkdown(reviewPreview.markdown)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
