// =====================================================
// FILE: src/components/suitability/form/SuitabilityForm.tsx
// FIXED: Corrected assessment ID access from autoSaveAssessment result
// =====================================================

import React from 'react'
import { useRouter } from 'next/navigation'
import { MotionConfig } from 'framer-motion'

// Component imports
import { NavigationControls } from '../NavigationControls'
import { Modal, NotificationDisplay } from '../SuitabilityFormModals'
import { SuitabilityFinancialDashboardToggleCard } from '../SuitabilityFinancialDashboardToggleCard'
import { SuitabilityHeaderBar } from '../SuitabilityHeaderBar'
import { SuitabilityFormDialogs } from '../SuitabilityFormDialogs'
import { SuitabilityLayout } from '../SuitabilityLayout'
import { SuitabilityRightSidebar } from '../SuitabilityRightSidebar'
import { SuitabilitySectionsNav } from '../SuitabilitySectionsNav'
import { SuitabilitySectionRenderer } from '../SuitabilitySectionRenderer'
import { AssessmentStatusCard } from './AssessmentStatusCard'
import { WhatsMissingCard } from './WhatsMissingCard'

// Hook imports
import { useSuitabilityFormController } from './useSuitabilityFormController'

// Service imports
import { validationEngine } from '@/lib/suitability/validationEngine'
import { calculateSuitabilityCompletion } from '@/lib/suitability/completion'
import { getMissingRequiredFieldErrors } from '@/lib/suitability/requiredFields'
import { aiAssistantService } from '@/services/aiAssistantService'
import type { SaveStatus } from '@/hooks/suitability/useSaveMutex'
import { canGenerateAISuggestions, formatSectionLabel, isValidAISuggestion } from '@/lib/suitability/ui/aiHelpers'
import { getIncompleteRequiredSections, getSubmissionErrorMessage } from '@/lib/suitability/ui/submitHelpers'
import { getComplianceGate, getCompletionGate, getValidationGate } from '@/lib/suitability/ui/submissionGates'
import { finalizeSuitabilityAndBuildRedirect } from '@/lib/suitability/ui/finalizeFlow'
import { calculateReconciledRisk } from '@/lib/assessments/riskReconciliation'
import { buildReportLink } from '@/lib/documents/reportLinks'

// Config imports
import { SECTIONS } from '@/lib/suitability/ui/sectionsMeta'
import { useSuitabilityNotifications } from '@/hooks/suitability/useSuitabilityNotifications'

// Type imports
import type {
  SuitabilityFormData,
  PulledPlatformData,
  ValidationError,
  AISuggestion,
  SuitabilityField,
  ConditionalFieldGroup
} from '@/types/suitability'

// UI imports
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
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
  Loader2,
  Shield,
  TrendingUp,
  Lock,
  Unlock,
  Copy,
  Zap,
  User,
  Phone,
  ClipboardList,
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

import { cn, safeWriteToClipboard } from '@/lib/utils'

// =====================================================
// TYPE DEFINITIONS
// Note: SectionDefinition imported from SuitabilityFormProgress
// =====================================================

