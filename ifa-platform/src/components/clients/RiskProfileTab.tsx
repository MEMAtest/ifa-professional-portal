import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
  const [atrAssessment, setAtrAssessment] = useState<any>(null);
  const [cflAssessment, setCflAssessment] = useState<any>(null);
  const [riskProfile, setRiskProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssessments();
  }, [clientId]);

  const loadAssessments = async () => {
    try {
      // Load ATR
      const { data: atr } = await supabase
        .from('atr_assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_current', true)
        .single();

      // Load CFL
      const { data: cfl } = await supabase
        .from('cfl_assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_current', true)
        .single();

      // ✅ NEW CODE - Gets risk_profile from client's JSONB field
const { data: client } = await supabase
  .from('clients')
  .select('risk_profile')
  .eq('id', clientId)
  .single();

const profile = client?.risk_profile || null;

      setAtrAssessment(atr);
      setCflAssessment(cfl);
      setRiskProfile(profile);
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return <div>Loading risk assessments...</div>;
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
                Level {riskProfile.final_risk_level} - {riskProfile.final_risk_category}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">ATR Score</p>
                <p className="text-2xl font-bold">{riskProfile.atr_score?.toFixed(1) || 'N/A'}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">CFL Score</p>
                <p className="text-2xl font-bold">{riskProfile.cfl_score?.toFixed(1) || 'N/A'}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Final Level</p>
                <p className="text-2xl font-bold">{riskProfile.final_risk_level}/5</p>
              </div>
            </div>
            {riskProfile.reconciliation_notes && (
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">{riskProfile.reconciliation_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ATR Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Attitude to Risk (ATR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atrAssessment ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{atrAssessment.risk_category}</p>
                  <p className="text-sm text-gray-500">
                    Assessed on {formatDate(atrAssessment.assessment_date)}
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push(`/assessments/atr?clientId=${clientId}`)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reassess
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center text-amber-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <p>No assessment completed</p>
              </div>
              <Button 
                onClick={() => router.push(`/assessments/atr?clientId=${clientId}`)}
              >
                Complete ATR Assessment
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CFL Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Capacity for Loss (CFL)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cflAssessment ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{cflAssessment.capacity_category}</p>
                  <p className="text-sm text-gray-500">
                    Max loss tolerance: {cflAssessment.max_loss_percentage}%
                  </p>
                  <p className="text-sm text-gray-500">
                    Assessed on {formatDate(cflAssessment.assessment_date)}
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push(`/assessments/cfl?clientId=${clientId}`)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reassess
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center text-amber-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <p>No assessment completed</p>
              </div>
              <Button 
                onClick={() => router.push(`/assessments/cfl?clientId=${clientId}`)}
              >
                Complete CFL Assessment
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suitability Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Suitability Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline"
            onClick={() => router.push(`/assessments/suitability?clientId=${clientId}`)}
          >
            Complete Full Suitability Assessment
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}