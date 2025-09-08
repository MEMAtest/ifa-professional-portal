// =====================================================
// FILE: src/components/suitability/SuitabilitySummary.tsx
// Complete implementation
// =====================================================

import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Save, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Activity
} from 'lucide-react'
import DocumentGenerationButton from '@/components/documents/DocumentGenerationButton'
import { 
  SuitabilityFormData,
  PulledPlatformData,
  ValidationError,
  AISuggestion
} from '@/types/suitability'

interface SuitabilitySummaryProps {
  formData: SuitabilityFormData
  overallProgress: number
  sectionProgress: Record<string, { completed: number; total: number; percentage: number }>
  validationErrors: ValidationError[]
  aiSuggestions: Record<string, AISuggestion>
  pulledData: PulledPlatformData
  onSave: () => void
  onNavigateToDocuments: () => void
  showDocumentGeneration: boolean
  savedAssessmentId: string | null
  clientId: string | null
  isProspect: boolean
  isTracking: boolean
}

export const SuitabilitySummary: React.FC<SuitabilitySummaryProps> = ({
  formData,
  overallProgress,
  sectionProgress,
  validationErrors,
  aiSuggestions,
  pulledData,
  onSave,
  onNavigateToDocuments,
  showDocumentGeneration,
  savedAssessmentId,
  clientId,
  isProspect,
  isTracking
}) => {
  const totalFields = Object.values(sectionProgress).reduce((sum, s) => sum + s.total, 0)
  const completedFields = Object.values(sectionProgress).reduce((sum, s) => sum + s.completed, 0)
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Assessment Summary
        </h2>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{overallProgress}%</div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedFields}</div>
            <div className="text-sm text-gray-600">Fields Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{totalFields - completedFields}</div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{validationErrors.length}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
        </div>
        
        {!isProspect && pulledData && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Platform Integration</h4>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={pulledData.atrScore ? 'success' : 'outline'}>
                ATR: {pulledData.atrScore ? `${pulledData.atrScore}` : 'Not synced'}
              </Badge>
              <Badge variant={pulledData.cflScore ? 'success' : 'outline'}>
                CFL: {pulledData.cflScore ? `${pulledData.cflScore}` : 'Not synced'}
              </Badge>
            </div>
          </div>
        )}
        
        <div className="flex justify-center gap-4">
          <Button onClick={onSave} size="lg">
            <Save className="h-4 w-4 mr-2" />
            Save Assessment
          </Button>
          
          {savedAssessmentId && showDocumentGeneration && clientId && (
            <DocumentGenerationButton
              assessmentType="suitability"
              assessmentId={savedAssessmentId}
              clientId={clientId}
              clientName={formData.personal_information?.client_name || ''}
              clientEmail={formData.contact_details?.email || ''}
              onSuccess={() => {}}
            />
          )}
          
          {savedAssessmentId && (
            <Button onClick={onNavigateToDocuments} variant="outline" size="lg">
              <FileText className="h-4 w-4 mr-2" />
              View Documents
            </Button>
          )}
        </div>
        
        {overallProgress < 80 && (
          <p className="text-sm text-gray-500 text-center mt-4">
            Complete at least 80% to generate reports
          </p>
        )}
        
        {isProspect && (
          <div className="mt-4 p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-700 text-center">
              <AlertCircle className="inline h-4 w-4 mr-1" />
              Convert to client for permanent saving
            </p>
          </div>
        )}
        
        {isTracking && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 text-center">
              <Activity className="inline h-4 w-4 mr-1 animate-pulse" />
              Progress syncing to Assessment Hub
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
