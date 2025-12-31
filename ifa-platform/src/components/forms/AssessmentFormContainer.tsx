// src/components/forms/AssessmentFormContainer.tsx - FINAL FIXED VERSION
'use client'
import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Assessment, AssessmentState, ClientProfile, FinancialProfile, RiskProfile, VulnerabilityAssessment, KnowledgeExperience } from '@/types'
import { ASSESSMENT_STEPS } from '@/constants/assessmentSteps'
import { ProgressBar } from './ProgressBar'
import { StepNavigation } from './StepNavigation'
import { ClientDetailsStep } from './steps/ClientDetailsStep'
import { FinancialAssessmentStep } from './steps/FinancialAssessmentStep'
import { RiskProfileStep } from './steps/RiskProfileStep'
import { VulnerabilityStep } from './steps/VulnerabilityStep'
import { KnowledgeStep } from './steps/KnowledgeStep'
import { SuitabilityStep } from './steps/SuitabilityStep'
import { ReviewStep } from './steps/ReviewStep'
import { CheckCircle, AlertCircle, Save } from 'lucide-react'

interface AssessmentFormContainerProps {
  assessmentId?: string
  onSave?: (assessment: Assessment) => Promise<void>
  onSubmit?: (assessment: Assessment) => Promise<void>
}

