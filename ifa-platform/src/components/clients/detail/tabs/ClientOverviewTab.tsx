'use client'

import React from 'react'
import { AlertCircle, Mail, MapPin, Phone, Shield, User } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import type { ExtendedClientProfile } from '@/services/integratedClientService'
import { calculateAge, formatDate, getRiskLevelColor, getRiskLevelName } from '@/lib/utils'

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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{client.contactInfo?.phone || 'No phone provided'}</span>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
            <span className="text-sm">{address}</span>
          </div>
        </CardContent>
      </Card>

      {/* Risk Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Risk Tolerance</span>
            <Badge className={getRiskLevelColor(getRiskLevelName(client.riskProfile?.attitudeToRisk || 5))}>
              {getRiskLevelName(client.riskProfile?.attitudeToRisk || 5)}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Risk Capacity</span>
            <span className="font-medium">{client.riskProfile?.riskCapacity || 'Not assessed'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Knowledge & Experience</span>
            <span className="font-medium">{client.riskProfile?.knowledgeExperience || 'Not assessed'}</span>
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
    </div>
  )
}
