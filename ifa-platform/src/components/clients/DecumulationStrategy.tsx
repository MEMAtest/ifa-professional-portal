// components/clients/DecumulationStrategy.tsx
// ================================================================
// Decumulation Strategy & Justification Component
// For clients in drawdown - documents withdrawal strategy
// ================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingDown,
  Check,
  Calendar,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Save,
  Info,
  Leaf,
  Repeat,
  Shuffle,
  Target
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

type DecumulationStrategy = 'ad_hoc' | 'regular' | 'natural_yield' | 'hybrid'

interface StrategyOption {
  id: DecumulationStrategy
  label: string
  icon: React.ElementType
  description: string
  suitableFor: string[]
  considerations: string[]
}

const STRATEGIES: StrategyOption[] = [
  {
    id: 'ad_hoc',
    label: 'Ad-hoc Withdrawals',
    icon: Target,
    description: 'Withdrawals taken as and when needed, no regular schedule',
    suitableFor: [
      'Clients with other income sources',
      'Variable income needs',
      'Early retirement with part-time work',
      'Those building up to State Pension age'
    ],
    considerations: [
      'May require more active management',
      'Income less predictable',
      'Need to ensure emergency funds adequate',
      'Tax efficiency opportunities with timing'
    ]
  },
  {
    id: 'regular',
    label: 'Regular Withdrawals',
    icon: Repeat,
    description: 'Fixed regular withdrawals (monthly/quarterly) for predictable income',
    suitableFor: [
      'Clients replacing salary income',
      'Those needing predictable cash flow',
      'Covering regular expenses',
      'Clients preferring stability'
    ],
    considerations: [
      'Withdrawal rate sustainability critical',
      'Sequence of returns risk',
      'Regular review of withdrawal amount needed',
      'Consider inflation adjustment'
    ]
  },
  {
    id: 'natural_yield',
    label: 'Natural Yield',
    icon: Leaf,
    description: 'Only take dividends and interest, preserving capital',
    suitableFor: [
      'Clients prioritising capital preservation',
      'Those with modest income needs',
      'Long retirement horizon',
      'Estate planning considerations'
    ],
    considerations: [
      'Income varies with market conditions',
      'May need higher initial capital',
      'Dividend tax considerations',
      'Portfolio must be structured for income'
    ]
  },
  {
    id: 'hybrid',
    label: 'Hybrid Approach',
    icon: Shuffle,
    description: 'Combination of strategies to meet different needs',
    suitableFor: [
      'Complex income requirements',
      'Multiple objectives (income + growth)',
      'Varying expenses through retirement',
      'Those wanting flexibility'
    ],
    considerations: [
      'More complex to manage',
      'Clear documentation of each component',
      'Regular review essential',
      'Tax wrapper sequencing important'
    ]
  }
]

interface SustainabilityFactors {
  withdrawal_rate: number | null
  time_horizon: number | null
  inflation_assumption: number
  growth_assumption: number
  stress_tested: boolean
  last_review_date: string | null
  next_review_date: string | null
}

interface DecumulationData {
  strategy: DecumulationStrategy | null
  justification: string
  sustainability: SustainabilityFactors
  additional_notes: string
}

