import { useCallback, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  OTHER_OPTION,
  createDefaultConsumerDutyFramework
} from '@/components/settings/consumerDuty/constants'
import clientLogger from '@/lib/logging/clientLogger'
import type {
  ConsumerDutyFramework,
  ConsumerDutySaveStatus,
  ConsumerDutyVersion
} from '@/components/settings/consumerDuty/types'

interface UseConsumerDutySettingsOptions {
  supabase: SupabaseClient
  userId?: string
  toast: (options: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
  setSaving?: (saving: boolean) => void
  resolveFirmId: (override?: string | null) => string | null
  resolveFirmIdFromAuth: () => Promise<string | null>
}

// Build summary text from framework
const buildConsumerDutySummary = (framework: ConsumerDutyFramework): string => {
  const resolveValue = (value: string, other: string): string => {
    return value === OTHER_OPTION && other ? other : value
  }

  const sections: string[] = []

  // Products & Services
  sections.push('## Products & Services Outcome')
  sections.push(`Target Market Approach: ${resolveValue(framework.products.targetMarketApproach, framework.products.targetMarketApproachOther)}`)
  sections.push(`Product Categories: ${framework.products.productCategories.join(', ')}`)
  sections.push(`Harm Mitigation: ${resolveValue(framework.products.harmMitigationStrategy, framework.products.harmMitigationStrategyOther)}`)
  sections.push(`Distribution Strategy: ${resolveValue(framework.products.distributionStrategy, framework.products.distributionStrategyOther)}`)
  sections.push('')

  // Price & Value
  sections.push('## Price & Value Outcome')
  sections.push(`Assessment Method: ${resolveValue(framework.pricing.assessmentMethod, framework.pricing.assessmentMethodOther)}`)
  sections.push(`Review Frequency: ${resolveValue(framework.pricing.reviewFrequency, framework.pricing.reviewFrequencyOther)}`)
  sections.push(`Transparency Approach: ${resolveValue(framework.pricing.transparencyApproach, framework.pricing.transparencyApproachOther)}`)
  sections.push(`Benchmarking: ${resolveValue(framework.pricing.benchmarkingApproach, framework.pricing.benchmarkingApproachOther)}`)
  sections.push('')

  // Consumer Understanding
  sections.push('## Consumer Understanding Outcome')
  sections.push(`Communication Styles: ${framework.communication.communicationStyle.join(', ')}`)
  sections.push(`Product Explanation: ${resolveValue(framework.communication.productExplanationMethod, framework.communication.productExplanationMethodOther)}`)
  sections.push(`Vulnerable Client Communication: ${resolveValue(framework.communication.vulnerableClientApproach, framework.communication.vulnerableClientApproachOther)}`)
  sections.push(`Testing Approach: ${resolveValue(framework.communication.testingApproach, framework.communication.testingApproachOther)}`)
  sections.push('')

  // Consumer Support
  sections.push('## Consumer Support Outcome')
  sections.push(`Service Quality: ${resolveValue(framework.support.serviceQualityStandards, framework.support.serviceQualityStandardsOther)}`)
  sections.push(`Complaint Handling: ${resolveValue(framework.support.complaintHandlingProcess, framework.support.complaintHandlingProcessOther)}`)
  sections.push(`Vulnerable Client Support: ${resolveValue(framework.support.vulnerableClientSupport, framework.support.vulnerableClientSupportOther)}`)
  sections.push(`Access Channels: ${framework.support.accessChannels.join(', ')}`)

  if (framework.additionalNotes) {
    sections.push('')
    sections.push('## Additional Notes')
    sections.push(framework.additionalNotes)
  }

  return sections.join('\n')
}

export const useConsumerDutySettings = ({
  supabase,
  userId,
  toast,
  setSaving,
  resolveFirmId,
  resolveFirmIdFromAuth
}: UseConsumerDutySettingsOptions) => {
  const [step, setStep] = useState(0)
  const [framework, setFramework] = useState<ConsumerDutyFramework>(createDefaultConsumerDutyFramework())
  const [saveStatus, setSaveStatus] = useState<ConsumerDutySaveStatus>({ state: 'idle' })
  const [versions, setVersions] = useState<ConsumerDutyVersion[]>([])

  const summary = useMemo(() => buildConsumerDutySummary(framework), [framework])

  const loadConsumerDutySettings = useCallback(async (firmIdOverride?: string | null) => {
    const resolvedFirmId = resolveFirmId(firmIdOverride) || (await resolveFirmIdFromAuth())
    if (!resolvedFirmId) {
      setFramework(createDefaultConsumerDutyFramework())
      return null
    }

    const { data, error } = await supabase
      .from('firms')
      .select('settings')
      .eq('id', resolvedFirmId)
      .maybeSingle()

    if (error) {
      console.warn('Error loading Consumer Duty settings:', error.message)
      return resolvedFirmId
    }

    const settings = (data?.settings || {}) as Record<string, unknown>
    const consumerDutyData = settings.consumer_duty_framework as {
      framework?: Partial<ConsumerDutyFramework>
      versions?: ConsumerDutyVersion[]
    } | undefined

    if (consumerDutyData?.framework) {
      const defaultFramework = createDefaultConsumerDutyFramework()
      setFramework({
        products: { ...defaultFramework.products, ...(consumerDutyData.framework.products || {}) },
        pricing: { ...defaultFramework.pricing, ...(consumerDutyData.framework.pricing || {}) },
        communication: { ...defaultFramework.communication, ...(consumerDutyData.framework.communication || {}) },
        support: { ...defaultFramework.support, ...(consumerDutyData.framework.support || {}) },
        additionalNotes: consumerDutyData.framework.additionalNotes || '',
        lastReviewDate: consumerDutyData.framework.lastReviewDate || null,
        nextReviewDate: consumerDutyData.framework.nextReviewDate || null
      })
    }

    if (Array.isArray(consumerDutyData?.versions)) {
      setVersions(consumerDutyData.versions)
    }

    return resolvedFirmId
  }, [resolveFirmId, resolveFirmIdFromAuth, supabase])

  const handleSave = async () => {
    setSaving?.(true)
    setSaveStatus({ state: 'saving' })

    try {
      const resolvedFirmId = resolveFirmId() || (await resolveFirmIdFromAuth())
      if (!resolvedFirmId) {
        throw new Error('No firm ID found')
      }

      // Get current settings
      const { data: firmData, error: fetchError } = await supabase
        .from('firms')
        .select('settings')
        .eq('id', resolvedFirmId)
        .maybeSingle()

      if (fetchError) throw fetchError

      const currentSettings = (firmData?.settings || {}) as Record<string, unknown>
      const existingVersions = (currentSettings.consumer_duty_framework as { versions?: ConsumerDutyVersion[] })?.versions || []

      // Create new version
      const newVersion: ConsumerDutyVersion = {
        id: `cd_${Date.now()}`,
        version: existingVersions.length + 1,
        saved_at: new Date().toISOString(),
        summary: summary,
        framework: framework,
        saved_by: userId || null
      }

      // Update framework with review dates
      const today = new Date().toISOString().split('T')[0]
      const nextYear = new Date()
      nextYear.setFullYear(nextYear.getFullYear() + 1)
      const nextReviewDate = nextYear.toISOString().split('T')[0]

      const updatedFramework = {
        ...framework,
        lastReviewDate: today,
        nextReviewDate: nextReviewDate
      }

      // Keep last 10 versions
      const updatedVersions = [newVersion, ...existingVersions].slice(0, 10)

      const updatedSettings = {
        ...currentSettings,
        consumer_duty_framework: {
          framework: updatedFramework,
          versions: updatedVersions
        }
      }

      const { error: updateError } = await supabase
        .from('firms')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', resolvedFirmId)

      if (updateError) throw updateError

      setFramework(updatedFramework)
      setVersions(updatedVersions)
      setSaveStatus({ state: 'success' })

      toast({
        title: 'Saved',
        description: 'Consumer Duty framework saved successfully'
      })

      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus({ state: 'idle' }), 3000)

    } catch (error) {
      clientLogger.error('Error saving Consumer Duty settings:', error)
      setSaveStatus({ state: 'error', message: 'Failed to save' })
      toast({
        title: 'Error',
        description: 'Failed to save Consumer Duty framework',
        variant: 'destructive'
      })
    } finally {
      setSaving?.(false)
    }
  }

