// src/app/client/assessment/[token]/complete/page.tsx
// Completion confirmation page shown after assessment is submitted

'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import {
  CheckCircle2,
  Mail,
  Clock,
  Shield,
  Sparkles
} from 'lucide-react'

interface AssessmentInfo {
  typeLabel: string
  advisorName: string
}

export default function AssessmentCompletePage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null)

  useEffect(() => {
    params.then(p => {
      // Try to get assessment info (even though completed)
      fetch(`/api/assessments/share/${p.token}`)
        .then(res => res.json())
        .then(data => {
          if (data.assessment) {
            setAssessment(data.assessment)
          }
        })
        .catch(() => {
          // Ignore errors - show generic completion message
        })
    })
  }, [params])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center">
          {/* Success icon with animation */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <Sparkles className="h-6 w-6 text-yellow-500 absolute top-0 right-1/3 animate-bounce" />
          </div>

          {/* Main message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Assessment Complete!
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for completing your{' '}
            {assessment?.typeLabel || 'assessment'}. Your responses have been
            securely submitted.
          </p>

          {/* What happens next */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Advisor Notified</p>
                  <p className="text-xs text-gray-500">
                    {assessment?.advisorName || 'Your advisor'} has been notified of your completed assessment.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Review in Progress</p>
                  <p className="text-xs text-gray-500">
                    Your responses will be reviewed and factored into your personalised financial advice.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Secure & Confidential</p>
                  <p className="text-xs text-gray-500">
                    Your data is encrypted and stored securely. Only your advisor has access.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Thank you note */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700">
              If you have any questions about this assessment or your financial planning,
              please contact{' '}
              <span className="font-medium">{assessment?.advisorName || 'your advisor'}</span>
              {' '}directly.
            </p>
          </div>

          {/* Close message */}
          <p className="text-xs text-gray-400">
            You can now close this window.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
