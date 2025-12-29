import type { EnhancedReportOptions, ReportTemplateType } from './types';
import { getBaseStyles, getFontSize } from './styles';

export const generateDynamicTemplate = (
  templateType: ReportTemplateType,
  options: EnhancedReportOptions
): string => {
  switch (templateType) {
    case 'cashflow':
      return generateCashFlowTemplate(options);
    case 'suitability':
      return generateSuitabilityTemplate(options);
    case 'review':
      return generateReviewTemplate(options);
    default:
      return generateCashFlowTemplate(options);
  }
};

export const generateCashFlowTemplate = (options: EnhancedReportOptions): string => {
  const { theme = 'light', accessibility } = options;
  const isHighContrast = accessibility?.highContrast || false;
  const fontSize = accessibility?.fontSize || 'medium';

  return `
<!DOCTYPE html>
<html lang="${options.locale || 'en-GB'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cash Flow Analysis Report - {{CLIENT_NAME}}</title>
  <style>
    /* Base Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${isHighContrast ? '#000' : '#333'};
      background: ${theme === 'dark' ? '#1a1a1a' : '#fff'};
      font-size: ${getFontSize(fontSize, 'body')};
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      background: ${theme === 'dark' ? '#2a2a2a' : '#fff'};
    }
    
    /* Header Styles */
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid ${isHighContrast ? '#000' : '#007acc'};
    }
    
    .header h1 {
      font-size: ${getFontSize(fontSize, 'h1')};
      color: ${isHighContrast ? '#000' : '#007acc'};
      margin-bottom: 10px;
      font-weight: 700;
    }
    
    .header .subtitle {
      font-size: ${getFontSize(fontSize, 'h3')};
      color: ${isHighContrast ? '#000' : '#666'};
      margin-bottom: 20px;
    }
    
    .header-info {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      font-size: ${getFontSize(fontSize, 'small')};
    }
    
    .header-info div {
      text-align: left;
    }
    
    .header-info .label {
      font-weight: 600;
      color: ${isHighContrast ? '#000' : '#555'};
    }
    
    /* Section Styles */
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .section h2 {
      font-size: ${getFontSize(fontSize, 'h2')};
      color: ${isHighContrast ? '#000' : '#007acc'};
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${isHighContrast ? '#000' : '#e0e0e0'};
    }
    
    .section h3 {
      font-size: ${getFontSize(fontSize, 'h3')};
      color: ${isHighContrast ? '#000' : '#333'};
      margin-bottom: 15px;
    }
    
    /* Executive Summary */
    .executive-summary {
      background: ${isHighContrast ? '#f0f0f0' : theme === 'dark' ? '#333' : '#f8f9fa'};
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 40px;
    }
    
    .key-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .metric-card {
      background: ${theme === 'dark' ? '#444' : '#fff'};
      padding: 20px;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .metric-card .value {
      font-size: ${getFontSize(fontSize, 'h2')};
      font-weight: 700;
      color: ${isHighContrast ? '#000' : '#007acc'};
      margin-bottom: 5px;
    }
    
    .metric-card .label {
      font-size: ${getFontSize(fontSize, 'small')};
      color: ${isHighContrast ? '#000' : '#666'};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: ${getFontSize(fontSize, 'small')};
    }
    
    thead {
      background: ${isHighContrast ? '#ddd' : theme === 'dark' ? '#444' : '#f8f9fa'};
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border: 1px solid ${isHighContrast ? '#000' : '#dee2e6'};
    }
    
    th {
      font-weight: 600;
      color: ${isHighContrast ? '#000' : '#333'};
    }
    
    tbody tr:nth-child(even) {
      background: ${isHighContrast ? '#f0f0f0' : theme === 'dark' ? '#333' : '#f8f9fa'};
    }
    
    .number {
      text-align: right;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    /* Charts */
    .chart-container {
      margin: 30px 0;
      text-align: center;
      page-break-inside: avoid;
    }
    
    .chart-container img {
      width: 100%;
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
      border: 1px solid ${isHighContrast ? '#000' : '#dee2e6'};
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .chart-title {
      font-size: ${getFontSize(fontSize, 'h4')};
      color: ${isHighContrast ? '#000' : '#555'};
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    /* Risk Analysis */
    .risk-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    
    .risk-item {
      background: ${theme === 'dark' ? '#333' : '#f8f9fa'};
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid ${isHighContrast ? '#000' : '#007acc'};
    }
    
    .risk-item h4 {
      font-size: ${getFontSize(fontSize, 'h4')};
      color: ${isHighContrast ? '#000' : '#333'};
      margin-bottom: 10px;
    }
    
    .risk-level {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: ${getFontSize(fontSize, 'small')};
      font-weight: 600;
      margin-top: 10px;
    }
    
    .risk-low {
      background: ${isHighContrast ? '#ddd' : '#d4edda'};
      color: ${isHighContrast ? '#000' : '#155724'};
    }
    
    .risk-medium {
      background: ${isHighContrast ? '#ddd' : '#fff3cd'};
      color: ${isHighContrast ? '#000' : '#856404'};
    }
    
    .risk-high {
      background: ${isHighContrast ? '#ddd' : '#f8d7da'};
      color: ${isHighContrast ? '#000' : '#721c24'};
    }
    
    /* Insights */
    .insights-list {
      list-style: none;
      padding: 0;
      margin-top: 20px;
    }
    
    .insights-list li {
      padding: 15px;
      margin-bottom: 10px;
      background: ${theme === 'dark' ? '#333' : '#f8f9fa'};
      border-radius: 6px;
      border-left: 3px solid ${isHighContrast ? '#000' : '#007acc'};
      position: relative;
      padding-left: 40px;
    }
    
    .insights-list li:before {
      content: "✓";
      position: absolute;
      left: 15px;
      color: ${isHighContrast ? '#000' : '#28a745'};
      font-weight: bold;
      font-size: 18px;
    }
    
    /* Footer */
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid ${isHighContrast ? '#000' : '#dee2e6'};
      text-align: center;
      font-size: ${getFontSize(fontSize, 'small')};
      color: ${isHighContrast ? '#000' : '#666'};
    }
    
    /* Print Styles */
    @media print {
      body {
        background: white;
        color: black;
      }
      
      .container {
        padding: 0;
        max-width: 100%;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .chart-container {
        page-break-inside: avoid;
      }
    }
    
    /* Accessibility */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    }
    
    /* Custom CSS */
    {{CUSTOM_CSS}}
  </style>
</head>
<body>
  <div class="container" role="main">
    <!-- Header -->
    <header class="header" role="banner">
      <h1>Cash Flow Analysis Report</h1>
      <div class="subtitle">Comprehensive Financial Projection Analysis</div>
      
      <div class="header-info">
        <div>
          <div class="label">Client</div>
          <div>{{CLIENT_NAME}}</div>
          <div>{{CLIENT_EMAIL}}</div>
        </div>
        <div>
          <div class="label">Report Date</div>
          <div>{{REPORT_DATE}}</div>
        </div>
        <div>
          <div class="label">Prepared By</div>
          <div>{{ADVISOR_NAME}}</div>
          <div>{{FIRM_NAME}}</div>
        </div>
      </div>
    </header>
    
    <!-- Executive Summary -->
    <section class="section executive-summary" aria-labelledby="exec-summary-title">
      <h2 id="exec-summary-title">Executive Summary</h2>
      
      <div class="key-metrics">
        <div class="metric-card">
          <div class="value">{{FINAL_PORTFOLIO_VALUE}}</div>
          <div class="label">Final Portfolio Value (Nominal)</div>
        </div>
        <div class="metric-card">
          <div class="value">{{FINAL_PORTFOLIO_VALUE_REAL}}</div>
          <div class="label">Final Portfolio Value (Real Terms)</div>
        </div>
        <div class="metric-card">
          <div class="value">{{PROJECTION_YEARS}}</div>
          <div class="label">Years Projected</div>
        </div>
        <div class="metric-card">
          <div class="value">{{AVERAGE_ANNUAL_RETURN}}</div>
          <div class="label">Avg Annual Return</div>
        </div>
        <div class="metric-card">
          <div class="value">{{SUSTAINABILITY_RATING}}/10</div>
          <div class="label">Sustainability Score</div>
        </div>
      </div>
      
      <h3>Key Findings</h3>
      <ul class="insights-list">
        {{KEY_INSIGHTS}}
      </ul>
    </section>
    
    <!-- Charts Section -->
    {{#if INCLUDE_CHARTS}}
    <section class="section" aria-labelledby="charts-title">
      <h2 id="charts-title">Visual Analysis</h2>
      {{CHARTS_SECTION}}
    </section>
    {{/if}}
    
    <!-- Assumptions Section -->
    {{#if INCLUDE_ASSUMPTIONS}}
    <section class="section" aria-labelledby="assumptions-title">
      <h2 id="assumptions-title">Assumptions & Parameters</h2>
      {{ASSUMPTIONS_TABLE}}
    </section>
    {{/if}}
    
    <!-- Risk Analysis Section -->
    {{#if INCLUDE_RISK_ANALYSIS}}
    <section class="section" aria-labelledby="risk-title">
      <h2 id="risk-title">Risk Analysis</h2>
      {{RISK_ANALYSIS_SECTION}}
    </section>
    {{/if}}
    
    <!-- Projection Table -->
    {{#if includeProjectionTable}}
    <section class="section" aria-labelledby="projections-title">
      <h2 id="projections-title">Year-by-Year Projections</h2>
      {{PROJECTION_TABLE}}
    </section>
    {{/if}}
    
    <!-- Footer -->
    <footer class="footer" role="contentinfo">
      <p>This report has been prepared for {{CLIENT_NAME}} by {{FIRM_NAME}}.</p>
      <p>Generated on {{REPORT_DATE}} | Scenario: {{SCENARIO_NAME}}</p>
      <p><strong>Important:</strong> Past performance is not indicative of future results. All projections are estimates based on current assumptions.</p>
    </footer>
  </div>
</body>
</html>
    `;
};

