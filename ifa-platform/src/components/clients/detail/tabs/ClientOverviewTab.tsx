'use client'

import React from 'react'
import { AlertCircle, Mail, MapPin, Phone, Smartphone, Target, User } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import type { ExtendedClientProfile } from '@/services/integratedClientService'
import { calculateAge, formatDate } from '@/lib/utils'

export function ClientOverviewTab(props: { client: ExtendedClientProfile }) {
  const { client } = props

  const dateOfBirth = client.personalDetails?.dateOfBirth

  const address =
    typeof client.contactInfo?.address === 'string'
      ? client.contactInfo.address
      : client.contactInfo?.address && typeof client.contactInfo.address === 'object'
        ? [
            (client.contactInfo.address as any).line1,
            (client.contactInfo.address as any).line2,
            (client.contactInfo.address as any).city,
            (client.contactInfo.address as any).postcode,
            (client.contactInfo.address as any).country
          ]
            .filter(Boolean)
            .join(', ')
        : 'No address provided'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Personal Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium">{dateOfBirth ? formatDate(dateOfBirth) : 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Age</p>
              <p className="font-medium">
                {dateOfBirth && typeof dateOfBirth === 'string' ? `${calculateAge(dateOfBirth)} years` : 'Not available'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Gender</p>
              <p className="font-medium">{client.personalDetails?.gender || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Occupation</p>
              <p className="font-medium">{client.personalDetails?.occupation || 'Not specified'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Marital Status</p>
            <p className="font-medium">{client.personalDetails?.maritalStatus || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Dependents</p>
            <p className="font-medium">{client.personalDetails?.dependents || 'Not specified'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{client.contactInfo?.email || 'No email provided'}</span>
          </div>
          {client.contactInfo?.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{client.contactInfo.phone}</span>
              <span className="text-xs text-gray-400">(Home)</span>
            </div>
          )}
          {client.contactInfo?.mobile && (
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{client.contactInfo.mobile}</span>
              <span className="text-xs text-gray-400">(Mobile)</span>
            </div>
          )}
          {!client.contactInfo?.phone && !client.contactInfo?.mobile && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">No phone provided</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
            <span className="text-sm">{address}</span>
          </div>
        </CardContent>
      </Card>

      {/* Vulnerability Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Vulnerability Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Status</span>
              <Badge variant={client.vulnerabilityAssessment?.is_vulnerable ? 'destructive' : 'default'}>
                {client.vulnerabilityAssessment?.is_vulnerable ? 'Vulnerable' : 'Not Vulnerable'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Last Assessed</span>
              <span className="font-medium">
                {client.vulnerabilityAssessment?.reviewDate ? formatDate(client.vulnerabilityAssessment.reviewDate) : 'Never'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objectives & Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objectives & Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Investment Timeframe</span>
            <span className="font-medium capitalize">
              {client.financialProfile?.investmentTimeframe?.replace(/_/g, ' ') || 'Not set'}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Investment Objectives</p>
            {client.financialProfile?.investmentObjectives && client.financialProfile.investmentObjectives.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {client.financialProfile.investmentObjectives.map((objective: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs capitalize">
                    {String(objective ?? '').replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-gray-400">No objectives set</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
