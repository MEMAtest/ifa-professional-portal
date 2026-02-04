'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Calculator, CheckCircle, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import clientLogger from '@/lib/logging/clientLogger'
import { formatDate, getRiskLevelColor, getRiskLevelName } from '@/lib/utils';
import type { Client } from '@/types/client';

interface AtrAssessment {
  id: string;
  client_id: string;
  risk_level: number;
  risk_category: string;
  total_score: number;
  assessment_date: string;
  is_current: boolean;
}

interface CflAssessment {
  id: string;
  client_id: string;
  capacity_level: number;
  capacity_category: string;
  total_score: number;
  max_loss_percentage: number;
  assessment_date: string;
  is_current: boolean;
}

interface RiskProfileData {
  final_risk_level: number;
  final_risk_category: string;
}

interface RiskProfileTabProps {
  clientId: string;
  client: Client;
}

export function RiskProfileTab({ clientId, client }: RiskProfileTabProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [atrAssessment, setAtrAssessment] = useState<AtrAssessment | null>(null);
  const [cflAssessment, setCflAssessment] = useState<CflAssessment | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAssessments = useCallback(async (): Promise<void> => {
    try {
      const { data: atrArray, error: atrError } = await supabase
        .from('atr_assessments')
        .select('*')
        .match({
          client_id: clientId,
          is_current: true
        });

      const atr = atrArray?.[0] || null;

      if (atrError && atrError.code !== 'PGRST116') {
        clientLogger.error('ATR fetch error:', atrError);
      }

      const { data: cflArray, error: cflError } = await supabase
        .from('cfl_assessments')
        .select('*')
        .match({
          client_id: clientId,
          is_current: true
        });

      const cfl = cflArray?.[0] || null;

      if (cflError && cflError.code !== 'PGRST116') {
        clientLogger.error('CFL fetch error:', cflError);
      }

      const { data: clientData } = await supabase
        .from('clients')
        .select('risk_profile')
        .eq('id', clientId)
        .single();

      const profile = clientData?.risk_profile || null;

      setAtrAssessment(atr as AtrAssessment | null);
      setCflAssessment(cfl as CflAssessment | null);
      setRiskProfile(profile as RiskProfileData | null);
    } catch (error) {
      clientLogger.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, supabase]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const hasNewAssessments = atrAssessment || cflAssessment || riskProfile;
  const displayRiskLevel = riskProfile?.final_risk_level || client.riskProfile?.attitudeToRisk || 5;
  const displayRiskCategory = riskProfile?.final_risk_category || getRiskLevelName(displayRiskLevel);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Risk Assessment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : hasNewAssessments ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {atrAssessment?.risk_level || 'N/A'}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">ATR Level</p>
                  <Badge className="mt-2">{atrAssessment?.risk_category || 'Not Assessed'}</Badge>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {cflAssessment?.capacity_level || 'N/A'}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">CFL Level</p>
                  <Badge className="mt-2" variant="secondary">
                    {cflAssessment?.capacity_category || 'Not Assessed'}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {riskProfile?.final_risk_level || 'N/A'}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Final Risk Level</p>
                  <Badge className="mt-2" variant="default">
                    {riskProfile?.final_risk_category || 'Not Calculated'}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {cflAssessment?.max_loss_percentage || 0}%
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Max Loss Tolerance</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 text-blue-600 mr-2" />
                        <h4 className="font-medium">Attitude to Risk (ATR)</h4>
                      </div>
                      {atrAssessment ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {atrAssessment
                        ? `Assessed on ${formatDate(atrAssessment.assessment_date)}`
                        : 'No assessment completed'}
                    </p>
                    <Button
                      size="sm"
                      variant={atrAssessment ? 'outline' : 'default'}
                      onClick={() => router.push(`/assessments/atr?clientId=${clientId}`)}
                    >
                      {atrAssessment ? 'Update Assessment' : 'Complete Assessment'}
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Calculator className="h-5 w-5 text-green-600 mr-2" />
                        <h4 className="font-medium">Capacity for Loss (CFL)</h4>
                      </div>
                      {cflAssessment ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {cflAssessment
                        ? `Assessed on ${formatDate(cflAssessment.assessment_date)}`
                        : 'No assessment completed'}
                    </p>
                    <Button
                      size="sm"
                      variant={cflAssessment ? 'outline' : 'default'}
                      onClick={() => router.push(`/assessments/cfl?clientId=${clientId}`)}
                    >
                      {cflAssessment ? 'Update Assessment' : 'Complete Assessment'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {client.riskProfile?.attitudeToRisk || 5}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Attitude to Risk Score</p>
                  <Badge className="mt-2">
                    {getRiskLevelName(client.riskProfile?.attitudeToRisk || 5)}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {client.riskProfile?.riskCapacity || 'Not Set'}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Risk Capacity</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {client.riskProfile?.capacityForLoss || 'Not Set'}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Capacity for Loss</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {client.riskProfile?.assessmentScore || 0}%
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Assessment Score</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">New Assessment System Available</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Complete the new ATR and CFL assessments for more comprehensive risk profiling.
                    </p>
                    <div className="flex gap-3">
                      <Button size="sm" onClick={() => router.push(`/assessments/atr?clientId=${clientId}`)}>
                        Start ATR Assessment
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/assessments/cfl?clientId=${clientId}`)}
                      >
                        Start CFL Assessment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(atrAssessment || cflAssessment) && (
        <>
          {atrAssessment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  ATR Assessment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Total Score</p>
                    <p className="text-xl font-bold">{atrAssessment.total_score.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Risk Category</p>
                    <Badge className="mt-1">{atrAssessment.risk_category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Assessment Date</p>
                    <p className="font-medium">{formatDate(atrAssessment.assessment_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {cflAssessment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  CFL Assessment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Total Score</p>
                    <p className="text-xl font-bold">{cflAssessment.total_score.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Capacity Category</p>
                    <Badge className="mt-1" variant="secondary">
                      {cflAssessment.capacity_category}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Assessment Date</p>
                    <p className="font-medium">{formatDate(cflAssessment.assessment_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Combined Risk Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Final Risk Level</p>
                  <p className="text-2xl font-bold text-blue-600">{displayRiskLevel}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Risk Category</p>
                  <Badge className={`mt-2 ${getRiskLevelColor(displayRiskCategory)}`}>
                    {displayRiskCategory}
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Max Loss Tolerance</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {cflAssessment?.max_loss_percentage || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
