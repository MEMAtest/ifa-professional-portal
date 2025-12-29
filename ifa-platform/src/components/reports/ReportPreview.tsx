// ================================================================
// src/components/reports/ReportPreview.tsx - FIXED VERSION
// Now properly imports and uses EnhancedCashFlowReportService
// ================================================================

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Download,
  Edit,
  Loader,
  Info
} from 'lucide-react';
// FIX: Import the Enhanced service that has generateReportPreview method
import { EnhancedCashFlowReportService, type EnhancedReportOptions } from '@/services/EnhancedCashFlowReportService';
import type { CashFlowScenario } from '@/types/cashflow';

interface ReportPreviewProps {
  scenario: CashFlowScenario;
  templateType: 'cashflow' | 'suitability' | 'review';
  options: EnhancedReportOptions;
  onEdit: () => void;
  onGenerate: () => void;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  scenario,
  templateType,
  options,
  onEdit,
  onGenerate
}) => {
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showTerminologyHelp, setShowTerminologyHelp] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // FIX: Use EnhancedCashFlowReportService singleton instance
  const reportService = EnhancedCashFlowReportService.getInstance();

  useEffect(() => {
    generatePreview();
  }, [scenario, templateType, options]);

  const generatePreview = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Generate enhanced HTML preview
      const result = await reportService.generateReportPreview(
        scenario.id,
        templateType,
        options
      );

      if (result.success && result.htmlContent) {
        // Enhance the HTML with inline explanations
        const enhancedContent = enhanceContentWithExplanations(result.htmlContent);
        setPreviewContent(enhancedContent);
      } else {
        throw new Error(result.error || 'Preview generation failed');
      }

    } catch (err) {
      console.error('Error generating preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const updateIframeHeight = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
    if (!doc) return;

    const nextHeight = Math.max(
      doc.body?.scrollHeight || 0,
      doc.documentElement?.scrollHeight || 0
    );

    if (nextHeight > 0) {
      setContentHeight(nextHeight);
    }
  }, []);

  useEffect(() => {
    if (!previewContent) return;
    const timeout = setTimeout(updateIframeHeight, 100);
    return () => clearTimeout(timeout);
  }, [previewContent, updateIframeHeight]);

  // Add explanatory tooltips and glossary terms to the content
  const enhanceContentWithExplanations = (html: string): string => {
    const glossary = {
      'portfolio': 'Your total investment holdings across all asset classes including pensions, ISAs, and general investments',
      'teams': 'Investment management groups or advisor teams responsible for different aspects of your financial planning',
      'real terms': 'Values adjusted for inflation to show purchasing power in today\'s money',
      'sequence risk': 'The risk of experiencing poor returns early in retirement when withdrawals are being made',
      'sustainability': 'How long your portfolio can support your planned withdrawals without running out',
      'monte carlo': 'Statistical simulation that runs thousands of scenarios to estimate probability of success'
    };

    let enhanced = html;
    
    // Add glossary section
    const glossaryHtml = `
      <div class="glossary-section" style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <h4 style="margin-bottom: 10px; color: #1f2937;">Key Terms Explained</h4>
        ${Object.entries(glossary).map(([term, definition]) => `
          <div style="margin-bottom: 8px;">
            <strong style="color: #3b82f6;">${term.charAt(0).toUpperCase() + term.slice(1)}:</strong>
            <span style="color: #6b7280;"> ${definition}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Insert glossary before the closing body tag or at the end
    enhanced = enhanced.replace('</body>', glossaryHtml + '</body>');
    if (!enhanced.includes('</body>')) {
      enhanced += glossaryHtml;
    }

    return enhanced;
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);
  const scaledHeight = contentHeight ? contentHeight * (zoomLevel / 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Preview Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-gray-600" />
          <span className="font-medium">Report Preview</span>
          <Badge variant="outline" className="ml-2">
            {templateType.charAt(0).toUpperCase() + templateType.slice(1)}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowTerminologyHelp(!showTerminologyHelp)}
            title="Show terminology help"
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 border rounded-lg p-1">
            <Button size="sm" variant="ghost" onClick={handleZoomOut} disabled={zoomLevel <= 50}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="px-2 text-sm font-medium min-w-[60px] text-center">
              {zoomLevel}%
            </span>
            <Button size="sm" variant="ghost" onClick={handleZoomIn} disabled={zoomLevel >= 200}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleResetZoom}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-1" />
            Edit Options
          </Button>
          <Button size="sm" onClick={onGenerate}>
            <Download className="w-4 h-4 mr-1" />
            Generate PDF
          </Button>
        </div>
      </div>

      {/* Terminology Help Panel */}
      {showTerminologyHelp && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <h4 className="font-medium text-blue-900 mb-2">Understanding Your Report</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <strong className="text-blue-800">Portfolio:</strong>
              <span className="text-blue-700"> All your investments combined</span>
            </div>
            <div>
              <strong className="text-blue-800">Real Terms:</strong>
              <span className="text-blue-700"> Adjusted for inflation</span>
            </div>
            <div>
              <strong className="text-blue-800">Sustainability:</strong>
              <span className="text-blue-700"> How long funds will last</span>
            </div>
            <div>
              <strong className="text-blue-800">Risk Metrics:</strong>
              <span className="text-blue-700"> Likelihood of various outcomes</span>
            </div>
          </div>
        </div>
      )}

      {/* Preview Content */}
      <div className="flex-1 bg-gray-100 p-4 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Generating enhanced preview...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 text-center">
                <p className="text-red-800 font-medium mb-2">Preview Error</p>
                <p className="text-red-600 text-sm">{error}</p>
                <Button size="sm" variant="outline" onClick={generatePreview} className="mt-4">
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-lg w-full max-w-none overflow-x-auto">
            <div 
              className="mx-auto bg-white"
              style={{
                width: '100%',
                maxWidth: '900px',
                minHeight: '297mm',
                height: scaledHeight ? `${scaledHeight}px` : '297mm',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}
            >
              <div
                style={{
                  width: '100%',
                  transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none',
                  transformOrigin: 'top center'
                }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={previewContent}
                  onLoad={updateIframeHeight}
                  className="w-full border-0"
                  style={{ height: contentHeight ? `${contentHeight}px` : '297mm' }}
                  title="Report Preview"
                  sandbox="allow-same-origin allow-scripts allow-modals allow-popups"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Footer with Context */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <strong>Scenario:</strong> {scenario.scenarioName} • 
            <strong> Type:</strong> {scenario.scenarioType} • 
            <strong> Years:</strong> {scenario.projectionYears}
          </div>
          <div>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};