export const AssessmentFormContainer = ({ 
  assessmentId, 
  onSave, 
  onSubmit 
}: AssessmentFormContainerProps) => {
  const [state, setState] = useState<AssessmentState>({
    currentStep: 0,
    steps: ASSESSMENT_STEPS.map(step => ({ ...step, completed: false, validationErrors: [] })),
    assessment: createEmptyAssessment(assessmentId),
    isDirty: false,
    isSubmitting: false,
    autoSaveEnabled: true
  })

  const handleAutoSave = useCallback(async () => {
    if (onSave && state.isDirty) {
      try {
        await onSave(state.assessment)
        setState(prev => ({ 
          ...prev, 
          isDirty: false, 
          lastSaved: new Date().toISOString() 
        }))
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }
  }, [onSave, state.assessment, state.isDirty])

  // Auto-save functionality
  useEffect(() => {
    if (state.isDirty && state.autoSaveEnabled && onSave) {
      const timer = setTimeout(() => {
        handleAutoSave()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [handleAutoSave, onSave, state.autoSaveEnabled, state.isDirty])

  const updateAssessment = useCallback((updates: Partial<Assessment>) => {
    setState(prev => ({
      ...prev,
      assessment: { ...prev.assessment, ...updates },
      isDirty: true
    }))
  }, [])

  const calculateCompletionPercentage = useCallback(() => {
    const completedSteps = state.steps.filter(step => step.completed).length
    return Math.round((completedSteps / state.steps.length) * 100)
  }, [state.steps])

  const validateCurrentStep = useCallback((): boolean => {
    const currentStep = state.steps[state.currentStep]
    const errors: string[] = []

    switch (currentStep.id) {
      case 'client_details':
        if (!state.assessment.clientProfile.firstName) errors.push('First name is required')
        if (!state.assessment.clientProfile.lastName) errors.push('Last name is required')
        if (!state.assessment.clientProfile.clientRef) errors.push('Client reference is required')
        break
      
      case 'financial_assessment':
        if (!state.assessment.financialProfile.investmentAmount) errors.push('Investment amount is required')
        if (!state.assessment.financialProfile.timeHorizon) errors.push('Time horizon is required')
        break
      
      case 'risk_profile':
        if (!state.assessment.riskProfile.attitudeToRisk) errors.push('Attitude to risk is required')
        if (!state.assessment.riskProfile.capacityForLoss) errors.push('Capacity for loss is required')
        break
    }

    setState(prev => ({
      ...prev,
      steps: prev.steps.map((step, index) =>
        index === state.currentStep
          ? { ...step, validationErrors: errors, completed: errors.length === 0 }
          : step
      )
    }))

    return errors.length === 0
  }, [state.currentStep, state.assessment, state.steps])

  const handleNext = useCallback(() => {
    if (validateCurrentStep() && state.currentStep < state.steps.length - 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }))
    }
  }, [state.currentStep, state.steps.length, validateCurrentStep])

  const handlePrevious = useCallback(() => {
    if (state.currentStep > 0) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }))
    }
  }, [state.currentStep])

  const handleStepClick = useCallback((stepIndex: number) => {
    setState(prev => ({ ...prev, currentStep: stepIndex }))
  }, [])

  const handleSubmitAssessment = useCallback(async () => {
    if (!onSubmit) return

    setState(prev => ({ ...prev, isSubmitting: true }))

    try {
      const finalAssessment: Assessment = {
        ...state.assessment,
        status: 'completed',
        completionPercentage: 100,
        submittedAt: new Date().toISOString()
      }

      await onSubmit(finalAssessment)
    } catch (error) {
      console.error('Submission failed:', error)
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }))
    }
  }, [onSubmit, state.assessment])

  const renderCurrentStep = () => {
    const currentStep = state.steps[state.currentStep]
    
    switch (currentStep.id) {
      case 'client_details':
        return (
          <ClientDetailsStep
            clientProfile={state.assessment.clientProfile}
            onChange={(updates: Partial<ClientProfile>) => updateAssessment({ clientProfile: { ...state.assessment.clientProfile, ...updates } })}
            errors={currentStep.validationErrors}
          />
        )
      
      case 'financial_assessment':
        return (
          <FinancialAssessmentStep
            financialProfile={state.assessment.financialProfile}
            onChange={(updates: Partial<FinancialProfile>) => updateAssessment({ financialProfile: { ...state.assessment.financialProfile, ...updates } })}
            errors={currentStep.validationErrors}
          />
        )
      
      case 'risk_profile':
        return (
          <RiskProfileStep
            riskProfile={state.assessment.riskProfile}
            financialProfile={state.assessment.financialProfile}
            onChange={(updates: Partial<RiskProfile>) => updateAssessment({ riskProfile: { ...state.assessment.riskProfile, ...updates } })}
            errors={currentStep.validationErrors}
          />
        )
      
      case 'vulnerability_assessment':
        return (
          <VulnerabilityStep
            vulnerabilityAssessment={state.assessment.vulnerabilityAssessment}
            onChange={(updates: Partial<VulnerabilityAssessment>) => updateAssessment({ vulnerabilityAssessment: { ...state.assessment.vulnerabilityAssessment, ...updates } })}
            errors={currentStep.validationErrors}
          />
        )
      
      case 'knowledge_experience':
        return (
          <KnowledgeStep
            knowledgeExperience={state.assessment.knowledgeExperience}
            onChange={(updates: Partial<KnowledgeExperience>) => updateAssessment({ knowledgeExperience: { ...state.assessment.knowledgeExperience, ...updates } })}
            errors={currentStep.validationErrors}
          />
        )
      
      case 'suitability_assessment':
        return (
          <SuitabilityStep
            assessment={state.assessment}
            onChange={(updates: any) => updateAssessment(updates)}
            errors={currentStep.validationErrors}
          />
        )
      
      case 'review_submit':
        return (
          <ReviewStep
            assessment={state.assessment}
            onSubmit={handleSubmitAssessment}
            isSubmitting={state.isSubmitting}
          />
        )
      
      default:
        return <div>Step not found</div>
    }
  }

  const currentStep = state.steps[state.currentStep]
  const isLastStep = state.currentStep === state.steps.length - 1
  const completionPercentage = calculateCompletionPercentage()

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Suitability Assessment</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {state.assessment.clientProfile.firstName && state.assessment.clientProfile.lastName 
                  ? `${state.assessment.clientProfile.firstName} ${state.assessment.clientProfile.lastName}`
                  : 'New Assessment'
                }
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{completionPercentage}% Complete</p>
                {state.lastSaved && (
                  <p className="text-xs text-gray-500">
                    Last saved: {new Date(state.lastSaved).toLocaleTimeString()}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoSave}
                disabled={!state.isDirty}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
          <ProgressBar current={state.currentStep + 1} total={state.steps.length} />
        </CardHeader>
      </Card>

      {/* Step Navigation */}
      <StepNavigation
        steps={state.steps}
        currentStep={state.currentStep}
        onStepClick={handleStepClick}
      />

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            {currentStep.completed ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : currentStep.validationErrors.length > 0 ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
            )}
            <CardTitle>{currentStep.title}</CardTitle>
          </div>
          <p className="text-sm text-gray-600">{currentStep.description}</p>
        </CardHeader>
        <CardContent>
          {renderCurrentStep()}
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={state.currentStep === 0}
            >
              Previous
            </Button>
            
            <div className="space-x-2">
              {!isLastStep ? (
                <Button onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitAssessment}
                  loading={state.isSubmitting}
                  disabled={state.steps.some(step => !step.completed)}
                >
                  Submit Assessment
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function createEmptyAssessment(id?: string): Assessment {
  const now = new Date().toISOString()
  return {
    id: id || `assessment_${Date.now()}`,
    formId: `form_${Date.now()}`,
    clientProfile: {
      id: '',
      clientRef: '',
      title: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      age: 0,
      occupation: '',
      maritalStatus: '',
      dependents: 0,
      address: { street: '', city: '', postcode: '', country: 'UK' },
      contactDetails: { phone: '', email: '', preferredContact: 'email' },
      createdAt: now,
      updatedAt: now
    },
    financialProfile: {
      investmentAmount: 0,
      timeHorizon: 0,
      primaryObjective: '',
      secondaryObjectives: [],
      incomeRequirement: 0,
      emergencyFund: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0,
      monthlyIncome: 0,
      monthlyExpenditure: 0,
      disposableIncome: 0,
      pensionValue: 0,
      propertyValue: 0
    },
    riskProfile: {
      attitudeToRisk: 0,
      capacityForLoss: 0,
      maxAcceptableLoss: 0,
      emergencyMonths: 0,
      finalRiskProfile: 0,
      riskReconciliation: '',
      volatilityTolerance: 0,
      expectedReturn: 0
    },
    vulnerabilityAssessment: {
      is_vulnerable: false,
      vulnerabilityTypes: [],
      healthVulnerabilities: '',
      lifeEventVulnerabilities: '',
      resilienceVulnerabilities: '',
      capabilityVulnerabilities: '',
      adaptationsMade: '',
      supportRequired: '',
      reviewFrequency: 'standard'
    },
    knowledgeExperience: {
      investmentKnowledge: 'basic',
      investmentExperience: 0,
      productKnowledge: {
        shares: false,
        bonds: false,
        funds: false,
        derivatives: false,
        alternatives: false
      },
      advisorReliance: 'medium',
      educationRequired: false,
      notes: ''
    },
    suitabilityAssessment: {
      meetsObjectives: false,
      objectivesExplanation: '',
      suitableForRisk: false,
      riskExplanation: '',
      affordabilityConfirmed: false,
      affordabilityNotes: '',
      recommendationSuitable: false,
      suitabilityScore: 0,
      complianceFlags: [],
      consumerDutyOutcomes: []
    },
    status: 'draft',
    completionPercentage: 0,
    adviceType: 'initial',
    adviserId: 'current_adviser',
    createdAt: now,
    updatedAt: now
  }
}
