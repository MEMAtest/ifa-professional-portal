// =====================================================
// FILE: src/components/suitability/SuitabilityForm.tsx
// FIXED: Corrected assessment ID access from autoSaveAssessment result
// =====================================================

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { type LucideIcon } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

// Component imports
import { SuitabilitySection } from './SuitabilitySection'
import { NavigationControls } from './NavigationControls'
import { AIAssistantPanel } from './AIAssistantPanel'
import { CollaborationIndicator } from './CollaborationIndicator'
import { FinancialDashboard } from './FinancialDashboard'
import { PersonalInformationSection } from './sections/PersonalInformationSection'
import { ValidationSummary } from '@/components/suitability/ValidationSummary'

// Hook imports
import { useSuitabilityForm } from '@/hooks/suitability/useSuitabilityForm'
import { useClientContext } from '@/hooks/useClientContext'

// Service imports
import { conditionalLogicEngine } from '@/lib/suitability/conditionalLogic'
import { validationEngine } from '@/lib/suitability/validationEngine'
import { aiAssistantService } from '@/services/aiAssistantService'
import { documentTemplateService } from '@/services/documentTemplateService'

// Config imports
import { suitabilitySections } from '@/config/suitability/sections'

// Type imports
import type {
  SuitabilityFormData,
  PulledPlatformData,
  ValidationError,
  AISuggestion,
  SuitabilitySection as SuitabilitySectionType,
  SuitabilityField,
  ConditionalFieldGroup
} from '@/types/suitability'

// UI imports
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'

