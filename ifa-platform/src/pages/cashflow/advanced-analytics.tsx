import React from 'react';
import { AdvancedAnalyticsDashboard } from '@/components/cashflow/advanced/AdvancedAnalyticsDashboard';
import { CashFlowScenario } from '@/types/advanced-analytics';

const AdvancedAnalyticsPage: React.FC = () => {
  // Mock scenario data for testing
  const mockScenario: CashFlowScenario = {
    id: 'test-scenario',
    scenario_name: 'Base Case Projection',
    client_id: 'test-client',
    projection_years: 25,
    inflation_rate: 2.5,
    real_equity_return: 5.0,
    real_bond_return: 2.0,
    real_cash_return: 0.5,
    risk_score: 6,
    assumption_basis: 'Based on historical market data and current economic conditions',
    annual_charge_percent: 1.25,
    charges_included: true,
    calculation_method: 'real_terms',
    data_sources: ['Alpha Vantage', 'BoE', 'ONS'],
    last_reviewed: new Date()
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive stress testing, compliance validation, and risk analysis
        </p>
      </div>

      <AdvancedAnalyticsDashboard 
        clientId="test-client" 
        scenario={mockScenario} 
      />
    </div>
  );
};

export default AdvancedAnalyticsPage;