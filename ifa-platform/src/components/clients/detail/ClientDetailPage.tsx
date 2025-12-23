'use client'

// ===================================================================
// src/components/clients/detail/ClientDetailPage.tsx
// Client detail page container (moved out of app route for maintainability)
// ===================================================================

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

import { useClientIntegration } from '@/lib/hooks/useClientIntegration'
import { useClientDetailsData } from '@/hooks/useClientDetailsData'

import ActivityTab from '@/components/clients/ActivityTab'
import ServiceSelection from '@/components/clients/ServiceSelection'
import PlatformJustification from '@/components/clients/PlatformJustification'
import DecumulationStrategy from '@/components/clients/DecumulationStrategy'
import DocumentGenerationHub from '@/components/documents/DocumentGenerationHub'
import CashFlowDashboard from '@/components/cashflow/CashFlowDashboard'
import { LogCommunicationModal } from '@/components/communications/LogCommunicationModal'
import { ScheduleReviewModal } from '@/components/reviews/ScheduleReviewModal'
import { EditReviewModal } from '@/components/reviews/EditReviewModal'

import { ClientDetailHeader } from '@/components/clients/detail/ClientDetailHeader'
import { ClientCompletionOverviewCard } from '@/components/clients/detail/ClientCompletionOverviewCard'
import { ClientPendingActionsCard } from '@/components/clients/detail/ClientPendingActionsCard'
import { ClientQuickActionsGrid } from '@/components/clients/detail/ClientQuickActionsGrid'
import type { ClientPendingAction, ClientQuickAction } from '@/components/clients/detail/types'
import { ClientOverviewTab } from '@/components/clients/detail/tabs/ClientOverviewTab'
import { ClientFinancialTab } from '@/components/clients/detail/tabs/ClientFinancialTab'
import { ClientRiskTab } from '@/components/clients/detail/tabs/ClientRiskTab'
import { ClientCommunicationsTab } from '@/components/clients/detail/tabs/ClientCommunicationsTab'
import { ClientReviewsTab } from '@/components/clients/detail/tabs/ClientReviewsTab'

import { AlertCircle, Calculator, Download, FileText, TrendingUp } from 'lucide-react'

