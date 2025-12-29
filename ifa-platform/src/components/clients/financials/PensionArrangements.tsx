'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Landmark, Plus } from 'lucide-react'
import type { PensionArrangement } from '@/types/client'

interface PensionArrangementsProps {
  pensions: PensionArrangement[]
  onAddPension?: () => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function getPensionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    defined_benefit: 'Defined Benefit',
    defined_contribution: 'Defined Contribution',
    sipp: 'SIPP',
    ssas: 'SSAS',
    state_pension: 'State Pension'
  }
  return labels[type] || type
}

function getPensionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    defined_benefit: 'bg-purple-100 text-purple-700',
    defined_contribution: 'bg-blue-100 text-blue-700',
    sipp: 'bg-green-100 text-green-700',
    ssas: 'bg-orange-100 text-orange-700',
    state_pension: 'bg-gray-100 text-gray-700'
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

export function PensionArrangements({
  pensions,
  onAddPension
}: PensionArrangementsProps) {
  const sortedPensions = [...pensions].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
  const totalValue = pensions.reduce((sum, p) => sum + (p.currentValue || 0), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-purple-600" />
            <div>
              <CardTitle>Pension Arrangements</CardTitle>
              <CardDescription>Retirement savings and pension plans</CardDescription>
            </div>
          </div>
          {onAddPension && (
            <Button variant="outline" size="sm" onClick={onAddPension}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pensions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Landmark className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No pension arrangements recorded</p>
            <p className="text-xs text-gray-400 mt-1">
              This data is populated when the client completes a suitability assessment
            </p>
            {onAddPension && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onAddPension}>
                <Plus className="h-4 w-4 mr-1" />
                Add Pension
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
              <div className="col-span-3">Pension</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Provider</div>
              <div className="col-span-2 text-right">Fund Value</div>
              <div className="col-span-2 text-right">Monthly</div>
              <div className="col-span-1 text-right">Retire</div>
            </div>

            {/* Pension Rows */}
            {sortedPensions.map((pension) => (
              <div
                key={pension.id}
                className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded transition-colors"
              >
                <div className="col-span-3">
                  <p className="font-medium text-gray-900">
                    {pension.description || getPensionTypeLabel(pension.type)}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPensionTypeColor(pension.type)}`}>
                    {getPensionTypeLabel(pension.type)}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-gray-600">
                  {pension.provider || '-'}
                </div>
                <div className="col-span-2 text-right font-medium">
                  {pension.currentValue ? formatCurrency(pension.currentValue) : '-'}
                </div>
                <div className="col-span-2 text-right text-sm text-gray-600">
                  {pension.monthlyContribution
                    ? `+${formatCurrency(pension.monthlyContribution)}`
                    : '-'}
                </div>
                <div className="col-span-1 text-right text-sm text-gray-600">
                  {pension.expectedRetirementAge || '-'}
                </div>
              </div>
            ))}

            {/* Total Row */}
            <div className="grid grid-cols-12 gap-4 items-center pt-3 border-t-2 border-gray-200 font-semibold">
              <div className="col-span-3">Total Pension Value</div>
              <div className="col-span-2"></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 text-right text-lg">
                {formatCurrency(totalValue)}
              </div>
              <div className="col-span-3"></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
