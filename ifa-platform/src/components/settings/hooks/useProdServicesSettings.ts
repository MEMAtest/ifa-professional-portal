import { useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_PROD_SERVICES } from '@/lib/prod/serviceCatalog'
import { advisorContextService } from '@/services/AdvisorContextService'
import { PDFGenerator, type ProdServicesReportData } from '@/lib/pdf/PDFGenerator'
import {
  OTHER_OPTION,
  createDefaultProdDetails
} from '@/components/settings/prod/constants'
import {
  buildProdSummary,
  getNextProdReviewDate,
  resolveDetail,
  resolveDistributionChannels
} from '@/components/settings/prod/utils'
import type {
  ProdDetails,
  ProdReviewTask,
  ProdVersion,
  FirmServicesState,
  ServicesSaveStatus,
  LatestProdDocument
} from '@/components/settings/prod/types'
import { prodServiceSteps } from '@/components/settings/prod/steps'

interface UseProdServicesSettingsOptions {
  supabase: SupabaseClient
  userId?: string
  toast: (options: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
  setSaving?: (saving: boolean) => void
  resolveFirmId: (override?: string | null) => string | null
  resolveFirmIdFromAuth: () => Promise<string | null>
}

const buildNormalizedServices = (services: FirmServicesState['services']) => {
  return services.map((service, index) => ({
    id: service.id,
    label: service.name,
    description: service.description,
    prodNotes: service.prodNotes,
    active: service.active,
    targetMarketChecks: service.targetMarketChecks.map((check, checkIndex) => ({
      id: `check_${index}_${checkIndex}`,
      label: check,
      description: check
    }))
  }))
}

export const useProdServicesSettings = ({
  supabase,
  userId,
  toast,
  setSaving,
  resolveFirmId,
  resolveFirmIdFromAuth
}: UseProdServicesSettingsOptions) => {
  const [customCheckInputs, setCustomCheckInputs] = useState<Record<string, string>>({})
  const [servicesStep, setServicesStep] = useState(0)
  const [prodDetails, setProdDetails] = useState<ProdDetails>(createDefaultProdDetails())
  const [servicesSaveStatus, setServicesSaveStatus] = useState<ServicesSaveStatus>({ state: 'idle' })
  const [prodVersions, setProdVersions] = useState<ProdVersion[]>([])
  const [prodReviewTask, setProdReviewTask] = useState<ProdReviewTask | null>(null)
  const [latestProdDocument, setLatestProdDocument] = useState<LatestProdDocument | null>(null)

  const [firmServices, setFirmServices] = useState<FirmServicesState>({
    prodPolicy: '',
    services: DEFAULT_PROD_SERVICES.map((service) => ({
      id: service.id,
      name: service.label,
      description: service.description,
      targetMarketChecks: service.targetMarketChecks.map((check) => check.label),
      prodNotes: service.prodNotes || '',
      active: service.active !== false
    }))
  })

  const prodSummary = useMemo(
    () => buildProdSummary(prodDetails, firmServices.services),
    [prodDetails, firmServices.services]
  )

  const loadFirmSettings = async (firmIdOverride?: string | null) => {
    const resolvedFirmId = resolveFirmId(firmIdOverride) || (await resolveFirmIdFromAuth())
    if (!resolvedFirmId) {
      setFirmServices({ prodPolicy: '', services: [] })
      setLatestProdDocument(null)
      return null
    }

    const { data, error } = await supabase
      .from('firms')
      .select('settings')
      .eq('id', resolvedFirmId)
      .maybeSingle()

    if (error) {
      console.warn('Error loading firm settings:', error.message)
      return resolvedFirmId
    }

    const settings = (data?.settings || {}) as any
    const hasServicesProd = Object.prototype.hasOwnProperty.call(settings, 'services_prod')
    const services = (settings.services_prod?.services || []) as Array<any>
    const prodPolicy = settings.services_prod?.prodPolicy || ''
    const versions = Array.isArray(settings.services_prod?.versions)
      ? (settings.services_prod?.versions as ProdVersion[])
      : []
    const reviewTask = settings.services_prod?.reviewTask as ProdReviewTask | undefined
    const detailPayload = (settings.services_prod?.details || {}) as Partial<ProdDetails>
    const defaultDetails = createDefaultProdDetails()
    const mergedDetails: ProdDetails = {
      ...defaultDetails,
      ...detailPayload,
      distributionChannels: Array.isArray(detailPayload.distributionChannels)
        ? detailPayload.distributionChannels
        : defaultDetails.distributionChannels
    }

    if (!detailPayload || Object.keys(detailPayload).length === 0) {
      if (prodPolicy && !mergedDetails.additionalNotes) {
        mergedDetails.additionalNotes = prodPolicy
      }
    }

    setProdDetails(mergedDetails)

    const latestDocument = settings.services_prod?.latest_document as
      | {
          id?: string | null
          name?: string | null
          file_name?: string | null
          path?: string | null
          storage_path?: string | null
          version?: number
          saved_at?: string
        }
      | undefined

    const latestDocumentPath =
      latestDocument?.path ||
      latestDocument?.storage_path ||
      settings.services_prod?.latest_document_path ||
      null
    if (latestDocumentPath) {
      setLatestProdDocument({
        id: latestDocument?.id || settings.services_prod?.latest_document_id || null,
        name:
          latestDocument?.name ||
          latestDocument?.file_name ||
          settings.services_prod?.latest_document_name ||
          'PROD & Services Policy',
        path: latestDocumentPath,
        version:
          latestDocument?.version ||
          settings.services_prod?.latest_document_version ||
          undefined,
        savedAt:
          latestDocument?.saved_at ||
          settings.services_prod?.latest_document_saved_at ||
          undefined
      })
    } else {
      setLatestProdDocument(null)
    }

    if (!hasServicesProd) {
      setFirmServices({ prodPolicy: '', services: [] })
      setProdVersions([])
      setProdReviewTask(null)
      setLatestProdDocument(null)

      try {
        const updatedSettings = {
          ...settings,
          services_prod: { prodPolicy: '', services: [] }
        }

        await supabase
          .from('firms')
          .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
          .eq('id', resolvedFirmId)
      } catch (seedError) {
        console.warn('Failed to seed firm services:', seedError)
      }
      return resolvedFirmId
    }

    if (services.length > 0 || prodPolicy) {
      setFirmServices({
        prodPolicy,
        services: services.map((service, index) => ({
          id: service.id || `service_${index}`,
          name: service.label || service.name || 'Service',
          description: service.description || '',
          targetMarketChecks: Array.isArray(service.targetMarketChecks)
            ? service.targetMarketChecks.map((check: any) =>
                typeof check === 'string' ? check : check.label || check.description || ''
              ).filter(Boolean)
            : [],
          prodNotes: service.prodNotes || '',
          active: service.active !== false
        }))
      })
    } else {
      setFirmServices({ prodPolicy: '', services: [] })
    }

    setProdVersions(versions)
    setProdReviewTask(reviewTask || null)
    return resolvedFirmId
  }

  const buildProdReportData = async (
    details: ProdDetails,
    services: typeof firmServices.services,
    summary: string,
    version: number,
    reviewTask: ProdReviewTask,
    resolvedFirmId: string
  ): Promise<ProdServicesReportData> => {
    const reportContext = await advisorContextService.getReportContext(userId, resolvedFirmId)

    return {
      reportDate: reportContext.generatedDate,
      firmName: reportContext.firmName,
      firmFcaNumber: reportContext.firmFcaNumber,
      firmAddress: reportContext.firmAddress,
      advisorName: reportContext.advisorName,
      summary,
      version,
      reviewDueDate: reviewTask.due_date,
      reviewStatus: reviewTask.status,
      governanceOwner: resolveDetail(details.governanceOwner, details.governanceOwnerOther),
      oversightBody: resolveDetail(details.oversightBody, details.oversightBodyOther),
      reviewFrequency: resolveDetail(details.reviewFrequency, details.reviewFrequencyOther),
      monitoringCadence: resolveDetail(details.monitoringCadence, details.monitoringCadenceOther),
      escalationProcess: resolveDetail(details.escalationProcess, details.escalationProcessOther),
      targetMarketDefinition: resolveDetail(details.targetMarketDefinition, details.targetMarketDefinitionOther),
      distributionChannels: resolveDistributionChannels(details),
      vulnerabilityApproach: resolveDetail(details.vulnerabilityApproach, details.vulnerabilityApproachOther),
      fairValueAssessment: resolveDetail(details.fairValueAssessment, details.fairValueAssessmentOther),
      services: services.map((service) => ({
        name: service.name,
        description: service.description,
        targetMarketChecks: service.targetMarketChecks,
        prodNotes: service.prodNotes,
        active: service.active
      }))
    }
  }

  const storeProdReport = async (
    reportData: ProdServicesReportData,
    resolvedFirmId: string,
    version: number
  ) => {
    const firmSlug = (reportData.firmName || 'firm')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'firm'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `prod-services-${firmSlug}-v${version}-${timestamp}.pdf`
    const filePath = `prod_services/${resolvedFirmId}/${fileName}`

    const blob = await PDFGenerator.generateProdServicesReport(reportData)
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data: documentRecord, error: documentError } = await supabase
      .from('documents')
      .insert({
        firm_id: resolvedFirmId,
        name: `PROD & Services Policy v${version}`,
        type: 'prod_policy',
        document_type: 'prod_policy',
        category: 'compliance',
        file_name: fileName,
        file_path: filePath,
        storage_path: filePath,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        compliance_status: 'approved',
        is_archived: false,
        is_template: false,
        created_by: userId || null,
        version_number: version,
        file_size: blob.size,
        metadata: {
          version,
          reviewDueDate: reportData.reviewDueDate,
          reviewStatus: reportData.reviewStatus,
          generatedAt: new Date().toISOString(),
          summary: reportData.summary
        },
        tags: ['prod', 'compliance']
      })
      .select('id, file_name, storage_path')
      .maybeSingle()

    if (documentError) {
      throw new Error(documentError.message)
    }

    return {
      id: documentRecord?.id,
      name: documentRecord?.file_name || fileName,
      path: documentRecord?.storage_path || filePath
    }
  }

