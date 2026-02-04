import { useCallback, useEffect, useMemo, useState } from 'react'

import { safeWriteToClipboard } from '@/lib/utils'
import { validationEngine } from '@/lib/suitability/validationEngine'
import { calculateSuitabilityCompletion } from '@/lib/suitability/completion'
import { getMissingRequiredFieldErrors } from '@/lib/suitability/requiredFields'
import type { RequestResult, SuitabilityReportVariant } from '@/lib/documents/requestAssessmentReport'
import { aiAssistantService } from '@/services/aiAssistantService'
import type { SaveStatus } from '@/hooks/suitability/useSaveMutex'
import { canGenerateAISuggestions, formatSectionLabel, isValidAISuggestion } from '@/lib/suitability/ui/aiHelpers'
import { getIncompleteRequiredSections, getSubmissionErrorMessage } from '@/lib/suitability/ui/submitHelpers'
import { getCompletionGate, getComplianceGate, getValidationGate } from '@/lib/suitability/ui/submissionGates'
import { finalizeSuitabilityAndBuildRedirect } from '@/lib/suitability/ui/finalizeFlow'
import { calculateReconciledRisk } from '@/lib/assessments/riskReconciliation'
import { generateSuitabilityDraftHtmlReport, generateSuitabilityPdfReport, openGeneratedReport } from './reportActions'

import { SECTIONS } from '@/lib/suitability/ui/sectionsMeta'

import { useSuitabilityForm } from '@/hooks/suitability/useSuitabilityForm'
import { useSuitabilityNotifications } from '@/hooks/suitability/useSuitabilityNotifications'

import type { AISuggestion, SuitabilityFormData, ValidationError } from '@/types/suitability'
import clientLogger from '@/lib/logging/clientLogger'

type FormState = {
  currentSection: string
  expandedSections: Set<string>
  showAIPanel: boolean
  showValidation: boolean
  showFinancialDashboard: boolean
  showVersionHistory: boolean
  isSubmitting: boolean
  lastActivity: Date
}

type ProductHolding = {
  product_name?: string | null
  product_provider?: string | null
  service_id?: string | null
}

export type SuitabilityFormController = ReturnType<typeof useSuitabilityFormController>

const RECOMMENDATION_ALLOCATION_PRESETS: Record<
  string,
  { equities: number; bonds: number; cash: number; alternatives: number }
> = {
  conservative: { equities: 30, bonds: 55, cash: 10, alternatives: 5 },
  cautious: { equities: 30, bonds: 55, cash: 10, alternatives: 5 },
  balanced: { equities: 60, bonds: 30, cash: 5, alternatives: 5 },
  growth: { equities: 75, bonds: 15, cash: 5, alternatives: 5 },
  aggressive: { equities: 85, bonds: 10, cash: 2, alternatives: 3 }
}

const getRecommendationPreset = (portfolio: string | null | undefined) => {
  const normalized = (portfolio || '').toLowerCase()
  if (!normalized) return null
  if (normalized.includes('aggressive')) return RECOMMENDATION_ALLOCATION_PRESETS.aggressive
  if (normalized.includes('growth')) return RECOMMENDATION_ALLOCATION_PRESETS.growth
  if (normalized.includes('balanced')) return RECOMMENDATION_ALLOCATION_PRESETS.balanced
  if (normalized.includes('conservative') || normalized.includes('cautious')) {
    return RECOMMENDATION_ALLOCATION_PRESETS.conservative
  }
  return RECOMMENDATION_ALLOCATION_PRESETS.balanced
}

