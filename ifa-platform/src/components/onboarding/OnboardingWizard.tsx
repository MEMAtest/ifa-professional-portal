'use client'

import { useState, useCallback, useMemo } from 'react'
import { Check } from 'lucide-react'
import WelcomeStep from './steps/WelcomeStep'
import FirmDetailsStep from './steps/FirmDetailsStep'
import AdvisorProfileStep from './steps/AdvisorProfileStep'
import SignatureSetupStep from './steps/SignatureSetupStep'
import ConsumerDutyStep from './steps/ConsumerDutyStep'
import TeamSetupStep from './steps/TeamSetupStep'
import CompletionStep from './steps/CompletionStep'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingState {
  steps: {
    firmDetails: boolean
    advisorProfile: boolean
    signatureSetup: boolean | 'skipped'
    consumerDuty: boolean | 'skipped'
    teamSetup: boolean | 'skipped'
  }
}

interface OnboardingWizardProps {
  onComplete: () => void | Promise<void>
  saving?: boolean
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'firmDetails', label: 'Firm Details' },
  { key: 'advisorProfile', label: 'Profile' },
  { key: 'signatureSetup', label: 'Signature' },
  { key: 'consumerDuty', label: 'Compliance' },
  { key: 'teamSetup', label: 'Team' },
  { key: 'completion', label: 'Done' },
] as const

type StepKey = (typeof STEPS)[number]['key']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingWizard({ onComplete, saving }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    steps: {
      firmDetails: false,
      advisorProfile: false,
      signatureSetup: false,
      consumerDuty: false,
      teamSetup: false,
    },
  })

  // -----------------------------------------------------------------------
  // Step navigation helpers
  // -----------------------------------------------------------------------

  const goTo = useCallback((step: number) => {
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const markComplete = useCallback(
    (stepKey: StepKey, value: boolean | 'skipped' = true) => {
      setCompletedSteps((prev) => {
        const next = new Set(prev)
        next.add(currentStep)
        return next
      })
      if (stepKey !== 'welcome' && stepKey !== 'completion') {
        setOnboardingState((prev) => ({
          ...prev,
          steps: {
            ...prev.steps,
            [stepKey]: value,
          },
        }))
      }
    },
    [currentStep]
  )

  const handleNext = useCallback(() => {
    const stepKey = STEPS[currentStep].key
    markComplete(stepKey, true)
    if (currentStep < STEPS.length - 1) {
      goTo(currentStep + 1)
    }
  }, [currentStep, markComplete, goTo])

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      goTo(currentStep - 1)
    }
  }, [currentStep, goTo])

  const handleSkip = useCallback(() => {
    const stepKey = STEPS[currentStep].key
    markComplete(stepKey, 'skipped')
    if (currentStep < STEPS.length - 1) {
      goTo(currentStep + 1)
    }
  }, [currentStep, markComplete, goTo])

  const handleFinish = useCallback(() => {
    markComplete('completion')
    onComplete()
  }, [markComplete, onComplete])

  // -----------------------------------------------------------------------
  // Build the completedSteps record for the CompletionStep
  // -----------------------------------------------------------------------

  const completedStepsRecord = useMemo(() => {
    return { ...onboardingState.steps } as Record<string, boolean | 'skipped'>
  }, [onboardingState.steps])

  // -----------------------------------------------------------------------
  // Render current step
  // -----------------------------------------------------------------------

  const renderStep = () => {
    switch (STEPS[currentStep].key) {
      case 'welcome':
        return <WelcomeStep onNext={handleNext} />
      case 'firmDetails':
        return <FirmDetailsStep onNext={handleNext} onBack={handleBack} />
      case 'advisorProfile':
        return <AdvisorProfileStep onNext={handleNext} onBack={handleBack} />
      case 'signatureSetup':
        return (
          <SignatureSetupStep
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        )
      case 'consumerDuty':
        return (
          <ConsumerDutyStep
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        )
      case 'teamSetup':
        return (
          <TeamSetupStep
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        )
      case 'completion':
        return (
          <CompletionStep
            completedSteps={completedStepsRecord}
            onFinish={handleFinish}
            saving={saving}
          />
        )
      default:
        return null
    }
  }

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Step Indicator Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep
              const isCompleted = completedSteps.has(index)
              const isLast = index === STEPS.length - 1

              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  {/* Step circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={`text-xs mt-1 hidden sm:block ${
                        isActive
                          ? 'text-blue-600 font-medium'
                          : isCompleted
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-colors ${
                        isCompleted ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {renderStep()}
      </div>
    </div>
  )
}
