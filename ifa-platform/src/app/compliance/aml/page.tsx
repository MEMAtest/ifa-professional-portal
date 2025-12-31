// app/compliance/aml/page.tsx
// ================================================================
// AML/CTF Dashboard - Dedicated route for AML compliance
// ================================================================

'use client'

import React from 'react'
import { Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import AMLDashboard from '@/components/compliance/AMLDashboard'

export default function AMLPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/compliance"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AML/CTF Compliance</h1>
              <p className="text-sm text-gray-500">
                Anti-Money Laundering & Counter-Terrorism Financing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AML Dashboard Component */}
      <AMLDashboard />
    </div>
  )
}
