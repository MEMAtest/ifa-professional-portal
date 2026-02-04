// src/components/cashflow/EnhancedGenerateReportModal.tsx
// MINIMAL FIX - Just remove i18n and fix imports

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
// REMOVED: import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Progress } from '@/components/ui/Progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Alert, AlertDescription } from '@/components/ui/Alert';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
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
  Calendar,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Globe,
  Accessibility,
  Palette,
  Clock,
  Share2,
  History,
  BookOpen
} from 'lucide-react';
import clientLogger from '@/lib/logging/clientLogger'
import { ReportPreview } from '@/components/reports/ReportPreview';
import { 
  // useReportGeneration, 
  // useReportHistory, 
  // useReportPreview,
  type EnhancedReportOptions,
  type ReportProgress,
  type ReportMetadata,
  EnhancedCashFlowReportService
} from '@/services/EnhancedCashFlowReportService';
import type { CashFlowScenario } from '@/types/cashflow';

interface EnhancedGenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: CashFlowScenario | null;
  onReportGenerated?: (result: any) => void;
}

interface ReportSection {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  required?: boolean;
  premium?: boolean;
}

interface TemplateOption {
  id: 'cashflow' | 'suitability' | 'review';
  label: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  premium?: boolean;
}

const EnhancedGenerateReportModal: React.FC<EnhancedGenerateReportModalProps> = ({
  isOpen,
  onClose,
  scenario,
  onReportGenerated
}) => {
  // REMOVED: const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'options' | 'preview' | 'history'>('options');
  const [templateType, setTemplateType] = useState<'cashflow' | 'suitability' | 'review'>('cashflow');
  const [currentProgress, setCurrentProgress] = useState<ReportProgress | null>(null);
  const [unsubscribeProgress, setUnsubscribeProgress] = useState<(() => void) | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const progressTimeoutRef = useRef<NodeJS.Timeout>();

  // Report options state with comprehensive defaults
  const [reportOptions, setReportOptions] = useState<EnhancedReportOptions>({
    includeCharts: true,
    includeAssumptions: true,
    includeRiskAnalysis: true,
    includeProjectionTable: true,
    reportPeriodYears: 20,
    outputFormat: 'pdf',
    chartTypes: ['portfolio', 'income_expense', 'asset_allocation', 'risk_analysis'],
    locale: 'en-GB', // HARDCODED instead of i18n.language
    theme: 'light',
    accessibility: {
      highContrast: false,
      fontSize: 'medium',
      screenReader: false
    },
    customizations: {
      colors: {},
      fonts: {}
    }
  });

  // REMOVED: React Query hooks - using simple state instead
  const [reportHistory, setReportHistory] = useState<ReportMetadata[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ htmlContent?: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<Error | null>(null);

  // Template options - HARDCODED TEXT instead of t()
  const templateOptions: TemplateOption[] = [
    {
      id: 'cashflow',
      label: 'Cash Flow Analysis',
      description: 'Comprehensive financial projections and analysis',
      icon: TrendingUp,
      features: [
        'Comprehensive projections',
        'Risk analysis',
        'Scenario comparison',
        'Visual charts'
      ]
    },
    {
      id: 'suitability',
      label: 'Suitability Report',
      description: 'Investment recommendations and risk assessment',
      icon: Shield,
      features: [
        'Investment recommendations',
        'Risk profiling',
        'Regulatory compliance',
        'Client objectives'
      ],
      premium: true
    },
    {
      id: 'review',
      label: 'Annual Review',
      description: 'Year-over-year performance analysis',
      icon: BookOpen,
      features: [
        'Performance review',
        'Goal tracking',
        'Recommendations',
        'Next steps'
      ]
    }
  ];

  // Report sections - HARDCODED TEXT
  const reportSections: ReportSection[] = [
    {
      id: 'charts',
      label: 'Visual Charts & Graphs',
      description: 'Interactive charts showing portfolio growth and analysis',
      icon: BarChart,
      required: false
    },
    {
      id: 'assumptions',
      label: 'Assumptions & Parameters',
      description: 'Detailed breakdown of financial assumptions',
      icon: Settings,
      required: true
    },
    {
      id: 'riskAnalysis',
      label: 'Comprehensive Risk Analysis',
      description: 'In-depth analysis of potential risks and scenarios',
      icon: Shield,
      required: false,
      premium: true
    },
    {
      id: 'projectionTable',
      label: 'Year-by-Year Projections',
      description: 'Detailed table showing annual financial projections',
      icon: Calendar,
      required: false
    }
  ];

  const chartTypeOptions = [
    { 
      id: 'portfolio', 
      label: 'Portfolio Growth', 
      description: 'Total assets growth over time',
      icon: TrendingUp
    },
    { 
      id: 'income_expense', 
      label: 'Income vs Expenses', 
      description: 'Cash flow analysis and trends',
      icon: BarChart
    },
    { 
      id: 'asset_allocation', 
      label: 'Asset Allocation', 
      description: 'Investment mix breakdown',
      icon: Zap
    },
    { 
      id: 'risk_analysis', 
      label: 'Risk Analysis', 
      description: 'Risk metrics visualization',
      icon: Shield
    }
  ];

  // REMOVED: Effect to update locale when language changes

  // Cleanup progress subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeProgress) {
        unsubscribeProgress();
      }
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
    };
  }, [unsubscribeProgress]);

  const loadPreviewData = useCallback(async () => {
    if (!scenario) return;
    
    setPreviewLoading(true);
    setPreviewError(null);
    
    try {
      const service = EnhancedCashFlowReportService.getInstance();
      const result = await service.generateReportPreview(scenario.id, templateType, reportOptions);
      setPreviewData(result.success ? { htmlContent: result.htmlContent } : null);
      if (!result.success) {
        setPreviewError(new Error(result.error || 'Preview failed'));
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error : new Error('Preview failed'));
    } finally {
      setPreviewLoading(false);
    }
  }, [reportOptions, scenario, templateType]);

  // Load preview data when switching to preview tab
  useEffect(() => {
    if (activeTab === 'preview' && scenario) {
      loadPreviewData();
    }
  }, [activeTab, loadPreviewData, scenario]);

  const loadHistoryData = useCallback(async () => {
    if (!scenario) return;
    
    setHistoryLoading(true);
    
    try {
      const service = EnhancedCashFlowReportService.getInstance();
      const history = await service.getReportHistory(scenario.clientId);
      setReportHistory(history);
    } catch (error) {
      clientLogger.error('Failed to load report history:', error);
      setReportHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [scenario]);

  // Load history data when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && scenario) {
      loadHistoryData();
    }
  }, [activeTab, scenario, loadHistoryData]);

  // Handle report generation with comprehensive error handling
  const handleGenerateReport = useCallback(async () => {
    if (!scenario) return;

    try {
      setIsGenerating(true);
      
      // Set up progress tracking
      const service = EnhancedCashFlowReportService.getInstance();
      const unsubscribe = service.subscribeToReportProgress(
        `${scenario.id}-${templateType}-${Date.now()}`,
        (progress) => {
          setCurrentProgress(progress);
          
          // Auto-clear progress after completion
          if (progress.stage === 'complete' || progress.stage === 'error') {
            progressTimeoutRef.current = setTimeout(() => {
              setCurrentProgress(null);
            }, 5000);
          }
        }
      );
      setUnsubscribeProgress(() => unsubscribe);

      const result = await service.generateCompleteReport(
        scenario.id,
        templateType,
        reportOptions,
        (progress) => setCurrentProgress(progress)
      );

      if (result.success) {
        onReportGenerated?.(result);
        
        // Show success notification
        setCurrentProgress({
          stage: 'complete',
          progress: 100,
          message: 'Report generated successfully!'
        });

        await loadHistoryData();

        if (activeTab !== 'history') {
          // Auto-close modal after successful generation
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } else {
        throw new Error(result.error || 'Report generation failed');
      }

    } catch (error) {
      clientLogger.error('Report generation error:', error);
      setCurrentProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [scenario, templateType, reportOptions, onReportGenerated, onClose, activeTab, loadHistoryData]);

  // Toggle section handlers
  const toggleSection = useCallback((sectionId: string) => {
    switch (sectionId) {
      case 'charts':
        setReportOptions(prev => ({ ...prev, includeCharts: !prev.includeCharts }));
        break;
      case 'assumptions':
        setReportOptions(prev => ({ ...prev, includeAssumptions: !prev.includeAssumptions }));
        break;
      case 'riskAnalysis':
        setReportOptions(prev => ({ ...prev, includeRiskAnalysis: !prev.includeRiskAnalysis }));
        break;
      case 'projectionTable':
        setReportOptions(prev => ({ ...prev, includeProjectionTable: !prev.includeProjectionTable }));
        break;
    }
  }, []);

  const toggleChartType = useCallback((chartType: string) => {
    setReportOptions(prev => ({
      ...prev,
      chartTypes: prev.chartTypes?.includes(chartType as any)
        ? prev.chartTypes.filter(t => t !== chartType)
        : [...(prev.chartTypes || []), chartType as any]
    }));
  }, []);

  const getSectionValue = useCallback((sectionId: string): boolean => {
    switch (sectionId) {
      case 'charts': return reportOptions.includeCharts;
      case 'assumptions': return reportOptions.includeAssumptions;
      case 'riskAnalysis': return reportOptions.includeRiskAnalysis;
      case 'projectionTable': return reportOptions.includeProjectionTable;
      default: return false;
    }
  }, [reportOptions]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!isOpen || !scenario) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h2 id="report-modal-title" className="text-xl font-bold text-gray-900">
              Generate Report
            </h2>
            <p className="text-gray-600 text-sm mt-0.5">
              Customize your cash flow report for {scenario.scenarioName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Indicator */}
        {currentProgress && (
          <div className="px-6 py-3 bg-blue-50 border-b flex-shrink-0">
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
              {currentProgress.estimatedTimeRemaining && (
                <span className="text-sm text-gray-500">
                  (~{Math.round(currentProgress.estimatedTimeRemaining / 1000)}s remaining)
                </span>
              )}
            </div>
            <Progress 
              value={currentProgress.progress} 
              className="w-full"
              aria-label="Generating report"
            />
            {currentProgress.currentStep && (
              <p className="text-sm text-gray-600 mt-1">
                {currentProgress.currentStep} ({currentProgress.totalSteps ? 
                  `${Math.round((currentProgress.progress / 100) * currentProgress.totalSteps)} / ${currentProgress.totalSteps}` 
                  : currentProgress.progress}%)
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 p-1 mx-6 mt-2 max-w-md flex-shrink-0">
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

          <div className="flex-1 overflow-y-auto min-h-0">
            <TabsContent value="options" className="p-6 space-y-6">
              {/* Template Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Report Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {templateOptions.map(template => {
                      const Icon = template.icon;
                      return (
                        <div
                          key={template.id}
                          className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                            templateType === template.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setTemplateType(template.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setTemplateType(template.id);
                            }
                          }}
                          aria-pressed={templateType === template.id}
                        >
                          {template.premium && (
                            <Badge className="absolute top-2 right-2" variant="outline">
                              Premium
                            </Badge>
                          )}
                          
                          <div className="flex items-center gap-3 mb-3">
                            <Icon className="w-6 h-6 text-blue-600" />
                            <h4 className="font-medium text-gray-900">{template.label}</h4>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                          
                          <div className="space-y-1">
                            {template.features.map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Report Sections */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Report Sections
                  </CardTitle>
                  <p className="text-sm text-gray-600">Select which sections to include in your report</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reportSections.map(section => {
                    const Icon = section.icon;
                    const isChecked = getSectionValue(section.id);
                    
                    return (
                      <div
                        key={section.id}
                        className={`p-4 border rounded-lg transition-all ${
                          isChecked ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                        } ${section.required ? 'opacity-50' : ''}`}
                        title={section.description}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => !section.required && toggleSection(section.id)}
                            disabled={section.required}
                            className="mt-1"
                            aria-describedby={`section-${section.id}-desc`}
                          />
                          <Icon className="w-5 h-5 text-gray-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">{section.label}</h4>
                              {section.required && (
                                <Badge variant="outline" className="text-xs">
                                  Required
                                </Badge>
                              )}
                              {section.premium && (
                                <Badge variant="outline" className="text-xs">
                                  Premium
                                </Badge>
                              )}
                            </div>
                            <p 
                              id={`section-${section.id}-desc`}
                              className="text-sm text-gray-600"
                            >
                              {section.description}
                            </p>
                                  
                                  {/* Chart type selection */}
                                  {section.id === 'charts' && isChecked && (
                                    <div className="mt-3 space-y-2">
                                      <p className="text-sm font-medium text-gray-700">
                                        Select chart types:
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {chartTypeOptions.map(chart => {
                                          const ChartIcon = chart.icon;
                                          return (
                                            <label
                                              key={chart.id}
                                              className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-gray-50"
                                            >
                                              <Checkbox
                                                checked={reportOptions.chartTypes?.includes(chart.id as any) || false}
                                                onCheckedChange={() => toggleChartType(chart.id)}
                                              />
                                              <ChartIcon className="w-4 h-4 text-gray-500" />
                                              <div>
                                                <span className="text-gray-700 font-medium">{chart.label}</span>
                                                <p className="text-xs text-gray-500">{chart.description}</p>
                                              </div>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                </CardContent>
              </Card>

              {/* Additional Options */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Basic Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Projection Period (Years)
                      </label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={reportOptions.reportPeriodYears}
                        onChange={(e) => setReportOptions(prev => ({ 
                          ...prev, 
                          reportPeriodYears: parseInt(e.target.value) 
                        }))}
                        aria-label="Projection Period"
                      >
                        <option value={10}>10 Years</option>
                        <option value={20}>20 Years</option>
                        <option value={30}>30 Years</option>
                        <option value={40}>Full Projection</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Output Format
                      </label>
                      <div className="mt-2 space-y-2">
                        {[
                          { value: 'pdf', label: 'PDF Document', icon: FileText },
                          { value: 'html', label: 'Interactive HTML', icon: Globe }
                        ].map(format => {
                          const FormatIcon = format.icon;
                          return (
                            <label key={format.value} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="format"
                                value={format.value}
                                checked={reportOptions.outputFormat === format.value}
                                onChange={(e) => setReportOptions(prev => ({ 
                                  ...prev, 
                                  outputFormat: e.target.value as any 
                                }))}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <FormatIcon className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">
                                {format.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Accessibility Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Accessibility className="w-5 h-5" />
                      Accessibility Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={reportOptions.accessibility?.highContrast || false}
                          onCheckedChange={(checked) => setReportOptions(prev => ({
                            ...prev,
                            accessibility: { ...prev.accessibility!, highContrast: !!checked }
                          }))}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          High Contrast Mode
                        </span>
                      </label>

                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={reportOptions.accessibility?.screenReader || false}
                          onCheckedChange={(checked) => setReportOptions(prev => ({
                            ...prev,
                            accessibility: { ...prev.accessibility!, screenReader: !!checked }
                          }))}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Screen Reader Support
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Font Size
                      </label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={reportOptions.accessibility?.fontSize || 'medium'}
                        onChange={(e) => setReportOptions(prev => ({
                          ...prev,
                          accessibility: { 
                            ...prev.accessibility!, 
                            fontSize: e.target.value as 'small' | 'medium' | 'large'
                          }
                        }))}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Theme
                      </label>
                      <div className="mt-2 space-y-2">
                        {[
                          { value: 'light', label: 'Light Theme' },
                          { value: 'dark', label: 'Dark Theme' },
                          { value: 'auto', label: 'Auto (System)' }
                        ].map(theme => (
                          <label key={theme.value} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="theme"
                              value={theme.value}
                              checked={reportOptions.theme === theme.value}
                              onChange={(e) => setReportOptions(prev => ({ 
                                ...prev, 
                                theme: e.target.value as any 
                              }))}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{theme.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Info Box */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <h4 className="font-medium text-blue-900 mb-1">
                    Report Generation Tips
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Include charts for better visual understanding</li>
                    <li>• Risk analysis helps identify potential challenges</li>
                    <li>• Projection table provides detailed tracking</li>
                    <li>• PDF format is best for printing and records</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="preview" className="p-0">
              {previewLoading ? (
                <div className="flex items-center justify-center h-96">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="ml-2">Loading preview...</span>
                </div>
              ) : previewError ? (
                <div className="flex items-center justify-center h-96">
                  <Alert className="max-w-md">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Preview error: {previewError.message}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <ReportPreview
                  scenario={scenario}
                  templateType={templateType}
                  options={reportOptions}
                  onEdit={() => setActiveTab('options')}
                  onGenerate={handleGenerateReport}
                />
              )}
            </TabsContent>

            <TabsContent value="history" className="p-6">
              {historyLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="ml-2">Loading history...</span>
                </div>
              ) : reportHistory && reportHistory.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Report History</h3>
                  {reportHistory.map((report: ReportMetadata) => (
                    <Card key={report.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{report.templateType} Report</h4>
                            <p className="text-sm text-gray-600">
                              Generated on {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <Badge variant="outline">{report.version}</Badge>
                              <span className="text-xs text-gray-500">
                                {report.language.toUpperCase()}
                              </span>
                              {report.accessibility && (
                                <Accessibility className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                            <Button variant="outline" size="sm">
                              <Share2 className="w-4 h-4 mr-1" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Reports Generated
                  </h3>
                  <p className="text-gray-600">
                    Generate your first report to see it here.
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            Report will include {Object.values(reportOptions).filter(v => v === true).length} sections
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

export default EnhancedGenerateReportModal;
