// src/app/assessments/suitability-clients/[clientId]/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  FileText,
  User,
  TrendingUp,
  Shield,
  Calculator,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Save,
  RefreshCw,
  Info,
  Target,
  Activity,
  DollarSign,
  Clock,
  ChevronRight,
  Edit,
  Download,
  AlertTriangle
} from 'lucide-react';
import { clientService } from '@/services/ClientService';
import { createClient } from '@/lib/supabase/client';
import type { Client } from '@/types/client';

// Use your existing UI components
const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    className={`bg-white border border-gray-200 rounded-lg shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

const Badge = ({ children, variant = "default" }: { children: React.ReactNode; variant?: string }) => {
  const variants = {
    default: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    secondary: "bg-gray-100 text-gray-800"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant as keyof typeof variants] || variants.default}`}>
      {children}
    </span>
  );
};

const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = "default",
  size = "default",
  className = "",
  loading = false
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  variant?: string;
  size?: string;
  className?: string;
  loading?: boolean;
}) => {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700"
  };
  
  const sizes = {
    default: "px-4 py-2",
    sm: "px-3 py-1.5 text-sm",
    lg: "px-6 py-3"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center ${variants[variant as keyof typeof variants] || variants.default} ${sizes[size as keyof typeof sizes] || sizes.default} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

// Types for suitability assessment
interface SuitabilityAssessment {
  id: string;
  client_id: string;
  assessment_date: string;
  risk_profile: {
    attitudeToRisk: number;
    capacityForLoss: number;
    knowledgeExperience: number;
    overall: number;
  };
  objectives: {
    primary: string;
    secondary: string[];
    timeHorizon: number;
    incomeRequirement: boolean;
    capitalGrowth: boolean;
    capitalPreservation: boolean;
  };
  recommendations: {
    assetAllocation: Record<string, number>;
    products: string[];
    notes: string;
    nextReviewDate: string;
  };
  regulatory: {
    appropriatenessConfirmed: boolean;
    vulnerabilityConsidered: boolean;
    capacityForLossDocumented: boolean;
    consumerDutyMet: boolean;
  };
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  completed_by?: string;
  approved_by?: string;
  approved_at?: string;
}

// Helper function to ensure assessment data structure
const normalizeAssessment = (assessment: any): SuitabilityAssessment => {
  return {
    ...assessment,
    risk_profile: assessment.risk_profile || {
      attitudeToRisk: 5,
      capacityForLoss: 5,
      knowledgeExperience: 5,
      overall: 5
    },
    objectives: {
      primary: assessment.objectives?.primary || '',
      secondary: assessment.objectives?.secondary || [],
      timeHorizon: assessment.objectives?.timeHorizon || 10,
      incomeRequirement: assessment.objectives?.incomeRequirement || false,
      capitalGrowth: assessment.objectives?.capitalGrowth !== false,
      capitalPreservation: assessment.objectives?.capitalPreservation || false
    },
    recommendations: {
      assetAllocation: assessment.recommendations?.assetAllocation || {
        equities: 60,
        bonds: 30,
        alternatives: 5,
        cash: 5
      },
      products: assessment.recommendations?.products || [],
      notes: assessment.recommendations?.notes || '',
      nextReviewDate: assessment.recommendations?.nextReviewDate || 
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    },
    regulatory: {
      appropriatenessConfirmed: assessment.regulatory?.appropriatenessConfirmed || false,
      vulnerabilityConsidered: assessment.regulatory?.vulnerabilityConsidered || false,
      capacityForLossDocumented: assessment.regulatory?.capacityForLossDocumented || false,
      consumerDutyMet: assessment.regulatory?.consumerDutyMet || false
    }
  };
};

// Main component
export default function SuitabilityClientsPage() {
  const supabase = createClient()
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Extract clientId from either params or searchParams
  const clientId = (params?.clientId as string) || searchParams?.get('clientId');
  
  const [client, setClient] = useState<Client | null>(null);
  const [assessment, setAssessment] = useState<SuitabilityAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'objectives' | 'recommendations' | 'compliance'>('overview');

  // Load client and assessment data
  useEffect(() => {
    if (clientId) {
      loadData();
    } else {
      setError('No client ID provided');
      setIsLoading(false);
    }
  }, [clientId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load client data
      const clientData = await clientService.getClientById(clientId!);
      setClient(clientData);

      // Load or create suitability assessment
      const { data: assessments, error: assessmentError } = await supabase
        .from('suitability_assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (assessmentError) throw assessmentError;

      if (assessments && assessments.length > 0) {
        // Normalize the loaded assessment to ensure all fields exist
        setAssessment(normalizeAssessment(assessments[0]));
      } else {
        // Create new assessment
        await createNewAssessment();
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewAssessment = async () => {
    try {
      const newAssessment = {
        client_id: clientId,
        assessment_date: new Date().toISOString(),
        risk_profile: {
          attitudeToRisk: 5,
          capacityForLoss: 5,
          knowledgeExperience: 5,
          overall: 5
        },
        objectives: {
          primary: '',
          secondary: [],
          timeHorizon: 10,
          incomeRequirement: false,
          capitalGrowth: true,
          capitalPreservation: false
        },
        recommendations: {
          assetAllocation: {
            equities: 60,
            bonds: 30,
            alternatives: 5,
            cash: 5
          },
          products: [],
          notes: '',
          nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        regulatory: {
          appropriatenessConfirmed: false,
          vulnerabilityConsidered: false,
          capacityForLossDocumented: false,
          consumerDutyMet: false
        },
        status: 'draft',
        completion_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('suitability_assessments')
        .insert(newAssessment)
        .select()
        .single();

      if (error) throw error;
      
      // Normalize the created assessment
      setAssessment(normalizeAssessment(data));
    } catch (err) {
      console.error('Error creating assessment:', err);
      throw err;
    }
  };

  const handleSaveAssessment = async () => {
    if (!assessment) return;

    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('suitability_assessments')
        .update({
          ...assessment,
          updated_at: new Date().toISOString()
        })
        .eq('id', assessment.id);

      if (error) throw error;
      
      // Show success message
      alert('Assessment saved successfully');
    } catch (err) {
      console.error('Error saving assessment:', err);
      alert('Failed to save assessment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartFullAssessment = () => {
    // Navigate to the full suitability assessment form
    router.push(`/assessments/suitability?clientId=${clientId}`);
  };

  const handleExportReport = async () => {
    try {
      const response = await fetch(`/api/assessments/report/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          format: 'pdf',
          type: 'suitability',
          assessmentId: assessment?.id 
        })
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `suitability-assessment-${client?.clientRef}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report');
    }
  };

  // FIXED: Properly memoized calculation with safe property access
  const calculateCompletionPercentage = useCallback(() => {
    if (!assessment) return 0;

    let completed = 0;
    let total = 0;

    // Check risk profile (safe access)
    total += 4;
    if (assessment.risk_profile?.attitudeToRisk > 0) completed++;
    if (assessment.risk_profile?.capacityForLoss > 0) completed++;
    if (assessment.risk_profile?.knowledgeExperience > 0) completed++;
    if (assessment.risk_profile?.overall > 0) completed++;

    // Check objectives (safe access)
    total += 3;
    if (assessment.objectives?.primary) completed++;
    if (assessment.objectives?.secondary && assessment.objectives.secondary.length > 0) completed++;
    if (assessment.objectives?.timeHorizon > 0) completed++;

    // Check recommendations (safe access)
    total += 3;
    if (assessment.recommendations?.assetAllocation && Object.keys(assessment.recommendations.assetAllocation).length > 0) completed++;
    if (assessment.recommendations?.products && assessment.recommendations.products.length > 0) completed++;
    if (assessment.recommendations?.notes) completed++;

    // Check regulatory (safe access)
    total += 4;
    if (assessment.regulatory?.appropriatenessConfirmed) completed++;
    if (assessment.regulatory?.vulnerabilityConsidered) completed++;
    if (assessment.regulatory?.capacityForLossDocumented) completed++;
    if (assessment.regulatory?.consumerDutyMet) completed++;

    return Math.round((completed / total) * 100);
  }, [assessment]);

  // Update assessment helper
  const updateAssessment = useCallback((updates: Partial<SuitabilityAssessment>) => {
    if (!assessment) return;
    
    setAssessment(prevAssessment => {
      if (!prevAssessment) return null;
      
      const updatedAssessment = {
        ...prevAssessment,
        ...updates
      };
      
      return updatedAssessment;
    });
  }, [assessment]);

  // FIXED: Properly memoize the completion percentage
  const completionPercentage = useMemo(() => calculateCompletionPercentage(), [calculateCompletionPercentage]);

  // Update completion percentage when assessment changes
  useEffect(() => {
    if (assessment && assessment.completion_percentage !== completionPercentage) {
      updateAssessment({ completion_percentage: completionPercentage });
    }
  }, [completionPercentage, assessment, updateAssessment]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading suitability assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Assessment</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/assessments')} variant="outline">
              Back to Assessments
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!client || !assessment) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center">
            <Info className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Assessment Data</h2>
            <p className="text-gray-600 mb-4">
              Would you like to start a new suitability assessment for this client?
            </p>
            <div className="flex justify-center space-x-3">
              <Button onClick={handleStartFullAssessment}>
                Start Assessment
              </Button>
              <Button onClick={() => router.push('/assessments')} variant="outline">
                Back to List
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/assessments/client/${clientId}`)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Suitability Assessment
                </h1>
                <p className="text-gray-600">
                  {client.personalDetails?.firstName} {client.personalDetails?.lastName} • {client.clientRef}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={loadData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleSaveAssessment}
                loading={isSaving}
                variant="default"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={handleExportReport}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={handleStartFullAssessment}
                variant="success"
              >
                <Edit className="h-4 w-4 mr-2" />
                Full Assessment
              </Button>
            </div>
          </div>

          {/* Status Alert */}
          {assessment.status === 'draft' && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Draft Assessment</p>
                <p className="text-sm text-yellow-700 mt-1">
                  This assessment is still in draft. Complete all sections and mark as complete when ready.
                </p>
              </div>
            </div>
          )}

          {/* Progress Overview */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Assessment Progress</h2>
              <span className="text-2xl font-bold text-blue-600">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className={`h-10 w-10 rounded-full mx-auto flex items-center justify-center ${
                  assessment.risk_profile?.overall > 0 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Shield className={`h-5 w-5 ${
                    assessment.risk_profile?.overall > 0 ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <p className="mt-2">Risk Profile</p>
              </div>
              <div className="text-center">
                <div className={`h-10 w-10 rounded-full mx-auto flex items-center justify-center ${
                  assessment.objectives?.primary ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Target className={`h-5 w-5 ${
                    assessment.objectives?.primary ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <p className="mt-2">Objectives</p>
              </div>
              <div className="text-center">
                <div className={`h-10 w-10 rounded-full mx-auto flex items-center justify-center ${
                  assessment.recommendations?.notes ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <FileText className={`h-5 w-5 ${
                    assessment.recommendations?.notes ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <p className="mt-2">Recommendations</p>
              </div>
              <div className="text-center">
                <div className={`h-10 w-10 rounded-full mx-auto flex items-center justify-center ${
                  assessment.regulatory?.consumerDutyMet ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <CheckCircle className={`h-5 w-5 ${
                    assessment.regulatory?.consumerDutyMet ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <p className="mt-2">Compliance</p>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {(['overview', 'risk', 'objectives', 'recommendations', 'compliance'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Risk Profile Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attitude to Risk</span>
                      <span className="font-medium">{assessment.risk_profile?.attitudeToRisk || 0}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capacity for Loss</span>
                      <span className="font-medium">{assessment.risk_profile?.capacityForLoss || 0}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Knowledge & Experience</span>
                      <span className="font-medium">{assessment.risk_profile?.knowledgeExperience || 0}/10</span>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex justify-between">
                        <span className="font-semibold">Overall Risk Score</span>
                        <span className="font-bold text-blue-600">{assessment.risk_profile?.overall || 0}/10</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-green-600" />
                    Investment Objectives
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Primary Objective</p>
                      <p className="font-medium">{assessment.objectives?.primary || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Time Horizon</p>
                      <p className="font-medium">{assessment.objectives?.timeHorizon || 0} years</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Requirements</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {assessment.objectives?.incomeRequirement && (
                          <Badge variant="default">Income</Badge>
                        )}
                        {assessment.objectives?.capitalGrowth && (
                          <Badge variant="default">Growth</Badge>
                        )}
                        {assessment.objectives?.capitalPreservation && (
                          <Badge variant="default">Preservation</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                    Asset Allocation
                  </h3>
                  <div className="space-y-2">
                    {assessment.recommendations?.assetAllocation && Object.entries(assessment.recommendations.assetAllocation).map(([asset, percentage]) => (
                      <div key={asset} className="flex items-center justify-between">
                        <span className="text-gray-600 capitalize">{asset}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="font-medium w-12 text-right">{percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-purple-600" />
                    Assessment Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <Badge variant={
                        assessment.status === 'completed' ? 'success' :
                        assessment.status === 'approved' ? 'success' :
                        assessment.status === 'in_progress' ? 'warning' :
                        'secondary'
                      }>
                        {assessment.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Assessment Date</span>
                      <span className="font-medium">
                        {format(new Date(assessment.assessment_date), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Review</span>
                      <span className="font-medium">
                        {assessment.recommendations?.nextReviewDate 
                          ? format(new Date(assessment.recommendations.nextReviewDate), 'dd MMM yyyy')
                          : 'Not set'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Other tabs */}
            {activeTab === 'risk' && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Risk Profile Details</h3>
                <p className="text-gray-600">
                  Navigate to the full assessment to update risk profile details.
                </p>
                <Button onClick={handleStartFullAssessment} className="mt-4">
                  Edit Risk Profile
                </Button>
              </Card>
            )}

            {activeTab === 'objectives' && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Investment Objectives</h3>
                <p className="text-gray-600">
                  Navigate to the full assessment to update investment objectives.
                </p>
                <Button onClick={handleStartFullAssessment} className="mt-4">
                  Edit Objectives
                </Button>
              </Card>
            )}

            {activeTab === 'recommendations' && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {assessment.recommendations?.notes || 'No recommendations added yet.'}
                  </p>
                </div>
                <Button onClick={handleStartFullAssessment} className="mt-4">
                  Edit Recommendations
                </Button>
              </Card>
            )}

            {activeTab === 'compliance' && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Regulatory Compliance</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Appropriateness Confirmed</span>
                    {assessment.regulatory?.appropriatenessConfirmed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Vulnerability Considered</span>
                    {assessment.regulatory?.vulnerabilityConsidered ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Capacity for Loss Documented</span>
                    {assessment.regulatory?.capacityForLossDocumented ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Consumer Duty Requirements Met</span>
                    {assessment.regulatory?.consumerDutyMet ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                <Button onClick={handleStartFullAssessment} className="mt-4">
                  Update Compliance
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}