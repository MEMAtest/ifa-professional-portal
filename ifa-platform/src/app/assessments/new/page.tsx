// src/app/assessments/new/page.tsx - COMPLETE NEW FILE
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Shield, 
  TrendingUp, 
  User, 
  FileText, 
  Activity, 
  Calculator,
  ArrowLeft,
  ChevronRight,
  Clock,
  Loader2,
  CheckCircle,
  Info,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { clientService } from '@/services/ClientService';
import type { Client } from '@/types/client';

// Assessment configuration (no prerequisites)
const assessmentTypes = {
  suitability: {
    id: 'suitability',
    name: 'Full Suitability',
    shortName: 'Suitability',
    description: 'Comprehensive suitability assessment',
    icon: FileText,
    route: '/assessments/suitability',
    category: 'compliance',
    estimatedTime: '30-45 minutes',
    color: 'green',
    order: 1
  },
  atr: {
    id: 'atr',
    name: 'Attitude to Risk',
    shortName: 'ATR',
    description: 'Measures psychological comfort with investment volatility',
    icon: Shield,
    route: '/assessments/atr',
    category: 'risk',
    estimatedTime: '10-15 minutes',
    color: 'blue',
    order: 2
  },
  cfl: {
    id: 'cfl',
    name: 'Capacity for Loss',
    shortName: 'CFL',
    description: 'Evaluates financial ability to absorb investment losses',
    icon: TrendingUp,
    route: '/assessments/cfl',
    category: 'risk',
    estimatedTime: '5-10 minutes',
    color: 'purple',
    order: 3
  },
  persona: {
    id: 'persona',
    name: 'Investor Persona',
    shortName: 'Persona',
    description: 'Behavioral profiling for personalized advice delivery',
    icon: User,
    route: '/assessments/persona-assessment',
    category: 'compliance',
    estimatedTime: '5 minutes',
    color: 'indigo',
    order: 4
  },
  monteCarlo: {
    id: 'monteCarlo',
    name: 'Monte Carlo Analysis',
    shortName: 'Monte Carlo',
    description: 'Probability-based retirement planning simulations',
    icon: Activity,
    route: '/monte-carlo',
    category: 'planning',
    estimatedTime: '15-20 minutes',
    color: 'orange',
    order: 5
  },
  cashFlow: {
    id: 'cashFlow',
    name: 'Cash Flow Planning',
    shortName: 'Cash Flow',
    description: 'Detailed income and expenditure projections',
    icon: Calculator,
    route: '/cashflow',
    category: 'planning',
    estimatedTime: '20-30 minutes',
    color: 'teal',
    order: 6
  }
};

const categoryLabels = {
  risk: 'Risk Profiling',
  planning: 'Financial Planning',
  compliance: 'Compliance & Suitability'
};

// UI Components
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
  className = ""
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  variant?: string;
  className?: string;
}) => {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${variants[variant as keyof typeof variants] || variants.default} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Alert = ({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: string; className?: string }) => {
  const variants = {
    default: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    danger: "bg-red-50 border-red-200 text-red-800"
  };
  
  return (
    <div className={`p-4 rounded-lg border ${variants[variant as keyof typeof variants] || variants.default} ${className}`}>
      {children}
    </div>
  );
};

// Get color classes for assessments
const getAssessmentColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200' }
  };
  return colorMap[color] || colorMap.blue;
};

