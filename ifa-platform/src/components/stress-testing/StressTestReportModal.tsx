// ================================================================
// src/components/stress-testing/StressTestReportModal.tsx
// Stress Test Report Generation Modal
// Professional 3-tab modal matching Monte Carlo pattern
// ================================================================

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Progress } from '@/components/ui/Progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  FileText,
  Download,
  Eye,
  Settings,
  ChevronRight,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Shield,
  Zap,
  BarChart3,
  Target,
  Clock,
  History,
  User,
  TrendingDown,
  Lightbulb,
  PieChart
} from 'lucide-react';

// ================================================================
// TYPES
// ================================================================

interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  survivalProbability: number;
  shortfallRisk: number;
  resilienceScore: number;
  worstCaseOutcome: number;
  recoveryTimeYears?: number;
  impactAnalysis: {
    portfolioDeclinePercent: number;
    incomeReductionPercent: number;
    expenseIncreasePercent: number;
  };
}

interface ClientProfile {
  clientId: string;
  clientName: string;
  clientRef: string;
  portfolioValue: number;
  annualIncome: number;
  annualExpenses: number;
  pensionValue: number;
  savings: number;
  age: number;
}

interface StressTestReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: StressTestResult[];
  clientProfile: ClientProfile;
  selectedScenarios: string[];
  onReportGenerated?: (result: any) => void;
}

interface ReportProgress {
  stage: 'preparing' | 'analyzing' | 'generating' | 'complete' | 'error';
  progress: number;
  message: string;
}

interface ReportSection {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  required?: boolean;
}

interface ReportOptions {
  includeExecutiveSummary: boolean;
  includeClientProfile: boolean;
  includeScenarioResults: boolean;
  includeRiskAnalysis: boolean;
  includeMitigationStrategies: boolean;
  includeNextSteps: boolean;
  includeResilienceChart: boolean;
  includeComparisonBar: boolean;
  includeSurvivalPie: boolean;
  includeRecoveryTimeline: boolean;
  includeScenarioDetailsTable: boolean;
  includeImpactAnalysisTable: boolean;
  advisorNotes: string;
  outputFormat: 'pdf' | 'html';
}

interface ReportHistoryItem {
  id: string;
  generatedAt: string;
  fileName: string;
  storagePath?: string;
  avgResilience?: number;
  scenarioCount?: number;
}

// ================================================================
// HELPERS
// ================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const getResilienceColor = (score: number): string => {
  if (score >= 70) return 'green';
  if (score >= 50) return 'amber';
  if (score >= 30) return 'orange';
  return 'red';
};

// ================================================================
// MAIN COMPONENT
// ================================================================

