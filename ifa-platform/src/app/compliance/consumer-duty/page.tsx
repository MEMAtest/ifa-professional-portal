// src/app/compliance/consumer-duty/page.tsx
// ================================================================
// Consumer Duty Standalone Page
// FCA Consumer Duty compliance tracking
// ================================================================

'use client'

import { Layout } from '@/components/layout/Layout'
import ConsumerDutyDashboard from '@/components/compliance/ConsumerDutyDashboard'

export default function ConsumerDutyPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consumer Duty</h1>
          <p className="text-gray-600 mt-1">
            FCA Consumer Duty compliance tracking across all clients
          </p>
        </div>

        <ConsumerDutyDashboard />
      </div>
    </Layout>
  )
}
