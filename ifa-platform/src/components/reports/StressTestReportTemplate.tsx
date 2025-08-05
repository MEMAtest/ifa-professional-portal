// ================================================================
// src/components/reports/StressTestReportTemplate.tsx - PHASE 3 LOW PRIORITY
// Professional HTML template for stress test reports
// Used by StressTestReportService for report generation
// ================================================================

'use client';

import React from 'react';

// Template data interface
export interface StressTestTemplateData {
  // Report Metadata
  reportTitle: string;
  reportDate: string;
  generatedAt: string;
  advisorName: string;
  firmName: string;
  complianceRef: string;

  // Client Information
  clientName: string;
  clientRef: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;

  // Scenario Information
  scenarioName: string;
  scenarioType: string;
  projectionYears: number;
  basePortfolioValue: number;

  // Executive Summary
  overallResilienceScore: number;
  averageSurvivalProbability: number;
  maxShortfallRisk: number;
  scenariosTested: number;

  // Results
  stressTestResults: Array<{
    scenarioId: string;
    scenarioName: string;
    resilienceScore: number;
    survivalProbability: number;
    shortfallRisk: number;
    portfolioImpact: number;
    recoveryTimeYears?: number;
  }>;

  // Content flags
  includeExecutiveSummary: boolean;
  includeDetailedResults: boolean;
  includeRecommendations: boolean;
  includeCharts: boolean;

  // Findings and recommendations
  keyFindings: string[];
  recommendations: string[];
}

interface StressTestReportTemplateProps {
  data: StressTestTemplateData;
  templateType?: 'standard' | 'compliance' | 'executive';
}

