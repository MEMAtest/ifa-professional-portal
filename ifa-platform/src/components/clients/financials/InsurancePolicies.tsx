'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Shield, Plus, AlertCircle, CheckCircle } from 'lucide-react'
import type { InsurancePolicy } from '@/types/client'

interface InsurancePoliciesProps {
  policies: InsurancePolicy[]
  onAddPolicy?: () => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function getPolicyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    life: 'Life Insurance',
    critical_illness: 'Critical Illness',
    income_protection: 'Income Protection',
    private_medical: 'Private Medical',
    other: 'Other'
  }
  return labels[type] || type
}

function getPolicyTypeColor(type: string): string {
  const colors: Record<string, string> = {
    life: 'bg-red-100 text-red-700',
    critical_illness: 'bg-orange-100 text-orange-700',
    income_protection: 'bg-blue-100 text-blue-700',
    private_medical: 'bg-green-100 text-green-700',
    other: 'bg-gray-100 text-gray-700'
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

function getPolicyStatus(expiryDate?: string): { label: string; color: string; icon: typeof CheckCircle } {
  if (!expiryDate) {
    return { label: 'Active', color: 'text-green-600', icon: CheckCircle }
  }

  const expiry = new Date(expiryDate)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) {
    return { label: 'Expired', color: 'text-red-600', icon: AlertCircle }
  } else if (daysUntilExpiry < 30) {
    return { label: 'Expiring Soon', color: 'text-orange-600', icon: AlertCircle }
  } else {
    return { label: 'Active', color: 'text-green-600', icon: CheckCircle }
  }
}

export function InsurancePolicies({
  policies,
  onAddPolicy
}: InsurancePoliciesProps) {
  const totalPremiums = policies.reduce((sum, p) => sum + (p.monthlyPremium || 0), 0)
  const totalCover = policies.reduce((sum, p) => sum + (p.coverAmount || 0), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <div>
              <CardTitle>Insurance Policies</CardTitle>
              <CardDescription>Protection and insurance coverage</CardDescription>
            </div>
          </div>
          {onAddPolicy && (
            <Button variant="outline" size="sm" onClick={onAddPolicy}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {policies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No insurance policies recorded</p>
            <p className="text-xs text-gray-400 mt-1">
              This data is populated when the client completes a suitability assessment
            </p>
            {onAddPolicy && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onAddPolicy}>
                <Plus className="h-4 w-4 mr-1" />
                Add Policy
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
              <div className="col-span-3">Policy</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Provider</div>
              <div className="col-span-2 text-right">Cover</div>
              <div className="col-span-2 text-right">Premium</div>
              <div className="col-span-1 text-right">Status</div>
            </div>

            {/* Policy Rows */}
            {policies.map((policy) => {
              const status = getPolicyStatus(policy.expiryDate)
              const StatusIcon = status.icon

              return (
                <div
                  key={policy.id}
                  className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="col-span-3">
                    <p className="font-medium text-gray-900">
                      {policy.description || getPolicyTypeLabel(policy.type)}
                    </p>
                    {policy.expiryDate && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Expires: {new Date(policy.expiryDate).toLocaleDateString('en-GB')}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPolicyTypeColor(policy.type)}`}>
                      {getPolicyTypeLabel(policy.type)}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-gray-600">
                    {policy.provider || '-'}
                  </div>
                  <div className="col-span-2 text-right font-medium">
                    {formatCurrency(policy.coverAmount || 0)}
                  </div>
                  <div className="col-span-2 text-right text-sm text-gray-600">
                    {formatCurrency(policy.monthlyPremium || 0)}/mo
                  </div>
                  <div className="col-span-1 text-right">
                    <span className={`inline-flex items-center gap-1 ${status.color}`}>
                      <StatusIcon className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Summary Row */}
            <div className="grid grid-cols-12 gap-4 items-center pt-3 border-t-2 border-gray-200 font-semibold">
              <div className="col-span-3">Total Coverage</div>
              <div className="col-span-2"></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 text-right text-lg">
                {formatCurrency(totalCover)}
              </div>
              <div className="col-span-2 text-right text-sm text-gray-600">
                {formatCurrency(totalPremiums)}/mo
              </div>
              <div className="col-span-1"></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