export default function DecumulationStrategy({ clientId, firmId, onSaved }: Props) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [data, setData] = useState<DecumulationData>({
    strategy: null,
    justification: '',
    sustainability: {
      withdrawal_rate: null,
      time_horizon: null,
      inflation_assumption: 2.5,
      growth_assumption: 4.0,
      stress_tested: false,
      last_review_date: null,
      next_review_date: null
    },
    additional_notes: ''
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
        const sustainability = record.sustainability_assessment || {}
        setData({
          strategy: record.decumulation_strategy as DecumulationStrategy,
          justification: record.decumulation_justification || '',
          sustainability: {
            withdrawal_rate: sustainability.withdrawal_rate || null,
            time_horizon: sustainability.time_horizon || null,
            inflation_assumption: sustainability.inflation_assumption || 2.5,
            growth_assumption: sustainability.growth_assumption || 4.0,
            stress_tested: sustainability.stress_tested || false,
            last_review_date: sustainability.last_review_date || null,
            next_review_date: sustainability.next_review_date || null
          },
          additional_notes: sustainability.additional_notes || ''
        })
      }
    } catch (error) {
      console.error('Error loading decumulation data:', error)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async () => {
    if (!data.strategy) {
      toast({
        title: 'Error',
        description: 'Please select a strategy',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        client_id: clientId,
        firm_id: isValidFirmId(firmId) ? firmId : null,
        decumulation_strategy: data.strategy,
        decumulation_justification: data.justification,
        sustainability_assessment: {
          ...data.sustainability,
          additional_notes: data.additional_notes
        }
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
        description: 'Decumulation strategy has been saved'
      })

      onSaved?.()
      loadData()
    } catch (error) {
      console.error('Error saving:', error)
      toast({
        title: 'Error',
        description: 'Failed to save decumulation strategy',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const selectedStrategy = STRATEGIES.find(s => s.id === data.strategy)

  // Calculate sustainability warning
  const showSustainabilityWarning =
    data.sustainability.withdrawal_rate !== null &&
    data.sustainability.withdrawal_rate > 4

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
            <TrendingDown className="h-5 w-5" />
            <span>Decumulation Strategy</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Document withdrawal strategy and sustainability assessment
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Sustainability Warning */}
      {showSustainabilityWarning && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">High Withdrawal Rate Warning</p>
            <p className="text-sm text-red-700">
              A withdrawal rate of {data.sustainability.withdrawal_rate}% exceeds the commonly cited
              sustainable rate of 4%. Ensure this has been stress-tested and the client understands
              the implications for portfolio longevity.
            </p>
          </div>
        </div>
      )}

      {/* Strategy Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Withdrawal Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STRATEGIES.map((strategy) => {
              const Icon = strategy.icon
              const isSelected = data.strategy === strategy.id

              return (
                <button
                  key={strategy.id}
                  onClick={() => setData({ ...data, strategy: strategy.id })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{strategy.label}</h4>
                        {isSelected && <Check className="h-5 w-5 text-blue-600" />}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{strategy.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Strategy Details */}
          {selectedStrategy && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-2">Suitable For</p>
                <ul className="space-y-1">
                  {selectedStrategy.suitableFor.map((item, i) => (
                    <li key={i} className="text-sm text-green-700 flex items-center space-x-2">
                      <Check className="h-3 w-3" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-800 mb-2">Key Considerations</p>
                <ul className="space-y-1">
                  {selectedStrategy.considerations.map((item, i) => (
                    <li key={i} className="text-sm text-yellow-700 flex items-center space-x-2">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sustainability Assessment */}
      {data.strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sustainability Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Withdrawal Rate (%)
                </label>
                <input
                  type="number"
                  value={data.sustainability.withdrawal_rate || ''}
                  onChange={(e) => setData({
                    ...data,
                    sustainability: {
                      ...data.sustainability,
                      withdrawal_rate: e.target.value ? parseFloat(e.target.value) : null
                    }
                  })}
                  placeholder="e.g. 4.0"
                  step="0.1"
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Horizon (years)
                </label>
                <input
                  type="number"
                  value={data.sustainability.time_horizon || ''}
                  onChange={(e) => setData({
                    ...data,
                    sustainability: {
                      ...data.sustainability,
                      time_horizon: e.target.value ? parseInt(e.target.value) : null
                    }
                  })}
                  placeholder="e.g. 30"
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inflation Assumption (%)
                </label>
                <input
                  type="number"
                  value={data.sustainability.inflation_assumption}
                  onChange={(e) => setData({
                    ...data,
                    sustainability: {
                      ...data.sustainability,
                      inflation_assumption: parseFloat(e.target.value) || 0
                    }
                  })}
                  step="0.1"
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Growth Assumption (%)
                </label>
                <input
                  type="number"
                  value={data.sustainability.growth_assumption}
                  onChange={(e) => setData({
                    ...data,
                    sustainability: {
                      ...data.sustainability,
                      growth_assumption: parseFloat(e.target.value) || 0
                    }
                  })}
                  step="0.1"
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </div>
            </div>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.sustainability.stress_tested}
                onChange={(e) => setData({
                  ...data,
                  sustainability: {
                    ...data.sustainability,
                    stress_tested: e.target.checked
                  }
                })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm">
                Withdrawal strategy has been stress-tested (Monte Carlo or similar analysis)
              </span>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Review Date
                </label>
                <input
                  type="date"
                  value={data.sustainability.last_review_date || ''}
                  onChange={(e) => setData({
                    ...data,
                    sustainability: {
                      ...data.sustainability,
                      last_review_date: e.target.value
                    }
                  })}
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Review Date
                </label>
                <input
                  type="date"
                  value={data.sustainability.next_review_date || ''}
                  onChange={(e) => setData({
                    ...data,
                    sustainability: {
                      ...data.sustainability,
                      next_review_date: e.target.value
                    }
                  })}
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Justification */}
      {data.strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Strategy Justification</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={data.justification}
              onChange={(e) => setData({ ...data, justification: e.target.value })}
              placeholder="Document why this withdrawal strategy is appropriate for the client, considering their income needs, other resources, risk capacity, and time horizon..."
              className="w-full border rounded-lg p-3 text-sm min-h-[120px]"
            />
          </CardContent>
        </Card>
      )}

      {/* Additional Notes */}
      {data.strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={data.additional_notes}
              onChange={(e) => setData({ ...data, additional_notes: e.target.value })}
              placeholder="Any additional considerations, contingency plans, or notes about the decumulation approach..."
              className="w-full border rounded-lg p-3 text-sm min-h-[80px]"
            />
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Decumulation Advice</p>
              <p className="mt-1">
                Decumulation strategy should be regularly reviewed (at least annually) to ensure it
                remains sustainable and appropriate for the client&apos;s changing circumstances.
                Consider longevity risk, sequence of returns risk, and the impact of market volatility
                on withdrawal sustainability.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
