// ================================================================
// CORRECTED: ComplianceDashboard.tsx using your existing components
// Path: ifa-platform/src/components/cashflow/advanced/ComplianceDashboard.tsx
// ================================================================
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Alert, AlertDescription } from '@/components/ui/Alert';  // This needs to be created
import { FileText, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { ComplianceReport } from '@/types/advanced-analytics';

interface ComplianceDashboardProps {
  complianceReport: ComplianceReport;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ complianceReport }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'non_compliant':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'non_compliant':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200';
    }
  };

  const getOverallStatusVariant = (status: string) => {
    switch (status) {
      case 'fully_compliant':
        return 'success';
      case 'partially_compliant':
        return 'warning';
      case 'non_compliant':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              FCA Compliance Status
            </span>
            <Badge variant={getOverallStatusVariant(complianceReport.overall_status)}>
              {complianceReport.overall_status.replace('_', ' ').toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {complianceReport.compliance_score}
              </div>
              <div className="text-sm text-gray-600">Compliance Score</div>
            </div>
            <div className="flex-1">
              <Progress 
                value={complianceReport.compliance_score} 
                className="h-3"
              />
            </div>
          </div>
          
          {complianceReport.recommendations.length > 0 && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertDescription>
                <div className="font-semibold mb-2">Recommendations:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {complianceReport.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Compliance Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Regulatory Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {complianceReport.checks.map((check) => (
              <div 
                key={check.id} 
                className={`p-4 rounded-lg border ${getStatusColor(check.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <div className="font-semibold">{check.requirement}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Reference: {check.guidance_reference}
                    </div>
                    {check.evidence.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium text-gray-700">Evidence:</div>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {check.evidence.map((evidence, idx) => (
                            <li key={idx}>{evidence}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};