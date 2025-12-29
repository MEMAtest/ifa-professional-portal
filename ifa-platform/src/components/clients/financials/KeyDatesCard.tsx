'use client'

import { Calendar, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import type { ExtendedClientProfile } from '@/services/integratedClientService'
import { formatDate } from '@/lib/utils'

interface KeyDatesCardProps {
  client: ExtendedClientProfile
  nextReviewDate?: string | null
}

function calculateRetirementDate(dateOfBirth: string, retirementAge: number = 65): Date | null {
  try {
    const dob = new Date(dateOfBirth)
    if (isNaN(dob.getTime())) return null
    const retirement = new Date(dob)
    retirement.setFullYear(retirement.getFullYear() + retirementAge)
    return retirement
  } catch {
    return null
  }
}

function getDaysUntil(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function DateRow({
  label,
  date,
  highlight = false,
  subtext
}: {
  label: string
  date: string | Date | null | undefined
  highlight?: boolean
  subtext?: string
}) {
  if (!date) {
    return (
      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm text-gray-400">Not set</span>
      </div>
    )
  }

  const dateObj = date instanceof Date ? date : new Date(date)
  const isValidDate = !isNaN(dateObj.getTime())

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-sm text-gray-600">{label}</span>
        {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
      </div>
      <div className="flex items-center gap-2">
        {highlight && <AlertCircle className="h-4 w-4 text-orange-500" />}
        <span className={`text-sm font-medium ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>
          {isValidDate ? formatDate(dateObj.toISOString()) : 'Invalid date'}
        </span>
      </div>
    </div>
  )
}

export function KeyDatesCard({ client, nextReviewDate: propNextReviewDate }: KeyDatesCardProps) {
  const dob = client.personalDetails?.dateOfBirth
  const expectedRetirementAge = client.financialProfile?.pensionArrangements?.[0]?.expectedRetirementAge || 65
  const retirementDate = dob ? calculateRetirementDate(dob, expectedRetirementAge) : null

  // Use provided nextReviewDate or calculate from last assessment
  const nextReviewDate = propNextReviewDate || (() => {
    const lastAssessment = client.riskProfile?.lastAssessment
    if (!lastAssessment) return null
    const reviewDate = new Date(lastAssessment)
    reviewDate.setFullYear(reviewDate.getFullYear() + 1)
    return reviewDate.toISOString()
  })()
  const reviewDaysUntil = nextReviewDate ? getDaysUntil(new Date(nextReviewDate)) : null
  const isReviewOverdue = reviewDaysUntil !== null && reviewDaysUntil < 0
  const isReviewSoon = reviewDaysUntil !== null && reviewDaysUntil >= 0 && reviewDaysUntil <= 30

  const policies = client.financialProfile?.insurancePolicies || []
  const upcomingRenewals = policies
    .filter((p) => p.expiryDate)
    .map((p) => ({
      type: p.type,
      expiryDate: new Date(p.expiryDate!),
      daysUntil: getDaysUntil(new Date(p.expiryDate!))
    }))
    .filter((p) => p.daysUntil > 0 && p.daysUntil <= 90)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const policyTypeLabels: Record<string, string> = {
    life: 'Life Insurance',
    critical_illness: 'Critical Illness',
    income_protection: 'Income Protection',
    private_medical: 'Private Medical',
    other: 'Insurance'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <div>
            <CardTitle>Key Dates</CardTitle>
            <CardDescription>Important dates and upcoming renewals</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <DateRow label="Date of Birth" date={dob} />

          <DateRow
            label="Expected Retirement"
            date={retirementDate}
            subtext={retirementDate ? `Age ${expectedRetirementAge}` : undefined}
          />

          <DateRow
            label="Next Review Due"
            date={nextReviewDate}
            highlight={isReviewOverdue || isReviewSoon}
            subtext={
              isReviewOverdue
                ? 'Overdue'
                : isReviewSoon
                  ? `Due in ${reviewDaysUntil} days`
                  : undefined
            }
          />

          {upcomingRenewals.map((renewal, index) => (
            <DateRow
              key={index}
              label={`${policyTypeLabels[renewal.type] || 'Policy'} Renewal`}
              date={renewal.expiryDate}
              highlight={renewal.daysUntil <= 30}
              subtext={`In ${renewal.daysUntil} days`}
            />
          ))}

          {!dob && !nextReviewDate && upcomingRenewals.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No key dates recorded</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