export const StressTestReportModal: React.FC<StressTestReportModalProps> = ({
  isOpen,
  onClose,
  results,
  clientProfile,
  selectedScenarios,
  onReportGenerated
}) => {
  const [activeTab, setActiveTab] = useState<'options' | 'preview' | 'history'>('options');
  const [currentProgress, setCurrentProgress] = useState<ReportProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const progressTimeoutRef = useRef<NodeJS.Timeout>();

  // Report options with defaults
  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    // Report Sections
    includeExecutiveSummary: true,
    includeClientProfile: true,
    includeScenarioResults: true,
    includeRiskAnalysis: true,
    includeMitigationStrategies: true,
    includeNextSteps: true,
    // Charts
    includeResilienceChart: true,
    includeComparisonBar: true,
    includeSurvivalPie: true,
    includeRecoveryTimeline: false,
    // Tables
    includeScenarioDetailsTable: true,
    includeImpactAnalysisTable: true,
    // Notes
    advisorNotes: '',
    // Format
    outputFormat: 'pdf'
  });

  // Report sections configuration
  const reportSections: ReportSection[] = [
    {
      id: 'executiveSummary',
      label: 'Executive Summary',
      description: 'Overall resilience score, critical alerts, key findings',
      icon: Target,
      required: true
    },
    {
      id: 'clientProfile',
      label: 'Client Profile Overview',
      description: 'Financial situation being tested (portfolio, income, expenses)',
      icon: User
    },
    {
      id: 'scenarioResults',
      label: 'Scenario Results Grid',
      description: 'Detailed results for each tested stress scenario',
      icon: BarChart3
    },
    {
      id: 'riskAnalysis',
      label: 'Risk Analysis Deep Dive',
      description: 'Impact analysis, worst-case outcomes, recovery projections',
      icon: Shield
    },
    {
      id: 'mitigationStrategies',
      label: 'Mitigation Strategies',
      description: 'Personalized recommendations to improve resilience',
      icon: Lightbulb
    },
    {
      id: 'nextSteps',
      label: 'Next Steps & Recommendations',
      description: 'Action items, review dates, advisor notes',
      icon: CheckCircle
    }
  ];

  // Chart options
  const chartOptions = [
    { id: 'resilienceChart', label: 'Resilience Radar', description: 'Category breakdown', icon: Shield },
    { id: 'comparisonBar', label: 'Scenario Comparison', description: 'Side-by-side scores', icon: BarChart3 },
    { id: 'survivalPie', label: 'Survival Distribution', description: 'Pass/fail breakdown', icon: PieChart },
    { id: 'recoveryTimeline', label: 'Recovery Timeline', description: 'Years to recover', icon: Clock }
  ];

  // Calculate summary metrics
  const avgResilience = results.length > 0
    ? results.reduce((sum, r) => sum + r.resilienceScore, 0) / results.length
    : 0;
  const criticalCount = results.filter(r => r.resilienceScore < 50).length;
  const resilienceColor = getResilienceColor(avgResilience);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
    };
  }, []);

  const loadHistoryData = useCallback(async () => {
    if (!clientProfile?.clientId) return;

    setHistoryLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('documents')
        .select('id, name, file_name, created_at, storage_path, metadata')
        .eq('client_id', clientProfile.clientId)
        .eq('document_type', 'stress_test')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const history: ReportHistoryItem[] = (data || []).map((doc: {
        id: string;
        name: string;
        file_name: string | null;
        created_at: string;
        storage_path: string | null;
        metadata: Record<string, unknown> | null;
      }) => ({
        id: doc.id,
        generatedAt: doc.created_at,
        fileName: doc.file_name || doc.name,
        storagePath: doc.storage_path ?? undefined,
        avgResilience: doc.metadata?.avgResilience as number | undefined,
        scenarioCount: doc.metadata?.scenarioCount as number | undefined
      }));

      setReportHistory(history);
    } catch (error) {
      console.error('Failed to load report history:', error);
      setReportHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [clientProfile?.clientId]);

  // Load history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && clientProfile?.clientId) {
      loadHistoryData();
    }
  }, [activeTab, clientProfile?.clientId, loadHistoryData]);

  const handleViewReport = async (report: ReportHistoryItem) => {
    if (!report.storagePath) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(report.storagePath, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to get report URL:', error);
    }
  };

  // Handle report generation
  const handleGenerateReport = useCallback(async () => {
    if (results.length === 0) return;

    try {
      setIsGenerating(true);

      // Simulate progress stages
      const stages: { stage: ReportProgress['stage']; message: string; duration: number }[] = [
        { stage: 'preparing', message: 'Preparing stress test data...', duration: 500 },
        { stage: 'analyzing', message: 'Analyzing scenario impacts...', duration: 1000 },
        { stage: 'generating', message: 'Generating PDF report...', duration: 1500 },
        { stage: 'complete', message: 'Report generated successfully!', duration: 0 }
      ];

      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        setCurrentProgress({
          stage: stage.stage,
          progress: ((i + 1) / stages.length) * 100,
          message: stage.message
        });

        if (stage.duration > 0) {
          await new Promise(resolve => setTimeout(resolve, stage.duration));
        }
      }

      // Generate report via API
      const response = await fetch('/api/documents/generate-stress-test-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          clientProfile,
          selectedScenarios,
          options: reportOptions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const result = await response.json();

      if (result.success) {
        onReportGenerated?.(result);

        // Download the PDF
        if (result.downloadUrl) {
          window.open(result.downloadUrl, '_blank');
        } else if (result.inlinePdf) {
          const byteCharacters = atob(result.inlinePdf);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = url;
          link.download = `stress-test-report-${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        // Auto-close after success
        progressTimeoutRef.current = setTimeout(() => {
          setCurrentProgress(null);
          onClose();
        }, 2000);
      } else {
        throw new Error(result.error || 'Report generation failed');
      }

    } catch (error) {
      console.error('Report generation error:', error);
      setCurrentProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [results, clientProfile, selectedScenarios, reportOptions, onReportGenerated, onClose]);

  // Toggle handlers
  const toggleSection = useCallback((sectionId: string) => {
    const key = `include${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}` as keyof ReportOptions;
    setReportOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const getSectionValue = useCallback((sectionId: string): boolean => {
    const key = `include${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}` as keyof ReportOptions;
    return reportOptions[key] as boolean || false;
  }, [reportOptions]);

  const toggleChart = useCallback((chartId: string) => {
    const key = `include${chartId.charAt(0).toUpperCase() + chartId.slice(1)}` as keyof ReportOptions;
    setReportOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const getChartValue = useCallback((chartId: string): boolean => {
    const key = `include${chartId.charAt(0).toUpperCase() + chartId.slice(1)}` as keyof ReportOptions;
    return reportOptions[key] as boolean || false;
  }, [reportOptions]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stress-report-modal-title"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div>
            <h2 id="stress-report-modal-title" className="text-xl font-bold">
              Generate Stress Test Report
            </h2>
            <p className="text-orange-100 text-sm mt-0.5">
              {clientProfile.clientName} - {results.length} scenarios tested
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick Stats Banner */}
        <div className="px-6 py-3 bg-gray-50 border-b grid grid-cols-4 gap-4 text-center">
          <div>
            <div className={`text-2xl font-bold text-${resilienceColor}-600`}>
              {avgResilience.toFixed(0)}/100
            </div>
            <div className="text-xs text-gray-500">Avg Resilience</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">
              {results.length}
            </div>
            <div className="text-xs text-gray-500">Scenarios Tested</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {criticalCount}
            </div>
            <div className="text-xs text-gray-500">Critical Risks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">
              {formatCurrency(clientProfile.portfolioValue)}
            </div>
            <div className="text-xs text-gray-500">Portfolio Value</div>
          </div>
        </div>

        {/* Progress Indicator */}
        {currentProgress && (
          <div className={`px-6 py-3 border-b ${
            currentProgress.stage === 'error' ? 'bg-red-50' :
            currentProgress.stage === 'complete' ? 'bg-green-50' : 'bg-orange-50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {currentProgress.stage === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              ) : currentProgress.stage === 'complete' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />
              )}
              <span className="font-medium text-gray-900">
                {currentProgress.message}
              </span>
            </div>
            <Progress value={currentProgress.progress} className="w-full h-2" />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 p-1 mx-6 mt-2 max-w-md">
            <TabsTrigger value="options" className="flex items-center gap-2 text-sm">
              <Settings className="w-4 h-4" />
              Options
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 text-sm">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            {/* Options Tab */}
            <TabsContent value="options" className="p-6 space-y-6 m-0">
              {/* Report Sections */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    Report Sections
                  </CardTitle>
                  <p className="text-sm text-gray-600">Select which sections to include</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reportSections.map(section => {
                    const Icon = section.icon;
                    const isChecked = getSectionValue(section.id);

                    return (
                      <div
                        key={section.id}
                        className={`p-3 border rounded-lg transition-all ${
                          isChecked ? 'border-orange-200 bg-orange-50/50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => !section.required && toggleSection(section.id)}
                            disabled={section.required}
                            className="mt-0.5"
                          />
                          <Icon className={`w-5 h-5 mt-0.5 ${isChecked ? 'text-orange-600' : 'text-gray-400'}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 text-sm">{section.label}</h4>
                              {section.required && (
                                <Badge variant="outline" className="text-xs py-0">Required</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Chart Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Charts & Visualizations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {chartOptions.map(chart => {
                      const Icon = chart.icon;
                      const isChecked = getChartValue(chart.id);

                      return (
                        <label
                          key={chart.id}
                          className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                            isChecked ? 'border-purple-200 bg-purple-50/50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleChart(chart.id)}
                          />
                          <Icon className={`w-4 h-4 ${isChecked ? 'text-purple-600' : 'text-gray-400'}`} />
                          <div>
                            <div className="font-medium text-sm text-gray-900">{chart.label}</div>
                            <div className="text-xs text-gray-500">{chart.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tables */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5 text-gray-600" />
                      Tables & Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={reportOptions.includeScenarioDetailsTable}
                        onCheckedChange={(checked) => setReportOptions(prev => ({
                          ...prev, includeScenarioDetailsTable: !!checked
                        }))}
                      />
                      <span className="text-sm text-gray-700">Scenario Details Table</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={reportOptions.includeImpactAnalysisTable}
                        onCheckedChange={(checked) => setReportOptions(prev => ({
                          ...prev, includeImpactAnalysisTable: !!checked
                        }))}
                      />
                      <span className="text-sm text-gray-700">Impact Analysis Table</span>
                    </label>
                  </CardContent>
                </Card>

                {/* Format */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      Output Format
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { value: 'pdf', label: 'PDF Document', description: 'Best for printing' },
                      { value: 'html', label: 'Interactive HTML', description: 'Best for digital sharing' }
                    ].map(format => (
                      <label key={format.value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="format"
                          value={format.value}
                          checked={reportOptions.outputFormat === format.value}
                          onChange={(e) => setReportOptions(prev => ({
                            ...prev,
                            outputFormat: e.target.value as 'pdf' | 'html'
                          }))}
                          className="text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <span className="text-sm text-gray-700 font-medium">{format.label}</span>
                          <span className="text-xs text-gray-500 ml-2">{format.description}</span>
                        </div>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Advisor Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    Advisor Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full h-24 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Add personalized notes or recommendations for the client..."
                    value={reportOptions.advisorNotes}
                    onChange={(e) => setReportOptions(prev => ({ ...prev, advisorNotes: e.target.value }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="p-6 m-0">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Report Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 rounded-lg p-8 min-h-[400px]">
                    <div className="bg-white rounded shadow-lg p-6 max-w-2xl mx-auto">
                      {/* Simulated Preview */}
                      <div className="border-b pb-4 mb-4">
                        <h1 className="text-xl font-bold text-gray-900 mb-2">
                          Stress Test Analysis Report
                        </h1>
                        <p className="text-gray-600 text-sm">
                          {clientProfile.clientName} - Generated {new Date().toLocaleDateString()}
                        </p>
                      </div>

                      <div className={`p-4 rounded-lg mb-4 ${
                        avgResilience >= 70 ? 'bg-green-50 border border-green-200' :
                        avgResilience >= 50 ? 'bg-amber-50 border border-amber-200' :
                        'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            avgResilience >= 70 ? 'bg-green-500' :
                            avgResilience >= 50 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}>
                            <span className="text-white font-bold text-lg">
                              {avgResilience.toFixed(0)}
                            </span>
                          </div>
                          <div>
                            <h2 className={`font-bold ${
                              avgResilience >= 70 ? 'text-green-800' :
                              avgResilience >= 50 ? 'text-amber-800' :
                              'text-red-800'
                            }`}>
                              {avgResilience >= 70 ? 'Robust Resilience' :
                               avgResilience >= 50 ? 'Moderate Resilience' :
                               'Low Resilience'}
                            </h2>
                            <p className={`text-sm ${
                              avgResilience >= 70 ? 'text-green-700' :
                              avgResilience >= 50 ? 'text-amber-700' :
                              'text-red-700'
                            }`}>
                              Based on {results.length} stress scenarios tested
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-gray-500">Portfolio Value</div>
                          <div className="font-bold">{formatCurrency(clientProfile.portfolioValue)}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-gray-500">Critical Risks</div>
                          <div className={`font-bold ${criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {criticalCount} scenario{criticalCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-gray-500">Client Age</div>
                          <div className="font-bold">{clientProfile.age} years</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-gray-500">Annual Income</div>
                          <div className="font-bold">{formatCurrency(clientProfile.annualIncome)}</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t text-center text-xs text-gray-400">
                        Preview only - Full report includes charts and detailed analysis
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="p-6 m-0">
              {historyLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-gray-600">Loading history...</span>
                </div>
              ) : reportHistory.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Previous Reports</h3>
                    <span className="text-sm text-gray-500">{reportHistory.length} report(s)</span>
                  </div>
                  {reportHistory.map((report) => {
                    const colorClasses = report.avgResilience
                      ? report.avgResilience >= 70
                        ? { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-100 text-green-700' }
                        : report.avgResilience >= 50
                        ? { bg: 'bg-amber-100', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' }
                        : { bg: 'bg-red-100', text: 'text-red-600', badge: 'bg-red-100 text-red-700' }
                      : { bg: 'bg-gray-100', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-700' };

                    return (
                      <Card key={report.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-lg ${colorClasses.bg} flex items-center justify-center`}>
                                <Zap className={`w-6 h-6 ${colorClasses.text}`} />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {report.fileName || 'Stress Test Report'}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-sm text-gray-600">
                                    {report.generatedAt
                                      ? new Date(report.generatedAt).toLocaleDateString('en-GB', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })
                                      : 'Unknown date'}
                                  </span>
                                  {report.avgResilience && (
                                    <Badge className={`${colorClasses.badge} text-xs`}>
                                      {report.avgResilience.toFixed(0)}/100 Resilience
                                    </Badge>
                                  )}
                                  {report.scenarioCount && (
                                    <span className="text-xs text-gray-500">
                                      {report.scenarioCount} scenarios
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewReport(report)}
                                disabled={!report.storagePath}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewReport(report)}
                                disabled={!report.storagePath}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Generated Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Generate your first stress test report to see it here.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('options')}
                    className="mt-2"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Create New Report
                  </Button>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <span className="font-medium">
              {Object.entries(reportOptions).filter(([k, v]) => k.startsWith('include') && v === true).length}
            </span> sections selected
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {activeTab === 'options' ? (
              <Button onClick={() => setActiveTab('preview')} className="bg-orange-500 hover:bg-orange-600">
                Preview Report
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : activeTab === 'preview' ? (
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating || !!currentProgress || results.length === 0}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isGenerating || currentProgress ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1" />
                    Generate Report
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => setActiveTab('options')} className="bg-orange-500 hover:bg-orange-600">
                Back to Options
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StressTestReportModal;
