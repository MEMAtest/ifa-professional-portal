// src/services/EnhancedChartService.ts - FIXED
// Remove canvas, use browser-only approach with proper Supabase typing

import type { CashFlowProjection, CashFlowScenario } from '@/types/cashflow';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/db';

export interface ChartConfig {
  type: 'line' | 'bar' | 'doughnut' | 'area' | 'radar';
  title: string;
  width: number;
  height: number;
  backgroundColor?: string;
  responsive?: boolean;
  theme?: 'light' | 'dark';
  animations?: boolean;
}

export interface ChartImageResult {
  base64: string;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  url?: string;
}

export class EnhancedChartService {
  private supabase: SupabaseClient<Database>;
  private static instance: EnhancedChartService;
  private chartCache = new Map<string, ChartImageResult>();

  constructor() {
    this.supabase = createClient();
  }

  public static getInstance(): EnhancedChartService {
    if (!EnhancedChartService.instance) {
      EnhancedChartService.instance = new EnhancedChartService();
    }
    return EnhancedChartService.instance;
  }

  /**
   * Generate portfolio growth chart - SIMPLIFIED VERSION
   */
  async generatePortfolioGrowthChart(
    projections: CashFlowProjection[],
    config: ChartConfig = {
      type: 'line',
      title: 'Portfolio Breakdown Over Time',
      width: 800,
      height: 400,
      theme: 'light',
      animations: false
    }
  ): Promise<ChartImageResult> {
    // Generate simple SVG chart instead of Canvas
    const svgChart = this.createSVGChart(projections, config, 'portfolio');
    return this.svgToImageResult(svgChart, config);
  }

  /**
   * Generate income vs expenses chart
   */
  async generateIncomeExpenseChart(
    projections: CashFlowProjection[],
    config: ChartConfig = {
      type: 'bar',
      title: 'Income vs Expenses Over Time',
      width: 800,
      height: 400,
      theme: 'light',
      animations: false
    }
  ): Promise<ChartImageResult> {
    const svgChart = this.createSVGChart(projections, config, 'income_expense');
    return this.svgToImageResult(svgChart, config);
  }

  /**
   * Generate asset allocation pie chart
   */
  async generateAssetAllocationChart(
    scenario: CashFlowScenario,
    config: ChartConfig = {
      type: 'doughnut',
      title: 'Asset Allocation',
      width: 600,
      height: 400,
      theme: 'light',
      animations: false
    }
  ): Promise<ChartImageResult> {
    const svgChart = this.createSVGPieChart(scenario, config);
    return this.svgToImageResult(svgChart, config);
  }

  /**
   * Generate risk analysis radar chart
   */
  async generateRiskAnalysisChart(
    riskMetrics: any,
    config: ChartConfig = {
      type: 'radar',
      title: 'Risk Analysis Profile',
      width: 600,
      height: 400,
      theme: 'light',
      animations: false
    }
  ): Promise<ChartImageResult> {
    const svgChart = this.createSVGRadarChart(riskMetrics, config);
    return this.svgToImageResult(svgChart, config);
  }

  /**
   * Batch generate multiple charts with progress tracking
   */
  async generateMultipleCharts(
    projectionResult: any,
    scenario: CashFlowScenario,
    chartTypes: string[],
    onProgress?: (progress: number, currentChart: string) => void
  ): Promise<ChartImageResult[]> {
    const results: ChartImageResult[] = [];
    const total = chartTypes.length;

    for (let i = 0; i < chartTypes.length; i++) {
      const chartType = chartTypes[i];
      onProgress?.(Math.round((i / total) * 100), chartType);

      try {
        let result: ChartImageResult;

        switch (chartType) {
          case 'portfolio':
            result = await this.generatePortfolioGrowthChart(projectionResult.projections);
            break;
          case 'income_expense':
            result = await this.generateIncomeExpenseChart(projectionResult.projections);
            break;
          case 'asset_allocation':
            result = await this.generateAssetAllocationChart(scenario);
            break;
          case 'risk_analysis':
            result = await this.generateRiskAnalysisChart(projectionResult.summary.riskMetrics);
            break;
          default:
            continue;
        }

        results.push(result);
      } catch (error) {
        console.error(`Error generating ${chartType} chart:`, error);
        // Continue with other charts even if one fails
      }
    }

    onProgress?.(100, 'Complete');
    return results;
  }

