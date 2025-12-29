import type { CashFlowProjection, CashFlowScenario } from '@/types/cashflow';
import type { ChartImageResult } from '../EnhancedChartService';
import type { EnhancedReportOptions } from './types';
import { getFontSize } from './styles';
import { formatCurrency, formatPercentage, getLocalizedText } from './formatters';

export const buildChartsSection = (
  chartResults: ChartImageResult[],
  options: EnhancedReportOptions
): string => {
  if (!chartResults.length) return '';

  const isHighContrast = options.accessibility?.highContrast;
  const fontSize = options.accessibility?.fontSize || 'medium';

  let chartsHtml = `<div class="charts-section" style="margin: 20px 0;">`;
  chartsHtml += `<h3 style="color: ${isHighContrast ? '#000' : '#333'}; margin-bottom: 15px; font-size: ${getFontSize(fontSize, 'h3')};">`;
  chartsHtml += getLocalizedText('ANALYSIS_CHARTS', options.locale);
  chartsHtml += '</h3>';

  chartResults.forEach((result, index) => {
    const chartType = options.chartTypes?.[index] || 'chart';
    const title = (chartType || 'chart').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    chartsHtml += `
        <div style="margin: 20px 0; text-align: center; page-break-inside: avoid;">
          <h4 style="margin-bottom: 10px; color: ${isHighContrast ? '#000' : '#007acc'}; font-size: ${getFontSize(fontSize, 'h4')};">${title}</h4>
          <img 
            src="${result.url || result.base64}" 
            alt="${title} showing financial data visualization" 
            style="width: 100%; max-width: 100%; height: auto; display: block; margin: 0 auto; border: 1px solid ${isHighContrast ? '#000' : '#ddd'}; border-radius: 4px;"
            role="img"
            aria-describedby="chart-${index}-desc"
          />
          ${options.accessibility?.screenReader ? `<div id="chart-${index}-desc" class="sr-only">Chart showing ${title.toLowerCase()} with detailed financial projections</div>` : ''}
        </div>
      `;
  });

  chartsHtml += '</div>';
  return chartsHtml;
};

export const buildAriaLabels = (locale?: string): Record<string, string> => {
  return {
    REPORT_TITLE: getLocalizedText('FINANCIAL_REPORT', locale),
    CHART_SECTION: getLocalizedText('CHARTS_AND_VISUALIZATIONS', locale),
    DATA_TABLE: getLocalizedText('FINANCIAL_DATA_TABLE', locale),
    RISK_ANALYSIS: getLocalizedText('RISK_ANALYSIS_SECTION', locale)
  };
};

export const buildCustomCSS = (options: EnhancedReportOptions): string => {
  const customizations = options.customizations || {};
  const accessibility = options.accessibility || {
    highContrast: false,
    fontSize: 'medium' as const,
    screenReader: false
  };

  let css = '';

  if (accessibility.highContrast) {
    css += `
        body { background: #fff !important; color: #000 !important; }
        .chart-container { border: 2px solid #000 !important; }
        h1, h2, h3, h4, h5, h6 { color: #000 !important; }
      `;
  }

  if (customizations.colors) {
    Object.entries(customizations.colors).forEach(([property, color]) => {
      css += `--${property}: ${color}; `;
    });
  }

  return css;
};

export const buildProjectionTable = (projections: CashFlowProjection[], locale?: string): string => {
  if (!projections.length) return '';

  const headers = {
    year: getLocalizedText('YEAR', locale),
    age: getLocalizedText('AGE', locale),
    income: getLocalizedText('TOTAL_INCOME', locale),
    expenses: getLocalizedText('TOTAL_EXPENSES', locale),
    portfolio: getLocalizedText('PORTFOLIO_VALUE', locale),
    surplus: getLocalizedText('ANNUAL_SURPLUS', locale)
  };

  let table = `
      <table class="projection-table" style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">${headers.year}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${headers.age}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${headers.income}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${headers.expenses}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${headers.portfolio}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${headers.surplus}</th>
          </tr>
        </thead>
        <tbody>
    `;

  projections.forEach((projection, index) => {
    table += `
        <tr style="${index % 2 === 0 ? 'background-color: #f8f9fa;' : ''}">
          <td style="border: 1px solid #dee2e6; padding: 8px;">${projection.projectionYear}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${projection.clientAge}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${formatCurrency(projection.totalIncome, locale)}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${formatCurrency(projection.totalExpenses, locale)}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${formatCurrency(projection.totalAssets, locale)}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${formatCurrency(projection.annualSurplusDeficit, locale)}</td>
        </tr>
      `;
  });

  table += `</tbody></table>`;
  return table;
};