// Icon imports
import {
  Save,
  Send,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Users,
  Clock,
  RefreshCw,
  Eye,
  Settings,
  HelpCircle,
  Loader2,
  Shield,
  TrendingUp,
  BarChart3,
  Lock,
  Unlock,
  Copy,
  Share2,
  History,
  Zap,
  User,
  Phone,
  PoundSterling,
  Target,
  GraduationCap,
  Briefcase,
  Heart,
  Calculator,
  FileCheck,
  Info,
  X,
  AlertTriangle,
  Database,
  WifiOff
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { ContactDetailsSection } from './ContactDetailsSection'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

type SectionStatus = 'complete' | 'partial' | 'incomplete' | 'error'
type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'email' | 'tel' | 'address'

interface SectionDefinition {
  id: string
  title: string
  description: string
  icon: LucideIcon
  required?: boolean
  order: number
  hasCustomComponent?: boolean
  fields?: SuitabilityField[]
  status?: SectionStatus
  fieldCount?: number
}

interface SuitabilityFormProps {
  clientId: string
  assessmentId?: string
  isProspect?: boolean
  mode?: 'create' | 'edit' | 'view'
  onComplete?: (data: SuitabilityFormData) => void
  onCancel?: () => void
  collaborators?: string[]
  allowAI?: boolean
  autoSaveInterval?: number
}

interface FormState {
  currentSection: string
  expandedSections: Set<string>
  showAIPanel: boolean
  showValidation: boolean
  showFinancialDashboard: boolean
  showVersionHistory: boolean
  isSubmitting: boolean
  lastActivity: Date
}

interface NotificationOptions {
  title: string
  description: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface RealtimeChange {
  sectionId: string
  fieldId: string
  value: any
  userId: string
  timestamp: string
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const castFieldType = (type: string): FieldType => {
  const validTypes: FieldType[] = ['text', 'number', 'select', 'textarea', 'radio', 'checkbox', 'date', 'email', 'tel', 'address']
  return validTypes.includes(type as FieldType) ? (type as FieldType) : 'text'
}

const getStatusFromString = (status?: string): SectionStatus => {
  switch (status) {
    case 'complete': return 'complete'
    case 'partial': return 'partial'
    case 'error': return 'error'
    default: return 'incomplete'
  }
}

// =====================================================
// NOTIFICATION HOOK
// =====================================================

const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationOptions[]>([])
  
  const showNotification = useCallback((options: NotificationOptions) => {
    console.log(`[${options.type?.toUpperCase() || 'INFO'}] ${options.title}: ${options.description}`)
    
    setNotifications(prev => [...prev, { ...options, duration: options.duration || 5000 }])
    
    // Auto remove after duration
    setTimeout(() => {
      setNotifications(prev => prev.slice(1))
    }, options.duration || 5000)
  }, [])

  return { notifications, showNotification }
}

// =====================================================
// REALTIME SYNC HOOK
// =====================================================

const useRealtimeSync = (clientId: string, assessmentId?: string) => {
  const [connectedUsers, setConnectedUsers] = useState<string[]>([])
  
  const supabase = useMemo<SupabaseClient | null>(() => {
    try {
      return createClient()
    } catch (error) {
      console.error("CRITICAL: Supabase client initialization failed in useRealtimeSync. Check environment variables.", error);
      return null
    }
  }, [])

  const broadcastChange = useCallback((change: RealtimeChange) => {
    if (!supabase) return
    
    const channel = supabase.channel(`suitability_${clientId}`)
    channel.send({
      type: 'broadcast',
      event: 'field_update',
      payload: change
    }).catch(error => {
      console.error('Failed to broadcast change:', error)
    })
  }, [clientId, supabase])

  const subscribeToChanges = useCallback((callback: (change: RealtimeChange) => void) => {
    if (!supabase) return () => {}
    
    const channel = supabase
      .channel(`suitability_${clientId}`)
      .on('broadcast', { event: 'field_update' }, (payload) => {
        callback(payload.payload as RealtimeChange)
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId, supabase])

  return {
    connectedUsers,
    broadcastChange,
    subscribeToChanges
  }
}

// =====================================================
// SECTIONS CONFIGURATION
// =====================================================

const SECTIONS: SectionDefinition[] = suitabilitySections.map((section, index) => {
  const iconMap: Record<string, LucideIcon> = {
    'personal_information': User,
    'contact_details': Phone,
    'financial_situation': PoundSterling,
    'objectives': Target,
    'risk_assessment': Shield,
    'knowledge_experience': GraduationCap,
    'existing_arrangements': Briefcase,
    'vulnerability_assessment': Heart,
    'regulatory_compliance': FileCheck,
    'costs_charges': Calculator,
    'recommendation': FileText,
    'suitability_declaration': CheckCircle
  }
  
  const descriptionMap: Record<string, string> = {
    'personal_information': 'Basic client details and circumstances',
    'contact_details': 'Contact information and preferences',
    'financial_situation': 'Current financial position and cash flow',
    'objectives': 'Goals and investment timeline',
    'risk_assessment': 'Risk tolerance and capacity for loss',
    'knowledge_experience': 'Investment knowledge and history',
    'existing_arrangements': 'Current investments and pensions',
    'vulnerability_assessment': 'Health and support requirements',
    'regulatory_compliance': 'Regulatory requirements and declarations',
    'costs_charges': 'Fee structure and charges',
    'recommendation': 'Investment recommendation and rationale',
    'suitability_declaration': 'Final declarations and sign-off'
  }
  
  const requiredSections = [
    'personal_information',
    'contact_details',
    'financial_situation',
    'objectives',
    'risk_assessment',
    'knowledge_experience',
    'vulnerability_assessment',
    'regulatory_compliance',
    'costs_charges',
    'recommendation',
    'suitability_declaration'
  ]
  
  const typedFields: SuitabilityField[] | undefined = section.fields ? 
    section.fields.map((field: any) => ({
      ...field,
      id: field.id,
      label: field.label,
      type: castFieldType(field.type),
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
    } as SuitabilityField)) : undefined
  
  return {
    id: section.id,
    title: section.title,
    description: descriptionMap[section.id] || 'Section details',
    icon: iconMap[section.id] || FileText,
    required: requiredSections.includes(section.id),
    order: index + 1,
    hasCustomComponent: section.id === 'personal_information' || section.id === 'financial_situation' || section.id === 'contact_details',
    fields: typedFields,
    status: getStatusFromString((section as any).status),
    fieldCount: section.fields?.length || 0
  }
})

// =====================================================
// PROGRESS HEADER COMPONENT
// =====================================================

interface ProgressHeaderProps {
  sections: SectionDefinition[]
  currentSection: string
  completedSections: string[]
  completionPercentage: number
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  sections,
  currentSection,
  completedSections,
  completionPercentage
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Assessment Progress</h3>
        <span className="text-sm font-medium">{completionPercentage}% Complete</span>
      </div>
      
      <Progress value={completionPercentage} className="h-2" />
      
      <div className="grid grid-cols-12 gap-1">
        {sections.map((section) => {
          const isCompleted = completedSections.includes(section.id)
          const isCurrent = currentSection === section.id
          
          return (
            <div
              key={section.id}
              className={cn(
                "h-2 rounded-full transition-colors",
                isCompleted && "bg-green-500",
                isCurrent && !isCompleted && "bg-blue-500 animate-pulse",
                !isCompleted && !isCurrent && "bg-gray-200"
              )}
              title={section.title}
            />
          )
        })}
      </div>
      
      <div className="text-xs text-gray-600">
        {completedSections.length} of {sections.filter(s => s.required).length} required sections completed
      </div>
    </div>
  )
}

// =====================================================
// MODAL COMPONENT
// =====================================================

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl"
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      <div className={cn(
        "relative bg-white rounded-lg shadow-xl mx-4 w-full",
        maxWidth,
        "max-h-[90vh] overflow-hidden flex flex-col"
      )}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// NOTIFICATION DISPLAY COMPONENT
// =====================================================

interface NotificationDisplayProps {
  notifications: NotificationOptions[]
}

const NotificationDisplay: React.FC<NotificationDisplayProps> = ({ notifications }) => {
  if (notifications.length === 0) return null
  
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={cn(
              "p-4 rounded-lg shadow-lg min-w-[300px] max-w-[400px]",
              notification.type === 'success' && "bg-green-500 text-white",
              notification.type === 'error' && "bg-red-500 text-white",
              notification.type === 'warning' && "bg-yellow-500 text-white",
              notification.type === 'info' && "bg-blue-500 text-white",
              !notification.type && "bg-gray-800 text-white"
            )}
          >
            <div className="flex items-start gap-3">
              {notification.type === 'success' && <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
              {notification.type === 'error' && <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
              {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
              {notification.type === 'info' && <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="font-medium">{notification.title}</p>
                <p className="text-sm opacity-90">{notification.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const SuitabilityForm: React.FC<SuitabilityFormProps> = ({
  clientId,
  assessmentId,
  isProspect = false,
  mode = 'create',
  onComplete,
  onCancel,
  collaborators = [],
  allowAI = true,
  autoSaveInterval = 30000
}) => {
  const router = useRouter()
  const { client } = useClientContext()
  
  const supabase = useMemo<SupabaseClient | null>(() => {
    try {
      return createClient()
    } catch (error) {
      console.error("CRITICAL: Supabase client initialization failed in SuitabilityForm. Check environment variables.", error);
      return null
    }
  }, [])
  
  // =====================================================
  // HOOKS
  // =====================================================
  
  const {
    formData,
    pulledData,
    updateField,
    updateSection,
    setPulledData,
    isLoading,
    isSaving,
    lastSaved,
    saveError,
    validationErrors: hookValidationErrors,
    runValidation,
    conditionalActions,
    getConditionalFields,
    getValidationMessages,
    loadDraft,
    saveToDraft,
    saveManually,
    reset,
    calculateCompletion,
    metrics,
    saveState
  } = useSuitabilityForm({
    clientId,
    assessmentId,
    autoSave: true,
    autoSaveInterval,
    syncEnabled: true,
    enableConditionalLogic: true,
    enableValidation: true,
    onSave: async (data) => {
      console.log('Form saved:', data)
    }
  })
  
  const {
    connectedUsers,
    broadcastChange,
    subscribeToChanges
  } = useRealtimeSync(clientId, assessmentId)
  
  const { notifications, showNotification } = useNotifications()
  
  // =====================================================
  // STATE
  // =====================================================
  
  const [formState, setFormState] = useState<FormState>({
    currentSection: 'personal_information',
    expandedSections: new Set(['personal_information']),
    showAIPanel: false,
    showValidation: false,
    showFinancialDashboard: false,
    showVersionHistory: false,
    isSubmitting: false,
    lastActivity: new Date()
  })
  
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AISuggestion>>({})
  const [isLoadingAI, setIsLoadingAI] = useState<Record<string, boolean>>({})
  const [completionScore, setCompletionScore] = useState(0)
  const activityTimerRef = useRef<NodeJS.Timeout>()
  
  const effectiveValidationErrors = hookValidationErrors || validationErrors
  
  // =====================================================
  // MEMOIZED VALIDATION
  // =====================================================
  
  const validationResult = useMemo(() => 
    validationEngine.validateComplete(formData, pulledData),
    [formData, pulledData]
  )
  
  // =====================================================
  // EFFECTS
  // =====================================================
  
  useEffect(() => {
    loadDraft()
  }, [loadDraft])
  
  useEffect(() => {
    const pullData = async () => {
      try {
        const data = await aiAssistantService.pullPlatformData(clientId)
        setPulledData(data)
      } catch (error) {
        console.error('Failed to pull platform data:', error)
      }
    }
    
    if (clientId) {
      pullData()
    }
  }, [clientId, setPulledData])
  
  useEffect(() => {
    const score = calculateCompletion ? calculateCompletion() : 0
    setCompletionScore(score)
  }, [formData, calculateCompletion])
  
  useEffect(() => {
    setValidationErrors(validationResult.errors)
  }, [validationResult])
  
  useEffect(() => {
    const unsubscribe = subscribeToChanges((change) => {
      if (change.userId !== 'current_user') {
        updateField(change.sectionId, change.fieldId, change.value, {
          source: 'external',
          broadcast: false
        })
      }
    })
    
    return unsubscribe
  }, [subscribeToChanges, updateField])
  
  // =====================================================
  // HANDLERS
  // =====================================================
  
  const handleFieldUpdate = useCallback((
    sectionId: string,
    fieldId: string,
    value: any,
    options?: any
  ) => {
    updateField(sectionId, fieldId, value, options)
    
    if (options?.broadcast !== false) {
      broadcastChange({
        sectionId,
        fieldId,
        value,
        userId: 'current_user',
        timestamp: new Date().toISOString()
      })
    }
  }, [updateField, broadcastChange])
  
  const handleSectionUpdate = useCallback((
    sectionId: string,
    data: any,
    options?: any
  ) => {
    updateSection(sectionId, data, options)
  }, [updateSection])
  
  const handleGetAISuggestion = useCallback(async (sectionId: string) => {
    if (!allowAI) return
    
    setIsLoadingAI(prev => ({ ...prev, [sectionId]: true }))
    
    try {
      const suggestion = await aiAssistantService.generateSuggestion(
        sectionId,
        formData,
        pulledData
      )
      
      setAiSuggestions(prev => ({
        ...prev,
        [sectionId]: suggestion
      }))
      
      showNotification({
        title: 'AI Suggestions Ready',
        description: `Generated suggestions for ${sectionId.replace(/_/g, ' ')}`,
        type: 'success'
      })
    } catch (error) {
      console.error('AI suggestion error:', error)
      showNotification({
        title: 'AI Error',
        description: 'Failed to generate suggestions',
        type: 'error'
      })
    } finally {
      setIsLoadingAI(prev => ({ ...prev, [sectionId]: false }))
    }
  }, [formData, pulledData, allowAI, showNotification])
  
  const handleSectionNavigation = useCallback((direction: 'prev' | 'next') => {
    const currentIndex = SECTIONS.findIndex(s => s.id === formState.currentSection)
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    
    if (newIndex >= 0 && newIndex < SECTIONS.length) {
      const newSection = SECTIONS[newIndex]
      setFormState(prev => ({
        ...prev,
        currentSection: newSection.id,
        expandedSections: new Set([...prev.expandedSections, newSection.id])
      }))
      
      document.getElementById(newSection.id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }, [formState.currentSection])
  
  const handleSubmit = useCallback(async () => {
    // Check completion
    if (completionScore < 80) {
      const incompleteSections = SECTIONS.filter(s => {
        if (!s.required) return false
        const data = formData[s.id as keyof SuitabilityFormData]
        if (!data || typeof data !== 'object') return true
        
        const hasData = Object.keys(data).some(key => {
          if (key.startsWith('_')) return false
          const value = data[key as keyof typeof data]
          return value !== null && value !== undefined && value !== ''
        })
        return !hasData
      })
      
      const missingTitles = incompleteSections.map(s => s.title)
      
      if (incompleteSections.length > 0) {
        showNotification({
          title: 'Incomplete Assessment',
          description: `Please complete: ${missingTitles.join(', ')} (${completionScore}% complete)`,
          type: 'warning'
        })
        
        const firstIncomplete = incompleteSections[0]
        setFormState(prev => ({
          ...prev,
          currentSection: firstIncomplete.id,
          expandedSections: new Set([...prev.expandedSections, firstIncomplete.id]),
          showValidation: true
        }))
        
        setTimeout(() => {
          document.getElementById(firstIncomplete.id)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }, 100)
        
        return
      }
      
      if (completionScore < 100) {
        const confirmSubmit = window.confirm(
          `Assessment is ${completionScore}% complete. Some optional fields are not filled. Do you want to continue with submission?`
        )
        if (!confirmSubmit) return
      }
    }
    
    // Validate
    if (!validationResult.isValid) {
      const criticalErrors = validationResult.errors.filter(e => e.severity === 'critical')
      
      if (criticalErrors.length > 0) {
        showNotification({
          title: 'Critical Validation Errors',
          description: `${criticalErrors.length} critical error${criticalErrors.length !== 1 ? 's' : ''} must be corrected`,
          type: 'error'
        })
        setFormState(prev => ({ ...prev, showValidation: true }))
        return
      }
      
      if (validationResult.errors.length > 0) {
        const confirmOverride = window.confirm(
          `There are ${validationResult.errors.length} validation warnings. Do you want to submit anyway?`
        )
        if (!confirmOverride) {
          setFormState(prev => ({ ...prev, showValidation: true }))
          return
        }
      }
    }
    
    if (!validationResult.compliance.compliant) {
      if (validationResult.compliance.remediations?.length > 0) {
        const criticalCompliance = validationResult.compliance.remediations.some(r => 
          r.includes('FCA') || r.includes('regulatory')
        )
        
        if (criticalCompliance) {
          showNotification({
            title: 'Compliance Check Failed',
            description: validationResult.compliance.remediations[0] || 'FCA requirements not met',
            type: 'error'
          })
          setFormState(prev => ({ ...prev, showValidation: true }))
          return
        }
      }
    }
    
    setFormState(prev => ({ ...prev, isSubmitting: true }))
    
    try {
      if (!supabase) {
        throw new Error('Database connection not available')
      }
      
      // Import SuitabilityDataService for proper save
      const { SuitabilityDataService } = await import('@/services/suitability/SuitabilityDataService')
      const dataService = new SuitabilityDataService() // FIX: No clientId parameter
      
      // First try to save using the data service (which handles field mapping)
      let finalAssessmentId: string
      
      try {
        // FIX: Use autoSaveAssessment with correct parameters
        const result = await dataService.autoSaveAssessment(
          clientId,
          formData,
          'final' // status parameter
        )
        
        if (result.success && result.data?.id) {
          // FIX: Access the ID from result.data.id, not result.assessmentId
          finalAssessmentId = result.data.id
          console.log('Assessment saved with ID:', finalAssessmentId)
        } else {
          throw new Error(result.error || 'Failed to save assessment')
        }
      } catch (dataServiceError) {
        console.error('Data service save failed, using direct save:', dataServiceError)
        
        // Fallback: Direct save to suitability_assessments table
        const mappedData = {
          client_id: clientId,
          personal_circumstances: formData.personal_information || {},
          financial_situation: formData.financial_situation || {},
          investment_objectives: formData.objectives || {},
          risk_assessment: formData.risk_assessment || {},
          knowledge_experience: formData.knowledge_experience || {},
          contact_details: formData.contact_details || {},
          existing_arrangements: formData.existing_arrangements || {},
          vulnerability: formData.vulnerability_assessment || {},
          regulatory: formData.regulatory_compliance || {},
          costs_charges: formData.costs_charges || {},
          recommendations: formData.recommendation || {},
          status: 'completed',
          completion_percentage: completionScore,
          assessment_date: new Date().toISOString(),
          metadata: {
            completionScore,
            validationPassed: true,
            fcaCompliant: validationResult.compliance.compliant,
            aiAssisted: Object.keys(aiSuggestions).length > 0,
            submittedBy: 'advisor',
            submissionTime: new Date().toISOString()
          }
        }
        
        const { data: assessment, error } = await supabase
          .from('suitability_assessments')
          .upsert(mappedData, { 
            onConflict: 'client_id',
            ignoreDuplicates: false 
          })
          .select()
          .single()
        
        if (error) {
          console.error('Direct save error:', error)
          throw error
        }
        
        finalAssessmentId = assessment.id
      }
      
      // Also save a record to assessments table for compatibility
      try {
        await supabase
          .from('assessments')
          .insert({
            client_id: clientId,
            assessment_type: 'suitability',
            assessment_data: formData,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
      } catch (compatError) {
        console.log('Compatibility save to assessments table failed (non-critical):', compatError)
      }
      
      // Generate report
      try {
        const template = await documentTemplateService.getTemplateById('suitability_report')
        if (template) {
          await documentTemplateService.generateDocumentFromTemplate({
            templateId: template.id,
            clientId,
            variables: {
              CLIENT_NAME: formData.personal_information?.client_name || 'Client',
              ADVISOR_NAME: 'Professional Advisor',
              REPORT_DATE: new Date().toLocaleDateString(),
              RISK_PROFILE: formData.risk_assessment?.attitude_to_risk || 'Not assessed',
              INVESTMENT_AMOUNT: formData.objectives?.investment_amount || 0,
              RECOMMENDATION: (formData.recommendation as any)?.recommendation_rationale || 'See detailed report',
              ...formData
            }
          })
        }
      } catch (reportError) {
        console.error('Report generation error (non-critical):', reportError)
      }
      
      // Clear draft after successful submission
      try {
        await supabase
          .from('assessment_drafts')
          .delete()
          .eq('client_id', clientId)
          .eq('assessment_type', 'suitability')
        
        const localKey = `suitability_draft_${clientId}`
        localStorage.removeItem(localKey)
      } catch (cleanupError) {
        console.log('Draft cleanup failed (non-critical):', cleanupError)
      }
      
      showNotification({
        title: 'Assessment Complete',
        description: 'Suitability assessment submitted successfully',
        type: 'success',
        duration: 7000
      })
      
      // Navigate or callback
      if (onComplete) {
        onComplete(formData)
      } else {
        router.push(`/clients/${clientId}/assessments/${finalAssessmentId}`)
      }
      
    } catch (error) {
      console.error('Submit error:', error)
      
      let errorMessage = 'Failed to submit assessment'
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          errorMessage = 'An assessment already exists for this client. Please update the existing assessment instead.'
        } else if (error.message.includes('foreign key')) {
          errorMessage = 'Client not found. Please ensure the client exists before submitting.'
        } else if (error.message.includes('permission')) {
          errorMessage = 'You do not have permission to submit assessments.'
        } else {
          errorMessage = error.message
        }
      }
      
      showNotification({
        title: 'Submission Failed',
        description: errorMessage,
        type: 'error',
        duration: 10000
      })
      
      console.error('Detailed submission error:', {
        error,
        clientId,
        completionScore,
        formData: Object.keys(formData).reduce((acc, key) => {
          const section = formData[key as keyof SuitabilityFormData]
          acc[key] = section && typeof section === 'object' ? Object.keys(section).length : 0
          return acc
        }, {} as Record<string, number>)
      })
      
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }))
    }
  }, [
    formData,
    completionScore,
    validationResult,
    aiSuggestions,
    clientId,
    onComplete,
    router,
    supabase,
    showNotification
  ])
  
  const handleGenerateDraftReport = useCallback(async () => {
    try {
      const template = await documentTemplateService.getTemplateById('draft_report')

      if (!template) {
        showNotification({
          title: 'Template Not Found',
          description: 'Draft report template is not available',
          type: 'error'
        })
        return
      }

      const report = await documentTemplateService.generateDocumentFromTemplate({
        templateId: template.id,
        clientId,
        variables: {
          CLIENT_NAME: formData.personal_information?.client_name || 'Client',
          ASSESSMENT_DATE: new Date().toLocaleDateString(),
          COMPLETION_PERCENTAGE: completionScore
        }
      })
      
      const blob = new Blob([report.content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      
      showNotification({
        title: 'Report Generated',
        description: 'Draft report opened in new tab',
        type: 'success'
      })
    } catch (error) {
      console.error('Draft report error:', error)
      showNotification({
        title: 'Generation Failed',
        description: 'Could not generate draft report',
        type: 'error'
      })
    }
  }, [clientId, formData, completionScore, showNotification])
  
  // =====================================================
  // RENDER SECTION WITH CONDITIONAL FIELDS
  // =====================================================
  
  const renderSection = useCallback((section: SectionDefinition) => {
    const sectionData = formData[section.id as keyof SuitabilityFormData] || {}
    const sectionErrors = effectiveValidationErrors.filter(e => e.sectionId === section.id)
    const sectionAI = aiSuggestions[section.id]
    const isLoadingSection = isLoadingAI[section.id]
    const isExpanded = formState.expandedSections.has(section.id)
    
    const conditionalFieldGroups = getConditionalFields ? 
      getConditionalFields(section.id) : []
    
    const additionalFields = (formData._conditionalFields as any)?.[section.id] || []
    
    const getTypedStatus = (status?: string): SectionStatus => {
      if (sectionErrors.some(e => e.severity === 'critical')) return 'error'
      if (sectionErrors.length > 0) return 'error'
      if (status === 'complete') return 'complete'
      if (status === 'partial') return 'partial'
      return 'incomplete'
    }
    
    // Special handling for personal information custom section
    if (section.id === 'personal_information' && section.hasCustomComponent) {
      return (
        <div key={section.id} id={section.id}>
          <PersonalInformationSection
            data={sectionData}
            onChange={handleFieldUpdate}
            onBatchUpdate={handleSectionUpdate}
            errors={sectionErrors}
            formData={formData}
            pulledData={pulledData}
            isReadOnly={mode === 'view'}
            isProspect={isProspect}
            showAI={allowAI}
            collaborators={connectedUsers}
            saveState={saveState}
          />
        </div>
      )
    }
    
    // Special handling for contact details section
    if (section.id === 'contact_details') {
      return (
        <div key={section.id} id={section.id}>
          <ContactDetailsSection
            sectionData={sectionData}
            updateField={(fieldId, value) => 
              handleFieldUpdate('contact_details', fieldId, value)
            }
            validationErrors={sectionErrors}
            isReadOnly={mode === 'view'}
            pulledData={pulledData}
          />
        </div>
      )
    }
    
    // Special handling for financial situation with dashboard
    if (section.id === 'financial_situation' && formState.showFinancialDashboard) {
      return (
        <div key={section.id} id={section.id} className="space-y-6">
          <SuitabilitySection
            section={{
              id: section.id,
              title: section.title,
              icon: section.icon,
              status: getTypedStatus(section.status),
              fields: section.fields || [],
              conditionalFields: conditionalFieldGroups,
              aiEnabled: true,
              chartEnabled: true,
              pulledDataFields: []
            }}
            formData={formData}
            pulledData={pulledData}
            sectionData={sectionData}
            isExpanded={isExpanded}
            onToggle={() => {
              setFormState(prev => {
                const newExpanded = new Set(prev.expandedSections)
                if (newExpanded.has(section.id)) {
                  newExpanded.delete(section.id)
                } else {
                  newExpanded.add(section.id)
                }
                return { ...prev, expandedSections: newExpanded }
              })
            }}
            updateField={(fieldId, value, options) => 
              handleFieldUpdate(section.id, fieldId, value, options)
            }
            validationErrors={sectionErrors}
            aiSuggestion={sectionAI}
            isLoadingAI={isLoadingSection}
            onGetAISuggestion={() => handleGetAISuggestion(section.id)}
            isProspect={isProspect}
            conditionalFields={conditionalFieldGroups}
          />
          
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <FinancialDashboard
                formData={formData}
                pulledData={pulledData}
                onUpdateField={(fieldId, value) => 
                  handleFieldUpdate('financial_situation', fieldId, value)
                }
              />
            </motion.div>
          )}
        </div>
      )
    }
    
    // Default section rendering
    return (
      <div key={section.id} id={section.id}>
        <SuitabilitySection
          section={{
            id: section.id,
            title: section.title,
            icon: section.icon,
            status: getTypedStatus(section.status),
            fields: section.fields || [],
            conditionalFields: conditionalFieldGroups,
            aiEnabled: true,
            chartEnabled: false,
            pulledDataFields: []
          }}
          formData={formData}
          pulledData={pulledData}
          sectionData={sectionData}
          isExpanded={isExpanded}
          onToggle={() => {
            setFormState(prev => {
              const newExpanded = new Set(prev.expandedSections)
              if (newExpanded.has(section.id)) {
                newExpanded.delete(section.id)
              } else {
                newExpanded.add(section.id)
              }
              return { ...prev, expandedSections: newExpanded }
            })
          }}
          updateField={(fieldId, value, options) => 
            handleFieldUpdate(section.id, fieldId, value, options)
          }
          validationErrors={sectionErrors}
          aiSuggestion={sectionAI}
          isLoadingAI={isLoadingSection}
          onGetAISuggestion={() => handleGetAISuggestion(section.id)}
          isProspect={isProspect}
          conditionalFields={conditionalFieldGroups}
        />
      </div>
    )
  }, [
    formData,
    pulledData,
    effectiveValidationErrors,
    aiSuggestions,
    isLoadingAI,
    formState,
    mode,
    isProspect,
    allowAI,
    connectedUsers,
    handleFieldUpdate,
    handleSectionUpdate,
    handleGetAISuggestion,
    saveState,
    getConditionalFields
  ])
  
  // =====================================================
  // MAIN RENDER
  // =====================================================
  
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }
  
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notifications */}
      <NotificationDisplay notifications={notifications} />
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">
                Suitability Assessment
              </h1>
              <Badge variant={mode === 'view' ? 'secondary' : 'default'}>
                {mode === 'view' ? 'Read Only' : mode === 'edit' ? 'Editing' : 'Creating'}
              </Badge>
              {isProspect && (
                <Badge variant="outline" className="bg-orange-50">
                  <Users className="h-3 w-3 mr-1" />
                  Prospect
                </Badge>
              )}
              {!isOnline && (
                <Badge variant="destructive">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {connectedUsers.length > 0 && (
                <CollaborationIndicator users={connectedUsers} />
              )}
              
              {lastSaved && (
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(lastSaved, 'HH:mm')}
                </div>
              )}
              
              {isSaving && (
                <Badge variant="outline">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Saving
                </Badge>
              )}
              
              {allowAI && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormState(prev => ({
                    ...prev,
                    showAIPanel: !prev.showAIPanel
                  }))}
                >
                  <Sparkles className="h-4 w-4" />
                  AI
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormState(prev => ({
                  ...prev,
                  showValidation: !prev.showValidation
                }))}
                className={cn(
                  effectiveValidationErrors.length > 0 && "border-red-500 text-red-600"
                )}
              >
                <Shield className="h-4 w-4" />
                Validate
                {effectiveValidationErrors.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {effectiveValidationErrors.length}
                  </Badge>
                )}
              </Button>
              
              {mode !== 'view' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveManually}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={formState.isSubmitting}
                  >
                    {formState.isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit
                  </Button>
                </>
              )}
              
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <ProgressHeader
              sections={SECTIONS}
              currentSection={formState.currentSection}
              completedSections={
                SECTIONS.filter(s => {
                  const data = formData[s.id as keyof SuitabilityFormData]
                  return data && Object.keys(data).length > 0
                }).map(s => s.id)
              }
              completionPercentage={completionScore}
            />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Section Navigation */}
          <div className="col-span-3 hidden lg:block">
            <Card className="sticky top-24">
              <CardHeader>
                <h3 className="font-semibold">Sections</h3>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {SECTIONS.map(section => {
                    const sectionData = formData[section.id as keyof SuitabilityFormData]
                    const hasData = sectionData && Object.keys(sectionData).length > 0
                    const hasErrors = effectiveValidationErrors.some(e => e.sectionId === section.id)
                    const isCurrent = formState.currentSection === section.id
                    const Icon = section.icon
                    
                    return (
                      <button
                        key={section.id}
                        onClick={() => {
                          setFormState(prev => ({
                            ...prev,
                            currentSection: section.id,
                            expandedSections: new Set([...prev.expandedSections, section.id])
                          }))
                          document.getElementById(section.id)?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                          })
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm transition-colors",
                          "hover:bg-gray-50 flex items-center justify-between",
                          isCurrent && "bg-blue-50 text-blue-600 border-l-2 border-blue-600",
                          hasErrors && "text-red-600"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {hasData && !hasErrors && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {hasErrors && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          {!hasData && !hasErrors && (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                          <Icon className="h-4 w-4" />
                          <span className="truncate">{section.title}</span>
                        </span>
                        {section.required && (
                          <span className="text-xs text-red-500">*</span>
                        )}
                      </button>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Form Area */}
          <div className="col-span-12 lg:col-span-6">
            <div className="space-y-6">
              {formState.currentSection === 'financial_situation' && (
                <Card>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Financial Dashboard</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFormState(prev => ({
                          ...prev,
                          showFinancialDashboard: !prev.showFinancialDashboard
                        }))}
                      >
                        {formState.showFinancialDashboard ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <AnimatePresence mode="wait">
                {SECTIONS.map(section => renderSection(section))}
              </AnimatePresence>
              
              <NavigationControls
                currentSection={formState.currentSection}
                sections={SECTIONS}
                onNavigate={(sectionId) => {
                  setFormState(prev => ({
                    ...prev,
                    currentSection: sectionId,
                    expandedSections: new Set([...prev.expandedSections, sectionId])
                  }))
                  document.getElementById(sectionId)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  })
                }}
                onPrevious={() => handleSectionNavigation('prev')}
                onNext={() => handleSectionNavigation('next')}
                canSubmit={completionScore === 100 && effectiveValidationErrors.length === 0}
                onSubmit={handleSubmit}
                isSubmitting={formState.isSubmitting}
              />
            </div>
          </div>
          
          {/* Right Sidebar */}
          <div className="col-span-3 hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Progress
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Overall</span>
                        <span className="font-medium">{completionScore}%</span>
                      </div>
                      <Progress value={completionScore} className="h-2" />
                    </div>
                    
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Sections</span>
                        <span>
                          {SECTIONS.filter(s => {
                            const data = formData[s.id as keyof SuitabilityFormData]
                            return data && Object.keys(data).length > 0
                          }).length}/{SECTIONS.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Errors</span>
                        <span className={cn(
                          effectiveValidationErrors.length > 0 && "text-red-600 font-medium"
                        )}>
                          {effectiveValidationErrors.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Actions</h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleGenerateDraftReport}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Draft Report
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setFormState(prev => ({
                      ...prev,
                      showVersionHistory: true
                    }))}
                  >
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={async () => {
                      const url = `${window.location.origin}/assessments/${assessmentId}/share`
                      await navigator.clipboard.writeText(url)
                      showNotification({
                        title: 'Link Copied',
                        description: 'Share link copied to clipboard',
                        type: 'success'
                      })
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <h3 className="font-semibold flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Help
                  </h3>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                  <p>Complete all required sections marked with *</p>
                  <p>Use AI Assistant for suggestions</p>
                  <p>Auto-saves every {autoSaveInterval / 1000} seconds</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {formState.showAIPanel && (
        <Modal
          isOpen={formState.showAIPanel}
          onClose={() => setFormState(prev => ({ ...prev, showAIPanel: false }))}
          title="AI Assistant"
          maxWidth="max-w-md"
        >
          <AIAssistantPanel
            formData={formData}
            pulledData={pulledData}
            suggestions={aiSuggestions}
            onApplySuggestion={(sectionId, fieldId, value) => {
              handleFieldUpdate(sectionId, fieldId, value, {
                aiSuggested: true,
                source: 'ai'
              })
            }}
            onGenerateSuggestions={handleGetAISuggestion}
          />
        </Modal>
      )}
      
      {formState.showValidation && (
        <Modal
          isOpen={formState.showValidation}
          onClose={() => setFormState(prev => ({ ...prev, showValidation: false }))}
          title="Validation Summary"
        >
          <ValidationSummary
            errors={effectiveValidationErrors}
            warnings={validationResult.warnings || []}
            compliance={validationResult.compliance}
            onNavigateToError={(sectionId, fieldId) => {
              setFormState(prev => ({
                ...prev,
                currentSection: sectionId,
                showValidation: false,
                expandedSections: new Set([...prev.expandedSections, sectionId])
              }))
              setTimeout(() => {
                document.getElementById(fieldId)?.focus()
              }, 500)
            }}
          />
        </Modal>
      )}
      
      {formState.showVersionHistory && (
        <Modal
          isOpen={formState.showVersionHistory}
          onClose={() => setFormState(prev => ({ ...prev, showVersionHistory: false }))}
          title="Version History"
        >
          <div className="py-8 text-center text-gray-500">
            <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Version history coming soon</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default SuitabilityForm