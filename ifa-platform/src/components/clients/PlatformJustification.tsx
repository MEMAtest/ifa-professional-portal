// components/clients/PlatformJustification.tsx
// ================================================================
// Platform Selection & Justification Component
// Documents reasons for platform recommendation
// ================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Server,
  Check,
  DollarSign,
  BarChart3,
  Headphones,
  Settings,
  Star,
  Save,
  Info,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'

interface Props {
  clientId: string
  firmId?: string
  onSaved?: () => void
}

interface Platform {
  id: string
  name: string
  description: string
  tier: 'entry' | 'mid' | 'premium'
}

const PLATFORMS: Platform[] = [
  { id: 'quilter', name: 'Quilter', description: 'Full-service platform with comprehensive fund range', tier: 'premium' },
  { id: 'transact', name: 'Transact', description: 'Sophisticated platform for complex portfolios', tier: 'premium' },
  { id: 'abrdn', name: 'abrdn Wrap', description: 'Platform with wide investment universe', tier: 'premium' },
  { id: 'fidelity', name: 'Fidelity FundsNetwork', description: 'Strong fund range with competitive pricing', tier: 'mid' },
  { id: 'aegon', name: 'Aegon ARC', description: 'Retirement-focused platform', tier: 'mid' },
  { id: 'aviva', name: 'Aviva Platform', description: 'Established platform with good service', tier: 'mid' },
  { id: 'standard_life', name: 'Standard Life', description: 'Strong pension proposition', tier: 'mid' },
  { id: 'true_potential', name: 'True Potential', description: 'Technology-focused platform', tier: 'entry' },
  { id: 'hargreaves', name: 'Hargreaves Lansdown', description: 'Execution-only option for cost-conscious clients', tier: 'entry' },
  { id: 'interactive_investor', name: 'Interactive Investor', description: 'Flat-fee platform for larger portfolios', tier: 'entry' },
  { id: 'other', name: 'Other', description: 'Alternative platform not listed', tier: 'entry' }
]

const JUSTIFICATION_REASONS = [
  { id: 'competitive_pricing', label: 'Competitive pricing', icon: DollarSign, description: 'Platform charges are cost-effective for this client' },
  { id: 'fund_range', label: 'Suitable fund range', icon: BarChart3, description: 'Investment universe meets client requirements' },
  { id: 'service_technology', label: 'Good service/technology', icon: Settings, description: 'Platform functionality and service quality' },
  { id: 'client_preference', label: 'Client preference', icon: Star, description: 'Client specifically requested or prefers this platform' },
  { id: 'existing_holdings', label: 'Existing holdings', icon: Server, description: 'Client has existing assets on this platform' },
  { id: 'wrapper_availability', label: 'Wrapper availability', icon: Check, description: 'Required wrappers (ISA, SIPP, GIA) available' },
  { id: 'consolidation', label: 'Consolidation benefits', icon: Server, description: 'Bringing multiple accounts together' },
  { id: 'drawdown_capabilities', label: 'Drawdown capabilities', icon: BarChart3, description: 'Suitable for retirement income needs' },
  { id: 'reporting', label: 'Reporting & tools', icon: Headphones, description: 'Client portal and reporting meet needs' }
]

interface PlatformData {
  platform_selected: string
  platform_justification: {
    reasons: string[]
    additional_notes: string
    comparison_performed: boolean
    alternatives_considered: string[]
  }
}