export const generateSuitabilityTemplate = (options: EnhancedReportOptions): string => {
  const { theme = 'light', accessibility } = options;
  const isHighContrast = accessibility?.highContrast || false;
  const fontSize = accessibility?.fontSize || 'medium';

  return `
<!DOCTYPE html>
<html lang="${options.locale || 'en-GB'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suitability Report - {{CLIENT_NAME}}</title>
  <style>
    /* Base styles from cash flow template */
    ${getBaseStyles(theme, isHighContrast, fontSize)}
    
    /* Suitability-specific styles */
    .recommendation-box {
      background: ${isHighContrast ? '#f0f0f0' : '#e3f2fd'};
      border: 2px solid ${isHighContrast ? '#000' : '#2196f3'};
      border-radius: 8px;
      padding: 25px;
      margin: 30px 0;
    }
    
    .recommendation-box h3 {
      color: ${isHighContrast ? '#000' : '#1976d2'};
      margin-bottom: 15px;
    }
    
    .suitability-matrix {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 20px;
      margin: 30px 0;
    }
    
    .matrix-label {
      font-weight: 600;
      padding: 10px;
      background: ${theme === 'dark' ? '#444' : '#f5f5f5'};
      border-radius: 4px;
    }
    
    .matrix-value {
      padding: 10px;
      border-left: 3px solid ${isHighContrast ? '#000' : '#007acc'};
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Investment Suitability Report</h1>
      <div class="subtitle">Personalized Investment Recommendations</div>
      <div class="header-info">
        <div>
          <div class="label">Client</div>
          <div>{{CLIENT_NAME}}</div>
        </div>
        <div>
          <div class="label">Report Date</div>
          <div>{{REPORT_DATE}}</div>
        </div>
        <div>
          <div class="label">Prepared By</div>
          <div>{{ADVISOR_NAME}}</div>
          <div>{{FIRM_NAME}}</div>
        </div>
      </div>
    </header>
    
    <section class="section">
      <h2>Client Profile</h2>
      <div class="suitability-matrix">
        <div class="matrix-label">Risk Profile</div>
        <div class="matrix-value">{{RISK_PROFILE}}</div>
        
        <div class="matrix-label">Investment Objective</div>
        <div class="matrix-value">{{INVESTMENT_OBJECTIVE}}</div>
        
        <div class="matrix-label">Time Horizon</div>
        <div class="matrix-value">{{TIME_HORIZON}}</div>
        
        <div class="matrix-label">Capacity for Loss</div>
        <div class="matrix-value">{{CAPACITY_FOR_LOSS}}</div>
      </div>
    </section>
    
    <section class="section">
      <h2>Recommendations</h2>
      <div class="recommendation-box">
        <h3>Recommended Portfolio Allocation</h3>
        {{PORTFOLIO_RECOMMENDATION}}
      </div>
    </section>
    
    {{#if INCLUDE_CHARTS}}
    <section class="section">
      <h2>Portfolio Analysis</h2>
      {{CHARTS_SECTION}}
    </section>
    {{/if}}
    
    <footer class="footer">
      <p>This report has been prepared for {{CLIENT_NAME}} by {{FIRM_NAME}}.</p>
      <p>Generated on {{REPORT_DATE}}</p>
    </footer>
  </div>
</body>
</html>
    `;
};

