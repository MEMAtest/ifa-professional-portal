// ================================================================
// src/components/monte-carlo/MonteCarloReportModal.tsx
// Monte Carlo Report Generation Modal
// Professional 4-quadrant report with embedded charts
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
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  FileText,
  Download,
  Eye,
  Settings,
  ChevronRight,
  Info,
  BarChart,
  Shield,
  TrendingUp,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Activity,
  Heart,
  Gauge,
  PieChart,
  Clock,
  Share2,
  History,
  Target,
  DollarSign
} from 'lucide-react';

interface MonteCarloScenario {
  id: string;
  client_id: string | null;
  scenario_name: string;
  created_at: string | null;
  initial_wealth: number | null;
  time_horizon: number | null;
  withdrawal_amount: number | null;
  risk_score: number | null;
  inflation_rate: number | null;
}

interface MonteCarloResult {
  id: string;
  scenario_id: string;
  success_probability: number;
  simulation_count: number;
  average_final_wealth: number;
  median_final_wealth: number;
  confidence_intervals: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  shortfall_risk: number;
  average_shortfall_amount: number;
  wealth_volatility: number;
  maximum_drawdown: number;
  calculation_status: string;
  created_at: string;
}

interface Client {
  id: string;
  personalDetails?: {
    firstName?: string;
    lastName?: string;
  };
  financialProfile?: {
    netWorth?: number;
  };
}

interface MonteCarloSimulationResult {
  id?: string;
  clientId: string;
  clientName?: string;
  simulationCount: number;
  successProbability: number;
  medianFinalWealth: number;
  p10FinalWealth: number;
  p90FinalWealth: number;
  maxDrawdown: number;
  initialWealth: number;
  withdrawalAmount: number;
  withdrawalRate: number;
  timeHorizon: number;
  expectedReturn: number;
  volatility: number;
  inflationRate: number;
  runDate: string;
}

interface MonteCarloReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Support both formats
  simulationResult?: MonteCarloSimulationResult | null;
  scenario?: MonteCarloScenario;
  result?: MonteCarloResult;
  client?: Client;
  onReportGenerated?: (result: any) => void;
}

interface ReportProgress {
  stage: 'preparing' | 'rendering' | 'generating' | 'complete' | 'error';
  progress: number;
  message: string;
  currentStep?: string;
  totalSteps?: number;
}

interface ReportSection {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  required?: boolean;
  quadrant?: number;
}

interface ReportHistoryItem {
  id: string;
  generatedAt: string;
  fileName: string;
  storagePath?: string;
  successProbability?: number;
  simulationCount?: number;
  reportVersion?: string;
}