export const buildAssumptionsTable = (scenario: CashFlowScenario, locale?: string): string => {
  const labels = {
    inflation: getLocalizedText('INFLATION_RATE', locale),
    equity: getLocalizedText('REAL_EQUITY_RETURN', locale),
    bond: getLocalizedText('REAL_BOND_RETURN', locale),
    cash: getLocalizedText('REAL_CASH_RETURN', locale),
    retirement: getLocalizedText('RETIREMENT_AGE', locale),
    life: getLocalizedText('LIFE_EXPECTANCY', locale)
  };

  return `
      <table class="assumptions-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left;">${getLocalizedText('ASSUMPTION', locale)}</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${getLocalizedText('VALUE', locale)}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.inflation}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${formatPercentage(scenario.inflationRate, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.equity}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${formatPercentage(scenario.realEquityReturn, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.bond}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${formatPercentage(scenario.realBondReturn, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.cash}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${formatPercentage(scenario.realCashReturn, locale)}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.retirement}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${scenario.retirementAge}</td></tr>
          <tr><td style="border: 1px solid #dee2e6; padding: 8px;">${labels.life}</td><td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">${scenario.lifeExpectancy}</td></tr>
        </tbody>
      </table>
    `;
};

export const buildRiskAnalysisSection = (riskMetrics: any, locale?: string): string => {
  const labels = {
    shortfall: getLocalizedText('SHORTFALL_RISK', locale),
    longevity: getLocalizedText('LONGEVITY_RISK', locale),
    inflation: getLocalizedText('INFLATION_RISK', locale),
    sequence: getLocalizedText('SEQUENCE_RISK', locale),
    summary: getLocalizedText('RISK_ANALYSIS_SUMMARY', locale)
  };

  return `
      <div class="risk-analysis-section" style="margin: 20px 0;">
        <h4 style="color: #333; margin-bottom: 15px;">${labels.summary}</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="padding: 10px; border: 1px solid #dee2e6; border-radius: 4px;">
            <strong>${labels.shortfall}:</strong> ${String(riskMetrics.shortfallRisk)}
          </div>
          <div style="padding: 10px; border: 1px solid #dee2e6; border-radius: 4px;">
            <strong>${labels.longevity}:</strong> ${String(riskMetrics.longevityRisk)}
          </div>
          <div style="padding: 10px; border: 1px solid #dee2e6; border-radius: 4px;">
            <strong>${labels.inflation}:</strong> ${String(riskMetrics.inflationRisk)}
          </div>
          <div style="padding: 10px; border: 1px solid #dee2e6; border-radius: 4px;">
            <strong>${labels.sequence}:</strong> ${String(riskMetrics.sequenceRisk)}
          </div>
        </div>
      </div>
    `;
};

export const buildTimelineEvents = (scenario: CashFlowScenario): string => {
  const events: Array<{ label: string; age: number }> = [];

  if (scenario.retirementAge) {
    events.push({ label: 'Retirement begins', age: scenario.retirementAge });
  }

  if (scenario.statePensionAge) {
    events.push({ label: 'State pension starts', age: scenario.statePensionAge });
  }

  if (scenario.mortgageBalance > 0 && scenario.mortgagePayment > 0) {
    const yearsToPayoff = Math.ceil(scenario.mortgageBalance / scenario.mortgagePayment);
    const payoffAge = scenario.clientAge + yearsToPayoff;
    events.push({ label: 'Mortgage paid off', age: payoffAge });
  }

  const capitalEvents = (scenario.vulnerabilityAdjustments as any)?.capitalExpenditures
    || (scenario.vulnerabilityAdjustments as any)?.capitalEvents;
  if (Array.isArray(capitalEvents)) {
    capitalEvents.forEach((event: any) => {
      if (event?.age && event?.label) {
        events.push({ label: event.label, age: event.age });
      }
    });
  }

  const sorted = events
    .filter((event) => Number.isFinite(event.age))
    .sort((a, b) => a.age - b.age);

  if (!sorted.length) {
    return '<div class="timeline-item"><div class="timeline-content">No key milestones recorded.</div></div>';
  }

  return sorted
    .map(
      (event) => `
        <div class="timeline-item">
          <div class="timeline-date">Age ${event.age}</div>
          <div class="timeline-content">${event.label}</div>
        </div>
      `
    )
    .join('');
};
