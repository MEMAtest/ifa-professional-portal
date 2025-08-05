// src/services/EnhancedChartService.ts - SIMPLE FIX
// Remove canvas, use browser-only approach

import type { CashFlowProjection, CashFlowScenario } from '@/types/cashflow';
import { createBrowserClient } from '@supabase/ssr';

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
  private supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  private static instance: EnhancedChartService;
  private chartCache = new Map<string, ChartImageResult>();

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
      title: 'Portfolio Growth Over Time',
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
      const filePath = `charts/${clientId}/${fileName}.png`;
      
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

  // PRIVATE HELPER METHODS - CREATE SIMPLE SVG CHARTS

  private createSVGChart(projections: CashFlowProjection[], config: ChartConfig, type: string): string {
    const { width, height, title } = config;
    const margin = { top: 60, right: 40, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    if (type === 'portfolio') {
      return this.createLineChart(projections, config, margin, chartWidth, chartHeight);
    } else if (type === 'income_expense') {
      return this.createBarChart(projections, config, margin, chartWidth, chartHeight);
    }

    return this.createFallbackChart(config);
  }

  private createLineChart(projections: CashFlowProjection[], config: ChartConfig, margin: any, chartWidth: number, chartHeight: number): string {
    const maxAssets = Math.max(...projections.map(p => p.totalAssets));
    const maxYear = projections.length - 1;

    let pathData = '';
    projections.forEach((p, i) => {
      const x = (i / maxYear) * chartWidth;
      const y = chartHeight - (p.totalAssets / maxAssets) * chartHeight;
      pathData += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });

    return `
      <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <g transform="translate(${margin.left},${margin.top})">
          <text x="${chartWidth/2}" y="-20" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">${config.title}</text>
          <path d="${pathData}" stroke="#007acc" stroke-width="2" fill="none"/>
          <g transform="translate(0,${chartHeight})">
            <line x1="0" y1="0" x2="${chartWidth}" y2="0" stroke="#ccc"/>
            <text x="${chartWidth/2}" y="40" text-anchor="middle" font-size="12" fill="#666">Years</text>
          </g>
          <g>
            <line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="#ccc"/>
            <text x="-60" y="${chartHeight/2}" text-anchor="middle" font-size="12" fill="#666" transform="rotate(-90,-60,${chartHeight/2})">Portfolio Value (£)</text>
          </g>
        </g>
      </svg>
    `;
  }

  private createBarChart(projections: CashFlowProjection[], config: ChartConfig, margin: any, chartWidth: number, chartHeight: number): string {
    // Show every 5th year to avoid crowding
    const filteredProjections = projections.filter((_, index) => index % 5 === 0);
    const maxValue = Math.max(...filteredProjections.flatMap(p => [p.totalIncome, p.totalExpenses]));
    const barWidth = chartWidth / (filteredProjections.length * 2 + 1);

    let bars = '';
    filteredProjections.forEach((p, i) => {
      const x = i * barWidth * 2 + barWidth * 0.5;
      const incomeHeight = (p.totalIncome / maxValue) * chartHeight;
      const expenseHeight = (p.totalExpenses / maxValue) * chartHeight;

      bars += `
        <rect x="${x}" y="${chartHeight - incomeHeight}" width="${barWidth * 0.8}" height="${incomeHeight}" fill="#28a745"/>
        <rect x="${x + barWidth}" y="${chartHeight - expenseHeight}" width="${barWidth * 0.8}" height="${expenseHeight}" fill="#dc3545"/>
      `;
    });

    return `
      <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <g transform="translate(${margin.left},${margin.top})">
          <text x="${chartWidth/2}" y="-20" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">${config.title}</text>
          ${bars}
          <g transform="translate(0,${chartHeight})">
            <line x1="0" y1="0" x2="${chartWidth}" y2="0" stroke="#ccc"/>
            <text x="${chartWidth/2}" y="40" text-anchor="middle" font-size="12" fill="#666">Years</text>
          </g>
          <g>
            <line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="#ccc"/>
            <text x="-60" y="${chartHeight/2}" text-anchor="middle" font-size="12" fill="#666" transform="rotate(-90,-60,${chartHeight/2})">Amount (£)</text>
          </g>
          <g transform="translate(${chartWidth + 20}, 20)">
            <rect x="0" y="0" width="15" height="10" fill="#28a745"/>
            <text x="20" y="8" font-size="10" fill="#333">Income</text>
            <rect x="0" y="15" width="15" height="10" fill="#dc3545"/>
            <text x="20" y="23" font-size="10" fill="#333">Expenses</text>
          </g>
        </g>
      </svg>
    `;
  }

  private createSVGPieChart(scenario: CashFlowScenario, config: ChartConfig): string {
    const centerX = config.width / 2;
    const centerY = config.height / 2;
    const radius = Math.min(config.width, config.height) / 3;

    const data = [
      { name: 'Equities', value: scenario.equityAllocation || 60, color: '#007acc' },
      { name: 'Bonds', value: scenario.bondAllocation || 30, color: '#28a745' },
      { name: 'Cash', value: scenario.cashAllocation || 5, color: '#ffc107' },
      { name: 'Alternatives', value: scenario.alternativeAllocation || 5, color: '#6f42c1' }
    ];

    let paths = '';
    let legends = '';
    let currentAngle = 0;

    data.forEach((item, index) => {
      const angle = (item.value / 100) * 2 * Math.PI;
      const x1 = centerX + radius * Math.cos(currentAngle);
      const y1 = centerY + radius * Math.sin(currentAngle);
      const x2 = centerX + radius * Math.cos(currentAngle + angle);
      const y2 = centerY + radius * Math.sin(currentAngle + angle);
      const largeArc = angle > Math.PI ? 1 : 0;

      paths += `
        <path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z"
              fill="${item.color}" stroke="#fff" stroke-width="2"/>
      `;

      legends += `
        <g transform="translate(20, ${20 + index * 25})">
          <rect x="0" y="0" width="15" height="15" fill="${item.color}"/>
          <text x="20" y="12" font-size="12" fill="#333">${item.name} (${item.value}%)</text>
        </g>
      `;

      currentAngle += angle;
    });

    return `
      <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <text x="${centerX}" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">${config.title}</text>
        ${paths}
        ${legends}
      </svg>
    `;
  }

  private createSVGRadarChart(riskMetrics: any, config: ChartConfig): string {
    // Simple fallback for radar chart
    return this.createFallbackChart(config);
  }

  private createFallbackChart(config: ChartConfig): string {
    return `
      <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="#6c757d">
          ${config.title}
        </text>
      </svg>
    `;
  }

  private svgToImageResult(svgString: string, config: ChartConfig): ChartImageResult {
    const base64 = `data:image/svg+xml;base64,${btoa(svgString)}`;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });

    return {
      base64,
      blob,
      mimeType: 'image/svg+xml',
      width: config.width,
      height: config.height
    };
  }

  // Cache management
  clearCache(): void {
    this.chartCache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.chartCache.size,
      keys: Array.from(this.chartCache.keys())
    };
  }
}