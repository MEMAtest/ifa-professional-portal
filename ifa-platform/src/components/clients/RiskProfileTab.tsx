// src/components/clients/RiskProfileTab.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import clientLogger from '@/lib/logging/clientLogger'
import { 
  Shield, 
  Calculator, 
  FileText, 
  ChevronRight,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface RiskProfileTabProps {
  clientId: string;
}

export default function RiskProfileTab({ clientId }: RiskProfileTabProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []); // ✅ ADD THIS LINE
  const [atrAssessment, setAtrAssessment] = useState<any>(null);
  const [cflAssessment, setCflAssessment] = useState<any>(null);
  const [riskProfile, setRiskProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAssessments = useCallback(async () => {
    try {
      // ✅ FIXED: Load ATR without .single()
      const { data: atrArray, error: atrError } = await supabase
        .from('atr_assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_current', true);

      if (atrError && atrError.code !== 'PGRST116') {
        clientLogger.error('ATR fetch error:', atrError);
      }
      const atr = atrArray?.[0] || null;

      // ✅ FIXED: Load CFL without .single()
      const { data: cflArray, error: cflError } = await supabase
        .from('cfl_assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_current', true);

      if (cflError && cflError.code !== 'PGRST116') {
        clientLogger.error('CFL fetch error:', cflError);
      }
      const cfl = cflArray?.[0] || null;

      // ✅ FIXED: Get risk_profile from client's JSONB field
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('risk_profile')
        .eq('id', clientId)
        .single();

      if (clientError && clientError.code !== 'PGRST116') {
        clientLogger.error('Client fetch error:', clientError);
      }
      const profile = clientData?.risk_profile || null;

      setAtrAssessment(atr);
      setCflAssessment(cfl);
      setRiskProfile(profile);
    } catch (error) {
      clientLogger.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, supabase]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Risk Profile */}
      {riskProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Risk Profile</span>
              <Badge variant="default" className="text-lg">
                Level {riskProfile.final_risk_level || 'N/A'} - {riskProfile.final_risk_category || 'Not Assessed'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">ATR Level</p>
                <p className="text-xl font-bold">{riskProfile.atr_level || 'Not assessed'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">CFL Level</p>
                <p className="text-xl font-bold">{riskProfile.cfl_level || 'Not assessed'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-sm">{riskProfile.last_updated ? formatDate(riskProfile.last_updated) : 'Never'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ATR Assessment Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                Attitude to Risk (ATR)
              </div>
              {atrAssessment ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atrAssessment ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Risk Level</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{atrAssessment.risk_level}</span>
                    <Badge>{atrAssessment.risk_category}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Score</p>
                  <p className="font-medium">{atrAssessment.total_score?.toFixed(1) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Assessment Date</p>
                  <p className="font-medium">{formatDate(atrAssessment.assessment_date)}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                  onClick={() => router.push(`/assessments/atr?clientId=${clientId}`)}
                >
                  Update Assessment
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No ATR assessment completed</p>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => router.push(`/assessments/atr?clientId=${clientId}`)}
                >
                  Complete Assessment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CFL Assessment Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-green-600" />
                Capacity for Loss (CFL)
              </div>
              {cflAssessment ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cflAssessment ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Capacity Level</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{cflAssessment.capacity_level}</span>
                    <Badge variant="secondary">{cflAssessment.capacity_category}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Max Loss Tolerance</p>
                  <p className="font-medium">{cflAssessment.max_loss_percentage}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Assessment Date</p>
                  <p className="font-medium">{formatDate(cflAssessment.assessment_date)}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                  onClick={() => router.push(`/assessments/cfl?clientId=${clientId}`)}
                >
                  Update Assessment
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No CFL assessment completed</p>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => router.push(`/assessments/cfl?clientId=${clientId}`)}
                >
                  Complete Assessment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk Reconciliation */}
      {(atrAssessment && cflAssessment) && (
        <Card>
          <CardHeader>
            <CardTitle>Risk Profile Reconciliation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">ATR Level</p>
                  <p className="text-2xl font-bold text-blue-600">{atrAssessment.risk_level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CFL Level</p>
                  <p className="text-2xl font-bold text-green-600">{cflAssessment.capacity_level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Final Level</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.min(atrAssessment.risk_level, cflAssessment.capacity_level)}
                  </p>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Reconciliation Method:</strong> Conservative approach - 
                  the final risk level is the lower of ATR ({atrAssessment.risk_level}) 
                  and CFL ({cflAssessment.capacity_level}) to ensure suitable recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Assessments Message */}
      {!atrAssessment && !cflAssessment && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Risk Assessments Completed</h3>
            <p className="text-gray-600 mb-6">
              Complete both ATR and CFL assessments to establish a comprehensive risk profile for this client.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push(`/assessments/atr?clientId=${clientId}`)}>
                Start ATR Assessment
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push(`/assessments/cfl?clientId=${clientId}`)}
              >
                Start CFL Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