  const handleSaveFirmServices = async () => {
    setServicesSaveStatus({ state: 'saving', message: 'Saving settings...' })
    let resolvedFirmId = resolveFirmId(null)
    if (!resolvedFirmId) {
      resolvedFirmId = await resolveFirmIdFromAuth()
    }

    if (!resolvedFirmId) {
      const message = 'Firm context not available for this account.'
      setServicesSaveStatus({ state: 'error', message })
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving?.(true)
      const { data, error } = await supabase
        .from('firms')
        .select('settings')
        .eq('id', resolvedFirmId)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      const currentSettings = (data?.settings || {}) as any
      const normalizedServices = buildNormalizedServices(firmServices.services)

      const existingVersions = Array.isArray(currentSettings.services_prod?.versions)
        ? currentSettings.services_prod.versions
        : []
      const nextVersionNumber = (existingVersions[0]?.version || existingVersions.length || 0) + 1
      const versionEntry: ProdVersion = {
        id: `prod-${Date.now()}`,
        version: nextVersionNumber,
        saved_at: new Date().toISOString(),
        summary: prodSummary,
        details: prodDetails,
        services: firmServices.services,
        saved_by: userId || null
      }
      const nextVersions = [versionEntry, ...existingVersions].slice(0, 10)

      const existingReviewTask: ProdReviewTask | undefined = currentSettings.services_prod?.reviewTask
      const reviewTask: ProdReviewTask = {
        due_date: getNextProdReviewDate(prodDetails.reviewFrequency, prodDetails.reviewFrequencyOther),
        status: existingReviewTask?.status || 'pending',
        created_at: existingReviewTask?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: nextVersionNumber
      }

      const updatedSettings = {
        ...currentSettings,
        services_prod: {
          prodPolicy: prodSummary,
          details: prodDetails,
          services: normalizedServices,
          versions: nextVersions,
          reviewTask
        }
      }

      const { error: updateError } = await supabase
        .from('firms')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', resolvedFirmId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      let documentMessage = ''
      try {
        const reportData = await buildProdReportData(
          prodDetails,
          firmServices.services,
          prodSummary,
          nextVersionNumber,
          reviewTask,
          resolvedFirmId
        )
        const storedDocument = await storeProdReport(reportData, resolvedFirmId, nextVersionNumber)
        if (storedDocument?.path) {
          const latestDocumentSnapshot = {
            id: storedDocument.id || null,
            name: storedDocument.name,
            path: storedDocument.path,
            version: nextVersionNumber,
            savedAt: new Date().toISOString()
          }
          setLatestProdDocument(latestDocumentSnapshot)

          const settingsWithDocument = {
            ...updatedSettings,
            services_prod: {
              ...updatedSettings.services_prod,
              latest_document: latestDocumentSnapshot
            }
          }

          const { error: documentSettingsError } = await supabase
            .from('firms')
            .update({ settings: settingsWithDocument, updated_at: new Date().toISOString() })
            .eq('id', resolvedFirmId)

          if (documentSettingsError) {
            console.warn('Unable to attach PROD document metadata to firm settings:', documentSettingsError.message)
          }

          documentMessage = 'PDF archived in Documents.'
        }
      } catch (docError) {
        console.warn('Unable to store PROD PDF report:', docError)
        documentMessage = 'Saved settings, but PDF archive failed.'
        toast({
          title: 'PDF archive failed',
          description: 'Settings saved, but the PROD PDF could not be stored.',
          variant: 'destructive'
        })
      }

      setFirmServices((prev) => ({
        ...prev,
        prodPolicy: prodSummary
      }))
      setProdVersions(nextVersions)
      setProdReviewTask(reviewTask)

      setServicesSaveStatus({
        state: 'success',
        message: documentMessage ? `Services & PROD saved. ${documentMessage}` : 'Services & PROD saved.'
      })
      toast({
        title: 'Saved',
        description: documentMessage || 'Firm services and PROD settings updated.',
        variant: 'default'
      })
    } catch (error) {
      console.error('Error saving firm services:', error)
      const message = error instanceof Error ? error.message : 'Failed to save firm settings'
      setServicesSaveStatus({ state: 'error', message })
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setSaving?.(false)
    }
  }

