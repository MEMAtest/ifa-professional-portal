// src/components/compliance/ProdServicesDashboard.tsx
'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Download, Settings, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { advisorContextService } from '@/services/AdvisorContextService'
import { PDFGenerator, type ProdServicesReportData } from '@/lib/pdf/PDFGenerator'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'

interface ServicesProdSettings {
  prodPolicy?: string
  details?: Record<string, any>
  services?: Array<Record<string, any>>
  versions?: Array<Record<string, any>>
  reviewTask?: {
    due_date?: string
    status?: string
    version?: number
  }
}

const isValidFirmId = (value?: string | null) => {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

const resolveDetail = (value?: string, other?: string) => {
  if (!value) return 'Not specified'
  if (value === 'Other') return other?.trim() || 'Other'
  return value
}

export default function ProdServicesDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<ServicesProdSettings | null>(null)
  const [reportContext, setReportContext] = useState<{
    firmName: string
    firmFcaNumber: string
    firmAddress: string
    advisorName: string
    generatedDate: string
  } | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [openingStored, setOpeningStored] = useState(false)

  const resolveFirmId = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser()
    const authUser = authData?.user
    let firmId =
      (authUser?.user_metadata?.firm_id as string | undefined) ||
      (authUser?.user_metadata?.firmId as string | undefined) ||
      null

    if (!isValidFirmId(firmId) && authUser?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', authUser.id)
        .maybeSingle()
      firmId = profile?.firm_id || null
    }

    return isValidFirmId(firmId) ? firmId : null
  }, [supabase])

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const firmId = await resolveFirmId()
      if (!firmId) {
        setSettings(null)
        return
      }

      const { data } = await supabase
        .from('firms')
        .select('settings')
        .eq('id', firmId)
        .maybeSingle()

      const servicesProd = (data?.settings as any)?.services_prod as ServicesProdSettings | undefined
      setSettings(servicesProd || null)

      const context = await advisorContextService.getReportContext(user?.id, firmId)
      setReportContext({
        firmName: context.firmName,
        firmFcaNumber: context.firmFcaNumber,
        firmAddress: context.firmAddress,
        advisorName: context.advisorName,
        generatedDate: context.generatedDate
      })
    } finally {
      setLoading(false)
    }
  }, [resolveFirmId, supabase, user?.id])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleDownload = async () => {
    if (!settings || !reportContext) return
    setDownloading(true)
    try {
      const details = settings.details || {}
      const distributionChannels = Array.isArray(details.distributionChannels)
        ? details.distributionChannels.map((channel: string) =>
            channel === 'Other' ? details.distributionOther || 'Other' : channel
          )
        : []
      const services = (settings.services || []).map((service: any) => ({
        name: service.label || service.name || 'Service',
        description: service.description || '',
        targetMarketChecks: Array.isArray(service.targetMarketChecks)
          ? service.targetMarketChecks.map((check: any) => check.label || check.description || check)
          : [],
        prodNotes: service.prodNotes || '',
        active: service.active !== false
      }))

      const reportData: ProdServicesReportData = {
        reportDate: reportContext.generatedDate,
        firmName: reportContext.firmName,
        firmFcaNumber: reportContext.firmFcaNumber,
        firmAddress: reportContext.firmAddress,
        advisorName: reportContext.advisorName,
        summary: settings.prodPolicy || 'Firm PROD policy summary',
        version: settings.versions?.[0]?.version,
        reviewDueDate: settings.reviewTask?.due_date,
        reviewStatus: settings.reviewTask?.status,
        governanceOwner: resolveDetail(details.governanceOwner, details.governanceOwnerOther),
        oversightBody: resolveDetail(details.oversightBody, details.oversightBodyOther),
        reviewFrequency: resolveDetail(details.reviewFrequency, details.reviewFrequencyOther),
        monitoringCadence: resolveDetail(details.monitoringCadence, details.monitoringCadenceOther),
        escalationProcess: resolveDetail(details.escalationProcess, details.escalationProcessOther),
        targetMarketDefinition: resolveDetail(details.targetMarketDefinition, details.targetMarketDefinitionOther),
        distributionChannels,
        vulnerabilityApproach: resolveDetail(details.vulnerabilityApproach, details.vulnerabilityApproachOther),
        fairValueAssessment: resolveDetail(details.fairValueAssessment, details.fairValueAssessmentOther),
        services
      }

      await PDFGenerator.downloadProdServicesReport(
        reportData,
        `prod-services-policy-${reportContext.firmName.replace(/\s+/g, '-').toLowerCase()}.pdf`
      )
    } catch (error) {
      console.error('Failed to generate PROD PDF', error)
      toast({
        title: 'PDF Error',
        description: 'Unable to generate PROD policy PDF.',
        variant: 'destructive'
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleOpenStoredPdf = async (path: string) => {
    setOpeningStored(true)
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 60 * 10)
      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Signed URL could not be generated')
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Failed to open stored PROD PDF', error)
      toast({
        title: 'Unable to open PDF',
        description: 'The stored PROD PDF could not be opened.',
        variant: 'destructive'
      })
    } finally {
      setOpeningStored(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-gray-500">Loading PROD settings...</CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-gray-600 space-y-3">
          <p className="font-medium text-gray-900">Firm PROD setup not found</p>
          <p>
            You can still complete client target market checks below using the default services catalog.
            Configure your firm PROD settings to customise the service list and governance summary.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push('/settings?tab=services')}
            className="w-full sm:w-auto"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure firm PROD
          </Button>
        </CardContent>
      </Card>
    )
  }

  const summary = settings.prodPolicy || 'No PROD summary saved yet.'
  const services = settings.services || []
  const reviewTask = settings.reviewTask
  const latestVersion = settings.versions?.[0]
  const latestDocument = (settings as any)?.latest_document || null
  const latestDocumentPath =
    latestDocument?.path || latestDocument?.storage_path || (settings as any)?.latest_document_path
  const latestDocumentVersion =
    latestDocument?.version || (settings as any)?.latest_document_version
  const latestDocumentName =
    latestDocument?.name ||
    latestDocument?.file_name ||
    (settings as any)?.latest_document_name ||
    'PROD & Services Policy'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>PROD &amp; Services Overview</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Firm-level PROD governance, target market, and service catalogue.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push('/settings?tab=services')}
              className="w-full sm:w-auto"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Settings
            </Button>
            {latestDocumentPath && (
              <Button
                variant="outline"
                onClick={() => handleOpenStoredPdf(latestDocumentPath)}
                disabled={openingStored}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                {openingStored ? 'Opening PDF...' : 'Open Saved PDF'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push('/reviews')}
              className="w-full sm:w-auto"
            >
              <Calendar className="h-4 w-4 mr-2" />
              View Reviews
            </Button>
            <Button onClick={handleDownload} disabled={downloading} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestVersion && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Version {latestVersion.version}</Badge>
              {reviewTask?.due_date && (
                <Badge variant="outline">
                  Next review: {new Date(reviewTask.due_date).toLocaleDateString('en-GB')}
                </Badge>
              )}
              {latestDocumentVersion && (
                <Badge variant="outline">Saved PDF v{latestDocumentVersion}</Badge>
              )}
            </div>
          )}
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm text-gray-700 whitespace-pre-line">
            {summary}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Services Catalogue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.length === 0 ? (
              <p className="text-sm text-gray-500">No services configured yet.</p>
            ) : (
              services.map((service: any, index: number) => (
                <div key={`${service.id || index}`} className="border rounded-lg p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-gray-900">{service.label || service.name}</p>
                    <Badge variant={service.active === false ? 'secondary' : 'default'}>
                      {service.active === false ? 'Inactive' : 'Active'}
                    </Badge>
                  </div>
                  {service.description && <p className="text-sm text-gray-600 mt-1">{service.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                    {(service.targetMarketChecks || []).slice(0, 4).map((check: any) => (
                      <span key={check.id || check.label || check} className="rounded-full bg-gray-100 px-2 py-1">
                        {check.label || check.description || check}
                      </span>
                    ))}
                    {(service.targetMarketChecks || []).length > 4 && (
                      <span className="rounded-full bg-gray-100 px-2 py-1">
                        +{service.targetMarketChecks.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review &amp; Versions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            {reviewTask?.due_date ? (
              <div>
                <p className="font-medium text-gray-900">Next PROD review</p>
                <p>{new Date(reviewTask.due_date).toLocaleDateString('en-GB')}</p>
              </div>
            ) : (
              <p>No review scheduled.</p>
            )}

            <div>
              <p className="font-medium text-gray-900">Version history</p>
              {settings.versions?.length ? (
                <div className="space-y-2">
                  {settings.versions.slice(0, 4).map((version: any) => (
                    <div key={version.id} className="rounded-md border border-gray-100 p-2">
                      <p className="text-sm font-medium">Version {version.version}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(version.saved_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No versions saved yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
