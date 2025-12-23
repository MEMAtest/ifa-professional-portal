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
  Info
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'

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

const SERVICES: ServiceOption[] = [
  {
    id: 'retirement_planning',
    label: 'Retirement Planning',
    icon: Calculator,
    description: 'Pension advice, drawdown, annuity, retirement income planning',
    targetMarketChecks: [
      { id: 'age_appropriate', label: 'Age-appropriate for retirement planning', description: 'Client is within reasonable retirement planning age range' },
      { id: 'pension_assets', label: 'Has pension assets or accumulation phase', description: 'Client has existing pension or capacity to contribute' },
      { id: 'understands_risks', label: 'Understands retirement income risks', description: 'Client understands longevity, inflation, and market risks' }
    ]
  },
  {
    id: 'investment_management',
    label: 'Investment Management',
    icon: TrendingUp,
    description: 'Portfolio management, fund selection, investment strategy',
    targetMarketChecks: [
      { id: 'min_investment', label: 'Meets minimum investment threshold', description: 'Client has minimum investable assets for service tier' },
      { id: 'investment_horizon', label: 'Appropriate investment horizon', description: 'Client has suitable time horizon for investment strategy' },
      { id: 'risk_capacity', label: 'Risk capacity assessed', description: 'Capacity for loss has been assessed and documented' }
    ]
  },
  {
    id: 'protection',
    label: 'Protection',
    icon: Shield,
    description: 'Life insurance, critical illness, income protection',
    targetMarketChecks: [
      { id: 'protection_need', label: 'Identified protection need', description: 'Gap analysis shows protection requirements' },
      { id: 'health_disclosure', label: 'Health disclosure understood', description: 'Client understands importance of accurate health disclosure' },
      { id: 'affordability', label: 'Premiums affordable', description: 'Protection premiums fit within client budget' }
    ]
  },
  {
    id: 'mortgage_advice',
    label: 'Mortgage Advice',
    icon: Home,
    description: 'Residential, buy-to-let, remortgage advice',
    targetMarketChecks: [
      { id: 'property_purpose', label: 'Property purpose confirmed', description: 'Residential vs investment purpose clarified' },
      { id: 'affordability_assessed', label: 'Affordability assessed', description: 'Income and expenditure reviewed for mortgage affordability' },
      { id: 'deposit_source', label: 'Deposit source verified', description: 'Source of deposit funds has been verified' }
    ]
  },
  {
    id: 'estate_planning',
    label: 'Estate Planning',
    icon: FileText,
    description: 'IHT planning, trusts, will planning',
    targetMarketChecks: [
      { id: 'estate_value', label: 'Estate value warrants planning', description: 'Estate size makes IHT planning relevant' },
      { id: 'succession_wishes', label: 'Succession wishes discussed', description: 'Client has expressed wishes for asset distribution' },
      { id: 'legal_referral', label: 'Legal referral where appropriate', description: 'Will/trust matters referred to qualified solicitor' }
    ]
  },
  {
    id: 'tax_planning',
    label: 'Tax Planning',
    icon: Calculator,
    description: 'Tax-efficient investing, ISA, CGT planning',
    targetMarketChecks: [
      { id: 'tax_status', label: 'Tax status confirmed', description: 'Client tax residency and status confirmed' },
      { id: 'allowances_reviewed', label: 'Tax allowances reviewed', description: 'Annual allowances and thresholds considered' },
      { id: 'accountant_liaison', label: 'Accountant liaison where needed', description: 'Complex tax matters coordinated with accountant' }
    ]
  }
]

interface ClientServices {
  id?: string
  services_selected: string[]
  target_market_checks: Record<string, Record<string, boolean>>
  suitability_justification: string
  platform_selected: string
  platform_justification: Record<string, unknown>
  decumulation_strategy: string | null
  decumulation_justification: string
}

export default function ServiceSelection({ clientId, firmId, onSaved }: Props) {
  const supabase = createClient()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedService, setExpandedService] = useState<string | null>(null)

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
      const { data: existing, error } = await supabase
        .from('client_services')
        .select('*')
        .eq('client_id', clientId)
        .single()

      if (existing && !error) {
        setData({
          id: existing.id,
          services_selected: existing.services_selected || [],
          target_market_checks: existing.target_market_checks || {},
          suitability_justification: existing.suitability_justification || '',
          platform_selected: existing.platform_selected || '',
          platform_justification: existing.platform_justification || {},
          decumulation_strategy: existing.decumulation_strategy,
          decumulation_justification: existing.decumulation_justification || ''
        })
      }
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, clientId])

  useEffect(() => {
    loadData()
  }, [loadData])

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
    const service = SERVICES.find(s => s.id === serviceId)
    if (!service) return { complete: 0, total: 0 }

    const checks = data.target_market_checks[serviceId] || {}
    const complete = Object.values(checks).filter(Boolean).length
    return { complete, total: service.targetMarketChecks.length }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        client_id: clientId,
        firm_id: firmId || null,
        services_selected: data.services_selected,
        target_market_checks: data.target_market_checks,
        suitability_justification: data.suitability_justification,
        platform_selected: data.platform_selected,
        platform_justification: data.platform_justification,
        decumulation_strategy: data.decumulation_strategy,
        decumulation_justification: data.decumulation_justification
      }

      if (data.id) {
        const { error } = await supabase
          .from('client_services')
          .update(payload)
          .eq('id', data.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('client_services')
          .insert(payload)

        if (error) throw error
      }

      toast({
        title: 'Saved',
        description: 'Service selection has been saved'
      })

      onSaved?.()
      loadData()
    } catch (error) {
      console.error('Error saving:', error)
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
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
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
          {SERVICES.map((service) => {
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
          })}
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
