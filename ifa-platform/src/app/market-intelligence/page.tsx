'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Layout } from '@/components/layout/Layout'
import { MarketIntelligenceDashboard } from '@/components/analytics/MarketIntelligenceDashboard'

function MarketIntelligenceContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId') || undefined

  return (
    <Layout>
      <MarketIntelligenceDashboard initialClientId={clientId} />
    </Layout>
  )
}

export default function MarketIntelligencePage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-96" />
          </div>
          <div className="h-32 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded-lg" />
            <div className="h-80 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </Layout>
    }>
      <MarketIntelligenceContent />
    </Suspense>
  )
}