// Main Component
export default function NewAssessmentPage() {
  const supabase = createClient()
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams?.get('clientId');
  
  const [client, setClient] = useState<Client | null>(null);
  const [completedAssessments, setCompletedAssessments] = useState<string[]>([]);
  const [inProgressAssessments, setInProgressAssessments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      loadClientAndAssessments();
    } else {
      setIsLoading(false);
      setError('No client selected');
    }
  }, [clientId]);

  const loadClientAndAssessments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load client data
      const clientData = await clientService.getClientById(clientId!);
      setClient(clientData);

      // Load assessment progress
      const { data, error: progressError } = await supabase
        .from('assessment_progress')
        .select('*')
        .eq('client_id', clientId);

      if (progressError) throw progressError;

      if (data) {
        const completed = data
          .filter(item => item.status === 'completed')
          .map(item => item.assessment_type);
        const inProgress = data
          .filter(item => item.status === 'in_progress')
          .map(item => item.assessment_type);
        
        setCompletedAssessments(completed);
        setInProgressAssessments(inProgress);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssessmentSelect = (assessmentId: string) => {
    if (!clientId) {
      alert('Please select a client first');
      router.push('/assessments');
      return;
    }

    const assessment = assessmentTypes[assessmentId as keyof typeof assessmentTypes];
    if (assessment) {
      // Navigate directly to the assessment
      if (assessmentId === 'suitability' && assessment.route === '/assessments/suitability') {
        // For suitability, we might want to go to suitability-clients page
        router.push(`/assessments/suitability-clients/${clientId}`);
      } else {
        router.push(`${assessment.route}?clientId=${clientId}`);
      }
    }
  };

  const handleBack = () => {
    if (clientId) {
      router.push(`/assessments/client/${clientId}`);
    } else {
      router.push('/assessments');
    }
  };

  const getAssessmentStatus = (assessmentId: string) => {
    if (completedAssessments.includes(assessmentId)) return 'completed';
    if (inProgressAssessments.includes(assessmentId)) return 'in_progress';
    return 'not_started';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Complete</Badge>;
      case 'in_progress':
        return <Badge variant="warning">In Progress</Badge>;
      default:
        return null;
    }
  };

  // Group assessments by category
  const assessmentsByCategory = Object.values(assessmentTypes).reduce((acc, assessment) => {
    const category = assessment.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(assessment);
    return acc;
  }, {} as Record<string, typeof assessmentTypes[keyof typeof assessmentTypes][]>);

  if (!clientId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Client Selected</h2>
            <p className="text-gray-600 mb-4">Please select a client to start an assessment</p>
            <Button onClick={() => router.push('/assessments')}>
              Select Client
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading assessments...</p>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => loadClientAndAssessments()}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => router.push('/assessments')}>
                Back to Assessments
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
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Choose Assessment</h1>
              {client && (
                <p className="text-gray-600 mt-1">
                  For: {client.personalDetails?.firstName} {client.personalDetails?.lastName} • {client.clientRef}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <Alert variant="default" className="mb-6">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No Prerequisites Required</p>
              <p className="text-sm mt-1">You can complete any assessment in any order. All assessments are independent.</p>
            </div>
          </div>
        </Alert>

        {/* Assessment Categories */}
        {Object.entries(assessmentsByCategory).map(([category, categoryAssessments]) => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {categoryLabels[category as keyof typeof categoryLabels]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryAssessments
                .sort((a, b) => a.order - b.order)
                .map(assessment => {
                  const colors = getAssessmentColorClasses(assessment.color);
                  const status = getAssessmentStatus(assessment.id);
                  const Icon = assessment.icon;
                  
                  return (
                    <Card
                      key={assessment.id}
                      onClick={() => handleAssessmentSelect(assessment.id)}
                      className="p-6 hover:border-blue-300 relative"
                    >
                      {status === 'completed' && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                      )}
                      
                      <div className="flex items-start space-x-3 mb-4">
                        <div className={`p-3 rounded-lg ${colors.bg}`}>
                          <Icon className={`h-6 w-6 ${colors.text}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{assessment.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{assessment.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">
                            <Clock className="h-4 w-4 inline mr-1" />
                            {assessment.estimatedTime}
                          </span>
                          {getStatusBadge(status)}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))}

        {/* Summary Stats */}
        <div className="mt-8 p-6 bg-white rounded-lg shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Assessment Progress Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{completedAssessments.length}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{inProgressAssessments.length}</p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-600">
                {Object.keys(assessmentTypes).length - completedAssessments.length - inProgressAssessments.length}
              </p>
              <p className="text-sm text-gray-600">Not Started</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}