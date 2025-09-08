// =====================================================
// FILE: /src/app/assessments/suitability/page.tsx
// FULLY FIXED VERSION - All methods aligned with actual SuitabilityDataService
// =====================================================

'use client'

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useClientContext } from '@/hooks/useClientContext'
import { NavigationGuard } from '@/components/ui/NavigationGuard'
import { useSuitabilityForm } from '@/hooks/suitability/useSuitabilityForm'
import { useSuitabilityProgress } from '@/hooks/suitability/useSuitabilityProgress'
import { useSuitabilityValidation } from '@/hooks/suitability/useSuitabilityValidation'
import { useSuitabilityAI } from '@/hooks/suitability/useSuitabilityAI'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'

// Components
import { SuitabilityHeader } from '@/components/suitability/SuitabilityHeader'
import { SuitabilityProgress } from '@/components/suitability/SuitabilityProgress'
import { SuitabilityForm } from '@/components/suitability/SuitabilityForm'
import { SuitabilitySummary } from '@/components/suitability/SuitabilitySummary'
import { AIAssistantPanel } from '@/components/suitability/AIAssistantPanel'

// Versioning Components
import { CreateNewVersionButton } from '@/components/suitability/CreateNewVersionButton'
import { VersionComparison } from '@/components/suitability/VersionComparison'

// UI Components
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Checkbox } from '@/components/ui/Checkbox'

// Icons
import { 
  AlertTriangle, 
  Users, 
  RefreshCw, 
  WifiOff, 
  Save, 
  Send, 
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  Sparkles,
  Shield,
  AlertCircle,
  ChevronRight,
  History,
  Lock,
  GitBranch,
  Clock,
  GitCommit,
  Eye,
  Download,
  Mail,
  FileSignature,
  ClipboardList,
  FileCheck,
  ExternalLink,
  CheckCircle2,
  User,
  Calendar
} from 'lucide-react'

// Services & Utils
import { SuitabilityDataService } from '@/services/suitability/SuitabilityDataService'
import { EnhancedDocumentGenerationService } from '@/services/EnhancedDocumentGenerationService'
import { validationEngine } from '@/lib/suitability/validationEngine'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// Types
import type { 
  SuitabilityFormData, 
  PulledPlatformData,
  ValidationError,
  SuitabilitySection
} from '@/types/suitability'

// Define AssessmentVersionInfo type locally 
interface AssessmentVersionInfo {
  id: string
  client_id: string
  version_number: number | null
  created_at: string | null
  updated_at: string | null
  is_draft: boolean | null
  is_final: boolean | null
  is_current: boolean | null
  status: string | null
  completion_percentage: number | null
  parent_assessment_id?: string | null
}

// =====================================================
// IMPORT AND TRANSFORM SECTIONS
// =====================================================

import { suitabilitySections as rawSections } from '@/config/suitability/sections'

type SectionStatus = 'complete' | 'partial' | 'incomplete' | 'error'
type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'email' | 'tel' | 'address'

const suitabilitySections: SuitabilitySection[] = rawSections.map(section => {
  const getStatus = (status: any): SectionStatus => {
    if (status === 'complete') return 'complete'
    if (status === 'partial') return 'partial'
    if (status === 'error') return 'error'
    return 'incomplete'
  }
  
  const getFieldType = (type: string): FieldType => {
    const validTypes: FieldType[] = ['text', 'number', 'select', 'textarea', 'radio', 'checkbox', 'date', 'email', 'tel', 'address']
    return validTypes.includes(type as FieldType) ? (type as FieldType) : 'text'
  }
  
  return {
    ...section,
    status: getStatus(section.status),
    fields: section.fields?.map(field => ({
      ...field,
      type: getFieldType(field.type),
      required: field.required || false,
      options: field.options || undefined,
      placeholder: field.placeholder || undefined,
      validation: field.validation || undefined,
      autoGenerate: field.autoGenerate || false,
      calculate: field.calculate || undefined,
      dependsOn: field.dependsOn || undefined,
      smartDefault: field.smartDefault || undefined,
      helpText: field.helpText || undefined,
      pullFrom: field.pullFrom || undefined,
      aiSuggested: field.aiSuggested || false,
      validateWith: field.validateWith || undefined,
      asyncValidation: field.asyncValidation || false,
      realTimeSync: field.realTimeSync || false,
      trackChanges: field.trackChanges || false
    })) || [],
    conditionalFields: (section as any).conditionalFields || undefined,
    aiEnabled: (section as any).aiEnabled !== undefined ? (section as any).aiEnabled : true,
    chartEnabled: (section as any).chartEnabled || false,
    pulledDataFields: (section as any).pulledDataFields || []
  } as SuitabilitySection
})

// =====================================================
// CONSTANTS
// =====================================================

const MINIMUM_COMPLETION_PERCENTAGE = 80 // Can be submitted at 80%
const RECOMMENDED_COMPLETION_PERCENTAGE = 100 // Full compliance recommended

// =====================================================
// REPORT GENERATION MODAL COMPONENT
// =====================================================

interface ReportGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  assessmentId: string
  clientId: string
  clientName: string
  version: number
  completionPercentage: number
  onGenerate: (reportTypes: string[]) => Promise<void>
  isGenerating: boolean
}