interface ReportOptions {
  includeExecutiveSummary: boolean;
  includeRiskAnalysis: boolean;
  includeCashFlowWaterfall: boolean;
  includeDeepDiveAnalysis: boolean;
  includeNextSteps: boolean;
  includeFanChart: boolean;
  includeHistogram: boolean;
  includeLongevityHeatmap: boolean;
  includeSustainabilityGauge: boolean;
  includeSequenceRisk: boolean;
  includeAllocationPie: boolean;
  includeSensitivityTable: boolean;
  includeAssumptionsTable: boolean;
  advisorNotes: string;
  clientSpecificNotes: string;
  outputFormat: 'pdf' | 'html';
  theme: 'light' | 'dark';
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const MonteCarloReportModal: React.FC<MonteCarloReportModalProps> = ({
  isOpen,
  onClose,
  simulationResult: rawSimulationResult,
  scenario,
  result,
  client,
  onReportGenerated
}) => {
  // Transform scenario/result/client into simulationResult format if provided
  const simulationResult: MonteCarloSimulationResult | null = React.useMemo(() => {
    if (rawSimulationResult) return rawSimulationResult;
    if (!scenario || !result || !client) return null;

    const initialWealth = scenario.initial_wealth || 500000;
    const withdrawalAmount = scenario.withdrawal_amount || 25000;

    return {
      id: result.id,
      clientId: client.id,
      clientName: `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() || 'Client',
      simulationCount: result.simulation_count,
      successProbability: result.success_probability,
      medianFinalWealth: result.median_final_wealth,
      p10FinalWealth: result.confidence_intervals?.p10 || 0,
      p90FinalWealth: result.confidence_intervals?.p90 || 0,
      maxDrawdown: result.maximum_drawdown,
      initialWealth,
      withdrawalAmount,
      withdrawalRate: (withdrawalAmount / initialWealth) * 100,
      timeHorizon: scenario.time_horizon || 25,
      expectedReturn: 5.0, // Default assumption
      volatility: result.wealth_volatility,
      inflationRate: scenario.inflation_rate || 2.5,
      runDate: result.created_at
    };
  }, [rawSimulationResult, scenario, result, client]);
  const [activeTab, setActiveTab] = useState<'options' | 'preview' | 'history'>('options');
  const [currentProgress, setCurrentProgress] = useState<ReportProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const progressTimeoutRef = useRef<NodeJS.Timeout>();

  // Report options with defaults
  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    // 4 Quadrant sections
    includeExecutiveSummary: true,
    includeRiskAnalysis: true,
    includeCashFlowWaterfall: true,
    includeDeepDiveAnalysis: true,
    includeNextSteps: true,
    // Chart options
    includeFanChart: true,
    includeHistogram: true,
    includeLongevityHeatmap: true,
    includeSustainabilityGauge: true,
    includeSequenceRisk: false,
    includeAllocationPie: true,
    // Tables
    includeSensitivityTable: true,
    includeAssumptionsTable: true,
    // Notes
    advisorNotes: '',
    clientSpecificNotes: '',
    // Format
    outputFormat: 'pdf',
    theme: 'light'
  });

  // Report sections (4 quadrants)
  const reportSections: ReportSection[] = [
    {
      id: 'executiveSummary',
      label: 'Executive Verdict',
      description: 'High-level success probability, traffic light indicator, key recommendation',
      icon: Target,
      required: true,
      quadrant: 1
    },
    {
      id: 'riskAnalysis',
      label: 'Risk Reality Check',
      description: 'Max drawdown, crisis simulation, capacity for loss, sequence risk',
      icon: Shield,
      quadrant: 2
    },
    {
      id: 'cashFlowWaterfall',
      label: 'Cash Flow Waterfall',
      description: 'Visual showing withdrawal sources (pension, ISA, state pension)',
      icon: DollarSign,
      quadrant: 3
    },
    {
      id: 'deepDiveAnalysis',
      label: 'Analysis Deep Dive',
      description: 'Assumptions, confidence intervals, fan chart, sensitivity analysis',
      icon: Activity,
      quadrant: 4
    },
    {
      id: 'nextSteps',
      label: 'Next Steps & Recommendations',
      description: 'Personalized advice, advisor notes, review date, compliance',
      icon: CheckCircle
    }
  ];

  // Chart options
  const chartOptions = [
    { id: 'fanChart', label: 'Fan Chart', description: 'Confidence intervals over time', icon: TrendingUp },
    { id: 'histogram', label: 'Success Histogram', description: 'Distribution of outcomes', icon: BarChart },
    { id: 'longevityHeatmap', label: 'Longevity Heatmap', description: 'Success by age', icon: Heart },
    { id: 'sustainabilityGauge', label: 'Sustainability Gauge', description: 'Withdrawal safety', icon: Gauge },
    { id: 'sequenceRisk', label: 'Sequence Risk', description: 'Market timing impact', icon: Activity },
    { id: 'allocationPie', label: 'Asset Allocation', description: 'Portfolio breakdown', icon: PieChart }
  ];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
    };
  }, []);

  // Load history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && simulationResult?.clientId) {
      loadHistoryData();
    }
  }, [activeTab, simulationResult?.clientId]);

  const loadHistoryData = async () => {
    if (!simulationResult?.clientId) return;

    setHistoryLoading(true);
    try {
      const supabase = createClient();

      // Query documents table for Monte Carlo reports for this client
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, file_name, created_at, storage_path, metadata')
        .eq('client_id', simulationResult.clientId)
        .eq('document_type', 'monte_carlo')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform to report history format
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
        successProbability: doc.metadata?.successProbability as number | undefined,
        simulationCount: doc.metadata?.simulationCount as number | undefined,
        reportVersion: doc.metadata?.reportVersion as string | undefined
      }));

      setReportHistory(history);
    } catch (error) {
      console.error('Failed to load report history:', error);
      setReportHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handle viewing/downloading a past report
  const handleViewReport = async (report: ReportHistoryItem) => {
    if (!report.storagePath) {
      console.error('No storage path for report');
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(report.storagePath, 3600); // 1 hour expiry

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
    if (!simulationResult) return;

    try {
      setIsGenerating(true);

      // Simulate progress stages
      const stages: { stage: ReportProgress['stage']; message: string; duration: number }[] = [
        { stage: 'preparing', message: 'Preparing simulation data...', duration: 500 },
        { stage: 'rendering', message: 'Rendering charts...', duration: 1500 },
        { stage: 'generating', message: 'Generating PDF document...', duration: 2000 },
        { stage: 'complete', message: 'Report generated successfully!', duration: 0 }
      ];

      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        setCurrentProgress({
          stage: stage.stage,
          progress: ((i + 1) / stages.length) * 100,
          message: stage.message,
          currentStep: `Step ${i + 1} of ${stages.length}`,
          totalSteps: stages.length
        });

        if (stage.duration > 0) {
          await new Promise(resolve => setTimeout(resolve, stage.duration));
        }
      }

      // Generate report via API
      const response = await fetch('/api/documents/generate-monte-carlo-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulationResult,
          options: reportOptions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const result = await response.json();

      if (result.success) {
        onReportGenerated?.(result);

        // Download the PDF - handle both downloadUrl and inlinePdf cases
        if (result.downloadUrl) {
          window.open(result.downloadUrl, '_blank');
        } else if (result.inlinePdf) {
          // Create blob from base64 and trigger download
          const byteCharacters = atob(result.inlinePdf);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);

          // Create download link and trigger
          const link = document.createElement('a');
          link.href = url;
          link.download = `monte-carlo-report-${Date.now()}.pdf`;
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
  }, [simulationResult, reportOptions, onReportGenerated, onClose]);

  // Toggle section handlers
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

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!isOpen || !simulationResult) return null;

  // Determine success color
  const successColor = simulationResult.successProbability >= 85 ? 'green' :
    simulationResult.successProbability >= 70 ? 'lime' :
    simulationResult.successProbability >= 50 ? 'amber' : 'red';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div>
            <h2 id="report-modal-title" className="text-xl font-bold">
              Generate Monte Carlo Report
            </h2>
            <p className="text-blue-100 text-sm mt-0.5">
              {simulationResult.clientName || 'Client'} • {simulationResult.simulationCount.toLocaleString()} simulations
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
            <div className={`text-2xl font-bold text-${successColor}-600`}>
              {simulationResult.successProbability.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Success Rate</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">
              {formatCurrency(simulationResult.medianFinalWealth)}
            </div>
            <div className="text-xs text-gray-500">Median End Value</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">
              {simulationResult.timeHorizon} yrs
            </div>
            <div className="text-xs text-gray-500">Time Horizon</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">
              {simulationResult.withdrawalRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Withdrawal Rate</div>
          </div>
        </div>

        {/* Progress Indicator */}
        {currentProgress && (
          <div className={`px-6 py-3 border-b ${
            currentProgress.stage === 'error' ? 'bg-red-50' :
            currentProgress.stage === 'complete' ? 'bg-green-50' : 'bg-blue-50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {currentProgress.stage === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              ) : currentProgress.stage === 'complete' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
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
              {/* Report Sections (4 Quadrants) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Report Sections (4-Quadrant Structure)
                  </CardTitle>
                  <p className="text-sm text-gray-600">FCA-compliant professional report structure</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reportSections.map(section => {
                    const Icon = section.icon;
                    const isChecked = getSectionValue(section.id);

                    return (
                      <div
                        key={section.id}
                        className={`p-3 border rounded-lg transition-all ${
                          isChecked ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => !section.required && toggleSection(section.id)}
                            disabled={section.required}
                            className="mt-0.5"
                          />
                          <Icon className={`w-5 h-5 mt-0.5 ${isChecked ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 text-sm">{section.label}</h4>
                              {section.required && (
                                <Badge variant="outline" className="text-xs py-0">Required</Badge>
                              )}
                              {section.quadrant && (
                                <Badge className="text-xs py-0 bg-blue-100 text-blue-700">
                                  Q{section.quadrant}
                                </Badge>
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
                    <BarChart className="w-5 h-5 text-purple-600" />
                    Charts & Visualizations
                  </CardTitle>
                  <p className="text-sm text-gray-600">Select which charts to embed in the report</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                {/* Tables & Data */}
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
                        checked={reportOptions.includeAssumptionsTable}
                        onCheckedChange={(checked) => setReportOptions(prev => ({
                          ...prev, includeAssumptionsTable: !!checked
                        }))}
                      />
                      <span className="text-sm text-gray-700">Assumptions Table</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={reportOptions.includeSensitivityTable}
                        onCheckedChange={(checked) => setReportOptions(prev => ({
                          ...prev, includeSensitivityTable: !!checked
                        }))}
                      />
                      <span className="text-sm text-gray-700">Sensitivity Analysis</span>
                    </label>
                  </CardContent>
                </Card>

                {/* Format Options */}
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
                          className="text-blue-600 focus:ring-blue-500"
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
                    className="w-full h-24 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add personalized notes for the client (optional)..."
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
                    {/* Simulated Preview */}
                    <div className="bg-white rounded shadow-lg p-6 max-w-2xl mx-auto">
                      {/* Page 1 - Executive Summary */}
                      <div className="border-b pb-4 mb-4">
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Monte Carlo Analysis Report</h1>
                        <p className="text-gray-600 text-sm">
                          {simulationResult.clientName || 'Client'} • Generated {new Date().toLocaleDateString()}
                        </p>
                      </div>

                      <div className={`p-4 rounded-lg mb-4 bg-${successColor}-50 border border-${successColor}-200`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full bg-${successColor}-500 flex items-center justify-center`}>
                            <span className="text-white font-bold text-lg">
                              {simulationResult.successProbability.toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <h2 className={`font-bold text-${successColor}-800`}>
                              {simulationResult.successProbability >= 85 ? 'Highly Sustainable' :
                               simulationResult.successProbability >= 70 ? 'Good Sustainability' :
                               simulationResult.successProbability >= 50 ? 'Moderate Risk' : 'High Risk'}
                            </h2>
                            <p className={`text-sm text-${successColor}-700`}>
                              Based on {simulationResult.simulationCount.toLocaleString()} Monte Carlo simulations
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-gray-500">Initial Portfolio</div>
                          <div className="font-bold">{formatCurrency(simulationResult.initialWealth)}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-gray-500">Annual Withdrawal</div>
                          <div className="font-bold">{formatCurrency(simulationResult.withdrawalAmount)}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-gray-500">Time Horizon</div>
                          <div className="font-bold">{simulationResult.timeHorizon} years</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-gray-500">Expected Return</div>
                          <div className="font-bold">{simulationResult.expectedReturn}%</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t text-center text-xs text-gray-400">
                        Preview only • Full report includes charts and detailed analysis
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
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600">Loading history...</span>
                </div>
              ) : reportHistory.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Previous Reports</h3>
                    <span className="text-sm text-gray-500">{reportHistory.length} report(s)</span>
                  </div>
                  {reportHistory.map((report) => {
                    // Use static class names for Tailwind compatibility
                    const colorClasses = report.successProbability
                      ? report.successProbability >= 85
                        ? { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-100 text-green-700' }
                        : report.successProbability >= 70
                        ? { bg: 'bg-lime-100', text: 'text-lime-600', badge: 'bg-lime-100 text-lime-700' }
                        : report.successProbability >= 50
                        ? { bg: 'bg-amber-100', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' }
                        : { bg: 'bg-red-100', text: 'text-red-600', badge: 'bg-red-100 text-red-700' }
                      : { bg: 'bg-gray-100', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-700' };

                    return (
                      <Card key={report.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-lg ${colorClasses.bg} flex items-center justify-center`}>
                                <FileText className={`w-6 h-6 ${colorClasses.text}`} />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {report.fileName || 'Monte Carlo Report'}
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
                                  {report.successProbability && (
                                    <Badge className={`${colorClasses.badge} text-xs`}>
                                      {report.successProbability.toFixed(0)}% Success
                                    </Badge>
                                  )}
                                  {report.simulationCount && (
                                    <span className="text-xs text-gray-500">
                                      {report.simulationCount.toLocaleString()} sims
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
                    Generate your first Monte Carlo report to see it here.
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
              <Button onClick={() => setActiveTab('preview')}>
                Preview Report
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : activeTab === 'preview' ? (
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating || !!currentProgress}
                className="bg-blue-600 hover:bg-blue-700"
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
              <Button onClick={() => setActiveTab('options')}>
                Back to Options
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { MonteCarloReportModal };
export default MonteCarloReportModal;
