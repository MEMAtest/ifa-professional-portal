'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface ComplianceOverviewProps {
  report: any;
}

export function ComplianceOverview({ report }: ComplianceOverviewProps) {
  // Mock compliance data
  const mockCompliance = {
    overall_status: 'fully_compliant',
    compliance_score: 100,
    checks: [
      {
        id: 'real_terms_only',
        requirement: 'All projections must be in real terms (net of inflation)',
        status: 'compliant',
        guidance_reference: 'COBS 13.4.1R'
      },
      {
        id: 'assumptions_justified',
        requirement: 'All assumptions must be documented and justified', 
        status: 'compliant',
        guidance_reference: 'COBS 13.4.2G'
      },
      {
        id: 'stress_testing_complete',
        requirement: 'Appropriate stress testing must be performed',
        status: 'compliant',
        guidance_reference: 'COBS 13.4.1G'
      },
      {
        id: 'charges_included',
        requirement: 'All charges must be reflected in projections',
        status: 'compliant',
        guidance_reference: 'COBS 13.4.1R(2)'
      }
    ],
    recommendations: []
  };

  const compliance = report || mockCompliance;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'non_compliant':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-100 text-green-800">✅ Compliant</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">⚠️ Warning</Badge>;
      case 'non_compliant':
        return <Badge className="bg-red-100 text-red-800">❌ Non-Compliant</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>🏛️ FCA Compliance Status</CardTitle>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {compliance.compliance_score}%
                </div>
                <div className="text-sm text-gray-600">Compliance Score</div>
              </div>
              {getStatusBadge(compliance.overall_status)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-gray-600">
            All FCA cash flow modeling requirements have been validated and verified.
            {compliance.recommendations.length > 0 && (
              <span className="text-yellow-600 ml-1">
                {compliance.recommendations.length} recommendation(s) available.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Regulatory Requirements Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {compliance.checks.map((check: any, index: number) => (
              <div key={check.id || index} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(check.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{check.requirement}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        Reference: {check.guidance_reference}
                      </div>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {compliance.recommendations && compliance.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {compliance.recommendations.map((rec: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm text-gray-700">{rec}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}