export function useSuitabilityFormController(params: {
  clientId: string
  assessmentId?: string
  isProspect: boolean
  allowAI: boolean
  autoSaveInterval: number
  onAssessmentIdChange?: (assessmentId: string) => void
  onComplete?: (data: SuitabilityFormData) => void
  onSaved?: (assessmentId: string) => void
  onCancel?: () => void
}) {
  const realtimeEnabled = false

  const {
    formData,
    pulledData,
    assessmentId: activeAssessmentId,
    updateField,
    updateSection,
    isLoading,
    isSaving,
    lastSaved,
    saveError,
    enhancedSaveState,
    validationErrors: hookValidationErrors,
    getConditionalFields,
    saveManually,
    resetSaveError,
    atrCflData,
    refreshATRCFL,
    refreshClient,
    isATRComplete,
    isCFLComplete,
    isPersonaComplete,
    personaAssessment,
    assessmentsNeedUpdate,
    saveState
  } = useSuitabilityForm({
    clientId: params.clientId,
    assessmentId: params.assessmentId,
    isProspect: params.isProspect,
    autoSave: true,
    autoSaveInterval: params.autoSaveInterval,
    syncEnabled: realtimeEnabled,
    enableConditionalLogic: true,
    enableValidation: true
  })

  const { notifications, showNotification } = useSuitabilityNotifications()
  const [servicesSelected, setServicesSelected] = useState<string[]>([])
  const [productHoldings, setProductHoldings] = useState<ProductHolding[]>([])
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportReady, setReportReady] = useState<{
    reportType: SuitabilityReportVariant
    result: RequestResult
    assessmentId: string
  } | null>(null)

  const reconciledRisk = useMemo(() => {
    return calculateReconciledRisk({
      atrScore: atrCflData?.atrScore,
      atrCategory: atrCflData?.atrCategory,
      cflScore: atrCflData?.cflScore,
      cflCategory: atrCflData?.cflCategory
    })
  }, [atrCflData?.atrCategory, atrCflData?.atrScore, atrCflData?.cflCategory, atrCflData?.cflScore])

  useEffect(() => {
    if (!params.onAssessmentIdChange) return
    if (activeAssessmentId) {
      params.onAssessmentIdChange(activeAssessmentId)
    }
  }, [activeAssessmentId, params])

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

  const effectiveValidationErrors = hookValidationErrors || validationErrors

  const requiredFieldErrors = useMemo<ValidationError[]>(() => {
    return getMissingRequiredFieldErrors(formData, pulledData)
  }, [formData, pulledData])

  const submissionValidationErrors = useMemo(() => {
    const keyOf = (e: ValidationError) => `${e.sectionId}.${e.fieldId}.${e.code || e.message}`
    const map = new Map<string, ValidationError>()
    for (const error of effectiveValidationErrors) map.set(keyOf(error), error)
    for (const error of requiredFieldErrors) map.set(keyOf(error), error)
    return Array.from(map.values())
  }, [effectiveValidationErrors, requiredFieldErrors])

  const combinedValidationErrors = useMemo(() => {
    if (!formState.showValidation && !formState.isSubmitting) return effectiveValidationErrors
    return submissionValidationErrors
  }, [effectiveValidationErrors, formState.isSubmitting, formState.showValidation, submissionValidationErrors])

  const validationIssueCount = submissionValidationErrors.length

  const validationResult = useMemo(() => validationEngine.validateComplete(formData, pulledData), [formData, pulledData])

  const completion = useMemo(() => calculateSuitabilityCompletion(formData, pulledData), [formData, pulledData])
  const completionScore = completion.overallPercentage

  const incompleteRequiredSections = useMemo(() => {
    return getIncompleteRequiredSections(SECTIONS, completion.sectionProgress)
  }, [completion.sectionProgress])

  useEffect(() => {
    if (!params.clientId) return
    const controller = new AbortController()

    const loadServicesSelected = async () => {
      try {
        const response = await fetch(`/api/clients/${params.clientId}/services`, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Failed to load client services (${response.status})`)
        }
        const result = await response.json()
        const selected = Array.isArray(result?.data?.services_selected) ? result.data.services_selected : []
        setServicesSelected(selected)
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.warn('Failed to load client services selection', error)
        setServicesSelected([])
      }
    }

    void loadServicesSelected()
    return () => controller.abort()
  }, [params.clientId])

  useEffect(() => {
    if (!params.clientId) return
    const controller = new AbortController()
    let isActive = true

    const loadHoldings = async () => {
      try {
        const response = await fetch(`/api/clients/${params.clientId}/holdings`, {
          signal: controller.signal,
          credentials: 'include'
        })
        if (!response.ok) return
        const payload = await response.json().catch(() => ({}))
        if (!isActive) return
        const holdings = Array.isArray(payload?.holdings) ? payload.holdings : []
        setProductHoldings(holdings)
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.warn('Failed to load product holdings', error)
        setProductHoldings([])
      }
    }

    void loadHoldings()
    return () => {
      isActive = false
      controller.abort()
    }
  }, [params.clientId])

  const submissionErrorsBySection = useMemo(() => {
    const bySection = new Map<string, ValidationError[]>()
    for (const error of submissionValidationErrors) {
      if (!bySection.has(error.sectionId)) bySection.set(error.sectionId, [])
      bySection.get(error.sectionId)!.push(error)
    }

    return SECTIONS.map((section) => {
      const errors = bySection.get(section.id) ?? []
      return { section, errors }
    }).filter(({ errors }) => errors.length > 0)
  }, [submissionValidationErrors])

  useEffect(() => {
    setValidationErrors(validationResult.errors)
  }, [validationResult])

  const handleFieldUpdate = useCallback(
    (sectionId: string, fieldId: string, value: any, options?: any) => {
      const allowBroadcast = realtimeEnabled && options?.broadcast !== false
      const allocationFields = new Set([
        'allocation_equities',
        'allocation_bonds',
        'allocation_cash',
        'allocation_alternatives'
      ])

      const parseAllocation = (raw: any): number | null => {
        if (raw === null || raw === undefined || raw === '') return null
        const parsed = typeof raw === 'number' ? raw : Number(raw)
        return Number.isFinite(parsed) ? parsed : null
      }

      if (sectionId === 'recommendation' && fieldId === 'recommended_portfolio') {
        const preset = getRecommendationPreset(typeof value === 'string' ? value : '')
        if (preset) {
          updateSection(
            'recommendation',
            {
              recommended_portfolio: value,
              allocation_equities: preset.equities,
              allocation_bonds: preset.bonds,
              allocation_cash: preset.cash,
              allocation_alternatives: preset.alternatives
            },
            { ...options, broadcast: allowBroadcast }
          )
          return
        }
      }

      if (sectionId === 'recommendation' && allocationFields.has(fieldId)) {
        const nextValue = parseAllocation(value)
        if (nextValue !== null) {
          const current = formData?.recommendation || {}
          const currentAllocations = {
            allocation_equities: parseAllocation(current.allocation_equities) ?? 0,
            allocation_bonds: parseAllocation(current.allocation_bonds) ?? 0,
            allocation_cash: parseAllocation(current.allocation_cash) ?? 0,
            allocation_alternatives: parseAllocation(current.allocation_alternatives) ?? 0
          }

          const clampedValue = Math.min(100, Math.max(0, nextValue))
          const nextAllocations = {
            ...currentAllocations,
            [fieldId]: clampedValue
          } as Record<string, number>

          const remainingFields = Object.keys(currentAllocations).filter((key) => key !== fieldId)
          const remainingTotal = remainingFields.reduce((sum, key) => sum + (currentAllocations as any)[key], 0)
          const targetRemaining = Math.max(0, 100 - clampedValue)

          if (remainingFields.length > 0) {
            if (remainingTotal <= 0) {
              remainingFields.forEach((key, index) => {
                nextAllocations[key] = index === 0 ? targetRemaining : 0
              })
            } else {
              const scale = targetRemaining / remainingTotal
              let runningTotal = 0
              remainingFields.forEach((key, index) => {
                if (index === remainingFields.length - 1) {
                  const remainder = Math.max(0, targetRemaining - runningTotal)
                  nextAllocations[key] = Math.round(remainder * 100) / 100
                } else {
                  const scaled = Math.round(((currentAllocations as any)[key] * scale) * 100) / 100
                  nextAllocations[key] = Math.max(0, scaled)
                  runningTotal += nextAllocations[key]
                }
              })
            }
          }

          updateSection('recommendation', nextAllocations, { ...options, broadcast: allowBroadcast })
          return
        }
      }

      updateField(sectionId, fieldId, value, { ...options, broadcast: allowBroadcast })
    },
    [formData?.recommendation, realtimeEnabled, updateField, updateSection]
  )

  const handleSectionUpdate = useCallback((sectionId: string, data: any, options?: any) => {
    updateSection(sectionId, data, options)
  }, [updateSection])

  const handleGetAISuggestion = useCallback(
    async (sectionId: string) => {
      const aiOk = canGenerateAISuggestions({ allowAI: params.allowAI, formData, pulledData })
      if (!aiOk.ok) {
        showNotification({ title: 'AI Unavailable', description: aiOk.reason, type: 'warning' })
        return
      }

      setIsLoadingAI((prev) => ({ ...prev, [sectionId]: true }))

      try {
        const suggestion = await aiAssistantService.generateSuggestion(sectionId, formData, pulledData)
        if (!isValidAISuggestion(suggestion)) throw new Error('Invalid AI suggestion response')

        setAiSuggestions((prev) => ({ ...prev, [sectionId]: suggestion }))

        showNotification({
          title: 'AI Suggestions Ready',
          description: `Generated suggestions for ${formatSectionLabel(sectionId)}`,
          type: 'success'
        })
      } catch (error) {
        clientLogger.error('AI suggestion error:', error)
        showNotification({ title: 'AI Error', description: 'Failed to generate suggestions', type: 'error' })
      } finally {
        setIsLoadingAI((prev) => ({ ...prev, [sectionId]: false }))
      }
    },
    [formData, params.allowAI, pulledData, showNotification]
  )

  const navigateToSection = useCallback((sectionId: string, opts?: { openValidation?: boolean }) => {
    setFormState((prev) => ({
      ...prev,
      currentSection: sectionId,
      expandedSections: new Set([...prev.expandedSections, sectionId]),
      ...(opts?.openValidation ? { showValidation: true } : null)
    }))

    if (typeof document === 'undefined') return
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const handleSectionNavigation = useCallback(
    (direction: 'prev' | 'next') => {
      const currentIndex = SECTIONS.findIndex((s) => s.id === formState.currentSection)
      const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1

      if (newIndex >= 0 && newIndex < SECTIONS.length) {
        navigateToSection(SECTIONS[newIndex].id)
      }
    },
    [formState.currentSection, navigateToSection]
  )

  const handleSubmit = useCallback(async () => {
    const completionGate = getCompletionGate({ completionScore, sections: SECTIONS, sectionProgress: completion.sectionProgress })
    if (completionGate.kind === 'block') {
      showNotification(completionGate.notification)
      if (completionGate.navigateToSectionId) {
        navigateToSection(completionGate.navigateToSectionId, { openValidation: completionGate.openValidation })
      } else if (completionGate.openValidation) {
        setFormState((prev) => ({ ...prev, showValidation: true }))
      }
      return
    }
    if (completionGate.kind === 'confirm') {
      const ok = window.confirm(completionGate.message)
      if (!ok) return
    }

    const validationGate = getValidationGate({ completionScore, submissionValidationErrors, sections: SECTIONS })
    if (validationGate.kind === 'block') {
      showNotification(validationGate.notification)
      if (validationGate.navigateToSectionId) {
        navigateToSection(validationGate.navigateToSectionId, { openValidation: validationGate.openValidation })
      } else if (validationGate.openValidation) {
        setFormState((prev) => ({ ...prev, showValidation: true }))
      }
      return
    }
    if (validationGate.kind === 'confirm') {
      const ok = window.confirm(validationGate.message)
      if (!ok) {
        if (validationGate.onCancelShowValidation) setFormState((prev) => ({ ...prev, showValidation: true }))
        return
      }
    }

    const complianceGate = getComplianceGate({ compliance: validationResult.compliance })
    if (complianceGate.kind === 'block') {
      showNotification(complianceGate.notification)
      if (complianceGate.openValidation) setFormState((prev) => ({ ...prev, showValidation: true }))
      return
    }

    setFormState((prev) => ({ ...prev, isSubmitting: true }))

    try {
      const { finalAssessmentId } = await finalizeSuitabilityAndBuildRedirect({
        clientId: params.clientId,
        assessmentId: activeAssessmentId || params.assessmentId,
        fallbackAssessmentId: activeAssessmentId || params.assessmentId,
        formData,
        completionPercentage: completionScore,
        onSaved: params.onSaved,
        onComplete: params.onComplete
      })

      if (finalAssessmentId) {
        const result = await generateSuitabilityPdfReport({
          reportType: 'fullReport',
          assessmentId: finalAssessmentId,
          clientId: params.clientId,
          showNotification,
          includeAI: true,
          openWindow: false
        })

        if (result) {
          setReportReady({
            reportType: 'fullReport',
            result,
            assessmentId: finalAssessmentId
          })
        }
      }

      showNotification({
        title: 'Assessment Complete',
        description: 'Suitability assessment submitted successfully',
        type: 'success',
        duration: 7000
      })
    } catch (error) {
      const errorMessage = getSubmissionErrorMessage(error)
      showNotification({ title: 'Submission Failed', description: errorMessage, type: 'error', duration: 10000 })
      clientLogger.error('Detailed submission error:', { error, clientId: params.clientId, completionScore })
    } finally {
      setFormState((prev) => ({ ...prev, isSubmitting: false }))
    }
  }, [
    activeAssessmentId,
    completion.sectionProgress,
    completionScore,
    formData,
    navigateToSection,
    params,
    showNotification,
    submissionValidationErrors,
    validationResult.compliance
  ])

  const handleGenerateDraftReport = useCallback(() => {
    return generateSuitabilityDraftHtmlReport({
      formData,
      completionScore,
      activeAssessmentId,
      assessmentId: params.assessmentId,
      showNotification
    })
  }, [activeAssessmentId, completionScore, formData, params.assessmentId, showNotification])

  const handleGeneratePDFReport = useCallback(
    async (reportType: SuitabilityReportVariant = 'fullReport') => {
      const effectiveAssessmentId = activeAssessmentId || params.assessmentId
      const result = await generateSuitabilityPdfReport({
        reportType,
        activeAssessmentId,
        assessmentId: params.assessmentId,
        clientId: params.clientId,
        showNotification,
        openWindow: false
      })

      if (result && effectiveAssessmentId) {
        setReportReady({
          reportType,
          result,
          assessmentId: effectiveAssessmentId
        })
      }

      return result
    },
    [activeAssessmentId, params.assessmentId, params.clientId, showNotification, setReportReady]
  )

  const handleOpenReadyReport = useCallback(() => {
    if (!reportReady) return false
    return openGeneratedReport({
      result: reportReady.result,
      reportType: reportReady.reportType,
      allowSameTabFallback: false
    })
  }, [reportReady])

  const handleDismissReadyReport = useCallback(() => {
    setReportReady(null)
  }, [])

  const handleGeneratePdfWithLoading = useCallback(
    async (reportType: SuitabilityReportVariant) => {
      setIsGeneratingReport(true)
      try {
        await handleGeneratePDFReport(reportType)
      } finally {
        setIsGeneratingReport(false)
      }
    },
    [handleGeneratePDFReport]
  )

  const toggleExpandedSection = useCallback((sectionId: string) => {
    setFormState((prev) => {
      const newExpanded = new Set(prev.expandedSections)
      if (newExpanded.has(sectionId)) newExpanded.delete(sectionId)
      else newExpanded.add(sectionId)
      return { ...prev, expandedSections: newExpanded }
    })
  }, [])

  const handleSaveDraftClick = useCallback(async () => {
    const success = await saveManually()
    if (success) {
      showNotification({ title: 'Draft Saved', description: 'Your progress has been saved', type: 'success', duration: 3000 })
      return
    }
    showNotification({ title: 'Save Failed', description: 'Unable to save draft. Please try again.', type: 'error', duration: 5000 })
  }, [saveManually, showNotification])

  const openVersionHistory = useCallback(() => {
    setFormState((prev) => ({ ...prev, showVersionHistory: true }))
  }, [])

  const handleShareLink = useCallback(async () => {
    const url = `${window.location.origin}/assessments/${params.assessmentId}/share`
    const ok = await safeWriteToClipboard(url)
    showNotification(
      ok
        ? { title: 'Link Copied', description: 'Share link copied to clipboard', type: 'success' }
        : { title: 'Copy Failed', description: 'Clipboard not available in this browser', type: 'error' }
    )
  }, [params.assessmentId, showNotification])

  const sectionErrorsMap = useMemo(() => {
    return SECTIONS.reduce<Record<string, boolean>>((acc, s) => {
      acc[s.id] = combinedValidationErrors.some((e) => e.sectionId === s.id)
      return acc
    }, {})
  }, [combinedValidationErrors])

  return {
    formData,
    pulledData,
    activeAssessmentId,
    isLoading,
    isSaving,
    lastSaved,
    saveError,
    enhancedSaveState,
    saveState,
    saveStatus: {
      status: ((enhancedSaveState?.status || 'idle') as SaveStatus),
      lastSaved: enhancedSaveState?.lastSaved || lastSaved || null,
      lastError: enhancedSaveState?.lastError || saveError || null,
      pendingChanges: Boolean(enhancedSaveState?.pendingChanges),
      onRetry: resetSaveError
        ? () => {
            resetSaveError()
            void saveManually()
          }
        : undefined
    },
    notifications,
    showNotification,
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
    refreshClient,
    getConditionalFields,
    handleFieldUpdate,
    handleSectionUpdate,
    handleGetAISuggestion,
    navigateToSection,
    handleSectionNavigation,
    handleSubmit,
    handleGenerateDraftReport,
    handleGeneratePDFReport,
    handleGeneratePdfWithLoading,
    handleOpenReadyReport,
    handleDismissReadyReport,
    toggleExpandedSection,
    handleSaveDraftClick,
    openVersionHistory,
    handleShareLink
  }
}