export function ClientDetailPage(props: { clientId: string }) {
  const { clientId } = props
  const router = useRouter()
  const { toast } = useToast()

  const { client, dashboardData, isLoading, error, generateDocument, refresh, getIntegrationStatus } =
    useClientIntegration({
      clientId,
      autoSave: false
    })

  const [activeTab, setActiveTab] = useState('overview')
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false)
  const [showVulnerabilityWizard, setShowVulnerabilityWizard] = useState(false)
  const [showConsumerDutyWizard, setShowConsumerDutyWizard] = useState(false)
  const [showCommunicationModal, setShowCommunicationModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showEditReviewModal, setShowEditReviewModal] = useState(false)
  const [selectedReview, setSelectedReview] = useState<any>(null)
  const [showShareAssessmentModal, setShowShareAssessmentModal] = useState(false)

  const { communications, reviews, loading: dataLoading, error: dataError, refresh: refreshData } =
    useClientDetailsData(client)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [])

  const handleBack = () => {
    router.push('/clients')
  }

  const handleEdit = () => {
    if (!client) return
    router.push(`/clients/${client.id}/edit`)
  }

  const handleDelete = async () => {
    if (!client) return

    const clientName = `${client.personalDetails?.firstName} ${client.personalDetails?.lastName}`.trim()
    if (!confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`)) {
      return
    }

    try {
      toast({
        title: 'Client Deleted',
        description: `${clientName} has been removed`,
        variant: 'default'
      })
      router.push('/clients')
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        variant: 'destructive'
      })
    }
  }

  const handleStartAssessment = () => {
    if (!client) return
    router.push(`/assessments/suitability?clientId=${client.id}`)
  }

  const handleCreateScenario = () => {
    if (!client) return
    router.push(`/cashflow?clientId=${client.id}&action=new`)
  }

  const handleGenerateDocument = async (templateType: string) => {
    if (!client) return

    setIsGeneratingDoc(true)
    try {
      const document = await generateDocument(templateType)
      if (document) {
        toast({
          title: 'Document Generated',
          description: `${document.name} has been created successfully`,
          variant: 'default'
        })
        await refresh()
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to generate document',
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingDoc(false)
    }
  }

  const handleRunMonteCarlo = () => {
    if (!client) return
    router.push(`/monte-carlo?clientId=${client.id}`)
  }

  const quickActions: ClientQuickAction[] = [
    {
      icon: FileText,
      label: 'Start Assessment',
      description: 'Complete suitability assessment',
      action: handleStartAssessment,
      variant: 'default',
      disabled: dashboardData?.currentAssessment !== null
    },
    {
      icon: Calculator,
      label: 'Create Scenario',
      description: 'Build cash flow projection',
      action: handleCreateScenario,
      variant: 'outline'
    },
    {
      icon: Download,
      label: 'Generate Report',
      description: 'Create client report',
      action: () => handleGenerateDocument('suitability_report'),
      variant: 'outline',
      disabled: !dashboardData?.currentAssessment || isGeneratingDoc
    },
    {
      icon: TrendingUp,
      label: 'Run Analysis',
      description: 'Monte Carlo simulation',
      action: handleRunMonteCarlo,
      variant: 'outline',
      disabled: !dashboardData?.activeScenario
    }
  ]

  const calculateCompletionPercentage = () => {
    if (!client) return 0
    const integrationStatus = getIntegrationStatus()

    const checks = [
      client.personalDetails?.firstName && client.personalDetails?.lastName,
      client.contactInfo?.email,
      client.financialProfile?.annualIncome,
      integrationStatus.hasAssessment,
      integrationStatus.hasScenario,
      integrationStatus.hasDocuments
    ]

    const completed = checks.filter(Boolean).length
    return Math.round((completed / checks.length) * 100)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{error || 'Client not found'}</h2>
            <Button onClick={handleBack} className="mt-4">
              Back to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const integrationStatus = getIntegrationStatus()
  const completionPercentage = calculateCompletionPercentage()

  const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim()
  const clientEmail = client.contactInfo?.email

  return (
    <div className="container mx-auto px-4 py-6">
      <ClientDetailHeader client={client} onBack={handleBack} onEdit={handleEdit} onDelete={handleDelete} />

      <ClientCompletionOverviewCard completionPercentage={completionPercentage} integrationStatus={integrationStatus as any} />

      <ClientPendingActionsCard
        actions={(dashboardData?.pendingActions || []) as ClientPendingAction[]}
        onAction={(action) => {
          if (action.actionUrl) {
            router.push(action.actionUrl)
            return
          }
          toast({
            title: 'Action Unavailable',
            description: 'This action is not yet configured',
            variant: 'destructive'
          })
        }}
      />

      <ClientQuickActionsGrid actions={quickActions} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="risk">Risk Profile</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="services">Services & PROD</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ClientOverviewTab client={client} />
        </TabsContent>

        <TabsContent value="financial">
          <ClientFinancialTab client={client} dashboardData={dashboardData} />
        </TabsContent>

        <TabsContent value="risk">
          <ClientRiskTab
            client={client}
            clientName={clientName}
            dashboardData={dashboardData}
            refresh={refresh}
            toast={toast}
            onStartAssessment={handleStartAssessment}
            showVulnerabilityWizard={showVulnerabilityWizard}
            setShowVulnerabilityWizard={setShowVulnerabilityWizard}
            showConsumerDutyWizard={showConsumerDutyWizard}
            setShowConsumerDutyWizard={setShowConsumerDutyWizard}
            showShareAssessmentModal={showShareAssessmentModal}
            setShowShareAssessmentModal={setShowShareAssessmentModal}
          />
        </TabsContent>

        <TabsContent value="services">
          <div className="space-y-6">
            <ServiceSelection
              clientId={client.id}
              firmId={client.firmId || undefined}
              onSaved={() => {
                toast({ title: 'Services Updated', description: 'Service selection has been saved' })
                refresh()
              }}
            />

            <div className="border-t pt-6">
              <PlatformJustification
                clientId={client.id}
                firmId={client.firmId || undefined}
                onSaved={() => {
                  toast({ title: 'Platform Updated', description: 'Platform justification has been saved' })
                  refresh()
                }}
              />
            </div>

            <div className="border-t pt-6">
              <DecumulationStrategy
                clientId={client.id}
                firmId={client.firmId || undefined}
                onSaved={() => {
                  toast({ title: 'Strategy Updated', description: 'Decumulation strategy has been saved' })
                  refresh()
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentGenerationHub clientId={client.id} clientName={clientName} clientEmail={clientEmail} />
        </TabsContent>

        <TabsContent value="cashflow">
          <CashFlowDashboard clientId={client.id} />
        </TabsContent>

        <TabsContent value="communications">
          <ClientCommunicationsTab
            communications={communications}
            dataLoading={dataLoading}
            dataError={dataError}
            onAddCommunication={() => setShowCommunicationModal(true)}
          />
        </TabsContent>

        <TabsContent value="reviews">
          <ClientReviewsTab
            reviews={reviews}
            dataLoading={dataLoading}
            onScheduleReview={() => setShowReviewModal(true)}
            setSelectedReview={setSelectedReview}
            setShowEditReviewModal={setShowEditReviewModal}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab clientId={client.id} />
        </TabsContent>
      </Tabs>

      {showCommunicationModal && (
        <LogCommunicationModal
          isOpen={showCommunicationModal}
          onClose={() => setShowCommunicationModal(false)}
          clientId={client.id}
          clientName={clientName}
          onSuccess={() => {
            refreshData?.()
            setShowCommunicationModal(false)
          }}
        />
      )}

      {showReviewModal && (
        <ScheduleReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          clientId={client.id}
          clientName={clientName}
          onSuccess={() => {
            refreshData?.()
            setShowReviewModal(false)
          }}
          existingReviews={
            reviews?.map((r: any) => ({
              id: r.id,
              due_date: r.due_date,
              status: r.status as 'scheduled' | 'in_progress' | 'completed' | 'overdue',
              review_type: r.review_type
            })) || []
          }
        />
      )}

      {showEditReviewModal && selectedReview && (
        <EditReviewModal
          isOpen={showEditReviewModal}
          onClose={() => {
            setShowEditReviewModal(false)
            setSelectedReview(null)
          }}
          review={selectedReview}
          clientName={clientName}
          onSuccess={() => {
            refreshData?.()
            setShowEditReviewModal(false)
            setSelectedReview(null)
          }}
        />
      )}
    </div>
  )
}

export default ClientDetailPage