  /**
   * Save chart image to Supabase storage
   */
  async saveChartToStorage(
    chartResult: ChartImageResult,
    fileName: string,
    clientId: string
  ): Promise<string> {
    try {
      // Validate Supabase client is initialized
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      const filePath = `charts/${clientId}/${fileName}.png`;
      
      // FIXED: Now TypeScript knows supabase has storage property
      const { error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, chartResult.blob, {
          contentType: chartResult.mimeType,
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Failed to save chart: ${uploadError.message}`);
      }

      // FIXED: Now TypeScript knows supabase has storage property
      const { data: urlData } = await this.supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);

      const signedUrl = urlData?.signedUrl || '';
      chartResult.url = signedUrl;

      return signedUrl;
    } catch (error) {
      console.error('Error saving chart to storage:', error);
      throw new Error(`Failed to save chart: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create SVG chart from projections
   */
  private createSVGChart(projections: CashFlowProjection[], config: ChartConfig, type: string): string {
    const { width, height, title, theme } = config;
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1f2937' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';

    // Simple SVG chart implementation
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="${bgColor}"/>`;
    
    // Title
    svg += `<text x="${width/2}" y="30" text-anchor="middle" fill="${textColor}" font-size="18" font-weight="bold">${title}</text>`;
    
    // Chart area
    const chartX = 60;
    const chartY = 60;
    const chartWidth = width - 120;
    const chartHeight = height - 120;
    const hasData = projections && projections.length > 0;

    const maxValue = hasData ? (() => {
      if (type === 'income_expense') {
        return Math.max(
          ...projections.map((p) => Math.max(p.totalIncome || 0, p.totalExpenses || 0)),
          1
        );
      }
      if (type === 'portfolio') {
        return Math.max(
          ...projections.map((p) => (p.pensionPotValue || 0) + (p.investmentPortfolio || 0) + (p.cashSavings || 0)),
          1
        );
      }
      return Math.max(...projections.map((p) => p.totalAssets || 0), 1);
    })() : 0;

    const formatValue = (value: number): string => {
      if (!Number.isFinite(value)) return 'GBP 0';
      if (value >= 1_000_000) return `GBP ${(value / 1_000_000).toFixed(1)}m`;
      if (value >= 1_000) return `GBP ${(value / 1_000).toFixed(0)}k`;
      return `GBP ${Math.round(value)}`;
    };

    // Grid
    svg += `<g stroke="${gridColor}" stroke-width="0.5">`;
    for (let i = 0; i <= 10; i++) {
      const y = chartY + (chartHeight * i / 10);
      svg += `<line x1="${chartX}" y1="${y}" x2="${chartX + chartWidth}" y2="${y}"/>`;
    }
    svg += `</g>`;

    if (hasData) {
      const yLabelSteps = 4;
      for (let i = 0; i <= yLabelSteps; i++) {
        const value = maxValue * (1 - i / yLabelSteps);
        const y = chartY + (chartHeight * i / yLabelSteps);
        svg += `<text x="${chartX - 10}" y="${y + 4}" text-anchor="end" fill="${textColor}" font-size="11">${formatValue(value)}</text>`;
      }

      const labelIndices = Array.from(new Set([0, Math.floor((projections.length - 1) / 2), projections.length - 1]));
      labelIndices.forEach((index) => {
        const projection = projections[index];
        const x = chartX + (chartWidth * index / Math.max(1, projections.length - 1));
        svg += `<text x="${x}" y="${chartY + chartHeight + 20}" text-anchor="middle" fill="${textColor}" font-size="11">Year ${projection.projectionYear + 1}</text>`;
      });
    }
    
    // Data points
    if (hasData) {
      const xPoints = projections.map((_, i) => chartX + (chartWidth * i / Math.max(1, projections.length - 1)));
      const toY = (value: number) => chartY + chartHeight - (chartHeight * value / maxValue);

      if (type === 'portfolio') {
        const pensionSeries = projections.map((p) => p.pensionPotValue || 0);
        const investmentSeries = projections.map((p) => p.investmentPortfolio || 0);
        const cashSeries = projections.map((p) => p.cashSavings || 0);

        const pensionTop = pensionSeries;
        const pensionBottom = pensionSeries.map(() => 0);
        const investmentTop = pensionSeries.map((pension, i) => pension + investmentSeries[i]);
        const investmentBottom = pensionSeries;
        const cashTop = investmentTop.map((value, i) => value + cashSeries[i]);
        const cashBottom = investmentTop;

        const buildAreaPath = (topValues: number[], bottomValues: number[]) => {
          let path = `M ${xPoints[0]} ${toY(topValues[0])}`;
          for (let i = 1; i < xPoints.length; i++) {
            path += ` L ${xPoints[i]} ${toY(topValues[i])}`;
          }
          for (let i = xPoints.length - 1; i >= 0; i--) {
            path += ` L ${xPoints[i]} ${toY(bottomValues[i])}`;
          }
          return `${path} Z`;
        };

        svg += `<path d="${buildAreaPath(pensionTop, pensionBottom)}" fill="#7c3aed" fill-opacity="0.5" stroke="#7c3aed" stroke-width="1"/>`;
        svg += `<path d="${buildAreaPath(investmentTop, investmentBottom)}" fill="#2563eb" fill-opacity="0.45" stroke="#2563eb" stroke-width="1"/>`;
        svg += `<path d="${buildAreaPath(cashTop, cashBottom)}" fill="#f59e0b" fill-opacity="0.4" stroke="#f59e0b" stroke-width="1"/>`;

        const legendItems = [
          { label: 'Pensions', color: '#7c3aed' },
          { label: 'Investments', color: '#2563eb' },
          { label: 'Cash', color: '#f59e0b' }
        ];
        legendItems.forEach((item, index) => {
          const lx = chartX + chartWidth - 110;
          const ly = chartY + 16 + index * 18;
          svg += `<rect x="${lx}" y="${ly - 10}" width="10" height="10" fill="${item.color}"/>`;
          svg += `<text x="${lx + 14}" y="${ly - 1}" fill="${textColor}" font-size="11">${item.label}</text>`;
        });
      }

      if (type === 'income_expense') {
        projections.forEach((p, i) => {
          const x = chartX + (chartWidth * i / projections.length);
          const barWidth = chartWidth / projections.length * 0.85;
          
          const incomeHeight = (chartHeight * (p.totalIncome || 0) / maxValue);
          const expenseHeight = (chartHeight * (p.totalExpenses || 0) / maxValue);
          
          svg += `<rect x="${x}" y="${chartY + chartHeight - incomeHeight}" width="${barWidth/2}" height="${incomeHeight}" fill="#10b981"/>`;
          svg += `<rect x="${x + barWidth/2}" y="${chartY + chartHeight - expenseHeight}" width="${barWidth/2}" height="${expenseHeight}" fill="#ef4444"/>`;
        });
      }
    }
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Create SVG pie chart
   */
  private createSVGPieChart(scenario: CashFlowScenario, config: ChartConfig): string {
    const { width, height, title, theme } = config;
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1f2937' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#374151';
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="${bgColor}"/>`;
    svg += `<text x="${centerX}" y="30" text-anchor="middle" fill="${textColor}" font-size="18" font-weight="bold">${title}</text>`;
    
    // Pie slices
    const allocations = [
      { label: 'Equities', value: scenario.equityAllocation || 0, color: '#3b82f6' },
      { label: 'Bonds', value: scenario.bondAllocation || 0, color: '#10b981' },
      { label: 'Cash', value: 100 - (scenario.equityAllocation || 0) - (scenario.bondAllocation || 0), color: '#f59e0b' }
    ];
    
    let currentAngle = -90;
    allocations.forEach(slice => {
      const angle = (slice.value / 100) * 360;
      const endAngle = currentAngle + angle;
      
      const x1 = centerX + radius * Math.cos(currentAngle * Math.PI / 180);
      const y1 = centerY + radius * Math.sin(currentAngle * Math.PI / 180);
      const x2 = centerX + radius * Math.cos(endAngle * Math.PI / 180);
      const y2 = centerY + radius * Math.sin(endAngle * Math.PI / 180);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      svg += `<path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${slice.color}" stroke="${bgColor}" stroke-width="2"/>`;
      
      currentAngle = endAngle;
    });
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Create SVG radar chart
   */
  private createSVGRadarChart(riskMetrics: any, config: ChartConfig): string {
    const { width, height, title, theme } = config;
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1f2937' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#374151';
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="${bgColor}"/>`;
    svg += `<text x="${width/2}" y="30" text-anchor="middle" fill="${textColor}" font-size="18" font-weight="bold">${title}</text>`;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    const metricLabels = [
      { key: 'shortfallRisk', label: 'Shortfall' },
      { key: 'longevityRisk', label: 'Longevity' },
      { key: 'inflationRisk', label: 'Inflation' },
      { key: 'sequenceRisk', label: 'Sequence' }
    ];

    const toScore = (value: any): number => {
      if (typeof value === 'number') return Math.min(1, Math.max(0, value));
      switch (String(value).toLowerCase()) {
        case 'high':
          return 0.9;
        case 'medium':
          return 0.6;
        case 'low':
          return 0.3;
        default:
          return 0.5;
      }
    };

    const axisCount = metricLabels.length;

    [0.33, 0.66, 1].forEach((scale) => {
      let ringPath = '';
      for (let i = 0; i < axisCount; i++) {
        const angle = (i * 2 * Math.PI) / axisCount - Math.PI / 2;
        const x = centerX + radius * scale * Math.cos(angle);
        const y = centerY + radius * scale * Math.sin(angle);
        ringPath += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
      }
      ringPath += 'Z';
      svg += `<path d="${ringPath}" fill="none" stroke="${textColor}" stroke-width="0.5" opacity="0.4"/>`;
    });

    metricLabels.forEach((metric, index) => {
      const angle = (index * 2 * Math.PI) / axisCount - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      svg += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="${textColor}" stroke-width="1"/>`;
      svg += `<text x="${centerX + (radius + 14) * Math.cos(angle)}" y="${centerY + (radius + 14) * Math.sin(angle)}" text-anchor="middle" fill="${textColor}" font-size="11">${metric.label}</text>`;
    });

    let polygonPath = '';
    metricLabels.forEach((metric, index) => {
      const score = toScore(riskMetrics?.[metric.key]);
      const angle = (index * 2 * Math.PI) / axisCount - Math.PI / 2;
      const x = centerX + radius * score * Math.cos(angle);
      const y = centerY + radius * score * Math.sin(angle);
      polygonPath += `${index === 0 ? 'M' : 'L'} ${x} ${y} `;
    });
    polygonPath += 'Z';

    svg += `<path d="${polygonPath}" fill="#3b82f6" fill-opacity="0.35" stroke="#2563eb" stroke-width="2"/>`;
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Convert SVG to image result
   */
  private async svgToImageResult(svgString: string, config: ChartConfig): Promise<ChartImageResult> {
    // Convert SVG string to blob
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    
    // Convert to base64
    const base64 = await this.blobToBase64(blob);
    
    return {
      base64,
      blob,
      mimeType: 'image/svg+xml',
      width: config.width,
      height: config.height
    };
  }

  /**
   * Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Export singleton instance
export const enhancedChartService = EnhancedChartService.getInstance();
