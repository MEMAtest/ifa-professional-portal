// src/app/client/assessment/[token]/page.tsx
// Public landing page for client assessments - no auth required

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  ClipboardList,
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Loader2
} from 'lucide-react'

interface AssessmentInfo {
  id: string
  type: string
  typeLabel: string
  clientName: string
  advisorName: string
  expiresAt: string
  status: string
  customMessage?: string
  requiresPassword: boolean
}

export default function AssessmentLandingPage({
  params
}: {
  params: { token: string }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null)

  // Get token directly from params (Next.js 14 pattern)
  const token = params.token

  useEffect(() => {
    if (token) {
      validateToken(token)
    }
  }, [token])

  const validateToken = async (tokenValue: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/assessments/share/${tokenValue}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid assessment link')
        setErrorCode(data.code || 'UNKNOWN')
        return
      }

      setAssessment(data.assessment)
    } catch (err) {
      setError('Failed to load assessment. Please try again.')
      setErrorCode('NETWORK_ERROR')
    } finally {
      setLoading(false)
    }
  }

  const handleStartAssessment = async () => {
    if (!token) return

    // Update status to started
    try {
      await fetch(`/api/assessments/share/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'started' })
      })
    } catch (err) {
      // Continue even if status update fails
    }

    router.push(`/client/assessment/${token}/form`)
  }

  const getEstimatedTime = (type: string): string => {
    switch (type) {
      case 'atr': return '5-7 minutes'
      case 'cfl': return '3-5 minutes'
      case 'investor_persona': return '5-10 minutes'
      default: return '5-10 minutes'
    }
  }

  const getAssessmentDescription = (type: string): string => {
    switch (type) {
      case 'atr':
        return 'This questionnaire helps us understand your attitude towards investment risk. Your answers will help us recommend suitable investment strategies aligned with your comfort level.'
      case 'cfl':
        return 'This assessment evaluates your financial capacity to absorb potential investment losses. It considers your financial situation and how much you could afford to lose without significantly impacting your lifestyle.'
      case 'investor_persona':
        return 'This questionnaire helps us understand your investment personality, including your goals, preferences, and decision-making style. This helps us tailor our advice to suit your unique profile.'
      default:
        return 'This assessment will help your advisor better understand your financial situation and preferences.'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your assessment...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {errorCode === 'EXPIRED' && 'Link Expired'}
              {errorCode === 'COMPLETED' && 'Already Completed'}
              {errorCode === 'REVOKED' && 'Link Revoked'}
              {errorCode === 'ACCESS_LIMIT' && 'Access Limit Reached'}
              {!['EXPIRED', 'COMPLETED', 'REVOKED', 'ACCESS_LIMIT'].includes(errorCode || '') && 'Invalid Link'}
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            {errorCode === 'COMPLETED' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-800">
                  Your responses have been submitted. Your advisor will review them shortly.
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact your financial advisor.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!assessment) {
    return null
  }

  const expiryDate = new Date(assessment.expiresAt)
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">{assessment.typeLabel}</CardTitle>
          <CardDescription className="text-base">
            Requested by {assessment.advisorName}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Welcome message */}
          <div className="text-center">
            <p className="text-gray-700">
              Hello <span className="font-semibold">{assessment.clientName}</span>,
            </p>
            {assessment.customMessage && (
              <p className="mt-2 text-gray-600 italic">&quot;{assessment.customMessage}&quot;</p>
            )}
          </div>

          {/* Assessment description */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              {getAssessmentDescription(assessment.type)}
            </p>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Estimated Time</p>
              <p className="text-sm font-medium text-gray-900">{getEstimatedTime(assessment.type)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${daysUntilExpiry <= 2 ? 'bg-orange-50' : 'bg-green-50'}`}>
              <AlertCircle className={`h-5 w-5 mx-auto mb-1 ${daysUntilExpiry <= 2 ? 'text-orange-600' : 'text-green-600'}`} />
              <p className="text-xs text-gray-500">Expires In</p>
              <p className={`text-sm font-medium ${daysUntilExpiry <= 2 ? 'text-orange-700' : 'text-gray-900'}`}>
                {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-3 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p>
              Your responses are secure and will only be shared with your financial advisor.
            </p>
          </div>

          {/* Start button */}
          <Button
            onClick={handleStartAssessment}
            className="w-full h-12 text-lg"
            size="lg"
          >
            Start Assessment
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          {/* Footer */}
          <p className="text-xs text-center text-gray-400">
            By starting this assessment, you agree to share your responses with your advisor.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
