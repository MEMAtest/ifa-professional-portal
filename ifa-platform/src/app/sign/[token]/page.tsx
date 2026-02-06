'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface SigningInfo {
  id: string
  documentName: string
  recipientName: string
  recipientEmail: string
  advisorName: string
  firmName: string
  expiresAt: string | null
  status: string
}

export default function SigningLandingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [signingInfo, setSigningInfo] = useState<SigningInfo | null>(null)

  useEffect(() => {
    async function validateToken() {
      try {
        const response = await fetch(`/api/public/sign/${token}`)
        const data = await response.json()

        if (!data.success) {
          setError(data.error || 'Invalid signing link')
          setErrorCode(data.errorCode || 'UNKNOWN')
          setLoading(false)
          return
        }

        setSigningInfo(data.signingInfo)
        setLoading(false)
      } catch (err) {
        setError('Failed to load signing information')
        setErrorCode('NETWORK_ERROR')
        setLoading(false)
      }
    }

    if (token) {
      validateToken()
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validating your signing link...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {errorCode === 'EXPIRED' ? 'Link Expired' : 
             errorCode === 'ALREADY_SIGNED' ? 'Already Signed' :
             'Invalid Link'}
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          {errorCode === 'EXPIRED' && (
            <p className="text-sm text-gray-500">
              Please contact your advisor to request a new signing link.
            </p>
          )}
          {errorCode === 'ALREADY_SIGNED' && (
            <p className="text-sm text-gray-500">
              This document has already been signed. You can close this window.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (!signingInfo) {
    return null
  }

  const expiryDate = signingInfo.expiresAt 
    ? new Date(signingInfo.expiresAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-8 text-white text-center">
            <h1 className="text-2xl font-bold mb-2">Document Ready for Signature</h1>
            <p className="text-blue-100">from {signingInfo.firmName}</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Document Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{signingInfo.documentName}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Sent by {signingInfo.advisorName}
                  </p>
                </div>
              </div>
            </div>

            {/* Signer Info */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Signing as:</span> {signingInfo.recipientName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {signingInfo.recipientEmail}
              </p>
              {expiryDate && (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Expires:</span> {expiryDate}
                </p>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-medium text-amber-800 mb-2">What to expect</h3>
              <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                <li>Review the document carefully</li>
                <li>Draw your signature using your mouse or finger</li>
                <li>Confirm your consent and submit</li>
              </ol>
            </div>

            {/* Action Button */}
            <Link
              href={`/sign/${token}/view`}
              className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center font-medium rounded-lg transition-colors"
            >
              Review & Sign Document
            </Link>

            <p className="text-xs text-center text-gray-500">
              Your signature will be legally binding under the Electronic Communications Act 2000
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