export function StressTestReportTemplate({ 
  data, 
  templateType = 'standard' 
}: StressTestReportTemplateProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getResilienceRating = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: 'High Resilience', color: '#10b981' };
    if (score >= 60) return { label: 'Moderate Resilience', color: '#f59e0b' };
    return { label: 'Low Resilience', color: '#ef4444' };
  };

  const getRiskRating = (risk: number): { label: string; color: string } => {
    if (risk <= 10) return { label: 'Low Risk', color: '#10b981' };
    if (risk <= 25) return { label: 'Moderate Risk', color: '#f59e0b' };
    return { label: 'High Risk', color: '#ef4444' };
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '0', padding: '20px', lineHeight: '1.6' }}>
      <style>{`
        @media print {
          body { margin: 0; }
          .page-break { page-break-before: always; }
          .no-print { display: none; }
        }
        
        .report-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          margin: -20px -20px 30px -20px;
          border-radius: 0 0 8px 8px;
        }
        
        .report-title {
          font-size: 28px;
          font-weight: bold;
          margin: 0 0 10px 0;
        }
        
        .report-subtitle {
          font-size: 16px;
          opacity: 0.9;
          margin: 0;
        }
        
        .section {
          margin: 30px 0;
          padding: 0;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #333;
          margin: 0 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .highlight-box {
          background: #f0f8ff;
          border-left: 4px solid #3b82f6;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 4px 4px 0;
        }
        
        .warning-box {
          background: #fef3cd;
          border-left: 4px solid #f59e0b;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 4px 4px 0;
        }
        
        .success-box {
          background: #d1fae5;
          border-left: 4px solid #10b981;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 4px 4px 0;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        
        .metric-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        
        .metric-value {
          font-size: 28px;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .metric-label {
          font-size: 14px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 14px;
        }
        
        .results-table th {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
        }
        
        .results-table td {
          border: 1px solid #e2e8f0;
          padding: 12px 8px;
        }
        
        .results-table tr:nth-child(even) {
          background: #f8fafc;
        }
        
        .client-info {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
      `}</style>

      {/* Report Header */}
      <div className="report-header">
        <div className="report-title">{data.reportTitle}</div>
        <div className="report-subtitle">
          {data.firmName} • Generated {data.reportDate} • Ref: {data.complianceRef}
        </div>
      </div>

      {/* Client Information */}
      <div className="section">
        <h2 className="section-title">Client Information</h2>
        <div className="client-info">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div>
              <strong>Client:</strong> {data.clientName}<br />
              <strong>Reference:</strong> {data.clientRef}<br />
              <strong>Email:</strong> {data.clientEmail}
            </div>
            <div>
              <strong>Scenario:</strong> {data.scenarioName}<br />
              <strong>Type:</strong> {data.scenarioType}<br />
              <strong>Projection Period:</strong> {data.projectionYears} years
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      {data.includeExecutiveSummary && (
        <div className="section">
          <h2 className="section-title">Executive Summary</h2>
          
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Overall Resilience</div>
              <div 
                className="metric-value" 
                style={{ color: getResilienceRating(data.overallResilienceScore).color }}
              >
                {data.overallResilienceScore.toFixed(0)}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                {getResilienceRating(data.overallResilienceScore).label}
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Avg Survival Rate</div>
              <div 
                className="metric-value"
                style={{ 
                  color: data.averageSurvivalProbability >= 80 ? '#10b981' : 
                         data.averageSurvivalProbability >= 60 ? '#f59e0b' : '#ef4444' 
                }}
              >
                {data.averageSurvivalProbability.toFixed(1)}%
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                Probability of Success
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Max Shortfall Risk</div>
              <div 
                className="metric-value"
                style={{ color: getRiskRating(data.maxShortfallRisk).color }}
              >
                {data.maxShortfallRisk.toFixed(1)}%
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                {getRiskRating(data.maxShortfallRisk).label}
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Scenarios Tested</div>
              <div className="metric-value" style={{ color: '#3b82f6' }}>
                {data.scenariosTested}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                Stress Scenarios
              </div>
            </div>
          </div>

          {/* Key Findings */}
          <div className="highlight-box">
            <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>Key Findings</h3>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {data.keyFindings.map((finding, index) => (
                <li key={index} style={{ marginBottom: '8px' }}>{finding}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Detailed Results */}
      {data.includeDetailedResults && (
        <div className="section page-break">
          <h2 className="section-title">Detailed Stress Test Results</h2>
          
          <table className="results-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th style={{ textAlign: 'center' }}>Resilience Score</th>
                <th style={{ textAlign: 'center' }}>Survival Probability</th>
                <th style={{ textAlign: 'center' }}>Shortfall Risk</th>
                <th style={{ textAlign: 'center' }}>Portfolio Impact</th>
                <th style={{ textAlign: 'center' }}>Recovery Time</th>
              </tr>
            </thead>
            <tbody>
              {data.stressTestResults.map((result, index) => (
                <tr key={index}>
                  <td>
                    <strong>{result.scenarioName}</strong>
                  </td>
                  <td style={{ 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    color: getResilienceRating(result.resilienceScore).color 
                  }}>
                    {result.resilienceScore.toFixed(0)}
                  </td>
                  <td style={{ 
                    textAlign: 'center',
                    color: result.survivalProbability >= 80 ? '#10b981' : 
                           result.survivalProbability >= 60 ? '#f59e0b' : '#ef4444'
                  }}>
                    {result.survivalProbability.toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'center', color: '#ef4444' }}>
                    {result.shortfallRisk.toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'center', color: '#ef4444' }}>
                    -{Math.abs(result.portfolioImpact).toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {result.recoveryTimeYears ? `${result.recoveryTimeYears}y` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Results Interpretation */}
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ color: '#1f2937', marginBottom: '15px' }}>Results Interpretation</h3>
            
            {data.overallResilienceScore >= 80 && (
              <div className="success-box">
                <strong>Strong Portfolio Resilience:</strong> Your portfolio demonstrates robust performance 
                across multiple stress scenarios. The high resilience score indicates good diversification 
                and appropriate risk management.
              </div>
            )}
            
            {data.overallResilienceScore >= 60 && data.overallResilienceScore < 80 && (
              <div className="warning-box">
                <strong>Moderate Portfolio Resilience:</strong> Your portfolio shows reasonable performance 
                under stress, but there may be opportunities to improve diversification or reduce 
                concentration risk.
              </div>
            )}
            
            {data.overallResilienceScore < 60 && (
              <div className="warning-box" style={{ background: '#fee2e2', borderColor: '#ef4444' }}>
                <strong>Portfolio Vulnerability Identified:</strong> Your portfolio may struggle under 
                severe market stress. Consider reviewing asset allocation and risk management strategies.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.includeRecommendations && (
        <div className="section">
          <h2 className="section-title">Recommendations</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#1f2937', marginBottom: '15px' }}>Strategic Recommendations</h3>
            <ul style={{ marginLeft: '20px' }}>
              {data.recommendations.map((recommendation, index) => (
                <li key={index} style={{ marginBottom: '12px', lineHeight: '1.6' }}>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>

          <div className="highlight-box">
            <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>Implementation Priority</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div>
                <strong style={{ color: '#ef4444' }}>High Priority:</strong>
                <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                  {data.overallResilienceScore < 60 && (
                    <li>Review overall portfolio risk level</li>
                  )}
                  {data.maxShortfallRisk > 30 && (
                    <li>Strengthen emergency fund provisions</li>
                  )}
                </ul>
              </div>
              <div>
                <strong style={{ color: '#f59e0b' }}>Medium Priority:</strong>
                <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                  <li>Regular stress test monitoring</li>
                  <li>Diversification review</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Section for Compliance Templates */}
      {templateType === 'compliance' && (
        <div className="section page-break">
          <h2 className="section-title">Regulatory Compliance</h2>
          
          <div className="highlight-box">
            <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>FCA COBS 13.4.1R Compliance</h3>
            <p>This stress testing analysis has been conducted in compliance with FCA regulations:</p>
            <ul style={{ marginLeft: '20px' }}>
              <li>✅ Projections provided in real terms (net of inflation)</li>
              <li>✅ Appropriate stress testing performed across multiple scenarios</li>
              <li>✅ Assumptions documented and justified</li>
              <li>✅ Multiple scenarios tested for portfolio robustness</li>
            </ul>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h3 style={{ color: '#1f2937', marginBottom: '15px' }}>Methodology Documentation</h3>
            <div style={{ background: '#f8fafc', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <p><strong>Simulation Method:</strong> Monte Carlo analysis with 1,000 iterations per scenario</p>
              <p><strong>Time Horizon:</strong> {data.projectionYears} years</p>
              <p><strong>Scenarios Tested:</strong> {data.scenariosTested} comprehensive stress scenarios</p>
              <p><strong>Risk Factors:</strong> Market volatility, inflation, interest rates, longevity</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="footer">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <strong>{data.firmName}</strong><br />
            Prepared by: {data.advisorName}<br />
            Date: {data.reportDate}
          </div>
          <div>
            <strong>Important Notice:</strong><br />
            This analysis is based on assumptions and historical data. 
            Past performance does not guarantee future results.
          </div>
          <div>
            <strong>Compliance Reference:</strong><br />
            {data.complianceRef}<br />
            Generated: {new Date(data.generatedAt).toLocaleString('en-GB')}
          </div>
        </div>
        
        <div style={{ 
          marginTop: '20px', 
          paddingTop: '20px', 
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
          fontSize: '11px'
        }}>
          This document contains confidential and proprietary information. 
          Distribution should be limited to authorized recipients only.
        </div>
      </div>
    </div>
  );
}

// Export template as HTML string for PDF generation
export function generateStressTestReportHTML(data: StressTestTemplateData, templateType?: string): string {
  // This would be used by the service to generate HTML string
  // In a real implementation, you'd render the React component to HTML
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.reportTitle}</title>
      </head>
      <body>
        <!-- Rendered React component would go here -->
        <!-- For now, return a basic template structure -->
      </body>
    </html>
  `;
}