  const updateProducts = (updates: Partial<ConsumerDutyFramework['products']>) => {
    setFramework(prev => ({
      ...prev,
      products: { ...prev.products, ...updates }
    }))
  }

  const updatePricing = (updates: Partial<ConsumerDutyFramework['pricing']>) => {
    setFramework(prev => ({
      ...prev,
      pricing: { ...prev.pricing, ...updates }
    }))
  }

  const updateCommunication = (updates: Partial<ConsumerDutyFramework['communication']>) => {
    setFramework(prev => ({
      ...prev,
      communication: { ...prev.communication, ...updates }
    }))
  }

  const updateSupport = (updates: Partial<ConsumerDutyFramework['support']>) => {
    setFramework(prev => ({
      ...prev,
      support: { ...prev.support, ...updates }
    }))
  }

  const updateNotes = (notes: string) => {
    setFramework(prev => ({ ...prev, additionalNotes: notes }))
  }

  const toggleProductCategory = (category: string) => {
    setFramework(prev => {
      const current = prev.products.productCategories
      const updated = current.includes(category)
        ? current.filter(c => c !== category)
        : [...current, category]
      return {
        ...prev,
        products: { ...prev.products, productCategories: updated }
      }
    })
  }

  const toggleCommunicationStyle = (style: string) => {
    setFramework(prev => {
      const current = prev.communication.communicationStyle
      const updated = current.includes(style)
        ? current.filter(s => s !== style)
        : [...current, style]
      return {
        ...prev,
        communication: { ...prev.communication, communicationStyle: updated }
      }
    })
  }

  const toggleAccessChannel = (channel: string) => {
    setFramework(prev => {
      const current = prev.support.accessChannels
      const updated = current.includes(channel)
        ? current.filter(c => c !== channel)
        : [...current, channel]
      return {
        ...prev,
        support: { ...prev.support, accessChannels: updated }
      }
    })
  }

  const restoreVersion = (version: ConsumerDutyVersion) => {
    setFramework(version.framework)
    toast({
      title: 'Restored',
      description: `Restored to version ${version.version}`
    })
  }

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      toast({
        title: 'Copied',
        description: 'Summary copied to clipboard'
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy summary',
        variant: 'destructive'
      })
    }
  }

  return {
    step,
    setStep,
    framework,
    summary,
    saveStatus,
    versions,
    loadConsumerDutySettings,
    handleSave,
    updateProducts,
    updatePricing,
    updateCommunication,
    updateSupport,
    updateNotes,
    toggleProductCategory,
    toggleCommunicationStyle,
    toggleAccessChannel,
    restoreVersion,
    handleCopySummary
  }
}
