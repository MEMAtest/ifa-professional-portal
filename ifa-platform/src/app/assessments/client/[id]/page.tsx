// src/app/assessments/client/[id]/page.tsx - UPDATED WITH VERSION DISPLAY & RESULTS NAVIGATION
// COMPLETE UNABRIDGED CODE

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import {
  Shield,
  TrendingUp,
  User,
  FileText,
  Activity,
  Calculator,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  Download,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Info,
  BarChart3,
  AlertTriangle,
  Loader2,
  Plus,
  Eye,
  History
} from 'lucide-react';
import { clientService } from '@/services/ClientService';
import { createClient } from '@/lib/supabase/client';
import type { Client } from '@/types/client';
import type { AssessmentProgress, AssessmentHistory, ComplianceAlert } from '@/types/assessment';

// Assessment configuration with FIXED routes
const assessmentTypes = {
  suitability: {
    id: 'suitability',
    name: 'Full Suitability',
    shortName: 'Suitability',
    description: 'Comprehensive suitability assessment',
    icon: FileText,
    route: '/assessments/suitability-clients',
    resultsRoute: '/assessments/suitability/results',
    estimatedTime: '30-45 mins',
    color: 'green',
    order: 1
  },
  atr: {
    id: 'atr',
    name: 'Attitude to Risk',
    shortName: 'ATR',
    description: 'Assess risk tolerance and investment preferences',
    icon: Shield,
    route: '/assessments/atr',
    resultsRoute: '/assessments/atr/results',
    estimatedTime: '15-20 mins',
    color: 'blue',
    order: 2
  },
  cfl: {
    id: 'cfl',
    name: 'Capacity for Loss',
    shortName: 'CFL',
    description: 'Evaluate financial capacity for potential losses',
    icon: TrendingUp,
    route: '/assessments/cfl',
    resultsRoute: '/assessments/cfl/results',
    estimatedTime: '20-25 mins',
    color: 'purple',
    order: 3
  },
  persona: {
    id: 'persona',
    name: 'Investor Persona',
    shortName: 'Persona',
    description: 'Identify investor personality and preferences',
    icon: User,
    route: '/assessments/persona-assessment',
    resultsRoute: '/assessments/personas/results',
    estimatedTime: '10-15 mins',
    color: 'indigo',
    order: 4
  },
  monte_carlo: {
    id: 'monte_carlo',
    name: 'Monte Carlo Analysis',
    shortName: 'Monte Carlo',
    description: 'Probability-based retirement planning simulations',
    icon: Activity,
    route: '/monte-carlo',
    resultsRoute: '/monte-carlo/results',
    estimatedTime: '15-20 mins',
    color: 'orange',
    order: 5
  },
  cashflow: {
    id: 'cashflow',
    name: 'Cash Flow Planning',
    shortName: 'Cash Flow',
    description: 'Detailed income and expenditure projections',
    icon: Calculator,
    route: '/cashflow',
    resultsRoute: '/cashflow/results',
    estimatedTime: '20-30 mins',
    color: 'teal',
    order: 6
  }
};

// Helper functions
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

const calculateOverallProgress = (completedAssessments: string[]): number => {
  const totalAssessments = Object.keys(assessmentTypes).length;
  return totalAssessments > 0 
    ? Math.round((completedAssessments.length / totalAssessments) * 100)
    : 0;
};