  const handleOpenStoredProdDocument = async () => {
    if (!latestProdDocument?.path) {
      toast({
        title: 'No saved PDF yet',
        description: 'Save your PROD settings to generate the stored PDF.',
        variant: 'destructive'
      })
      return
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(latestProdDocument.path, 60 * 10)

    if (error || !data?.signedUrl) {
      toast({
        title: 'Unable to open PDF',
        description: error?.message || 'Signed URL could not be generated.',
        variant: 'destructive'
      })
      return
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const addService = () => {
    setFirmServices((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        {
          id: `service_${Date.now()}`,
          name: '',
          description: '',
          targetMarketChecks: [],
          prodNotes: '',
          active: true
        }
      ]
    }))
  }

  const updateService = (serviceId: string, updates: Partial<FirmServicesState['services'][number]>) => {
    setFirmServices((prev) => ({
      ...prev,
      services: prev.services.map((service) =>
        service.id === serviceId ? { ...service, ...updates } : service
      )
    }))
  }

  const removeService = (serviceId: string) => {
    setFirmServices((prev) => ({
      ...prev,
      services: prev.services.filter((service) => service.id !== serviceId)
    }))
  }

  const applyServiceTemplate = (serviceId: string, templateId: string) => {
    if (templateId === 'custom') return
    const template = DEFAULT_PROD_SERVICES.find((service) => service.id === templateId)
    if (!template) return

    setFirmServices((prev) => ({
      ...prev,
      services: prev.services.map((service) => {
        if (service.id !== serviceId) return service
        const nextChecks = service.targetMarketChecks.length > 0
          ? service.targetMarketChecks
          : template.targetMarketChecks.map((check) => check.label)
        return {
          ...service,
          name: template.label,
          description: template.description,
          targetMarketChecks: nextChecks
        }
      })
    }))
  }

  const addTargetMarketCheck = (serviceId: string, checkLabel: string) => {
    const cleaned = checkLabel.trim()
    if (!cleaned) return

    setFirmServices((prev) => ({
      ...prev,
      services: prev.services.map((service) => {
        if (service.id !== serviceId) return service
        if (service.targetMarketChecks.includes(cleaned)) return service
        return {
          ...service,
          targetMarketChecks: [...service.targetMarketChecks, cleaned]
        }
      })
    }))
  }

  const removeTargetMarketCheck = (serviceId: string, checkLabel: string) => {
    setFirmServices((prev) => ({
      ...prev,
      services: prev.services.map((service) => {
        if (service.id !== serviceId) return service
        return {
          ...service,
          targetMarketChecks: service.targetMarketChecks.filter((check) => check !== checkLabel)
        }
      })
    }))
  }

  const handleCustomCheckInputChange = (serviceId: string, value: string) => {
    setCustomCheckInputs((prev) => ({ ...prev, [serviceId]: value }))
  }

  const handleAddCustomCheck = (serviceId: string) => {
    addTargetMarketCheck(serviceId, customCheckInputs[serviceId] || '')
    setCustomCheckInputs((prev) => ({ ...prev, [serviceId]: '' }))
  }

  const updateProdDetails = (updates: Partial<ProdDetails>) => {
    setProdDetails((prev) => ({
      ...prev,
      ...updates
    }))
  }

  const toggleDistributionChannel = (channel: string) => {
    setProdDetails((prev) => {
      const exists = prev.distributionChannels.includes(channel)
      const nextChannels = exists
        ? prev.distributionChannels.filter((item) => item !== channel)
        : [...prev.distributionChannels, channel]
      return {
        ...prev,
        distributionChannels: nextChannels,
        distributionOther: exists && channel === OTHER_OPTION ? '' : prev.distributionOther
      }
    })
  }

  const restoreProdVersion = (version: ProdVersion) => {
    setFirmServices({
      prodPolicy: version.summary,
      services: version.services
    })
    setProdDetails(version.details)
    const summaryIndex = Math.max(0, prodServiceSteps.findIndex((step) => step.id === 'summary'))
    setServicesStep(summaryIndex)
    setServicesSaveStatus({ state: 'idle' })
  }

  const handleCopyProdSummary = () => {
    navigator.clipboard?.writeText(prodSummary)
    toast({
      title: 'Copied',
      description: 'PROD summary copied to clipboard.',
      variant: 'default'
    })
  }

  return {
    firmServices,
    prodDetails,
    servicesStep,
    servicesSaveStatus,
    prodVersions,
    prodReviewTask,
    latestProdDocument,
    customCheckInputs,
    prodSummary,
    setServicesStep,
    setFirmServices,
    setServicesSaveStatus,
    loadFirmSettings,
    handleSaveFirmServices,
    handleOpenStoredProdDocument,
    addService,
    updateService,
    removeService,
    applyServiceTemplate,
    addTargetMarketCheck,
    removeTargetMarketCheck,
    handleCustomCheckInputChange,
    handleAddCustomCheck,
    updateProdDetails,
    toggleDistributionChannel,
    restoreProdVersion,
    handleCopyProdSummary
  }
}
