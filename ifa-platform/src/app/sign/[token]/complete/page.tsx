// src/app/sign/[token]/complete/page.tsx
// Completion page after signing - no auth required

'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  CheckCircle2,
  Download,
  Mail,
  ShieldCheck,
  Home
} from 'lucide-react'

export default function SigningCompletePage({
  params
}: {
  params: { token: string }
}) {
  const token = params.token

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center">
          {/* Success icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Document Signed Successfully!
          </h1>
          <p className="text-gray-600 mb-6">
            Your signature has been applied and the document is now complete.
          </p>

          {/* What happens next */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 text-left">
            <h2 className="font-semibold text-gray-900 mb-3">What happens next?</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Confirmation email</p>
                  <p className="text-sm text-gray-500">
                    You&apos;ll receive a copy of the signed document by email shortly.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Secure storage</p>
                  <p className="text-sm text-gray-500">
                    Your signed document is securely stored and accessible by your advisor.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Download className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Download available</p>
                  <p className="text-sm text-gray-500">
                    You can download the signed document from the email we send you.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span>Legally binding electronic signature</span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              You can safely close this window now.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Powered by Plannetic &bull; Secure E-Signature Platform
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