const getNextAssessment = (completedAssessments: string[]) => {
  const allAssessments = Object.values(assessmentTypes).sort((a, b) => a.order - b.order);
  for (const assessment of allAssessments) {
    if (!completedAssessments.includes(assessment.id)) {
      return assessment;
    }
  }
  return null;
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
    danger: "bg-red-600 text-white hover:bg-red-700"
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
      className={`rounded-lg font-medium transition-colors inline-flex items-center ${variants[variant as keyof typeof variants] || variants.default} ${sizes[size as keyof typeof sizes] || sizes.default} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

const Alert = ({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: string; className?: string }) => {
  const variants = {
    default: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    danger: "bg-red-50 border-red-200 text-red-800",
    success: "bg-green-50 border-green-200 text-green-800"
  };
  
  return (
    <div className={`p-4 rounded-lg border ${variants[variant as keyof typeof variants] || variants.default} ${className}`}>
      {children}
    </div>
  );
};

// Main Component
export default function AssessmentClientPage() {
  const supabase = createClient()
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;
  
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  // State
  const [client, setClient] = useState<Client | null>(null);
  const [assessmentProgress, setAssessmentProgress] = useState<AssessmentProgress[]>([]);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentHistory[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [assessmentVersions, setAssessmentVersions] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'compliance'>('overview');
  const [showExportModal, setShowExportModal] = useState(false);

  // Check compliance alerts
  const checkComplianceAlerts = useCallback((progress: AssessmentProgress[]) => {
    const alerts: ComplianceAlert[] = [];
    const now = new Date();

    progress.forEach(p => {
      if (p.completed_at) {
        const completedDate = new Date(p.completed_at);
        const monthsSince = differenceInDays(now, completedDate) / 30;
        
        if (monthsSince > 12) {
          const normalizedType = p.assessment_type.replace('_', '-');
          const assessment = assessmentTypes[p.assessment_type as keyof typeof assessmentTypes] || 
                           assessmentTypes[normalizedType as keyof typeof assessmentTypes];
          
          alerts.push({
            id: `overdue-${p.assessment_type}`,
            clientId: clientId,
            type: 'overdue',
            assessmentType: p.assessment_type,
            message: `${assessment?.name || p.assessment_type} assessment is overdue for annual review`,
            severity: 'high',
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    setComplianceAlerts(alerts);
  }, [clientId]);

  // Load version information for assessments
  const loadAssessmentVersions = useCallback(async () => {
    const versions: Record<string, any> = {};
    
    // Load ATR versions
    try {
      const { data: atrData } = await supabase
        .from('atr_assessments')
        .select('id, version, assessment_date, risk_category, total_score, is_current')
        .eq('client_id', clientId)
        .order('version', { ascending: false })
        .limit(1);
      
      if (atrData && atrData[0]) {
        versions.atr = {
          version: atrData[0].version || 1,
          date: atrData[0].assessment_date,
          category: atrData[0].risk_category,
          score: atrData[0].total_score,
          isCurrent: atrData[0].is_current
        };
      }
    } catch (error) {
      console.error('Error loading ATR versions:', error);
    }
    
    // Load CFL versions
    try {
      const { data: cflData } = await supabase
        .from('cfl_assessments')
        .select('id, version, assessment_date, capacity_category, total_score, is_current')
        .eq('client_id', clientId)
        .order('version', { ascending: false })
        .limit(1);
      
      if (cflData && cflData[0]) {
        versions.cfl = {
          version: cflData[0].version || 1,
          date: cflData[0].assessment_date,
          category: cflData[0].capacity_category,
          score: cflData[0].total_score,
          isCurrent: cflData[0].is_current
        };
      }
    } catch (error) {
      console.error('Error loading CFL versions:', error);
    }
    
    // Load Persona versions
    try {
      const { data: personaData } = await supabase
        .from('persona_assessments')
        .select('id, version, assessment_date, persona_type, confidence, is_current')
        .eq('client_id', clientId)
        .order('version', { ascending: false })
        .limit(1);
      
      if (personaData && personaData[0]) {
        versions.persona = {
          version: personaData[0].version || 1,
          date: personaData[0].assessment_date,
          type: personaData[0].persona_type,
          confidence: personaData[0].confidence,
          isCurrent: personaData[0].is_current
        };
      }
    } catch (error) {
      console.error('Error loading Persona versions:', error);
    }
    
    setAssessmentVersions(versions);
  }, [clientId]);

  // Load all data
  const loadAllData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setIsLoading(true);
      setError(null);

      // Load client data
      const clientData = await clientService.getClientById(clientId);
      if (!mountedRef.current) return;
      setClient(clientData);

      // Load assessment progress
      const { data: progressData, error: progressError } = await supabase
        .from('assessment_progress')
        .select('*')
        .eq('client_id', clientId);

      if (progressError) throw progressError;
      if (!mountedRef.current) return;
      
      const normalizedProgress = (progressData || []).map(p => ({
        ...p,
        assessment_type: p.assessment_type.replace('-', '_')
      }));
      
      setAssessmentProgress(normalizedProgress);

      // Load assessment history
      const { data: historyData, error: historyError } = await supabase
        .from('assessment_history')
        .select('*')
        .eq('client_id', clientId)
        .order('performed_at', { ascending: false })
        .limit(50);

      if (historyError) throw historyError;
      if (!mountedRef.current) return;
      setAssessmentHistory(historyData || []);

      // Load version information
      await loadAssessmentVersions();

      // Check for compliance alerts
      checkComplianceAlerts(normalizedProgress);

    } catch (err) {
      console.error('Error loading data:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load assessment data');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        loadingRef.current = false;
      }
    }
  }, [clientId, checkComplianceAlerts, loadAssessmentVersions]);

  // Load data on mount
  useEffect(() => {
    mountedRef.current = true;
    
    if (clientId) {
      loadAllData();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [clientId, loadAllData]);

  // Handle assessment navigation
  const handleStartAssessment = (assessmentId: string) => {
    const assessment = assessmentTypes[assessmentId as keyof typeof assessmentTypes];
    if (!assessment) return;

    let route = '';
    
    switch (assessmentId) {
      case 'suitability':
        route = `/assessments/suitability-clients/${clientId}`;
        break;
      
      case 'monte_carlo':
        route = `/monte-carlo?clientId=${clientId}`;
        break;
      
      case 'cashflow':
        route = `/cashflow?clientId=${clientId}`;
        break;
      
      case 'atr':
      case 'cfl':
      case 'persona':
        route = `${assessment.route}?clientId=${clientId}`;
        break;
      
      default:
        route = `${assessment.route}?clientId=${clientId}`;
    }

    console.log(`Navigating to ${assessmentId}: ${route}`);
    router.push(route);
  };

  // Handle viewing results
  const handleViewResults = (assessmentId: string) => {
    const assessment = assessmentTypes[assessmentId as keyof typeof assessmentTypes];
    if (!assessment) return;
    
    // Navigate to the results page
    router.push(`${assessment.resultsRoute}/${clientId}`);
  };

  // Handle new assessment
  const handleNewAssessment = () => {
    router.push(`/assessments/new?clientId=${clientId}`);
  };

  // Handle export
  const handleExportReport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/assessments/report/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-report-${client?.clientRef}-${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report');
    }
  };

  // Get assessment status with version info
  const getAssessmentStatus = (assessmentId: string) => {
    const normalizedId = assessmentId.replace('-', '_');
    const progress = assessmentProgress.find(p => {
      const normalizedProgressType = p.assessment_type.replace('-', '_');
      return normalizedProgressType === normalizedId;
    });
    
    const versionInfo = assessmentVersions[assessmentId];
    
    if (!progress) return { status: 'not_started', percentage: 0, date: null, version: null };
    
    let status = progress.status;
    if (progress.progress_percentage === 100 && status !== 'completed') {
      status = 'completed';
    } else if (progress.progress_percentage > 0 && progress.progress_percentage < 100 && status === 'not_started') {
      status = 'in_progress';
    }
    
    return {
      status,
      percentage: progress.progress_percentage || 0,
      date: progress.completed_at || progress.last_updated,
      version: versionInfo?.version || null,
      versionInfo
    };
  };

  // Get status badge with version
  const getStatusBadge = (status: string, version?: number | null) => {
    if (status === 'completed' && version) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="success">Complete</Badge>
          <Badge variant="secondary">v{version}</Badge>
        </div>
      );
    }
    
    switch (status) {
      case 'completed':
        return <Badge variant="success">Complete</Badge>;
      case 'in_progress':
        return <Badge variant="warning">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  // Calculate stats
  const completedAssessments = assessmentProgress
    .filter(p => p.status === 'completed' || p.progress_percentage === 100)
    .map(p => p.assessment_type.replace('-', '_'));
  const inProgressCount = assessmentProgress
    .filter(p => (p.status === 'in_progress' || (p.progress_percentage > 0 && p.progress_percentage < 100)))
    .length;
  const overallProgress = calculateOverallProgress(completedAssessments);
  const nextAssessment = getNextAssessment(completedAssessments);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading assessment data...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Assessment Data</h2>
            <p className="text-gray-600 mb-4">{error || 'Client not found'}</p>
            <Button onClick={() => router.push('/assessments')} variant="outline">
              Back to Assessments
            </Button>
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
                onClick={() => router.push('/assessments')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                </h1>
                <p className="text-gray-600">{client.clientRef} • {client.contactInfo?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleNewAssessment}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Assessment</span>
              </Button>
              <Button variant="outline" onClick={() => loadAllData()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => setShowExportModal(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Info Alert */}
          <Alert variant="success" className="mb-4">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Flexible Assessment System</h3>
                <p className="text-sm">All assessments are independent - complete them in any order that suits your workflow. Completed assessments show version numbers and can be clicked to view full history.</p>
              </div>
            </div>
          </Alert>

          {/* Compliance Alerts */}
          {complianceAlerts.length > 0 && (
            <Alert variant="warning" className="mb-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Review Recommended</h3>
                  <ul className="space-y-1 text-sm">
                    {complianceAlerts.map(alert => (
                      <li key={alert.id}>{alert.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Alert>
          )}

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overall Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{overallProgress}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {completedAssessments.length}/{Object.keys(assessmentTypes).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-600">{inProgressCount}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Next Suggested</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {nextAssessment?.shortName || 'All Complete'}
                  </p>
                </div>
                <ChevronRight className="h-8 w-8 text-gray-400" />
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab('compliance')}
                className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
                  activeTab === 'compliance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Compliance
                {complianceAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-2 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* All Available Assessments */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Assessments</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(assessmentTypes)
                    .sort((a, b) => a.order - b.order)
                    .map(assessment => {
                      const status = getAssessmentStatus(assessment.id);
                      const colors = getAssessmentColorClasses(assessment.color);
                      const Icon = assessment.icon;
                      
                      return (
                        <Card
                          key={assessment.id}
                          onClick={() => {
                            // If completed, navigate to results page to view history
                            if (status.status === 'completed') {
                              handleViewResults(assessment.id);
                            } else {
                              // Start or continue assessment
                              handleStartAssessment(assessment.id);
                            }
                          }}
                          className="p-6 hover:border-blue-300"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`p-3 rounded-lg ${colors.bg}`}>
                                <Icon className={`h-6 w-6 ${colors.text}`} />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{assessment.name}</h3>
                                <p className="text-sm text-gray-600">{assessment.description}</p>
                              </div>
                            </div>
                            {getStatusBadge(status.status, status.version)}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium">{status.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${colors.bg}`}
                                style={{ width: `${status.percentage}%` }}
                              />
                            </div>
                            
                            {/* Show version info and last update for completed assessments */}
                            {status.status === 'completed' && status.versionInfo && (
                              <div className="mt-3 p-2 bg-gray-50 rounded-lg space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">Current Version:</span>
                                  <span className="font-semibold">Version {status.versionInfo.version}</span>
                                </div>
                                {status.date && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">Last Updated:</span>
                                    <span>{format(new Date(status.date), 'dd MMM yyyy')}</span>
                                  </div>
                                )}
                                {status.versionInfo.category && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">Result:</span>
                                    <span className="font-medium">{status.versionInfo.category}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-center mt-2">
                                  <span className="text-xs text-blue-600 flex items-center">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Click to view full history
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Show estimated time for not started */}
                            {status.status === 'not_started' && (
                              <div className="flex items-center justify-between mt-4">
                                <span className="text-sm text-gray-600">
                                  <Clock className="h-4 w-4 inline mr-1" />
                                  {assessment.estimatedTime}
                                </span>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            
                            {/* Show continue for in progress */}
                            {status.status === 'in_progress' && (
                              <div className="flex items-center justify-center mt-4">
                                <span className="text-sm text-blue-600 font-medium">
                                  Continue Assessment →
                                </span>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment History</h2>
              {assessmentHistory.length === 0 ? (
                <Card className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No assessment history yet</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {assessmentHistory.map(entry => {
                    const normalizedType = entry.assessment_type.replace('_', '-');
                    const assessment = assessmentTypes[entry.assessment_type as keyof typeof assessmentTypes] || 
                                     assessmentTypes[normalizedType as keyof typeof assessmentTypes];
                    
                    return (
                      <Card key={entry.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              {entry.action === 'completed' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : entry.action === 'saved' ? (
                                <History className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-gray-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {assessment?.name || entry.assessment_type} - {entry.action}
                              </p>
                              <p className="text-sm text-gray-600">
                                {format(new Date(entry.performed_at), 'dd MMM yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                            <div className="text-sm text-gray-500">
                              {entry.metadata.version && (
                                <Badge variant="secondary">v{entry.metadata.version}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'compliance' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Overview</h2>
              {complianceAlerts.length === 0 ? (
                <Card className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All Current</h3>
                  <p className="text-gray-600">No compliance issues detected</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {complianceAlerts.map(alert => {
                    const assessment = assessmentTypes[alert.assessmentType as keyof typeof assessmentTypes];
                    return (
                      <Alert
                        key={alert.id}
                        variant={alert.severity === 'high' ? 'danger' : 'warning'}
                      >
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-medium">{assessment?.name || alert.assessmentType}</h4>
                            <p className="text-sm mt-1">{alert.message}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleStartAssessment(alert.assessmentType)}
                          >
                            Update
                          </Button>
                        </div>
                      </Alert>
                    );
                  })}
                </div>
              )}
              
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Compliance Guidelines</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4" />
                    <span>Annual review recommended for all assessments</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4" />
                    <span>Material changes may trigger reassessment needs</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4" />
                    <span>Version history is maintained for all assessments</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Assessment Report</h3>
            <p className="text-gray-600 mb-6">
              Choose the format for your assessment report export.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => handleExportReport('pdf')}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
              <Button
                onClick={() => handleExportReport('excel')}
                variant="outline"
                className="w-full"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Export as Excel
              </Button>
              <Button
                onClick={() => setShowExportModal(false)}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}