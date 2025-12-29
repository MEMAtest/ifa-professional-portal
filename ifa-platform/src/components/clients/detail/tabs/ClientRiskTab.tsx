'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Scale, Shield } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import ConsumerDutyWizard from '@/components/compliance/ConsumerDutyWizard'
import VulnerabilityWizard from '@/components/compliance/VulnerabilityWizard'
import type { ClientDashboardData, ExtendedClientProfile } from '@/services/integratedClientService'
import { formatDate } from '@/lib/utils'

type ToastFn = (args: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void

type BooleanState = React.Dispatch<React.SetStateAction<boolean>>

export function ClientRiskTab(props: {
  client: ExtendedClientProfile
  clientName: string
  dashboardData?: ClientDashboardData | null
  refresh: () => Promise<void> | void
  toast: ToastFn
  onStartAssessment: () => void
  showVulnerabilityWizard: boolean
  setShowVulnerabilityWizard: BooleanState
  showConsumerDutyWizard: boolean
  setShowConsumerDutyWizard: BooleanState
}) {
  const {
    client,
    clientName,
    dashboardData,
    refresh,
    toast,
    onStartAssessment,
    showVulnerabilityWizard,
    setShowVulnerabilityWizard,
    showConsumerDutyWizard,
    setShowConsumerDutyWizard,
  } = props

  const router = useRouter()

  return (
    <>
      {/* Vulnerability Wizard Modal */}
      {showVulnerabilityWizard && (
        <VulnerabilityWizard
          clientId={client.id}
          clientName={clientName}
          firmId={client.firmId || undefined}
          onComplete={() => {
            setShowVulnerabilityWizard(false)
            refresh()
          }}
          onCancel={() => setShowVulnerabilityWizard(false)}
        />
      )}

      {/* Consumer Duty Wizard Modal */}
      {showConsumerDutyWizard && (
        <ConsumerDutyWizard
          clientId={client.id}
          clientName={clientName}
          onComplete={async (data) => {
            try {
              await fetch('/api/compliance/consumer-duty/assess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  clientId: client.id,
                  firmId: client.firmId,
                  answers: data.answers,
                  scores: data.scores,
                  overallScore: data.overallScore,
                  overallStatus: data.overallStatus,
                  isDraft: false
                })
              })
              setShowConsumerDutyWizard(false)
              refresh()
              toast({
                title: 'Assessment Complete',
                description: 'Consumer Duty assessment has been saved'
              })
            } catch {
              toast({
                title: 'Error',
                description: 'Failed to save assessment',
                variant: 'destructive'
              })
            }
          }}
          onSaveDraft={async (answers) => {
            try {
              await fetch('/api/compliance/consumer-duty/assess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  clientId: client.id,
                  firmId: client.firmId,
                  answers,
                  isDraft: true
                })
              })
              toast({
                title: 'Draft Saved',
                description: 'Your progress has been saved'
              })
            } catch {
              toast({
                title: 'Error',
                description: 'Failed to save draft',
                variant: 'destructive'
              })
            }
          }}
          onClose={() => setShowConsumerDutyWizard(false)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.currentAssessment ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Risk Tolerance</span>
                  <Badge>{dashboardData.currentAssessment.riskProfile.overall}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Attitude to Risk</span>
                  <span className="font-medium">{dashboardData.currentAssessment.riskProfile.attitudeToRisk}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Assessment</span>
                  <span className="text-sm">{formatDate(dashboardData.currentAssessment.completedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Overall Score</span>
                  <span className="font-medium">{dashboardData.currentAssessment.overallScore}%</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No assessment completed</p>
                <Button onClick={onStartAssessment}>Start Assessment</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Vulnerability Assessment
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowVulnerabilityWizard(true)}>
                {client.vulnerabilityAssessment?.is_vulnerable ? 'Update' : 'Assess'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <Badge variant={client.vulnerabilityAssessment?.is_vulnerable ? 'destructive' : 'default'}>
                  {client.vulnerabilityAssessment?.is_vulnerable ? 'Vulnerable' : 'Not Vulnerable'}
                </Badge>
              </div>
              {client.vulnerabilityAssessment?.vulnerabilityFactors &&
                client.vulnerabilityAssessment.vulnerabilityFactors.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Factors:</p>
                    <div className="flex flex-wrap gap-1">
                      {client.vulnerabilityAssessment.vulnerabilityFactors.map((factor: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              <div className="flex justify-between">
                <span className="text-gray-600">Review Date</span>
                <span className="text-sm">{formatDate(client.vulnerabilityAssessment?.reviewDate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consumer Duty Assessment */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Consumer Duty Assessment
            </CardTitle>
            <Button onClick={() => setShowConsumerDutyWizard(true)}>
              <Scale className="h-4 w-4 mr-2" />
              Start Assessment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            FCA Consumer Duty assessment covering Products & Services, Price & Value, Consumer Understanding, and Consumer
            Support outcomes.
          </p>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Products & Services</p>
              <Badge variant="outline">Not Assessed</Badge>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Price & Value</p>
              <Badge variant="outline">Not Assessed</Badge>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Understanding</p>
              <Badge variant="outline">Not Assessed</Badge>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Support</p>
              <Badge variant="outline">Not Assessed</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Review History - shows QA reviews for this client */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Compliance Review History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">
            QA file reviews for this client will appear here. Go to the Compliance Hub to initiate a new review.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/compliance')}>
            Go to Compliance Hub
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
