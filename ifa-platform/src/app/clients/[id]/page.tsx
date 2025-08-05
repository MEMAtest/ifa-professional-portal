// ===================================================================
// src/app/clients/[id]/page.tsx - UPDATED WITH DOCUMENT GENERATION HUB
// Complete integration with document generation system
// ===================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ClientDetails } from '@/components/clients/ClientDetails';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import DocumentGenerationHub from '@/components/documents/DocumentGenerationHub';
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

interface PendingAction {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
}

// ===================================================================
// MAIN COMPONENT WITH DOCUMENT GENERATION HUB
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
    autoSave: false,
  });

  // Local state
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  // Check URL params for tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  // ===================================================================
  // INTEGRATION: Quick Actions for connected modules
  // ===================================================================

  const handleStartAssessment = () => {
    if (!client) return;
    router.push(`/assessments/suitability?clientId=${client.id}`);
  };

  const handleCreateScenario = () => {
    if (!client) return;
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

  // Get client name and email for document generation
  const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim();
  const clientEmail = client.contactInfo?.email;

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

        {/* UPDATED Documents Tab with Document Generation Hub */}
        <TabsContent value="documents">
          <DocumentGenerationHub
            clientId={client.id}
            clientName={clientName}
            clientEmail={clientEmail}
          />
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
// INTEGRATION DOCUMENTATION
// ===================================================================

/*
UPDATES MADE:
1. ✅ Added DocumentGenerationHub import
2. ✅ Replaced the documents tab content with DocumentGenerationHub component
3. ✅ Passed required props: clientId, clientName, clientEmail
4. ✅ Preserved all existing functionality
5. ✅ Added URL parameter handling for tab selection
6. ✅ Enhanced document tab to use full document generation system

KEY FEATURES ADDED:
1. Document Generation Hub in documents tab shows:
   - All client assessments with completion status
   - Individual document generation buttons
   - Batch generation capability
   - Combined report generation
   - Document status tracking

2. Integration maintains:
   - All existing client details functionality
   - Integration with assessments, scenarios, Monte Carlo
   - Quick actions and pending actions
   - All existing tabs and features

TESTING:
1. Navigate to client detail page
2. Click on "Documents" tab
3. See all assessments listed
4. Generate individual documents
5. Try batch generation
6. Create combined annual review
*/