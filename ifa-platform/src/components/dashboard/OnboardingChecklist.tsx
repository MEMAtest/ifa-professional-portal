'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useFirm } from '@/modules/firm/hooks/useFirm'
import { useAuth } from '@/hooks/useAuth'
import {
  CheckCircle,
  Circle,
  Building2,
  User,
  FileSignature,
  Shield,
  Users,
  ChevronRight,
  X,
  Rocket
} from 'lucide-react'

interface ChecklistStep {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  settingsPath: string
  isComplete: boolean
}

export function OnboardingChecklist() {
  const { firm, updateFirmAsync } = useFirm()
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  const firmSettings = firm?.settings as any
  const onboardingState = firmSettings?.onboarding

  // Don't show if onboarding is fully complete and was dismissed, or user is not admin
  if (dismissed || !user || user.role !== 'admin') return null

  // Don't show if no firm data yet
  if (!firm) return null

  // If onboarding was completed, don't show checklist
  if (onboardingState?.completed) return null

  const steps: ChecklistStep[] = [
    {
      key: 'firmDetails',
      label: 'Firm Details',
      description: 'Set your firm name, FCA number, and address',
      icon: <Building2 className="h-4 w-4" />,
      settingsPath: '/settings?tab=firm',
      isComplete: Boolean(firm.name && firm.fcaNumber),
    },
    {
      key: 'advisorProfile',
      label: 'Advisor Profile',
      description: 'Complete your personal profile',
      icon: <User className="h-4 w-4" />,
      settingsPath: '/settings?tab=profile',
      isComplete: Boolean(user.firstName && user.lastName),
    },
    {
      key: 'signatureSetup',
      label: 'Email Signature',
      description: 'Configure the signature appended to client emails',
      icon: <FileSignature className="h-4 w-4" />,
      settingsPath: '/settings?tab=firm',
      isComplete: onboardingState?.steps?.signatureSetup === true || onboardingState?.steps?.signatureSetup === 'skipped',
    },
    {
      key: 'consumerDuty',
      label: 'Consumer Duty',
      description: 'Set up compliance and review settings',
      icon: <Shield className="h-4 w-4" />,
      settingsPath: '/settings?tab=consumer-duty',
      isComplete: onboardingState?.steps?.consumerDuty === true || onboardingState?.steps?.consumerDuty === 'skipped',
    },
    {
      key: 'teamSetup',
      label: 'Team Setup',
      description: 'Invite team members to your firm',
      icon: <Users className="h-4 w-4" />,
      settingsPath: '/settings?tab=users',
      isComplete: onboardingState?.steps?.teamSetup === true || onboardingState?.steps?.teamSetup === 'skipped',
    },
  ]

  const completedCount = steps.filter(s => s.isComplete).length
  const totalSteps = steps.length
  const allComplete = completedCount === totalSteps

  const handleDismiss = async () => {
    setDismissed(true)
    if (allComplete) {
      try {
        await updateFirmAsync({
          settings: {
            ...firm.settings,
            onboarding: {
              ...onboardingState,
              completed: true,
              completedAt: new Date().toISOString(),
              completedBy: user.id,
            },
          } as any,
        })
      } catch {
        // Silently fail — checklist is dismissed locally
      }
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Getting Started</CardTitle>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600">
          {allComplete
            ? 'All setup steps are complete!'
            : `${completedCount} of ${totalSteps} steps completed`}
        </p>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalSteps) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <Link
            key={step.key}
            href={step.settingsPath}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              step.isComplete
                ? 'bg-green-50 border border-green-200'
                : 'bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
            }`}
          >
            {step.isComplete ? (
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {step.icon}
                <span className={`text-sm font-medium ${step.isComplete ? 'text-green-700' : 'text-gray-900'}`}>
                  {step.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
            </div>
            {!step.isComplete && (
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            )}
          </Link>
        ))}

        {allComplete && (
          <Button
            onClick={handleDismiss}
            className="w-full mt-2"
            variant="outline"
          >
            Dismiss Checklist
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
