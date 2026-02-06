// src/app/sign/[token]/view/page.tsx
// Document viewer and signature capture page - no auth required

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SignaturePad } from '@/components/signature/SignaturePad'
import { SigningConsentCheckbox } from '@/components/signature/SigningConsentCheckbox'
import {
  FileText,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  RotateCcw,
  Send,
  ZoomIn,
  ZoomOut
} from 'lucide-react'

interface SigningInfo {
  id: string
  documentName: string
  recipientName: string
  recipientEmail: string
  advisorName: string
}

type Step = 'view' | 'sign' | 'submit'

export default function SigningViewPage({
  params
}: {
  params: { token: string }
}) {
  const router = useRouter()
  const token = params.token

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signingInfo, setSigningInfo] = useState<SigningInfo | null>(null)

  // Document viewing state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [zoom, setZoom] = useState(100)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Signing state
  const [currentStep, setCurrentStep] = useState<Step>('view')
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [consentGiven, setConsentGiven] = useState(false)
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      loadSigningInfo()
    }
  }, [token])

  const loadSigningInfo = async () => {
    try {
      setLoading(true)

      // Validate token and get signing info
      const response = await fetch(`/api/public/sign/${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid signing link')
        return
      }

      setSigningInfo(data.signingInfo)

      // Set PDF URL for viewing
      setPdfUrl(`/api/public/sign/${token}/document`)
    } catch (err) {
      setError('Failed to load document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignatureChange = (dataUrl: string | null) => {
    setSignatureDataUrl(dataUrl)
  }

  const handleConsentChange = (consented: boolean, timestamp: string | null) => {
    setConsentGiven(consented)
    setConsentTimestamp(timestamp)
  }

  const handleSubmitSignature = async () => {
    if (!signatureDataUrl || !consentGiven || !consentTimestamp) {
      setSubmitError('Please complete your signature and consent')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(`/api/public/sign/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signatureDataUrl,
          consentGiven,
          consentTimestamp
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit signature')
      }

      // Redirect to completion page
      router.push(`/sign/${token}/complete`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit signature')
    } finally {
      setSubmitting(false)
    }
  }

  const goToStep = (step: Step) => {
    setCurrentStep(step)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading document...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push(`/sign/${token}`)} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-teal-600" />
            <div>
              <h1 className="font-semibold text-gray-900 text-sm sm:text-base">
                {signingInfo?.documentName || 'Document'}
              </h1>
              <p className="text-xs text-gray-500">
                From: {signingInfo?.advisorName}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="hidden sm:flex items-center gap-2">
            <StepIndicator
              step={1}
              label="Review"
              active={currentStep === 'view'}
              completed={currentStep === 'sign' || currentStep === 'submit'}
            />
            <div className="w-8 h-0.5 bg-gray-200" />
            <StepIndicator
              step={2}
              label="Sign"
              active={currentStep === 'sign'}
              completed={currentStep === 'submit'}
            />
            <div className="w-8 h-0.5 bg-gray-200" />
            <StepIndicator
              step={3}
              label="Submit"
              active={currentStep === 'submit'}
              completed={false}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-4 gap-4">
        {/* Document viewer */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {/* Document toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.max(50, zoom - 25))}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 min-w-[4rem] text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            <a
              href={pdfUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </div>

          {/* PDF viewer */}
          <div className="flex-1 overflow-auto bg-gray-200 p-4" style={{ minHeight: '400px' }}>
            {pdfUrl ? (
              <iframe
                ref={iframeRef}
                src={`${pdfUrl}#toolbar=0&view=FitH`}
                className="w-full h-full bg-white shadow-lg"
                style={{
                  minHeight: '500px',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center'
                }}
                title="Document Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Document not available</p>
              </div>
            )}
          </div>
        </div>

        {/* Signing panel */}
        <div className="w-full lg:w-96 space-y-4">
          {currentStep === 'view' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  Review Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Please review the document carefully before signing. Scroll through all pages to ensure you understand the contents.
                </p>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Signing for:</strong> {signingInfo?.recipientName}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {signingInfo?.recipientEmail}
                  </p>
                </div>
                <Button
                  onClick={() => goToStep('sign')}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  I&apos;ve Reviewed - Proceed to Sign
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStep === 'sign' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  Your Signature
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Draw your signature or type your name to generate one.
                </p>

                <SignaturePad
                  onSignatureChange={handleSignatureChange}
                  width={320}
                  height={150}
                  signerName={signingInfo?.recipientName || ''}
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => goToStep('view')}
                    className="flex-1"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={() => goToStep('submit')}
                    disabled={!signatureDataUrl}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'submit' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-teal-600" />
                  Confirm & Submit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Review your signature below and confirm your consent to sign this document electronically.
                </p>

                {/* Signature preview */}
                {signatureDataUrl && (
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-2">Your Signature:</p>
                    <img
                      src={signatureDataUrl}
                      alt="Your signature"
                      className="max-h-20 mx-auto"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSignatureDataUrl(null)
                        goToStep('sign')
                      }}
                      className="w-full mt-2 text-sm"
                    >
                      <RotateCcw className="mr-2 h-3 w-3" />
                      Redo Signature
                    </Button>
                  </div>
                )}

                {/* Consent checkbox */}
                <SigningConsentCheckbox
                  onConsentChange={handleConsentChange}
                  signerName={signingInfo?.recipientName || ''}
                  documentName={signingInfo?.documentName || 'this document'}
                />

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => goToStep('sign')}
                    disabled={submitting}
                    className="flex-1"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmitSignature}
                    disabled={!signatureDataUrl || !consentGiven || submitting}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Signature
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help text */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
            <p>
              <strong>Need help?</strong> Contact your advisor if you have any questions about this document.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

function StepIndicator({
  step,
  label,
  active,
  completed
}: {
  step: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
          completed
            ? 'bg-teal-600 text-white'
            : active
            ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-600'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {completed ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <span className={`text-xs ${active ? 'text-teal-700 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  )
}