interface SuitabilityFormProps {
  clientId: string
  assessmentId?: string
  isProspect?: boolean
  mode?: 'create' | 'edit' | 'view'
  onComplete?: (data: SuitabilityFormData) => void
  onSaved?: (assessmentId: string) => void
  onAssessmentIdChange?: (assessmentId: string) => void
  onCancel?: () => void
  breadcrumbs?: Array<{ label: string; href?: string }>
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

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Required-field validation is centralized in `src/lib/suitability/requiredFields.ts`.

// =====================================================
// NOTIFICATION HOOK
// =====================================================

// =====================================================
// SECTIONS CONFIGURATION
// =====================================================

// =====================================================
// EXTRACTED COMPONENTS
// NotificationDisplay -> SuitabilityFormModals (./SuitabilityFormModals.tsx)
// =====================================================

// =====================================================
// MAIN COMPONENT
// =====================================================

export const SuitabilityForm: React.FC<SuitabilityFormProps> = ({
  clientId,
  assessmentId,
  isProspect = false,
  mode = 'create',
  onComplete,
  onSaved,
  onAssessmentIdChange,
  onCancel,
  breadcrumbs,
  collaborators = [],
  allowAI = true,
  autoSaveInterval = 30000
}) => {
  const router = useRouter()
  // Realtime collaboration is intentionally disabled for suitability editing for stability.
  // (Supabase websockets are frequently blocked in some browsers/environments and can cause
  // noisy reconnect loops / UI “settling”.)
  const {
    formData,
    pulledData,
    activeAssessmentId,
    isLoading,
    isSaving,
    saveState,
    saveStatus,
    notifications,
  servicesSelected,
    productHoldings,
    isGeneratingReport,
    reportReady,
    reconciledRisk,
    formState,
    setFormState,
    aiSuggestions,
    isLoadingAI,
    completion,
    completionScore,
    validationResult,
    combinedValidationErrors,
    submissionValidationErrors,
    validationIssueCount,
    sectionErrorsMap,
    incompleteRequiredSections,
    submissionErrorsBySection,
    assessmentsNeedUpdate,
    atrCflData,
    personaAssessment,
    isATRComplete,
    isCFLComplete,
    isPersonaComplete,
    refreshATRCFL,
    getConditionalFields,
    handleFieldUpdate,
    handleSectionUpdate,
    handleGetAISuggestion,
    navigateToSection,
    handleSectionNavigation,
    handleSubmit,
    handleGenerateDraftReport,
    handleGeneratePdfWithLoading,
    handleOpenReadyReport,
    handleDismissReadyReport,
    toggleExpandedSection,
    handleSaveDraftClick,
    openVersionHistory,
    handleShareLink
  } = useSuitabilityFormController({
    clientId,
    assessmentId,
    isProspect,
    allowAI,
    autoSaveInterval,
    onAssessmentIdChange,
    onComplete,
    onSaved,
    onCancel
  })

  const reportLink = React.useMemo(() => {
    if (!reportReady) return null
    return buildReportLink({ result: reportReady.result, reportType: reportReady.reportType })
  }, [reportReady])

  React.useEffect(() => {
    return () => {
      if (reportLink?.isObjectUrl) {
        const url = reportLink.url
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
    }
  }, [reportLink])
  
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  const resolvedAssessmentId = activeAssessmentId || assessmentId
  const loadingState = React.useMemo(() => {
    if (formState.isSubmitting) {
      return { message: 'Submitting assessment', hint: 'Finalizing data and generating report' }
    }
    if (isGeneratingReport) {
      return { message: 'Generating report', hint: 'Building PDF output' }
    }
    if (isSaving || saveStatus.status === 'saving' || saveStatus.status === 'pending') {
      return { message: 'Saving changes', hint: 'Auto-saving in the background' }
    }
    return undefined
  }, [formState.isSubmitting, isGeneratingReport, isSaving, saveStatus.status])

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between text-xs text-blue-700">
            <span>Loading assessment data</span>
            <span>Working...</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-blue-100">
            <div className="h-2 w-1/2 animate-pulse rounded-full bg-blue-600" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <MotionConfig reducedMotion="always">
      <div className="min-h-screen bg-gray-50">
        {(formState.isSubmitting || isGeneratingReport) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {formState.isSubmitting ? 'Submitting suitability assessment...' : 'Generating report...'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {formState.isSubmitting ? 'Finalizing data and generating your report.' : 'Building your PDF report.'}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-blue-100">
                <div className="h-2 w-1/2 animate-pulse rounded-full bg-blue-600" />
              </div>
            </div>
          </div>
        )}

        <Modal
          isOpen={Boolean(reportReady)}
          onClose={handleDismissReadyReport}
          title="Report Ready"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-sm text-gray-700">
            <p>Your suitability report has been generated and is ready to open.</p>
            {reportReady?.result.fallbackToWarningsUsed && (
              <Alert>
                <AlertDescription>
                  Final report incomplete{reportReady.result.missingFields?.length ? ` (${reportReady.result.missingFields.length} missing)` : ''}.
                  A draft PDF with warnings is ready.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap gap-2">
              {reportLink ? (
                <a
                  href={reportLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  onClick={() => {
                    handleDismissReadyReport()
                  }}
                >
                  Open report
                </a>
              ) : (
                <Button
                  onClick={() => {
                    const opened = handleOpenReadyReport()
                    if (opened) {
                      handleDismissReadyReport()
                    }
                  }}
                >
                  Open report
                </Button>
              )}
              {reportReady && (
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push(`/assessments/suitability/results/${clientId}?assessmentId=${reportReady.assessmentId}`)
                    handleDismissReadyReport()
                  }}
                >
                  View assessment summary
                </Button>
              )}
              <Button variant="ghost" onClick={handleDismissReadyReport}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      {/* Notifications */}
      <NotificationDisplay notifications={notifications} />
      
	      <SuitabilityHeaderBar
	        mode={mode}
	        isProspect={isProspect}
	        isOnline={isOnline}
	        allowAI={allowAI}
	        onCancel={onCancel}
          breadcrumbs={breadcrumbs}
	        saveStatus={saveStatus}
	        isSaving={isSaving}
	        onSaveDraft={handleSaveDraftClick}
	        isSubmitting={formState.isSubmitting}
	        completionScore={completionScore}
	        onSubmit={handleSubmit}
	        validationIssueCount={validationIssueCount}
	        onToggleValidation={() => setFormState(prev => ({ ...prev, showValidation: !prev.showValidation }))}
	        onToggleAI={() => setFormState(prev => ({ ...prev, showAIPanel: !prev.showAIPanel }))}
	        loadingState={loadingState}
	        progress={{
	          sections: SECTIONS,
	          currentSection: formState.currentSection,
	          completedSections: completion.completedSections,
	          completionPercentage: completionScore,
	          sectionProgress: completion.sectionProgress,
	          sectionErrors: sectionErrorsMap
	        }}
	      />
      
	      <SuitabilityLayout
	        left={
	          <SuitabilitySectionsNav
	            sections={SECTIONS}
	            currentSectionId={formState.currentSection}
	            sectionProgress={completion.sectionProgress}
	            hasErrors={(sectionId) => combinedValidationErrors.some(e => e.sectionId === sectionId)}
	            onSelectSection={navigateToSection}
	          />
	        }
	        main={
	          <>
              <AssessmentStatusCard
                assessmentsNeedUpdate={assessmentsNeedUpdate}
                isLoading={isLoading}
                onRefresh={() => refreshATRCFL()}
                atrCflData={atrCflData}
                personaAssessment={personaAssessment}
                isATRComplete={isATRComplete}
                isCFLComplete={isCFLComplete}
                isPersonaComplete={isPersonaComplete}
                reconciledRisk={reconciledRisk}
                onReviewRisk={() => navigateToSection('risk_assessment')}
              />

              {(completionScore < 80 ||
                incompleteRequiredSections.length > 0 ||
                submissionValidationErrors.length > 0) && (
                <WhatsMissingCard
                  completionScore={completionScore}
                  incompleteRequiredSections={incompleteRequiredSections}
                  submissionErrorsBySection={submissionErrorsBySection}
                  onViewValidation={() => setFormState((prev) => ({ ...prev, showValidation: true }))}
                  navigateToSection={navigateToSection}
                />
              )}

	            {formState.currentSection === 'financial_situation' && (
	              <SuitabilityFinancialDashboardToggleCard
	                isVisible={formState.showFinancialDashboard}
	                onToggle={() =>
	                  setFormState(prev => ({
	                    ...prev,
	                    showFinancialDashboard: !prev.showFinancialDashboard
	                  }))
	                }
	              />
	            )}

            {SECTIONS.map((section) => (
              <SuitabilitySectionRenderer
                key={section.id}
                section={section}
                formData={formData}
                pulledData={pulledData}
                clientId={clientId}
                assessmentId={resolvedAssessmentId}
                mode={mode}
                isProspect={isProspect}
                allowAI={allowAI}
                collaborators={collaborators}
                saveState={saveState}
                servicesSelected={servicesSelected}
                productHoldings={productHoldings}
                expandedSections={formState.expandedSections}
	                showFinancialDashboard={formState.showFinancialDashboard}
	                combinedValidationErrors={combinedValidationErrors}
	                aiSuggestions={aiSuggestions}
	                isLoadingAI={isLoadingAI}
	                getConditionalFields={getConditionalFields}
	                onToggleExpanded={toggleExpandedSection}
	                onFieldUpdate={handleFieldUpdate}
	                onSectionUpdate={handleSectionUpdate}
	                onGetAISuggestion={(sectionId) => handleGetAISuggestion(sectionId)}
	              />
	            ))}

	            <NavigationControls
	              currentSection={formState.currentSection}
	              sections={SECTIONS}
	              onNavigate={navigateToSection}
	              onPrevious={() => handleSectionNavigation('prev')}
	              onNext={() => handleSectionNavigation('next')}
	              canSubmit={completionScore >= 80}
	              onSubmit={handleSubmit}
	              isSubmitting={formState.isSubmitting}
	            />
	          </>
	        }
	        right={
          <SuitabilityRightSidebar
            mode={mode}
            completionScore={completionScore}
            completedSectionsCount={completion.completedSections.length}
            totalSectionsCount={SECTIONS.length}
            validationIssueCount={validationIssueCount}
            formData={formData}
            isSubmitting={formState.isSubmitting}
            canGenerateReports={Boolean(activeAssessmentId || assessmentId)}
            onSubmit={handleSubmit}
            onPreviewHtml={handleGenerateDraftReport}
            onGeneratePdf={handleGeneratePdfWithLoading}
	            onShowHistory={openVersionHistory}
	            onShare={handleShareLink}
	            autoSaveIntervalMs={autoSaveInterval}
	          />
	        }
	      />
      
	      <SuitabilityFormDialogs
	        isAIOpen={formState.showAIPanel}
	        isValidationOpen={formState.showValidation}
	        isVersionHistoryOpen={formState.showVersionHistory}
	        setAIOpen={(open) => setFormState(prev => ({ ...prev, showAIPanel: open }))}
	        setValidationOpen={(open) => setFormState(prev => ({ ...prev, showValidation: open }))}
	        setVersionHistoryOpen={(open) => setFormState(prev => ({ ...prev, showVersionHistory: open }))}
	        formData={formData}
	        pulledData={pulledData}
	        aiSuggestions={aiSuggestions}
	        onApplySuggestion={(sectionId, fieldId, value) =>
	          handleFieldUpdate(sectionId, fieldId, value, { aiSuggested: true, source: 'ai' })
	        }
	        onGenerateSuggestions={(sectionId) => handleGetAISuggestion(sectionId)}
	        combinedValidationErrors={combinedValidationErrors}
	        validationWarnings={validationResult.warnings || []}
	        compliance={validationResult.compliance}
	        onNavigateToError={(sectionId, fieldId) => {
	          navigateToSection(sectionId)
	          setFormState(prev => ({ ...prev, showValidation: false }))
	          setTimeout(() => {
	            document.getElementById(fieldId)?.focus()
	          }, 500)
	        }}
	      />
      </div>
    </MotionConfig>
  )
}

export default SuitabilityForm
