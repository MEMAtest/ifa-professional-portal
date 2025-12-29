// src/app/compliance/prod-services/page.tsx
// Dedicated Services & PROD compliance page

'use client'

import React from 'react'
import ProdServicesDashboard from '@/components/compliance/ProdServicesDashboard'
import { ProdServicesClientPanel } from '@/components/compliance/ProdServicesClientPanel'

export default function ComplianceProdServicesPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Services &amp; PROD</h1>
        <p className="text-gray-600">
          Centralised oversight for firm PROD governance, target market checks, and client coverage.
        </p>
      </div>

      <ProdServicesDashboard />

      <ProdServicesClientPanel />
    </div>
  )
}
