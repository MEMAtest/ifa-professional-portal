'use client'

import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { CheckCircle2, Circle, SkipForward, ArrowRight } from 'lucide-react'

interface CompletionStepProps {
  completedSteps: Record<string, boolean | 'skipped'>
  onFinish: () => void
  saving?: boolean
}

const stepLabels: Record<string, string> = {
  firmDetails: 'Firm Details',
  advisorProfile: 'Advisor Profile',
  signatureSetup: 'Email Signature',
  consumerDuty: 'Consumer Duty',
  teamSetup: 'Team Setup',
}

export default function CompletionStep({ completedSteps, onFinish, saving }: CompletionStepProps) {
  const entries = Object.entries(stepLabels)
  const completedCount = entries.filter(
    ([key]) => completedSteps[key] === true
  ).length
  const skippedCount = entries.filter(
    ([key]) => completedSteps[key] === 'skipped'
  ).length

  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
      {/* Success Icon */}
      <div className="mb-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          You&apos;re all set!
        </h1>
        <p className="text-lg text-gray-600">
          Your firm is configured and ready to go. You can always adjust these
          settings later from the Settings page.
        </p>
      </div>

      {/* Step Summary */}
      <Card className="w-full mb-8">
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Setup Summary
          </h2>
          <ul className="space-y-3 text-left">
            {entries.map(([key, label]) => {
              const status = completedSteps[key]
              return (
                <li key={key} className="flex items-center gap-3">
                  {status === true ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : status === 'skipped' ? (
                    <SkipForward className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  )}
                  <span
                    className={
                      status === true
                        ? 'text-gray-900 font-medium'
                        : status === 'skipped'
                        ? 'text-amber-700'
                        : 'text-gray-400'
                    }
                  >
                    {label}
                  </span>
                  {status === 'skipped' && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Skipped
                    </span>
                  )}
                  {status === true && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Complete
                    </span>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
            {completedCount} completed, {skippedCount} skipped
          </div>
        </CardContent>
      </Card>

      <Button size="lg" onClick={onFinish} disabled={saving} className="gap-2">
        {saving ? 'Saving...' : 'Go to Dashboard'}
        {!saving && <ArrowRight className="w-4 h-4" />}
      </Button>
    </div>
  )
}