const ReportGenerationModal: React.FC<ReportGenerationModalProps> = ({
  isOpen,
  onClose,
  assessmentId,
  clientId,
  clientName,
  version,
  completionPercentage,
  onGenerate,
  isGenerating
}) => {
  const { toast } = useToast()
  const [selectedReports, setSelectedReports] = useState<Record<string, boolean>>({
    clientLetter: true,
    advisorReport: false,
    executiveSummary: false,
    fullReport: false,
    complianceReport: false
  })
  
  const reportDescriptions = {
    clientLetter: {
      title: 'Client Letter',
      description: 'Professional letter to client with recommendations and next steps',
      icon: Mail,
      color: 'blue'
    },
    advisorReport: {
      title: 'Advisor Report',
      description: 'Internal technical documentation for compliance and records',
      icon: ClipboardList,
      color: 'purple'
    },
    executiveSummary: {
      title: 'Executive Summary',
      description: 'High-level overview for senior management review',
      icon: FileText,
      color: 'green'
    },
    fullReport: {
      title: 'Full Assessment Report',
      description: 'Complete detailed assessment with all sections and analysis',
      icon: FileCheck,
      color: 'orange'
    },
    complianceReport: {
      title: 'FCA Compliance Report',
      description: 'Regulatory-focused report meeting FCA requirements',
      icon: Shield,
      color: 'red'
    }
  }
  
  const handleToggleReport = (reportType: string) => {
    setSelectedReports(prev => ({
      ...prev,
      [reportType]: !prev[reportType]
    }))
  }
  
  const handleGenerateReports = async () => {
    const selectedTypes = Object.entries(selectedReports)
      .filter(([_, selected]) => selected)
      .map(([type, _]) => type)
    
    if (selectedTypes.length === 0) {
      toast({
        title: 'No Reports Selected',
        description: 'Please select at least one report type to generate',
        variant: 'destructive'
      })
      return
    }
    
    await onGenerate(selectedTypes)
    
    // Close modal after successful generation
    onClose()
  }
  
  const selectedCount = Object.values(selectedReports).filter(Boolean).length
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Generate Professional Reports</h2>
              <p className="text-sm text-gray-600 mt-1">
                {clientName} • Version {version} • {completionPercentage}% Complete
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              disabled={isGenerating}
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {completionPercentage < 100 && (
            <Alert className="mb-4 border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm">
                <strong>Assessment is {completionPercentage}% complete.</strong> Generated reports will indicate missing sections.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-3">
            {Object.entries(reportDescriptions).map(([key, config]) => {
              const Icon = config.icon
              const isSelected = selectedReports[key]
              
              return (
                <div
                  key={key}
                  className={cn(
                    "border rounded-lg p-4 cursor-pointer transition-all",
                    isSelected 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                  onClick={() => handleToggleReport(key)}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "mt-0.5 flex items-center justify-center w-10 h-10 rounded-lg",
                      isSelected ? `bg-${config.color}-100` : "bg-gray-100"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        isSelected ? `text-${config.color}-600` : "text-gray-500"
                      )} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{config.title}</h3>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleReport(key)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {config.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Report Details</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• All reports generated as PDF documents</li>
              <li>• Include version tracking and timestamp</li>
              <li>• Stored securely in client document repository</li>
              <li>• Available for digital signature via DocuSeal</li>
              <li>• FCA-compliant formatting and disclaimers included</li>
            </ul>
          </div>
        </div>
        
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedCount === 0 
                ? "Select at least one report to generate"
                : `${selectedCount} report${selectedCount === 1 ? '' : 's'} selected`
              }
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateReports}
                disabled={selectedCount === 0 || isGenerating}
                className="min-w-[140px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate ({selectedCount})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MISSING FIELDS MODAL COMPONENT
// =====================================================

interface MissingFieldsModalProps {
  missingSections: Array<{
    sectionId: string
    sectionName: string
    missingFields: Array<{
      fieldId: string
      fieldName: string
      required: boolean
    }>
  }>
  completionPercentage: number
  onClose: () => void
  onProceed: () => void
  onNavigateToSection?: (sectionId: string) => void
}

const MissingFieldsModal: React.FC<MissingFieldsModalProps> = ({
  missingSections,
  completionPercentage,
  onClose,
  onProceed,
  onNavigateToSection
}) => {
  const totalMissingFields = missingSections.reduce(
    (acc, section) => acc + section.missingFields.length, 0
  )
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Incomplete Assessment Warning</h2>
              <p className="text-sm text-gray-600 mt-1">
                Assessment is {completionPercentage}% complete. {totalMissingFields} fields are missing.
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <Alert className="mb-4 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm">
              <strong>Important:</strong> Submitting an incomplete assessment means:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Generated reports will have missing sections clearly marked</li>
                <li>You can return to complete missing fields at any time</li>
                <li>FCA compliance may require 100% completion before client presentation</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Missing Information by Section:</h3>
            
            {missingSections.map((section) => (
              <div key={section.sectionId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{section.sectionName}</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose()
                      onNavigateToSection?.(section.sectionId)
                    }}
                  >
                    Go to Section
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {section.missingFields.map((field) => (
                    <div key={field.fieldId} className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        field.required ? "bg-red-500" : "bg-yellow-500"
                      )} />
                      <span className="text-sm text-gray-600">
                        {field.fieldName}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Progress value={completionPercentage} className="w-32 h-2" />
              <span className="text-sm text-gray-600">{completionPercentage}% Complete</span>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Continue Editing
              </Button>
              <Button 
                onClick={onProceed}
                className={cn(
                  completionPercentage >= RECOMMENDED_COMPLETION_PERCENTAGE
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
                )}
              >
                Submit Anyway ({completionPercentage}%)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// VALIDATION SUMMARY COMPONENT
// =====================================================

interface ValidationSummaryProps {
  errors: ValidationError[]
  warnings?: any[]
  onClose: () => void
  onNavigateToError?: (sectionId: string) => void
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors,
  warnings = [],
  onClose,
  onNavigateToError
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Validation Summary</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        {errors.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-red-600 mb-2">Critical Errors ({errors.filter(e => e.severity === 'critical').length})</h3>
            <div className="space-y-2">
              {errors.filter(e => e.severity === 'critical').map((error, index) => (
                <div 
                  key={index} 
                  className="p-3 bg-red-50 border border-red-200 rounded cursor-pointer hover:bg-red-100"
                  onClick={() => onNavigateToError?.(error.sectionId)}
                >
                  <p className="text-sm text-red-800">{error.message}</p>
                  <p className="text-xs text-red-600 mt-1">Section: {error.sectionId}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {warnings.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-yellow-600 mb-2">Warnings ({warnings.length})</h3>
            <div className="space-y-2">
              {warnings.map((warning: any, index: number) => (
                <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">{warning.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {errors.length === 0 && warnings.length === 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800">All validations passed!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const calculateMissingFields = (
  formData: SuitabilityFormData,
  sections: SuitabilitySection[]
): Array<{
  sectionId: string
  sectionName: string
  missingFields: Array<{
    fieldId: string
    fieldName: string
    required: boolean
  }>
}> => {
  const missingSections: Array<any> = []
  
  sections.forEach(section => {
    const missingFields: Array<any> = []
    const sectionData = (formData as any)[section.id] || {}
    
    section.fields?.forEach(field => {
      const value = sectionData[field.id]
      const isEmpty = value === undefined || value === null || value === '' || 
        (Array.isArray(value) && value.length === 0)
      
      if (isEmpty) {
        missingFields.push({
          fieldId: field.id,
          fieldName: field.label,
          required: field.required || false
        })
      }
    })
    
    if (missingFields.length > 0) {
      missingSections.push({
        sectionId: section.id,
        sectionName: section.title,
        missingFields
      })
    }
  })
  
  return missingSections
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function SuitabilityAssessmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { client, clientId: contextClientId, isProspect } = useClientContext()
  
  // Get parameters including versioning
  const urlClientId = searchParams?.get('clientId')
  const assessmentId = searchParams?.get('assessmentId')
  const versionId = searchParams?.get('versionId')
  const viewMode = searchParams?.get('mode') || 'edit'
  const sessionClientId = typeof window !== 'undefined' 
    ? sessionStorage.getItem('selectedClientId') 
    : null
  
  const effectiveClientId = contextClientId || urlClientId || sessionClientId || 
    (isProspect ? generateUUID() : null)
  
  // Get userId from auth
  const [userId, setUserId] = useState<string | null>(null)
  
  // =====================================================
  // VERSIONING STATE
  // =====================================================
  
  const [currentVersion, setCurrentVersion] = useState<AssessmentVersionInfo | null>(null)
  const [versionHistory, setVersionHistory] = useState<AssessmentVersionInfo[]>([])
  const [canEdit, setCanEdit] = useState(true)
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [showVersionComparison, setShowVersionComparison] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [activeTab, setActiveTab] = useState<'form' | 'comparison'>('form')
  
  // =====================================================
  // CORE STATE
  // =====================================================
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)
  const [showReportGeneration, setShowReportGeneration] = useState(false)
  const [isGeneratingReports, setIsGeneratingReports] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showValidationSummary, setShowValidationSummary] = useState(false)
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false)
  const [missingSections, setMissingSections] = useState<any[]>([])
  const [savedAssessmentId, setSavedAssessmentId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoGenerateDocuments, setAutoGenerateDocuments] = useState(true)
  const [collaborators, setCollaborators] = useState<string[]>([])
  
  // Initialize Supabase client and get user
  const supabase = useMemo(() => createClient(), [])
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [supabase])
  
  // Initialize services with versioning support - FIX: No parameter to constructor
  const dataService = useMemo(
    () => new SuitabilityDataService(),
    []
  )
  
  const documentService = useMemo(
    () => EnhancedDocumentGenerationService.getInstance(),
    []
  )
  
  // Use custom hooks with version awareness
  const {
    formData,
    pulledData,
    updateField,
    updateSection,
    isLoading: isLoadingForm,
    saveError,
    loadDraft,
    setPulledData,
    saveToDraft,
    calculateCompletion,
    metrics,
    saveState,
    saveManually
  } = useSuitabilityForm({
    clientId: effectiveClientId || '',
    assessmentId: savedAssessmentId || undefined,
    autoSave: !isProspect && canEdit,
    autoSaveInterval: 30000,
    syncEnabled: !isProspect && isOnline && canEdit,
    enableConditionalLogic: true,
    enableValidation: true,
    // Fix for line 754 (in onSave callback)
onSave: async (data) => {
  if (!isProspect && dataService && canEdit && userId && savedAssessmentId) {
    // FIX: Convert data to JSON string
    await dataService.autoSaveAssessment(JSON.stringify(data), savedAssessmentId, userId)
    setLastSaved(new Date())
  }
},
    onFieldChange: (sectionId, fieldId, value) => {
      console.log(`Field changed: ${sectionId}.${fieldId}`, value)
    }
  })
  
  const {
    overallProgress,
    sectionProgress,
    trackProgress,
    isTracking
  } = useSuitabilityProgress({
    clientId: effectiveClientId || '',
    formData,
    sections: suitabilitySections
  })
  
  const {
    validationErrors,
    crossValidationErrors,
    validateField: validateFieldFn,
    validateSection: validateSectionFn,
    runCrossValidations
  } = useSuitabilityValidation({
    formData,
    pulledData,
    sections: suitabilitySections
  })
  
  const {
    aiSuggestions,
    isLoadingAI,
    getAISuggestion,
    pullPlatformData
  } = useSuitabilityAI({
    formData,
    clientId: effectiveClientId || ''
  })
  
  // =====================================================
  // REPORT GENERATION HANDLER
  // =====================================================
  
  const handleGenerateReports = useCallback(async (reportTypes: string[]) => {
    if (!savedAssessmentId || !effectiveClientId) {
      toast({
        title: 'Error',
        description: 'Assessment must be saved before generating reports',
        variant: 'destructive'
      })
      return
    }
    
    setIsGeneratingReports(true)
    const generatedReports: string[] = []
    const failedReports: string[] = []
    
    try {
      const completionPercentage = calculateCompletion()
      const missingFields = completionPercentage < 100 
        ? calculateMissingFields(formData, suitabilitySections) 
        : undefined
      
      // Generate each selected report type
      for (const reportType of reportTypes) {
        try {
          const result = await documentService.generateFromAssessment({
            assessmentType: 'suitability',
            assessmentId: savedAssessmentId,
            clientId: effectiveClientId,
            includeWarnings: completionPercentage < 100,
            missingFieldsReport: missingFields,
            reportOptions: {
              showIncompleteWarning: completionPercentage < 100,
              allowPartialGeneration: true,
              highlightMissingData: completionPercentage < 100,
              includeCompletionStatus: true,
              reportType: reportType as any
            }
          })
          
          if (result.success) {
            generatedReports.push(reportType)
          } else {
            failedReports.push(reportType)
            console.error(`Failed to generate ${reportType}:`, result.error)
          }
        } catch (error) {
          failedReports.push(reportType)
          console.error(`Error generating ${reportType}:`, error)
        }
      }
      
      // Show results
      if (generatedReports.length > 0) {
        toast({
          title: 'Reports Generated Successfully',
          description: (
            <div>
              <p>✓ Generated {generatedReports.length} report(s)</p>
              <p className="text-sm mt-1">Documents saved to client repository</p>
              {completionPercentage < 100 && (
                <p className="text-sm mt-1 text-yellow-600">
                  Note: Reports marked as {completionPercentage}% complete
                </p>
              )}
            </div>
          ) as any,
          variant: 'default',
          duration: 6000
        })
      }
      
      if (failedReports.length > 0) {
        toast({
          title: 'Some Reports Failed',
          description: `Failed to generate: ${failedReports.join(', ')}`,
          variant: 'destructive',
          duration: 5000
        })
      }
      
      setShowReportGeneration(false)
      
    } catch (error) {
      console.error('Error generating reports:', error)
      toast({
        title: 'Report Generation Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingReports(false)
    }
  }, [savedAssessmentId, effectiveClientId, formData, calculateCompletion, documentService, toast])
  
  // =====================================================
  // VERSIONING: LOAD VERSION DATA - FIXED
  // =====================================================
  
  const loadVersionData = useCallback(async () => {
    if (!dataService || !effectiveClientId) return
    
    try {
      setIsLoadingDraft(true)
      
      // FIX: Get version history directly from database
      const { data: versions, error: versionsError } = await supabase
        .from('suitability_assessments')
        .select('*')
        .eq('client_id', effectiveClientId)
        .order('version_number', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      
      if (!versionsError && versions) {
        setVersionHistory(versions as AssessmentVersionInfo[])
      }
      
      // If specific version requested, load it
      if (versionId) {
        // FIX: Use getAssessment with assessmentId parameter
        const versionData = await dataService.getAssessment(versionId)
        const versionInfo = versions?.find(v => v.id === versionId)
        
        if (versionInfo && versionData) {
          setCurrentVersion(versionInfo as AssessmentVersionInfo)
          // Check if version is finalized (not draft)
          setCanEdit(!versionInfo.is_final)
          setSavedAssessmentId(versionId)
          
          // Load into form
          Object.keys(versionData).forEach(key => {
            if (key !== '_metadata' && key !== '_aiSuggestions' && key !== '_chartData') {
              updateSection(key, versionData[key as keyof SuitabilityFormData])
            }
          })
        }
      } else {
        // Load current assessment or latest version
        if (versions && versions.length > 0) {
          const latestVersion = versions[0]
          setCurrentVersion(latestVersion as AssessmentVersionInfo)
          setSavedAssessmentId(latestVersion.id)
          setCanEdit(!latestVersion.is_final)
          
          // FIX: Load with assessmentId
          const assessment = await dataService.getAssessment(latestVersion.id)
          
          if (assessment) {
            // Load assessment data
            Object.keys(assessment).forEach(key => {
              if (key !== '_metadata' && key !== '_aiSuggestions' && key !== '_chartData') {
                updateSection(key, assessment[key as keyof SuitabilityFormData])
              }
            })
          }
        }
      }
      
      // Load pulled platform data
      if (client && !isProspect) {
        const pulled: PulledPlatformData = {
          atrScore: client.riskProfile?.attitudeToRisk,
          atrCategory: client.riskProfile?.riskTolerance,
          cflScore: Number(client.riskProfile?.capacityForLoss) || undefined,
          cflCategory: client.riskProfile?.capacityForLoss,
          vulnerabilityScore: client.vulnerabilityAssessment?.assessmentNotes,
          vulnerabilityFactors: client.vulnerabilityAssessment?.vulnerabilityFactors,
          clientMetrics: {
            totalAssets: client.financialProfile?.totalAssets,
            totalLiabilities: Number(client.financialProfile?.otherLiabilities) || 0,
            investmentExperience: client.riskProfile?.knowledgeExperience
          }
        }
        setPulledData(pulled)
      }
      
      toast({
        title: currentVersion?.is_draft ? 'Draft Loaded' : 'Assessment Loaded',
        description: `Version ${currentVersion?.version_number || 1} loaded successfully`,
        variant: 'default'
      })
      
    } catch (error) {
      console.error('Error loading version data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assessment version',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingDraft(false)
    }
  }, [dataService, versionId, client, isProspect, updateSection, setPulledData, toast, supabase, effectiveClientId, currentVersion])
  
  // =====================================================
  // HANDLE SAVE WITH VERSION AWARENESS - FIXED
  // =====================================================
  
  const handleSaveAssessment = useCallback(async () => {
    if (!dataService || !effectiveClientId || !userId) {
      toast({
        title: 'Error',
        description: 'Unable to save - missing required information',
        variant: 'destructive'
      })
      return
    }
    
    // Check if can edit
    if (!canEdit) {
      toast({
        title: 'Cannot Edit',
        description: 'This version is finalized and cannot be edited. Create a new version to make changes.',
        variant: 'destructive'
      })
      return
    }
    
    try {
      setIsSaving(true)
      
      const completionPercentage = calculateCompletion()
      const assessmentData = {
        ...formData,
        _metadata: {
          ...formData._metadata,
          completionPercentage,
          lastSaved: new Date().toISOString(),
          status: completionPercentage === 100 ? 'completed' : 'in_progress',
          updatedAt: new Date().toISOString()
        }
      }
      
      // FIX: Use autoSaveAssessment with correct parameters
      const assessmentId = savedAssessmentId || generateUUID()
      await dataService.autoSaveAssessment(JSON.stringify(assessmentData), assessmentId, userId)
      
      setSavedAssessmentId(assessmentId)
      setLastSaved(new Date())
      
      toast({
        title: 'Success',
        description: completionPercentage < 100 
          ? `Draft saved (${completionPercentage}% complete)`
          : 'Assessment saved successfully',
        variant: 'default'
      })
      
    } catch (error) {
      console.error('Error saving assessment:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save assessment',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }, [dataService, effectiveClientId, userId, canEdit, formData, calculateCompletion, toast, savedAssessmentId])
  
  // =====================================================
  // SUBMIT & FINALIZE - FIXED
  // =====================================================
  
  const handleSubmit = useCallback(async () => {
    if (!dataService || !effectiveClientId || !savedAssessmentId || !userId) {
      toast({
        title: 'Error',
        description: 'Please save the assessment first',
        variant: 'destructive'
      })
      return
    }
    
    // Check if can edit
    if (!canEdit) {
      toast({
        title: 'Cannot Submit',
        description: 'This version is already finalized',
        variant: 'destructive'
      })
      return
    }
    
    try {
      // Calculate completion percentage
      const completionPercentage = calculateCompletion()
      
      // Check minimum completion threshold
      if (completionPercentage < MINIMUM_COMPLETION_PERCENTAGE) {
        toast({
          title: 'Insufficient Completion',
          description: `Assessment is only ${completionPercentage}% complete. Minimum ${MINIMUM_COMPLETION_PERCENTAGE}% required for submission.`,
          variant: 'destructive'
        })
        return
      }
      
      // If not 100%, show missing fields modal
      if (completionPercentage < RECOMMENDED_COMPLETION_PERCENTAGE) {
        const missing = calculateMissingFields(formData, suitabilitySections)
        setMissingSections(missing)
        setShowMissingFieldsModal(true)
        return
      }
      
      // Proceed with submission
      await submitAssessment()
      
    } catch (error) {
      console.error('Error submitting assessment:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit assessment',
        variant: 'destructive'
      })
    }
  }, [dataService, effectiveClientId, savedAssessmentId, userId, canEdit, formData, calculateCompletion, toast])
  
  // Actual submission logic with versioning and auto-show reports - FIXED
  const submitAssessment = useCallback(async () => {
    if (!dataService || !savedAssessmentId || !userId) return
    
    try {
      setIsSubmitting(true)
      
      const completionPercentage = calculateCompletion()
      
      // FIX: Submit with all 3 required parameters
      await dataService.submitAssessment(savedAssessmentId, userId)
      
      // Update version info
      setCurrentVersion(prev => prev ? { 
        ...prev, 
        is_final: true, 
        is_draft: false 
      } : null)
      setCanEdit(false)
      
      // Show success toast
      toast({
        title: 'Assessment Submitted Successfully',
        description: `Assessment finalized at ${completionPercentage}% completion. You can now generate reports.`,
        variant: 'default',
        duration: 5000
      })
      
      // Automatically show report generation modal after submission
      setTimeout(() => {
        setShowReportGeneration(true)
      }, 1500) // Small delay to let the user see the success message
      
    } catch (error) {
      console.error('Error in submitAssessment:', error)
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Failed to submit assessment',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
      setShowMissingFieldsModal(false)
    }
  }, [dataService, savedAssessmentId, userId, formData, calculateCompletion, toast])
  
  // =====================================================
  // HANDLE VERSION CREATION - FIXED
  // =====================================================
  
  const handleVersionCreated = useCallback((newVersion: any) => {
    // FIX: Map the version to correct type
    const versionInfo: AssessmentVersionInfo = {
      id: newVersion.id,
      client_id: newVersion.client_id || effectiveClientId || '',
      version_number: newVersion.version_number || null,
      created_at: newVersion.created_at || null,
      updated_at: newVersion.updated_at || null,
      is_draft: newVersion.is_draft || null,
      is_final: newVersion.is_final || null,
      is_current: newVersion.is_current || null,
      status: newVersion.status || null,
      completion_percentage: newVersion.completion_percentage || null,
      parent_assessment_id: newVersion.parent_assessment_id || null
    }
    
    setCurrentVersion(versionInfo)
    setSavedAssessmentId(versionInfo.id)
    setCanEdit(true)
    
    // Reload version history
    loadVersionData()
    
    toast({
      title: 'New Version Created',
      description: `Version ${versionInfo.version_number || 'New'} created successfully`,
      variant: 'default'
    })
  }, [loadVersionData, toast, effectiveClientId])
  
  // =====================================================
  // EFFECTS
  // =====================================================
  
  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  // Load version data on mount
  useEffect(() => {
    if (effectiveClientId && dataService) {
      loadVersionData()
    }
  }, [effectiveClientId, dataService])
  
  // Auto-save effect (version-aware) - FIXED
  useEffect(() => {
    if (!isProspect && dataService && formData && Object.keys(formData).length > 2 && canEdit && userId && savedAssessmentId) {
      const autoSaveInterval = setInterval(async () => {
        try {
          // FIX: Call with correct parameters
          await dataService.autoSaveAssessment(JSON.stringify(formData), savedAssessmentId, userId)
          setLastSaved(new Date())
        } catch (error) {
          console.error('Auto-save error:', error)
        }
      }, 30000)
      
      return () => clearInterval(autoSaveInterval)
    }
  }, [isProspect, dataService, formData, canEdit, userId, savedAssessmentId])
  
  // Check for unsaved changes before navigation
  useEffect(() => {
    const hasUnsavedChanges = saveState.isSaving || 
      (lastSaved && new Date().getTime() - lastSaved.getTime() > 60000)
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isProspect && canEdit) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveState.isSaving, lastSaved, isProspect, canEdit])
  
  // =====================================================
  // RENDER
  // =====================================================
  
  // Loading state
  if (isLoadingDraft || isLoadingForm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading assessment...</p>
          </div>
        </Card>
      </div>
    )
  }
  
  // No client selected error
  if (!effectiveClientId && !isProspect) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold">No Client Selected</h2>
            <p className="text-gray-600 text-center">
              Please select a client from the clients page before starting an assessment.
            </p>
            <Button 
              onClick={() => router.push('/clients')}
              className="mt-4"
            >
              Go to Clients
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  // Get client name for report modal
  const clientName = client 
    ? `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim()
    : 'Client'
  
  // FIX: Create properly typed current version for CreateNewVersionButton
  const buttonCurrentVersion: AssessmentVersionInfo | undefined = currentVersion 
  ? {
      id: currentVersion.id,
      client_id: currentVersion.client_id || effectiveClientId || '',
      version_number: currentVersion.version_number || 1,
      created_at: currentVersion.created_at || new Date().toISOString(),
      updated_at: currentVersion.updated_at || new Date().toISOString(),
      is_draft: currentVersion.is_draft !== null ? currentVersion.is_draft : true,
      is_final: currentVersion.is_final !== null ? currentVersion.is_final : false,
      is_current: currentVersion.is_current !== null ? currentVersion.is_current : true,
      status: currentVersion.status || 'draft',
      completion_percentage: currentVersion.completion_percentage || 0,
      parent_assessment_id: currentVersion.parent_assessment_id || null  // Changed from || undefined to || null
    }
  : undefined
  
  // Main render with enhanced version history
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Guard */}
      {!isProspect && (
        <NavigationGuard requireClient={true}>
          <></>
        </NavigationGuard>
      )}
      
      {/* Enhanced Header with Versioning */}
      <div className="bg-white border-b sticky top-0 z-40">
        <SuitabilityHeader
          client={client}
          isProspect={isProspect}
          lastSaved={lastSaved}
          isSaving={isSaving || saveState.isSaving}
          onSave={handleSaveAssessment}
          hasDraft={!!formData?._metadata}
          onBack={() => router.back()}
          onSync={() => {/* Sync handler */}}
        />
        
        {/* Version Info Bar */}
        {currentVersion && (
          <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <GitCommit className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Version {currentVersion.version_number || 1}</span>
                {currentVersion.is_draft && (
                  <Badge variant="outline" className="ml-2">Draft</Badge>
                )}
                {currentVersion.is_final && (
                  <Badge variant="default" className="ml-2">
                    <Lock className="h-3 w-3 mr-1" />
                    Finalized
                  </Badge>
                )}
                {!canEdit && (
                  <Badge variant="destructive" className="ml-2">
                    <Eye className="h-3 w-3 mr-1" />
                    Read Only
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-gray-500">
                Created: {currentVersion.created_at ? format(new Date(currentVersion.created_at), 'MMM d, yyyy h:mm a') : 'Unknown'}
              </div>
              
              {currentVersion.completion_percentage !== undefined && currentVersion.completion_percentage !== null && (
                <div className="flex items-center gap-2">
                  <Progress value={currentVersion.completion_percentage} className="w-24 h-2" />
                  <span className="text-sm text-gray-600">{currentVersion.completion_percentage}%</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Version History Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
              >
                <History className="h-4 w-4 mr-2" />
                History ({versionHistory.length})
              </Button>
              
              {/* Version Comparison Button */}
              {versionHistory.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVersionComparison(!showVersionComparison)}
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  Compare
                </Button>
              )}
              
              {/* Create New Version Button - FIXED with proper type */}
              {/* Create New Version Button - FIXED with proper type */}
{currentVersion && (
  <CreateNewVersionButton
    clientId={effectiveClientId || ''}
    currentAssessmentId={currentVersion.id}
    currentVersion={{
      ...currentVersion,
      parent_assessment_id: currentVersion.parent_assessment_id || null // Ensure it's null, not undefined
    }}
    onVersionCreated={handleVersionCreated}
    disabled={!currentVersion.is_final && (currentVersion.completion_percentage || 0) < 100}
    variant="outline"
    size="sm"
  />
)}
            </div>
          </div>
        )}
      </div>
      
      {/* Enhanced Version History Panel with Better Clickable Items */}
      {showVersionHistory && (
        <div className="bg-white border-b px-6 py-4 shadow-sm">
          <div className="space-y-2">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Version History
            </h3>
            <div className="grid gap-2 max-h-64 overflow-auto">
              {versionHistory.map((version) => {
                const isCurrentVersion = currentVersion?.id === version.id
                
                return (
                  <button
                    key={version.id}
                    onClick={() => {
                      if (!isCurrentVersion) {
                        router.push(`/assessments/suitability?clientId=${effectiveClientId}&versionId=${version.id}`)
                      }
                    }}
                    className={cn(
                      "group relative flex items-center justify-between p-3 border rounded-lg transition-all duration-200 text-left w-full",
                      isCurrentVersion 
                        ? "border-blue-500 bg-blue-50 cursor-default" 
                        : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md cursor-pointer transform hover:-translate-y-0.5",
                      !isCurrentVersion && "hover:scale-[1.02]"
                    )}
                    disabled={isCurrentVersion}
                  >
                    {/* Hover Indicator */}
                    {!isCurrentVersion && (
                      <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-400 rounded-lg pointer-events-none transition-all duration-200" />
                    )}
                    
                    <div className="flex items-center gap-3 relative">
                      {/* Version Icon with Animation */}
                      <div className={cn(
                        "transition-all duration-200",
                        !isCurrentVersion && "group-hover:text-blue-500 group-hover:scale-110"
                      )}>
                        {isCurrentVersion ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-500" />
                        ) : (
                          <FileText className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div>
                        <div className={cn(
                          "font-medium transition-colors duration-200",
                          !isCurrentVersion && "group-hover:text-blue-600"
                        )}>
                          Version {version.version_number || 1}
                          {isCurrentVersion && (
                            <span className="ml-2 text-xs text-blue-600 font-normal">(Current)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {version.created_at ? format(new Date(version.created_at), 'MMM d, yyyy h:mm a') : 'Unknown'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 relative">
                      {/* Status Badges */}
                      {version.is_final && (
                        <div className="group-hover:scale-105 transition-transform duration-200">
                          <Lock className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Completion Badge with Color Coding */}
                      <Badge 
                        variant={version.is_draft ? 'outline' : 'default'} 
                        className={cn(
                          "text-xs transition-all duration-200",
                          !isCurrentVersion && "group-hover:scale-105",
                          version.completion_percentage === 100 && "bg-green-100 text-green-700 border-green-300",
                          version.completion_percentage !== null && version.completion_percentage >= 80 && version.completion_percentage < 100 && "bg-yellow-100 text-yellow-700 border-yellow-300",
                          version.completion_percentage !== null && version.completion_percentage < 80 && "bg-red-100 text-red-700 border-red-300"
                        )}
                      >
                        {version.completion_percentage || 0}%
                      </Badge>
                      
                      {/* Open Icon - Only show on hover for non-current versions */}
                      {!isCurrentVersion && (
                        <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Connection Status */}
      {!isOnline && (
        <Alert className="mx-4 mt-4 border-yellow-200 bg-yellow-50">
          <WifiOff className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You're offline. Changes will be saved locally and synced when connection is restored.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Read-Only Warning */}
      {!canEdit && (
        <Alert className="mx-4 mt-4 border-blue-200 bg-blue-50">
          <Lock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            This version is finalized and cannot be edited. 
            <Button 
              variant="link" 
              className="p-0 h-auto ml-1 text-blue-600"
              onClick={() => {
                const button = document.querySelector('[data-testid="create-version-button"]') as HTMLElement
                button?.click()
              }}
            >
              Create a new version
            </Button>
            to make changes.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Completion Status Banner */}
      {canEdit && overallProgress < MINIMUM_COMPLETION_PERCENTAGE && (
        <Alert className="mx-4 mt-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Minimum {MINIMUM_COMPLETION_PERCENTAGE}% completion required for submission.</strong> 
            Current: {overallProgress}%
          </AlertDescription>
        </Alert>
      )}
      
      {canEdit && overallProgress >= MINIMUM_COMPLETION_PERCENTAGE && overallProgress < RECOMMENDED_COMPLETION_PERCENTAGE && (
        <Alert className="mx-4 mt-4 border-yellow-200 bg-yellow-50">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Assessment can be submitted at {overallProgress}%.</strong> 
            However, {RECOMMENDED_COMPLETION_PERCENTAGE}% completion is recommended for full FCA compliance.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Collaboration Indicator */}
      {collaborators.length > 0 && (
        <div className="mx-4 mt-4">
          <Badge variant="outline" className="gap-2">
            <Users className="h-3 w-3" />
            {collaborators.length} other user(s) viewing
          </Badge>
        </div>
      )}
      
      {/* Progress Bar */}
      <div className="px-4 py-2 bg-white border-b">
        <SuitabilityProgress
          overallProgress={overallProgress}
          sectionProgress={sectionProgress}
          validationErrors={validationErrors}
          crossValidationErrors={crossValidationErrors}
          pulledData={pulledData}
          isTracking={isTracking}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className={cn(
            "transition-all duration-300",
            showAIPanel ? "col-span-8" : "col-span-12"
          )}>
            <SuitabilityForm
              clientId={effectiveClientId || ''}
              assessmentId={savedAssessmentId || undefined}
              isProspect={isProspect}
              mode={canEdit ? (isProspect ? 'create' : 'edit') : 'view'}
              onComplete={handleSubmit}
              onCancel={() => router.back()}
              collaborators={collaborators}
              allowAI={!isProspect && canEdit}
              autoSaveInterval={30000}
            />
            
            {/* Action Buttons */}
            <Card className="mt-6 p-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting || isSaving}
                  >
                    Cancel
                  </Button>
                  {canEdit && (
                    <Button
                      variant="outline"
                      onClick={handleSaveAssessment}
                      disabled={isSubmitting || isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Progress
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-3">
                  {!isProspect && canEdit && (
                    <Button
                      variant="outline"
                      onClick={() => setShowAIPanel(!showAIPanel)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Assistant
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowValidationSummary(true)}
                    disabled={validationErrors.length === 0}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Validate ({validationErrors.length})
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!savedAssessmentId) {
                        toast({
                          title: 'Save Required',
                          description: 'Please save the assessment before generating reports',
                          variant: 'destructive'
                        })
                        return
                      }
                      setShowReportGeneration(true)
                    }}
                    disabled={!savedAssessmentId}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Reports
                  </Button>
                  
                  {canEdit && currentVersion?.is_draft && (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || isSaving || overallProgress < MINIMUM_COMPLETION_PERCENTAGE}
                      className={cn(
                        "text-white",
                        overallProgress >= RECOMMENDED_COMPLETION_PERCENTAGE
                          ? "bg-green-600 hover:bg-green-700"
                          : overallProgress >= MINIMUM_COMPLETION_PERCENTAGE
                          ? "bg-yellow-600 hover:bg-yellow-700"
                          : "bg-gray-400 cursor-not-allowed"
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit & Finalize ({overallProgress}%)
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Save Status */}
              {lastSaved && (
                <div className="mt-4 text-sm text-gray-500 text-center">
                  Last saved: {lastSaved.toLocaleTimeString()}
                  {overallProgress < 100 && canEdit && (
                    <span className="ml-2">• {100 - overallProgress}% remaining</span>
                  )}
                </div>
              )}
            </Card>
          </div>
          
          {/* AI Assistant Panel */}
          {showAIPanel && canEdit && (
            <div className="col-span-4">
              <AIAssistantPanel
                formData={formData}
                pulledData={pulledData}
                suggestions={aiSuggestions}
                onApplySuggestion={(sectionId: string, fieldId: string, value: any) => {
                  updateField(sectionId, fieldId, value)
                }}
                onGenerateSuggestions={async (sectionId: string) => {
                  await getAISuggestion(sectionId)
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Report Generation Modal */}
      <ReportGenerationModal
        isOpen={showReportGeneration}
        onClose={() => setShowReportGeneration(false)}
        assessmentId={savedAssessmentId || ''}
        clientId={effectiveClientId || ''}
        clientName={clientName}
        version={currentVersion?.version_number || 1}
        completionPercentage={overallProgress}
        onGenerate={handleGenerateReports}
        isGenerating={isGeneratingReports}
      />
      
      {/* Validation Summary Modal */}
      {showValidationSummary && (
        <ValidationSummary
          errors={validationErrors}
          warnings={crossValidationErrors}
          onClose={() => setShowValidationSummary(false)}
          onNavigateToError={(sectionId) => {
            setShowValidationSummary(false)
            const element = document.getElementById(sectionId)
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        />
      )}
      
      {/* Missing Fields Modal */}
      {showMissingFieldsModal && (
        <MissingFieldsModal
          missingSections={missingSections}
          completionPercentage={calculateCompletion()}
          onClose={() => setShowMissingFieldsModal(false)}
          onProceed={submitAssessment}
          onNavigateToSection={(sectionId) => {
            setShowMissingFieldsModal(false)
            const element = document.getElementById(sectionId)
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        />
      )}
    </div>
  )
}