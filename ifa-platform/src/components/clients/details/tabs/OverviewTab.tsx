import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertCircle, Mail, MapPin, Phone, Shield, User } from 'lucide-react';
import { formatDate, getRiskLevelColor, getRiskLevelName } from '@/lib/utils';
import { formatGender } from '@/components/clients/details/formatters';
import type { Client } from '@/types/client';

interface OverviewTabProps {
  client: Client;
  age: number | null;
  isVulnerable: boolean | null;
}

export function OverviewTab({ client, age, isVulnerable }: OverviewTabProps) {
  const riskTolerance = client.riskProfile?.riskTolerance || 'Not assessed';
  const riskToleranceName =
    typeof riskTolerance === 'number' ? getRiskLevelName(riskTolerance) : riskTolerance;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Personal Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium">
                {client.personalDetails?.dateOfBirth
                  ? formatDate(client.personalDetails.dateOfBirth)
                  : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Age</p>
              <p className="font-medium">{age ? `${age} years` : 'Not available'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Gender</p>
              <p className="font-medium">{formatGender(client.personalDetails?.gender)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Occupation</p>
              <p className="font-medium">{client.personalDetails?.occupation || 'Not specified'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Marital Status</p>
            <p className="font-medium">{client.personalDetails?.maritalStatus || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Dependents</p>
            <p className="font-medium">{client.personalDetails?.dependents || 'Not specified'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Contact Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{client.contactInfo?.email || 'No email provided'}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{client.contactInfo?.phone || 'No phone provided'}</span>
          </div>
          <div className="flex items-start space-x-3">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
            <span className="text-sm">
              {typeof client.contactInfo?.address === 'string'
                ? client.contactInfo.address
                : client.contactInfo?.address && typeof client.contactInfo.address === 'object'
                  ? [
                      client.contactInfo.address.line1,
                      client.contactInfo.address.line2,
                      client.contactInfo.address.city,
                      client.contactInfo.address.postcode,
                      client.contactInfo.address.country
                    ]
                      .filter(Boolean)
                      .join(', ')
                  : 'No address provided'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Risk Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Risk Tolerance</span>
              <Badge className={getRiskLevelColor(riskToleranceName)}>{riskToleranceName}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Risk Capacity</span>
              <span className="font-medium">{client.riskProfile?.riskCapacity || 'Not assessed'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Knowledge & Experience</span>
              <span className="font-medium">
                {client.riskProfile?.knowledgeExperience || 'Not assessed'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Last Assessment</span>
              <span className="font-medium">
                {client.riskProfile?.lastAssessment
                  ? formatDate(client.riskProfile.lastAssessment)
                  : 'Never'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>Vulnerability Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Status</span>
              <Badge
                variant={isVulnerable ? 'destructive' : 'default'}
                className={isVulnerable ? '' : 'bg-green-100 text-green-800'}
              >
                {isVulnerable ? 'Vulnerable' : 'Not Vulnerable'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Last Assessed</span>
              <span className="font-medium">
                {client.vulnerabilityAssessment?.lastAssessed
                  ? formatDate(client.vulnerabilityAssessment.lastAssessed)
                  : 'Never'}
              </span>
            </div>
          </div>
          {client.vulnerabilityAssessment?.assessmentNotes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{client.vulnerabilityAssessment.assessmentNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