export const generateReviewTemplate = (options: EnhancedReportOptions): string => {
  const { theme = 'light', accessibility } = options;
  const isHighContrast = accessibility?.highContrast || false;
  const fontSize = accessibility?.fontSize || 'medium';

  return `
<!DOCTYPE html>
<html lang="${options.locale || 'en-GB'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Annual Review - {{CLIENT_NAME}}</title>
  <style>
    /* Base styles from cash flow template */
    ${getBaseStyles(theme, isHighContrast, fontSize)}
    
    /* Review-specific styles */
    .performance-card {
      background: linear-gradient(135deg, ${isHighContrast ? '#f0f0f0' : '#007acc'} 0%, ${isHighContrast ? '#ddd' : '#0056b3'} 100%);
      color: ${isHighContrast ? '#000' : '#fff'};
      padding: 30px;
      border-radius: 12px;
      margin: 30px 0;
      text-align: center;
    }
    
    .performance-card h3 {
      color: ${isHighContrast ? '#000' : '#fff'};
      font-size: ${getFontSize(fontSize, 'h2')};
      margin-bottom: 10px;
    }
    
    .timeline {
      position: relative;
      padding: 20px 0;
      margin: 30px 0;
    }
    
    .timeline-item {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      position: relative;
    }
    
    .timeline-date {
      width: 120px;
      font-weight: 600;
      color: ${isHighContrast ? '#000' : '#007acc'};
    }
    
    .timeline-content {
      flex: 1;
      padding: 20px;
      background: ${theme === 'dark' ? '#333' : '#f8f9fa'};
      border-radius: 8px;
      margin-left: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Annual Review Report</h1>
      <div class="subtitle">Year in Review: {{REVIEW_PERIOD}}</div>
      <div class="header-info">
        <div>
          <div class="label">Client</div>
          <div>{{CLIENT_NAME}}</div>
        </div>
        <div>
          <div class="label">Report Date</div>
          <div>{{REPORT_DATE}}</div>
        </div>
        <div>
          <div class="label">Prepared By</div>
          <div>{{ADVISOR_NAME}}</div>
          <div>{{FIRM_NAME}}</div>
        </div>
      </div>
    </header>
    
    <section class="section executive-summary" aria-labelledby="annual-summary-title">
      <h2 id="annual-summary-title">Annual Summary</h2>
      <div class="key-metrics">
        <div class="metric-card">
          <div class="value">{{FINAL_PORTFOLIO_VALUE}}</div>
          <div class="label">Portfolio Value (Nominal)</div>
        </div>
        <div class="metric-card">
          <div class="value">{{FINAL_PORTFOLIO_VALUE_REAL}}</div>
          <div class="label">Portfolio Value (Real Terms)</div>
        </div>
        <div class="metric-card">
          <div class="value">{{AVERAGE_ANNUAL_RETURN}}</div>
          <div class="label">Avg Annual Return</div>
        </div>
        <div class="metric-card">
          <div class="value">{{GOAL_ACHIEVEMENT_RATE}}</div>
          <div class="label">Goal Achievement</div>
        </div>
        <div class="metric-card">
          <div class="value">{{SUSTAINABILITY_RATING}}/10</div>
          <div class="label">Sustainability</div>
        </div>
      </div>
      
      <h3>Key Insights</h3>
      <ul class="insights-list">
        {{KEY_INSIGHTS}}
      </ul>
    </section>

    <section class="section">
      <div class="performance-card">
        <h3>{{ANNUAL_PERFORMANCE}}</h3>
        <p>Estimated annual portfolio performance</p>
      </div>
      <div class="key-metrics">
        <div class="metric-card">
          <div class="value">{{CURRENT_INCOME}}</div>
          <div class="label">Current Income</div>
        </div>
        <div class="metric-card">
          <div class="value">{{CURRENT_EXPENSES}}</div>
          <div class="label">Current Expenses</div>
        </div>
        <div class="metric-card">
          <div class="value">{{CURRENT_SAVINGS}}</div>
          <div class="label">Savings</div>
        </div>
        <div class="metric-card">
          <div class="value">{{INVESTMENT_VALUE}}</div>
          <div class="label">Investments</div>
        </div>
      </div>
    </section>
    
    <section class="section">
      <h2>Key Milestones</h2>
      <div class="timeline">
        {{TIMELINE_EVENTS}}
      </div>
    </section>
    
    {{#if INCLUDE_CHARTS}}
    <section class="section">
      <h2>Performance Analysis</h2>
      {{CHARTS_SECTION}}
    </section>
    {{/if}}

    {{#if INCLUDE_ASSUMPTIONS}}
    <section class="section">
      <h2>Assumptions & Parameters</h2>
      {{ASSUMPTIONS_TABLE}}
    </section>
    {{/if}}

    {{#if INCLUDE_RISK_ANALYSIS}}
    <section class="section">
      <h2>Risk Analysis</h2>
      {{RISK_ANALYSIS_SECTION}}
    </section>
    {{/if}}

    {{#if includeProjectionTable}}
    <section class="section">
      <h2>Year-by-Year Projections</h2>
      {{PROJECTION_TABLE}}
    </section>
    {{/if}}
    
    <footer class="footer">
      <p>This report has been prepared for {{CLIENT_NAME}} by {{FIRM_NAME}}.</p>
      <p>Generated on {{REPORT_DATE}}</p>
    </footer>
  </div>
</body>
</html>
    `;
};