export default function PlatformJustification({ clientId, firmId, onSaved }: Props) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [data, setData] = useState<PlatformData>({
    platform_selected: '',
    platform_justification: {
      reasons: [],
      additional_notes: '',
      comparison_performed: false,
      alternatives_considered: []
    }
  })

  const isValidFirmId = (value?: string | null) => {
    if (!value) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}/services`)
      const result = await response.json()
      const record = result.success ? result.data : null

      if (record) {
        setData({
          platform_selected: record.platform_selected || '',
          platform_justification: record.platform_justification || {
            reasons: [],
            additional_notes: '',
            comparison_performed: false,
            alternatives_considered: []
          }
        })
      }
    } catch (error) {
      console.error('Error loading platform data:', error)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleReason = (reasonId: string) => {
    const reasons = data.platform_justification.reasons || []
    const isSelected = reasons.includes(reasonId)

    setData({
      ...data,
      platform_justification: {
        ...data.platform_justification,
        reasons: isSelected
          ? reasons.filter(r => r !== reasonId)
          : [...reasons, reasonId]
      }
    })
  }

  const toggleAlternative = (platformId: string) => {
    const alternatives = data.platform_justification.alternatives_considered || []
    const isSelected = alternatives.includes(platformId)

    setData({
      ...data,
      platform_justification: {
        ...data.platform_justification,
        alternatives_considered: isSelected
          ? alternatives.filter(p => p !== platformId)
          : [...alternatives, platformId]
      }
    })
  }

  const handleSave = async () => {
    if (!data.platform_selected) {
      toast({
        title: 'Error',
        description: 'Please select a platform',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      const resolvedFirmId = isValidFirmId(firmId) ? firmId : null
      const payload = {
        client_id: clientId,
        firm_id: resolvedFirmId,
        platform_selected: data.platform_selected,
        platform_justification: data.platform_justification
      }

      const response = await fetch(`/api/clients/${clientId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to save')
      }

      toast({
        title: 'Saved',
        description: 'Platform selection has been saved'
      })

      onSaved?.()
      loadData()
    } catch (error) {
      console.error('Error saving:', error)
      toast({
        title: 'Error',
        description: 'Failed to save platform selection',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const selectedPlatform = PLATFORMS.find(p => p.id === data.platform_selected)

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
            <Server className="h-5 w-5" />
            <span>Platform Selection</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Select and justify the recommended platform
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Platform Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selected Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={data.platform_selected ?? ''}
            onChange={(e) => setData({ ...data, platform_selected: e.target.value })}
            className="w-full border rounded-lg p-3 text-sm"
          >
            <option value="">Select a platform...</option>
            <optgroup label="Premium Platforms">
              {PLATFORMS.filter(p => p.tier === 'premium').map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
            <optgroup label="Mid-Tier Platforms">
              {PLATFORMS.filter(p => p.tier === 'mid').map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
            <optgroup label="Entry-Level / D2C">
              {PLATFORMS.filter(p => p.tier === 'entry').map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
          </select>

          {selectedPlatform && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedPlatform.name}</p>
                  <p className="text-sm text-gray-500">{selectedPlatform.description}</p>
                </div>
                <Badge variant="outline" className="capitalize">{selectedPlatform.tier}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Justification Reasons */}
      {data.platform_selected && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Reasons for Selection
                <span className="text-gray-400 font-normal text-sm ml-2">
                  ({(data.platform_justification.reasons || []).length} selected)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {JUSTIFICATION_REASONS.map((reason) => {
                  const Icon = reason.icon
                  const isSelected = (data.platform_justification.reasons || []).includes(reason.id)

                  return (
                    <button
                      key={reason.id}
                      onClick={() => toggleReason(reason.id)}
                      className={`p-3 rounded-lg border text-left flex items-start space-x-3 transition-all ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? 'bg-blue-600' : 'border-2 border-gray-300'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{reason.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{reason.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Comparison & Alternatives */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform Comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.platform_justification.comparison_performed ?? false}
                  onChange={(e) => setData({
                    ...data,
                    platform_justification: {
                      ...data.platform_justification,
                      comparison_performed: e.target.checked
                    }
                  })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm">
                  Platform comparison has been performed against alternatives
                </span>
              </label>

              {data.platform_justification.comparison_performed && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Alternatives Considered
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.filter(p => p.id !== data.platform_selected).map(platform => {
                      const isSelected = (data.platform_justification.alternatives_considered || []).includes(platform.id)
                      return (
                        <button
                          key={platform.id}
                          onClick={() => toggleAlternative(platform.id)}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                            isSelected
                              ? 'border-blue-300 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {platform.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={data.platform_justification.additional_notes ?? ''}
                onChange={(e) => setData({
                  ...data,
                  platform_justification: {
                    ...data.platform_justification,
                    additional_notes: e.target.value
                  }
                })}
                placeholder="Document any additional factors considered in platform selection, including specific features or client circumstances that influenced the recommendation..."
                className="w-full border rounded-lg p-3 text-sm min-h-[100px]"
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Platform Suitability</p>
              <p className="mt-1">
                Platform selection should be based on the client&apos;s specific needs including investment
                requirements, wrapper needs, cost sensitivity, and service preferences. Document your
                reasoning to demonstrate suitability.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
