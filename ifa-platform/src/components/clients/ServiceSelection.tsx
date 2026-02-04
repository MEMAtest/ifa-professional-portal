// components/clients/ServiceSelection.tsx
// ================================================================
// Service Selection & PROD Compliance Component
// Target Market verification and product governance
// ================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Briefcase,
  Check,
  AlertTriangle,
  Shield,
  TrendingUp,
  Home,
  Heart,
  FileText,
  Calculator,
  ChevronDown,
  ChevronUp,
  Save,
  Info,
  Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import clientLogger from '@/lib/logging/clientLogger'
import { DEFAULT_PROD_SERVICES, ProdServiceDefinition } from '@/lib/prod/serviceCatalog'

interface Props {
  clientId: string
  firmId?: string
  onSaved?: () => void
}

interface ServiceOption {
  id: string
  label: string
  icon: React.ElementType
  description: string
  targetMarketChecks: {
    id: string
    label: string
    description: string
  }[]
}

const SERVICE_ICON_MAP: Record<string, React.ElementType> = {
  retirement_planning: Calculator,
  investment_management: TrendingUp,
  protection: Shield,
  mortgage_advice: Home,
  estate_planning: FileText,
  tax_planning: Calculator
}

const normalizeTargetMarketChecks = (checks: any): ServiceOption['targetMarketChecks'] => {
  if (!Array.isArray(checks)) return []
  return checks.map((check, index) => {
    if (typeof check === 'string') {
      return { id: `check_${index}`, label: check, description: check }
    }
    return {
      id: check.id || `check_${index}`,
      label: check.label || check.description || 'Target market check',
      description: check.description || check.label || ''
    }
  })
}

const toServiceOption = (service: ProdServiceDefinition): ServiceOption => ({
  id: service.id,
  label: service.label || (service as any).name || 'Service',
  icon: SERVICE_ICON_MAP[service.id] || Briefcase,
  description: service.description || '',
  targetMarketChecks: normalizeTargetMarketChecks((service as any).targetMarketChecks || service.targetMarketChecks)
})

