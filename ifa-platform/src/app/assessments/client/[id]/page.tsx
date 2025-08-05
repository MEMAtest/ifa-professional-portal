'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, differenceInDays, addMonths } from 'date-fns';
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
  Loader2
} from 'lucide-react';
import { 
  assessmentTypes, 
  requiredAssessments, 
  optionalAssessments,
  getAssessmentColorClasses,
  calculateOverallProgress,
  getNextAssessment,
  checkPrerequisites
} from '@/config/assessmentTypes';
import { clientService } from '@/services/ClientService';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types/client';
import type { AssessmentProgress, AssessmentHistory, ComplianceAlert } from '@/types/assessment';

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
  className = ""
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  variant?: string;
  size?: string;
  className?: string;
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
      disabled={disabled}
      className={`rounded-lg font-medium transition-colors ${variants[variant as keyof typeof variants] || variants.default} ${sizes[size as keyof typeof sizes] || sizes.default} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
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

// Main Component
export default function AssessmentClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  // State
  const [client, setClient] = useState<Client | null>(null);
  const [assessmentProgress, setAssessmentProgress] = useState<AssessmentProgress[]>([]);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentHistory[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'compliance'>('overview');
  const [showExportModal, setShowExportModal] = useState(false);

  // Load all data
  useEffect(() => {
    if (clientId) {
      loadAllData();
    }
  }, [clientId]);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load client data
      const clientData = await clientService.getClientById(clientId);
      setClient(clientData);

      // Load assessment progress
      const { data: progressData, error: progressError } = await supabase
        .from('assessment_progress')
        .select('*')
        .eq('client_id', clientId);

      if (progressError) throw progressError;
      setAssessmentProgress(progressData || []);

      // Load assessment history
      const { data: historyData, error: historyError } = await supabase
        .from('assessment_history')
        .select('*')
        .eq('client_id', clientId)
        .order('performed_at', { ascending: false })
        .limit(50);

      if (historyError) throw historyError;
      setAssessmentHistory(historyData || []);

      // Check for compliance alerts
      checkComplianceAlerts(progressData || []);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assessment data');
    } finally {
      setIsLoading(false);
    }
  };

  const checkComplianceAlerts = (progress: AssessmentProgress[]) => {
    const alerts: ComplianceAlert[] = [];
    const now = new Date();

    // Check for overdue assessments
    progress.forEach(p => {
      if (p.completed_at) {
        const completedDate = new Date(p.completed_at);
        const monthsSince = differenceInDays(now, completedDate) / 30;
        
        if (monthsSince > 12) {
          alerts.push({
            id: `overdue-${p.assessment_type}`,
            clientId: clientId,
            type: 'overdue',
            assessmentType: p.assessment_type,
            message: `${assessmentTypes[p.assessment_type]?.name} assessment is overdue for annual review`,
            severity: 'high',
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // Check for incomplete required assessments
    requiredAssessments.forEach(assessment => {
      const progress = assessmentProgress.find(p => p.assessment_type === assessment.id);
      if (!progress || progress.status !== 'completed') {
        alerts.push({
          id: `incomplete-${assessment.id}`,
          clientId: clientId,
          type: 'incomplete',
          assessmentType: assessment.id,
          message: `${assessment.name} is required but not completed`,
          severity: 'medium',
          createdAt: new Date().toISOString()
        });
      }
    });

    setComplianceAlerts(alerts);
  };

  const handleStartAssessment = (assessmentId: string) => {
    const assessment = assessmentTypes[assessmentId];
    if (!assessment) return;

    // Check prerequisites
    const completedAssessments = assessmentProgress
      .filter(p => p.status === 'completed')
      .map(p => p.assessment_type);
    
    const prereqCheck = checkPrerequisites(assessmentId, completedAssessments);
    if (!prereqCheck.met) {
      alert(`Please complete the following assessments first: ${prereqCheck.missing.join(', ')}`);
      return;
    }

    // Navigate to assessment with clientId
    router.push(`${assessment.route}?clientId=${clientId}`);
  };

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

  const getAssessmentStatus = (assessmentId: string) => {
    const progress = assessmentProgress.find(p => p.assessment_type === assessmentId);
    if (!progress) return { status: 'not_started', percentage: 0, date: null };
    
    return {
      status: progress.status,
      percentage: progress.progress_percentage || 0,
      date: progress.completed_at || progress.last_updated
    };
  };

  const getStatusBadge = (status: string) => {
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
  const completedAssessments = assessmentProgress.filter(p => p.status === 'completed').map(p => p.assessment_type);
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
              <Button variant="outline" onClick={() => loadAllData()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setShowExportModal(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Compliance Alerts */}
          {complianceAlerts.length > 0 && (
            <Alert variant="warning" className="mb-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Compliance Alerts</h3>
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
                  <p className="text-sm text-gray-600">Required Complete</p>
                  <p className="text-2xl font-bold text-green-600">
                    {completedAssessments.filter(id => requiredAssessments.some(a => a.id === id)).length}/{requiredAssessments.length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Next Assessment</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {nextAssessment?.shortName || 'All Complete'}
                  </p>
                </div>
                <ChevronRight className="h-8 w-8 text-gray-400" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Compliance Status</p>
                  <p className="text-lg font-semibold">
                    {complianceAlerts.length === 0 ? (
                      <span className="text-green-600">Compliant</span>
                    ) : (
                      <span className="text-red-600">{complianceAlerts.length} Issues</span>
                    )}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-purple-500" />
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
              {/* Required Assessments */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Required Assessments</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiredAssessments.map(assessment => {
                    const status = getAssessmentStatus(assessment.id);
                    const colors = getAssessmentColorClasses(assessment.color);
                    
                    return (
                      <Card
                        key={assessment.id}
                        onClick={() => handleStartAssessment(assessment.id)}
                        className="p-6 hover:border-blue-300"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-3 rounded-lg ${colors.bg}`}>
                              <assessment.icon className={`h-6 w-6 ${colors.text}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{assessment.name}</h3>
                              <p className="text-sm text-gray-600">{assessment.description}</p>
                            </div>
                          </div>
                          {getStatusBadge(status.status)}
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
                          
                          {status.date && (
                            <p className="text-xs text-gray-500 mt-2">
                              Last updated: {format(new Date(status.date), 'dd MMM yyyy')}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-4">
                            <span className="text-sm text-gray-600">
                              <Clock className="h-4 w-4 inline mr-1" />
                              {assessment.estimatedTime}
                            </span>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Optional Assessments */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Optional Assessments</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {optionalAssessments.map(assessment => {
                    const status = getAssessmentStatus(assessment.id);
                    const colors = getAssessmentColorClasses(assessment.color);
                    
                    return (
                      <Card
                        key={assessment.id}
                        onClick={() => handleStartAssessment(assessment.id)}
                        className="p-6 hover:border-blue-300"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-3 rounded-lg ${colors.bg}`}>
                              <assessment.icon className={`h-6 w-6 ${colors.text}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{assessment.name}</h3>
                              <p className="text-sm text-gray-600">{assessment.description}</p>
                            </div>
                          </div>
                          {status.status === 'completed' && getStatusBadge(status.status)}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            <Clock className="h-4 w-4 inline mr-1" />
                            {assessment.estimatedTime}
                          </span>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
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
                  {assessmentHistory.map(entry => (
                    <Card key={entry.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            {entry.action === 'completed' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {assessmentTypes[entry.assessment_type]?.name} - {entry.action}
                            </p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(entry.performed_at), 'dd MMM yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        {entry.metadata && (
                          <Badge variant="secondary">
                            {JSON.stringify(entry.metadata)}
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All Compliant</h3>
                  <p className="text-gray-600">No compliance issues detected</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {complianceAlerts.map(alert => (
                    <Alert
                      key={alert.id}
                      variant={alert.severity === 'high' ? 'danger' : 'warning'}
                    >
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium">{assessmentTypes[alert.assessmentType]?.name}</h4>
                          <p className="text-sm mt-1">{alert.message}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStartAssessment(alert.assessmentType)}
                        >
                          Resolve
                        </Button>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
              
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Compliance Requirements</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4" />
                    <span>Annual review required for all assessments</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4" />
                    <span>Material changes trigger reassessment requirement</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4" />
                    <span>All required assessments must be completed before advice</span>
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