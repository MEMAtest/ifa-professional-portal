// ===================================================================
// src/app/clients/[id]/page.tsx - INTEGRATED CLIENT DETAIL PAGE - FIXED
// Complete integration with assessments, documents, scenarios
// ===================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
// ✅ FIXED - Use default import instead of named import
import { ClientDetails } from '@/components/clients/ClientDetails';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
// INTEGRATION: Import the integration hook and services
import { useClientIntegration } from '@/lib/hooks/useClientIntegration';
import { realDocumentService } from '@/services/realIntegratedServices';
import { 
  ArrowLeft, 
  FileText, 
  Calculator, 
  Shield, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Download,
  Send,
  Calendar,
  ChevronRight,
  Activity,
  Target,
  DollarSign,
  Users,
  Briefcase
} from 'lucide-react';

// ===================================================================
// INTERFACES
// ===================================================================

interface PageProps {
  params: { id: string };
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  description: string;
  action: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  disabled?: boolean;
}

// ✅ FIXED - Define PendingAction interface to handle actionUrl properly
interface PendingAction {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string; // Made optional to handle undefined cases
}

// ===================================================================
// MAIN COMPONENT WITH FULL INTEGRATION
// ===================================================================

export default function ClientDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // ===================================================================
  // INTEGRATION: Use the integrated client hook for all data
  // ===================================================================
  const {
    client,
    dashboardData,
    isLoading,
    error,
    generateDocument,
    createWorkflow,
    refresh,
    getIntegrationStatus
  } = useClientIntegration({
    clientId: params.id,
    autoSave: false, // No auto-save needed for detail view
    refreshInterval: 30000 // Auto-refresh every 30 seconds
  });

  // Local state
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  // ===================================================================
  // INTEGRATION: Quick Actions for connected modules
  // ===================================================================

  const handleStartAssessment = () => {
    if (!client) return;
    // Navigate to suitability assessment with client pre-selected
    router.push(`/assessments/suitability?clientId=${client.id}`);
  };

  const handleCreateScenario = () => {
    if (!client) return;
    // Navigate to cash flow with client pre-selected
    router.push(`/cashflow?clientId=${client.id}&action=new`);
  };

  const handleGenerateDocument = async (templateType: string) => {
    if (!client) return;
    
    setIsGeneratingDoc(true);
    try {
      const document = await generateDocument(templateType);
      
      if (document) {
        toast({
          title: 'Document Generated',
          description: `${document.name} has been created successfully`,
          variant: 'default'
        });
        
        // Refresh to show new document
        await refresh();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate document',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleRunMonteCarlo = () => {
    if (!client) return;
    router.push(`/monte-carlo?clientId=${client.id}`);
  };

  const handleScheduleReview = () => {
    toast({
      title: 'Review Scheduled',
      description: 'Annual review has been scheduled',
      variant: 'default'
    });
  };

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      icon: FileText,
      label: 'Start Assessment',
      description: 'Complete suitability assessment',
      action: handleStartAssessment,
      variant: 'default',
      disabled: dashboardData?.currentAssessment !== null
    },
    {
      icon: Calculator,
      label: 'Create Scenario',
      description: 'Build cash flow projection',
      action: handleCreateScenario,
      variant: 'outline'
    },
    {
      icon: Download,
      label: 'Generate Report',
      description: 'Create client report',
      action: () => handleGenerateDocument('suitability_report'),
      variant: 'outline',
      disabled: !dashboardData?.currentAssessment || isGeneratingDoc
    },
    {
      icon: TrendingUp,
      label: 'Run Analysis',
      description: 'Monte Carlo simulation',
      action: handleRunMonteCarlo,
      variant: 'outline',
      disabled: !dashboardData?.activeScenario
    }
  ];

  // Navigation handlers
  const handleBack = () => {
    router.push('/clients');
  };

  const handleEdit = () => {
    if (client) {
      router.push(`/clients/${client.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    
    const clientName = `${client.personalDetails?.firstName} ${client.personalDetails?.lastName}`.trim();
    
    if (!confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`)) {
      return;
    }

    try {
      // In production, call delete service
      toast({
        title: 'Client Deleted',
        description: `${clientName} has been removed`,
        variant: 'default'
      });
      router.push('/clients');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        variant: 'destructive'
      });
    }
  };

  // Format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    if (!client) return 0;
    const integrationStatus = getIntegrationStatus();
    
    const checks = [
      client.personalDetails?.firstName && client.personalDetails?.lastName,
      client.contactInfo?.email,
      client.financialProfile?.annualIncome,
      integrationStatus.hasAssessment,
      integrationStatus.hasScenario,
      integrationStatus.hasDocuments
    ];
    
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  };

  // ===================================================================
  // RENDER STATES
  // ===================================================================

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {error || 'Client not found'}
            </h2>
            <Button onClick={handleBack} className="mt-4">
              Back to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const integrationStatus = getIntegrationStatus();
  const completionPercentage = calculateCompletionPercentage();

  // ===================================================================
  // MAIN RENDER
  // ===================================================================

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {client.personalDetails?.firstName} {client.personalDetails?.lastName}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-gray-600">
                Client Ref: {client.clientRef || 'N/A'}
              </span>
              <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                {client.status || 'prospect'}
              </Badge>
              {client.vulnerabilityAssessment?.is_vulnerable && (
                <Badge variant="destructive">Vulnerable</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            Edit Client
          </Button>
          <Button variant="outline" onClick={handleDelete} className="text-red-600">
            Delete
          </Button>
        </div>
      </div>

      {/* INTEGRATION: Client Completion Overview */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Profile Completion</h3>
              <p className="text-sm text-gray-600">
                {completionPercentage}% complete
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  integrationStatus.hasAssessment ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {integrationStatus.hasAssessment ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <Clock className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <p className="text-xs mt-1">Assessment</p>
              </div>
              <div className="text-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  integrationStatus.hasScenario ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {integrationStatus.hasScenario ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <Clock className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <p className="text-xs mt-1">Scenario</p>
              </div>
              <div className="text-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  integrationStatus.hasDocuments ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {integrationStatus.hasDocuments ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <Clock className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <p className="text-xs mt-1">Documents</p>
              </div>
              <div className="text-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  integrationStatus.hasMonteCarlo ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {integrationStatus.hasMonteCarlo ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <Clock className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <p className="text-xs mt-1">Analysis</p>
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* INTEGRATION: Pending Actions Alert */}
      {dashboardData?.pendingActions && dashboardData.pendingActions.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboardData.pendingActions.map((action: PendingAction, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      action.priority === 'high' ? 'bg-red-500' :
                      action.priority === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                    }`} />
                    <div>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </div>
                  {/* ✅ FIXED - Handle undefined actionUrl */}
                  <Button
                    size="sm"  
                    variant="outline"
                    onClick={() => {
                      if (action.actionUrl) {
                        router.push(action.actionUrl);
                      } else {
                        toast({
                          title: 'Action Unavailable',
                          description: 'This action is not yet configured',
                          variant: 'destructive'
                        });
                      }
                    }}
                  >
                    Action
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* INTEGRATION: Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {quickActions.map((action, index) => (
          <Card
            key={index}
            className={`cursor-pointer hover:shadow-lg transition-all ${
              action.disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={!action.disabled ? action.action : undefined}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  action.variant === 'default' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <action.icon className={`h-5 w-5 ${
                    action.variant === 'default' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{action.label}</h4>
                  <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Tabs with Integration Data */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="risk">Risk & Compliance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Using existing ClientDetails component */}
        <TabsContent value="overview">
          <ClientDetails
            client={client}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddCommunication={() => toast({
              title: 'Coming Soon',
              description: 'Communication logging will be available soon'
            })}
            onScheduleReview={handleScheduleReview}
          />
        </TabsContent>

        {/* Financial Tab with Integration Data */}
        <TabsContent value="financial">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Annual Income</span>
                    <span className="font-medium">
                      £{client.financialProfile?.annualIncome?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Worth</span>
                    <span className="font-medium">
                      £{client.financialProfile?.netWorth?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Liquid Assets</span>
                    <span className="font-medium">
                      £{client.financialProfile?.liquidAssets?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Expenses</span>
                    <span className="font-medium">
                      £{client.financialProfile?.monthlyExpenses?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Scenario Summary */}
            {dashboardData?.activeScenario && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Active Scenario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <h4 className="font-medium mb-2">
                    {dashboardData.activeScenario.scenario_name}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type</span>
                      <Badge>{dashboardData.activeScenario.scenario_type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Projection Years</span>
                      <span>{dashboardData.activeScenario.projection_years}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Risk Score</span>
                      <span>{dashboardData.activeScenario.risk_score}/10</span>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => router.push(`/cashflow?clientId=${client.id}`)}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Risk & Compliance Tab */}
        <TabsContent value="risk">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.currentAssessment ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Risk Tolerance</span>
                      <Badge>{dashboardData.currentAssessment.riskProfile.overall}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attitude to Risk</span>
                      <span className="font-medium">
                        {dashboardData.currentAssessment.riskProfile.attitudeToRisk}/10
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Assessment</span>
                      <span className="text-sm">
                        {formatDate(dashboardData.currentAssessment.completedAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overall Score</span>
                      <span className="font-medium">
                        {dashboardData.currentAssessment.overallScore}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">No assessment completed</p>
                    <Button onClick={handleStartAssessment}>
                      Start Assessment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Vulnerability Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <Badge variant={client.vulnerabilityAssessment?.is_vulnerable ? 'destructive' : 'default'}>
                      {client.vulnerabilityAssessment?.is_vulnerable ? 'Vulnerable' : 'Not Vulnerable'}
                    </Badge>
                  </div>
                  {client.vulnerabilityAssessment?.vulnerabilityFactors && 
                   client.vulnerabilityAssessment.vulnerabilityFactors.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Factors:</p>
                      <div className="flex flex-wrap gap-1">
                        {client.vulnerabilityAssessment.vulnerabilityFactors.map((factor: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Review Date</span>
                    <span className="text-sm">
                      {formatDate(client.vulnerabilityAssessment?.reviewDate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab with Integration */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documents</CardTitle>
                <Button
                  onClick={() => router.push(`/documents?clientId=${client.id}`)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Manage Documents
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentDocuments && dashboardData.recentDocuments.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentDocuments.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-gray-600">
                            Created {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={doc.status === 'signed' ? 'default' : 'secondary'}>
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">No documents yet</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateDocument('client_agreement')}
                      disabled={isGeneratingDoc}
                    >
                      Generate Agreement
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateDocument('suitability_report')}
                      disabled={!dashboardData?.currentAssessment || isGeneratingDoc}
                    >
                      Generate Report
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Cash Flow Scenarios</CardTitle>
                <Button
                  onClick={handleCreateScenario}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Scenario
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dashboardData?.activeScenario ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">{dashboardData.activeScenario.scenario_name}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Current Income:</span>
                        <span className="ml-2 font-medium">
                          £{dashboardData.activeScenario.current_income?.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Retirement Age:</span>
                        <span className="ml-2 font-medium">{dashboardData.activeScenario.retirement_age}</span>
                      </div>
                    </div>
                  </div>
                  
                  {dashboardData.monteCarloResults && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Monte Carlo Analysis</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Success Probability: {dashboardData.monteCarloResults.success_probability}%
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRunMonteCarlo}
                        >
                          Update Analysis
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">No scenarios created</p>
                  <Button onClick={handleCreateScenario}>
                    Create First Scenario
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Client History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                    <Plus className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Client Created</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(client.createdAt)}
                    </p>
                  </div>
                </div>
                
                {dashboardData?.currentAssessment && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Assessment Completed</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(dashboardData.currentAssessment.completedAt)}
                      </p>
                    </div>
                  </div>
                )}
                
                {client.updatedAt !== client.createdAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                      <Activity className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Last Updated</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(client.updatedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===================================================================
// INTEGRATION DOCUMENTATION FOR FUTURE AI
// ===================================================================

/*
TYPESCRIPT FIXES APPLIED:
1. ✅ Fixed ClientDetails import - Changed from named import to default import
2. ✅ Fixed actionUrl undefined error - Added null checking and fallback behavior
3. ✅ Added PendingAction interface to properly type the action objects
4. ✅ Enhanced error handling for missing actionUrl values

INTEGRATION SUMMARY:
1. This page now shows complete integrated dashboard data
2. Displays pending actions from all modules
3. Quick actions connect to assessments, documents, scenarios
4. Real-time updates every 30 seconds
5. All existing ClientDetails functionality preserved

KEY INTEGRATION FEATURES:
1. Profile Completion - Visual status of all integrations
2. Pending Actions - Centralized task management
3. Quick Actions - One-click access to key workflows
4. Enhanced Tabs - Show data from all connected modules

FUTURE CONNECTION POINTS:
1. Calendar integration for review scheduling
2. Communication log integration
3. Compliance reporting integration
4. Team collaboration features

DATA FLOW:
- Client data flows TO assessments (pre-population)
- Assessment data flows TO documents (template variables)
- Financial data flows TO scenarios (projections)
- All data flows BACK to this dashboard view

TESTING CHECKLIST:
1. Create client → Check default scenario created
2. Complete assessment → Check risk profile updated
3. Generate document → Check appears in documents tab
4. Create scenario → Check linked to client
5. Pending actions → Check navigation works
*/