interface ClientServices {
  id?: string
  services_selected: string[]
  target_market_checks: Record<string, Record<string, boolean>>
  suitability_justification: string
  platform_selected: string
  platform_justification: Record<string, unknown>
  decumulation_strategy: string | null
  decumulation_justification: string
  sustainability_assessment?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export default function ServiceSelection({ clientId, firmId, onSaved }: Props) {
  const supabase = createClient()
  const { toast } = useToast()

  const isValidFirmId = (value?: string | null) => {
    if (!value) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  }

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedService, setExpandedService] = useState<string | null>(null)
  const [serviceCatalog, setServiceCatalog] = useState<ServiceOption[]>(
    DEFAULT_PROD_SERVICES.map(toServiceOption)
  )
  const [serviceCatalogSource, setServiceCatalogSource] = useState<'default' | 'firm' | 'fallback'>('default')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const [data, setData] = useState<ClientServices>({
    services_selected: [],
    target_market_checks: {},
    suitability_justification: '',
    platform_selected: '',
    platform_justification: {},
    decumulation_strategy: null,
    decumulation_justification: ''
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      // Use API route to bypass RLS issues
      const response = await fetch(`/api/clients/${clientId}/services`)
      const result = await response.json()

      if (result.success && result.data) {
        const record = result.data
        setData({
          id: record.id,
          services_selected: record.services_selected || [],
          target_market_checks: record.target_market_checks || {},
          suitability_justification: record.suitability_justification || '',
          platform_selected: record.platform_selected || '',
          platform_justification: record.platform_justification || {},
          decumulation_strategy: record.decumulation_strategy,
          decumulation_justification: record.decumulation_justification || '',
          sustainability_assessment: record.sustainability_assessment || {},
          created_at: record.created_at,
          updated_at: record.updated_at
        })
        setLastSavedAt(record.updated_at || record.created_at || null)
      } else {
        setLastSavedAt(null)
      }
    } catch (error) {
      clientLogger.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  const loadFirmServices = useCallback(async () => {
    if (!isValidFirmId(firmId)) {
      setServiceCatalogSource('default')
      setServiceCatalog(DEFAULT_PROD_SERVICES.map(toServiceOption))
      return
    }

    try {
      const { data, error } = await supabase
        .from('firms')
        .select('settings')
        .eq('id', firmId)
        .maybeSingle()

      if (error || !data?.settings) {
        setServiceCatalogSource('default')
        setServiceCatalog(DEFAULT_PROD_SERVICES.map(toServiceOption))
        return
      }

      const settings = data.settings as any
      const services = (settings.services_prod?.services || []) as ProdServiceDefinition[]
      const normalized = services.filter((service) => service && service.active !== false)

      if (normalized.length > 0) {
        setServiceCatalog(normalized.map(toServiceOption))
        setServiceCatalogSource('firm')
        return
      }

      if (settings.services_prod) {
        setServiceCatalog(DEFAULT_PROD_SERVICES.map(toServiceOption))
        setServiceCatalogSource('fallback')
        return
      }
    } catch (error) {
      console.warn('Failed to load firm services:', error)
      setServiceCatalogSource('default')
      setServiceCatalog(DEFAULT_PROD_SERVICES.map(toServiceOption))
    }
  }, [supabase, firmId])

  useEffect(() => {
    loadData()
    loadFirmServices()
  }, [loadData, loadFirmServices])

  const toggleService = (serviceId: string) => {
    const isSelected = data.services_selected.includes(serviceId)
    if (isSelected) {
      setData({
        ...data,
        services_selected: data.services_selected.filter(s => s !== serviceId),
        target_market_checks: {
          ...data.target_market_checks,
          [serviceId]: {}
        }
      })
    } else {
      setData({
        ...data,
        services_selected: [...data.services_selected, serviceId]
      })
      setExpandedService(serviceId)
    }
  }

  const toggleCheck = (serviceId: string, checkId: string) => {
    const serviceChecks = data.target_market_checks[serviceId] || {}
    setData({
      ...data,
      target_market_checks: {
        ...data.target_market_checks,
        [serviceId]: {
          ...serviceChecks,
          [checkId]: !serviceChecks[checkId]
        }
      }
    })
  }

  const getServiceCompleteness = (serviceId: string): { complete: number; total: number } => {
    const service = serviceCatalog.find(s => s.id === serviceId)
    if (!service) return { complete: 0, total: 0 }

    const checks = data.target_market_checks[serviceId] || {}
    const complete = Object.values(checks).filter(Boolean).length
    return { complete, total: service.targetMarketChecks.length }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const resolvedFirmId = isValidFirmId(firmId) ? firmId : null
      const payload = {
        client_id: clientId,
        firm_id: resolvedFirmId,
        services_selected: data.services_selected,
        target_market_checks: data.target_market_checks,
        suitability_justification: data.suitability_justification,
        platform_selected: data.platform_selected,
        platform_justification: data.platform_justification,
        decumulation_strategy: data.decumulation_strategy,
        decumulation_justification: data.decumulation_justification
      }

      // Use API route to bypass RLS issues
      const response = await fetch(`/api/clients/${clientId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to save')
      }

      if (result.data) {
        setData({
          id: result.data.id,
          services_selected: result.data.services_selected || [],
          target_market_checks: result.data.target_market_checks || {},
          suitability_justification: result.data.suitability_justification || '',
          platform_selected: result.data.platform_selected || '',
          platform_justification: result.data.platform_justification || {},
          decumulation_strategy: result.data.decumulation_strategy,
          decumulation_justification: result.data.decumulation_justification || '',
          sustainability_assessment: result.data.sustainability_assessment || {},
          created_at: result.data.created_at,
          updated_at: result.data.updated_at
        })
        setLastSavedAt(result.data.updated_at || result.data.created_at || null)
      }

      toast({
        title: 'Saved',
        description: 'Service selection has been saved'
      })

      onSaved?.()
      loadData()
    } catch (error) {
      clientLogger.error('Error saving:', error)
      toast({
        title: 'Error',
        description: 'Failed to save service selection',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Check if all target market checks are complete for selected services
  const allChecksComplete = data.services_selected.every(serviceId => {
    const { complete, total } = getServiceCompleteness(serviceId)
    return complete === total
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Briefcase className="h-5 w-5" />
            <span>Service Selection & Target Market</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Select services and verify target market suitability (PROD compliance)
          </p>
          <div className="mt-2">
            <Badge variant="secondary">
              {serviceCatalogSource === 'firm'
                ? 'Firm catalog'
                : serviceCatalogSource === 'fallback'
                  ? 'Firm catalog empty - using default'
                  : 'Default catalog'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/settings?tab=services"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage firm services &amp; PROD
          </a>
          <span className="text-xs text-gray-500">
            {lastSavedAt
              ? `Last saved ${new Date(lastSavedAt).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}`
              : 'Not saved yet'}
          </span>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* PROD Compliance Alert */}
      {data.services_selected.length > 0 && !allChecksComplete && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Target Market Checks Incomplete</p>
            <p className="text-sm text-yellow-700">
              Complete all target market verification checks for selected services before proceeding with advice.
            </p>
          </div>
        </div>
      )}

      {/* Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selected Services ({data.services_selected.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {serviceCatalog.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="text-gray-400">
                <Briefcase className="h-12 w-12 mx-auto" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">No Firm Services Configured</p>
                <p className="text-sm text-gray-500 mt-1">
                  Configure your firm&apos;s services and PROD requirements to enable target market checks.
                </p>
              </div>
              <a
                href="/settings?tab=services"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure Firm Services
              </a>
            </div>
          ) : (
            serviceCatalog.map((service) => {
            const Icon = service.icon
            const isSelected = data.services_selected.includes(service.id)
            const isExpanded = expandedService === service.id
            const { complete, total } = getServiceCompleteness(service.id)

            return (
              <div
                key={service.id}
                className={`border rounded-lg transition-all ${
                  isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => toggleService(service.id)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{service.label}</h4>
                        {isSelected && (
                          <Badge
                            variant={complete === total ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {complete}/{total} checks
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isSelected && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </button>

                {/* Target Market Checks (show when selected) */}
                {isSelected && (
                  <div className="border-t px-4 pb-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedService(isExpanded ? null : service.id)
                      }}
                      className="w-full py-2 flex items-center justify-between text-sm text-gray-600"
                    >
                      <span>Target Market Verification</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 mt-2">
                        {service.targetMarketChecks.map((check) => {
                          const isChecked = data.target_market_checks[service.id]?.[check.id]

                          return (
                            <button
                              key={check.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCheck(service.id, check.id)
                              }}
                              className={`w-full p-3 rounded-lg border text-left flex items-start space-x-3 transition-all ${
                                isChecked
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isChecked ? 'bg-green-600' : 'border-2 border-gray-300'
                              }`}>
                                {isChecked && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{check.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{check.description}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
          )}
        </CardContent>
      </Card>

      {/* Suitability Justification */}
      {data.services_selected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suitability Justification</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={data.suitability_justification}
              onChange={(e) => setData({ ...data, suitability_justification: e.target.value })}
              placeholder="Document why these services are suitable for this client based on their objectives, circumstances, and risk profile..."
              className="w-full border rounded-lg p-3 text-sm min-h-[120px]"
            />
            <p className="text-xs text-gray-500 mt-2">
              This justification forms part of your suitability report and should reference the client&apos;s
              stated objectives, financial circumstances, and attitude to risk.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Compliance Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">PROD Compliance</p>
              <p className="mt-1">
                Product governance rules require you to verify that each client is within the target market
                for the products and services recommended. Complete all target market checks before proceeding
                with advice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
