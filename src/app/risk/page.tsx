// File: src/app/risk/page.tsx
'use client'

import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function RiskPage() {
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Risk Management</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Overall Risk Level:</span>
                  <Badge variant="outline">Moderate</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Portfolio Volatility:</span>
                  <Badge variant="outline">Medium</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Concentration Risk:</span>
                  <Badge variant="outline">Low</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Risk Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Detailed risk metrics and analysis will be available here.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}