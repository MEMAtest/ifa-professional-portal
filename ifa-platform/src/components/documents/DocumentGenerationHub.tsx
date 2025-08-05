import React, { useState, useEffect } from 'react'
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
  Filter
} from 'lucide-react'

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

  useEffect(() => {
    fetchAssessments()
  }, [clientId])

  const fetchAssessments = async () => {
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
          console.error(`Error fetching ${type} assessment:`, err)
        }
      }

      // Check for existing documents
      const docsResponse = await fetch(`/api/documents/client/${clientId}`)
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        const documents = docsData.documents || []
        
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
      console.error('Error loading assessments:', err)
    } finally {
      setLoading(false)
    }
  }

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
              Generate documents from {clientName}'s assessments
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
        <p>💡 Tip: Select multiple assessments to generate documents in batch, or use "Generate Combined Report" for a comprehensive annual review.</p>
      </div>
    </div>
  )
}