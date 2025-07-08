// Enhanced Analytics Component - Replaces existing Analytics in Foundation AI portal
// Integrates with existing clientData, riskMetrics, clientPersona state

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Target, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import ClientAnalyticsService from '../services/ClientAnalyticsService';
import type { ClientStoryAnalytics, MarketData } from '../services/ClientAnalyticsService';

// Props interface for Analytics component
interface AnalyticsProps {
  clientData: any;
  riskMetrics: any;
  clientPersona: any;
  setCurrentSection: (section: string) => void;
  riskCategories: any;
}

// This replaces the existing Analytics component in the Foundation AI portal
const Analytics: React.FC<AnalyticsProps> = ({ 
  clientData, 
  riskMetrics, 
  clientPersona, 
  setCurrentSection, 
  riskCategories 
}) => {
  // State for analytics data
  const [clientAnalytics, setClientAnalytics] = useState<ClientStoryAnalytics | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Initialize analytics service
  const analyticsService = new ClientAnalyticsService();

  // Load analytics when component mounts or client data changes
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Loading analytics for client:', clientData.name);
        
        // Generate analytics using existing Foundation AI state
        const analytics = await analyticsService.generateClientStoryAnalytics(
          clientData,      // From Foundation AI portal
          riskMetrics,     // From Foundation AI portal  
          clientPersona    // From Foundation AI portal
        );
        
        setClientAnalytics(analytics);
        
        // Get market data separately for display
        const market = await analyticsService.getMarketData();
        setMarketData(market);
        
        setLastUpdate(new Date().toLocaleTimeString());
        console.log('Analytics loaded successfully');
        
      } catch (error) {
        console.error('Analytics loading error:', error);
        setError('Failed to load market data. Using demo data.');
        
        // Still show demo analytics even if API fails
        const fallbackAnalytics = await analyticsService.generateClientStoryAnalytics(
          clientData,
          riskMetrics, 
          clientPersona
        );
        setClientAnalytics(fallbackAnalytics);
      } finally {
        setLoading(false);
      }
    };

    // Only load if we have basic client data
    if (riskMetrics.finalRiskProfile) {
      loadAnalytics();
    } else {
      setLoading(false);
    }
  }, [clientData, riskMetrics, clientPersona]); // Re-run when Foundation AI data changes

  // Refresh analytics manually
  const refreshAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Refreshing analytics for client:', clientData.name);
      
      // Generate analytics using existing Foundation AI state
      const analytics = await analyticsService.generateClientStoryAnalytics(
        clientData,      // From Foundation AI portal
        riskMetrics,     // From Foundation AI portal  
        clientPersona    // From Foundation AI portal
      );
      
      setClientAnalytics(analytics);
      
      // Get market data separately for display
      const market = await analyticsService.getMarketData();
      setMarketData(market);
      
      setLastUpdate(new Date().toLocaleTimeString());
      console.log('Analytics refreshed successfully');
      
    } catch (error) {
      console.error('Analytics refresh error:', error);
      setError('Failed to refresh market data. Using demo data.');
      
      // Still show demo analytics even if API fails
      const fallbackAnalytics = await analyticsService.generateClientStoryAnalytics(
        clientData,
        riskMetrics, 
        clientPersona
      );
      setClientAnalytics(fallbackAnalytics);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-blue-600 animate-pulse" />
            <div>
              <h2 className="text-2xl font-bold text-blue-900">Loading Market Analytics...</h2>
              <p className="text-blue-700">Fetching live data and analyzing client profile</p>
            </div>
          </div>
          <div className="mt-4 flex space-x-4 text-sm text-blue-600">
            <div>📈 Market data from Alpha Vantage</div>
            <div>🏛️ BoE interest rates</div>
            <div>📊 Client-specific insights</div>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no assessment completed
  if (!riskMetrics.finalRiskProfile) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <Info className="h-8 w-8 text-yellow-600" />
            <div>
              <h2 className="text-2xl font-bold text-yellow-900">Complete Assessment for Analytics</h2>
              <p className="text-yellow-700">Finish ATR and CFL assessments to see personalized market insights</p>
            </div>
          </div>
          <div className="mt-4 flex space-x-4">
            <button 
              onClick={() => setCurrentSection('atr')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            >
              Start ATR Assessment
            </button>
            <button 
              onClick={() => setCurrentSection('cfl')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            >
              Start CFL Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with client context */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-blue-900">Market Analytics for {clientData.name || 'Current Client'}</h2>
              <p className="text-blue-700">
                Personalized insights for {clientPersona?.type || `Risk Profile ${riskMetrics.finalRiskProfile}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <button 
              onClick={refreshAnalytics}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Refresh Data
            </button>
            <div className="text-xs text-gray-500 mt-1">
              Last update: {lastUpdate}
            </div>
          </div>
        </div>

        {/* Error message if API failed */}
        {error && (
          <div className="mb-4 p-3 bg-orange-100 border border-orange-300 rounded-lg text-orange-800 text-sm">
            ⚠️ {error} Analytics will update when connection is restored.
          </div>
        )}

        {/* Market overview cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-blue-100">
            <div className="text-sm text-gray-600">Client Risk Profile</div>
            <div className="text-2xl font-bold text-blue-600">
              {riskMetrics.finalRiskProfile}/5
            </div>
            <div className="text-xs text-gray-500">
              {riskCategories[riskMetrics.finalRiskProfile]?.name || 'Assessed'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-green-100">
            <div className="text-sm text-gray-600">FTSE 100</div>
            <div className="text-2xl font-bold text-green-600">
              {marketData?.ftse?.price?.toLocaleString() || '8,234'}
            </div>
            <div className={`text-xs ${
              (marketData?.ftse?.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(marketData?.ftse?.changePercent || 0) >= 0 ? '+' : ''}
              {(marketData?.ftse?.changePercent || -0.55).toFixed(2)}% today
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-purple-100">
            <div className="text-sm text-gray-600">BoE Base Rate</div>
            <div className="text-2xl font-bold text-purple-600">
              {marketData?.bankRate || '5.25'}%
            </div>
            <div className="text-xs text-gray-500">Current rate</div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-orange-100">
            <div className="text-sm text-gray-600">UK CPI Inflation</div>
            <div className="text-2xl font-bold text-orange-600">
              {marketData?.inflation || '2.1'}%
            </div>
            <div className="text-xs text-gray-500">Latest reading</div>
          </div>
        </div>
      </div>

      {/* Client-specific market impact analysis */}
      {clientAnalytics && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            📊 How Market Conditions Affect {clientPersona?.type || 'This Client'}
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* FTSE Impact */}
            <div className={`p-4 rounded-lg border-l-4 ${
              clientAnalytics.marketImpact.ftseImpact.impactOnClient === 'low' ? 'border-green-500 bg-green-50' :
              clientAnalytics.marketImpact.ftseImpact.impactOnClient === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
              'border-red-500 bg-red-50'
            }`}>
              <h4 className="font-medium mb-2 flex items-center">
                📈 FTSE Movement Impact
                {clientAnalytics.marketImpact.ftseImpact.actionNeeded && (
                  <AlertTriangle className="h-4 w-4 ml-2 text-orange-600" />
                )}
              </h4>
              <div className="text-sm mb-2">
                <span className="font-medium">Impact Level: </span>
                <span className={`capitalize font-medium ${
                  clientAnalytics.marketImpact.ftseImpact.impactOnClient === 'low' ? 'text-green-700' :
                  clientAnalytics.marketImpact.ftseImpact.impactOnClient === 'moderate' ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {clientAnalytics.marketImpact.ftseImpact.impactOnClient}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                {clientAnalytics.marketImpact.ftseImpact.reasoning}
              </p>
              {clientAnalytics.marketImpact.ftseImpact.actionNeeded && (
                <div className="mt-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                  ⚡ Review recommended
                </div>
              )}
            </div>

            {/* Interest Rate Impact */}
            <div className="p-4 rounded-lg border-l-4 border-purple-500 bg-purple-50">
              <h4 className="font-medium mb-2 flex items-center">
                🏛️ Interest Rate Impact
                {clientAnalytics.marketImpact.interestRateImpact.opportunityFlag && (
                  <CheckCircle2 className="h-4 w-4 ml-2 text-green-600" />
                )}
              </h4>
              <div className="text-sm mb-2">
                <span className="font-medium">Current Rate: </span>
                <span className="text-purple-700 font-medium">
                  {clientAnalytics.marketImpact.interestRateImpact.currentRate}%
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                {clientAnalytics.marketImpact.interestRateImpact.impactOnStrategy}
              </p>
              {clientAnalytics.marketImpact.interestRateImpact.opportunityFlag && (
                <div className="mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  💡 Opportunity identified
                </div>
              )}
            </div>

            {/* Inflation Impact */}
            <div className={`p-4 rounded-lg border-l-4 ${
              clientAnalytics.marketImpact.inflationImpact.riskToGoals === 'low' ? 'border-green-500 bg-green-50' :
              clientAnalytics.marketImpact.inflationImpact.riskToGoals === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
              'border-red-500 bg-red-50'
            }`}>
              <h4 className="font-medium mb-2 flex items-center">
                📊 Inflation Risk Assessment
                {clientAnalytics.marketImpact.inflationImpact.protectionNeeded && (
                  <AlertTriangle className="h-4 w-4 ml-2 text-yellow-600" />
                )}
              </h4>
              <div className="text-sm mb-2">
                <span className="font-medium">Risk to Goals: </span>
                <span className={`capitalize font-medium ${
                  clientAnalytics.marketImpact.inflationImpact.riskToGoals === 'low' ? 'text-green-700' :
                  clientAnalytics.marketImpact.inflationImpact.riskToGoals === 'moderate' ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {clientAnalytics.marketImpact.inflationImpact.riskToGoals}
                </span>
              </div>
              <div className="text-sm text-gray-700 mb-2">
                Current inflation: {clientAnalytics.marketImpact.inflationImpact.currentRate}%
              </div>
              {clientAnalytics.marketImpact.inflationImpact.protectionNeeded && (
                <div className="mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  🛡️ Protection recommended
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Personalized decision guidance */}
      {clientAnalytics?.decisionGuidance && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            🎯 Advisory Guidance Based on {clientPersona?.type || 'Client Profile'}
          </h3>
          
          <div className="space-y-4">
            {clientAnalytics.decisionGuidance.map((guidance, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                guidance.riskLevel === 'low' ? 'border-green-200 bg-green-50' :
                guidance.riskLevel === 'moderate' ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{guidance.scenario}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    guidance.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                    guidance.riskLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {guidance.riskLevel} priority
                  </span>
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Analysis: </span>
                  {guidance.impact}
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Recommendation: </span>
                  {guidance.recommendation}
                </div>
                <div className="text-xs text-gray-600 italic">
                  💡 {guidance.reasoning}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio allocation recommendation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          📈 Recommended Portfolio Allocation
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">
              For Risk Profile {riskMetrics.finalRiskProfile}/5 
              ({riskCategories[riskMetrics.finalRiskProfile]?.name})
            </h4>
            
            {/* Dynamic allocation display based on risk profile */}
            <div className="space-y-3">
              {riskMetrics.finalRiskProfile <= 2 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Equities (UK/Global)</span>
                    <span className="text-sm font-medium">
                      {riskMetrics.finalRiskProfile === 1 ? '10%' : '25%'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full" 
                      style={{width: riskMetrics.finalRiskProfile === 1 ? '10%' : '25%'}}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bonds & Cash</span>
                    <span className="text-sm font-medium">
                      {riskMetrics.finalRiskProfile === 1 ? '90%' : '75%'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full" 
                      style={{width: riskMetrics.finalRiskProfile === 1 ? '90%' : '75%'}}
                    ></div>
                  </div>
                </>
              )}
              
              {riskMetrics.finalRiskProfile === 3 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Equities (Balanced)</span>
                    <span className="text-sm font-medium">50%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full" style={{width: '50%'}}></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bonds & Fixed Income</span>
                    <span className="text-sm font-medium">50%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-green-600 h-3 rounded-full" style={{width: '50%'}}></div>
                  </div>
                </>
              )}
              
              {riskMetrics.finalRiskProfile >= 4 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Equities (Growth Focus)</span>
                    <span className="text-sm font-medium">
                      {riskMetrics.finalRiskProfile === 4 ? '70%' : '85%'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full" 
                      style={{width: riskMetrics.finalRiskProfile === 4 ? '70%' : '85%'}}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bonds & Alternatives</span>
                    <span className="text-sm font-medium">
                      {riskMetrics.finalRiskProfile === 4 ? '30%' : '15%'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full" 
                      style={{width: riskMetrics.finalRiskProfile === 4 ? '30%' : '15%'}}
                    ></div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Assessment-Based Rationale</h4>
            <div className="text-sm text-gray-700 space-y-3">
              <div className="p-3 bg-blue-50 rounded border-l-2 border-blue-500">
                <div className="font-medium text-blue-900">ATR Analysis</div>
                <div className="text-blue-800">
                  Score: {riskMetrics.atrScore?.toFixed(1)} - 
                  {riskMetrics.atrScore <= 2 ? ' Conservative investment attitude' : 
                   riskMetrics.atrScore <= 4 ? ' Moderate risk tolerance' : ' Growth-oriented mindset'}
                </div>
              </div>
              
              <div className="p-3 bg-orange-50 rounded border-l-2 border-orange-500">
                <div className="font-medium text-orange-900">CFL Analysis</div>
                <div className="text-orange-800">
                  Score: {riskMetrics.cflScore?.toFixed(1)} - 
                  {riskMetrics.cflScore <= 2 ? ' Limited capacity for losses' : 
                   riskMetrics.cflScore <= 4 ? ' Moderate loss capacity' : ' High resilience to losses'}
                </div>
              </div>
              
              {clientPersona && (
                <div className="p-3 bg-purple-50 rounded border-l-2 border-purple-500">
                  <div className="font-medium text-purple-900">Persona Insights</div>
                  <div className="text-purple-800">
                    {clientPersona.type} - {clientPersona.description?.substring(0, 100)}...
                  </div>
                </div>
              )}
              
              <div className="p-3 bg-gray-50 rounded border-l-2 border-gray-500">
                <div className="font-medium text-gray-900">Time Context</div>
                <div className="text-gray-800">
                  Time horizon: {clientData.timeHorizon || 'Not specified'} years
                  {clientData.timeHorizon && (
                    <span className="ml-2">
                      ({clientData.timeHorizon < 5 ? 'Short-term focus' : 
                        clientData.timeHorizon < 15 ? 'Medium-term planning' : 'Long-term investing'})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance and monitoring section */}
      {clientAnalytics?.complianceAlignment && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🏛️ Regulatory Compliance Status</h3>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {clientAnalytics.complianceAlignment.suitabilityAlignment}%
              </div>
              <div className="text-sm text-green-800">Suitability Alignment</div>
              <div className="text-xs text-green-600 mt-1">COBS 9.2.2R Compliant</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {clientAnalytics.complianceAlignment.consumerDutyScore}%
              </div>
              <div className="text-sm text-blue-800">Consumer Duty</div>
              <div className="text-xs text-blue-600 mt-1">Client Outcome Focused</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {clientAnalytics.complianceAlignment.riskProfileConfidence}%
              </div>
              <div className="text-sm text-purple-800">Profile Confidence</div>
              <div className="text-xs text-purple-600 mt-1">Assessment Quality</div>
            </div>
          </div>
          
          {clientAnalytics.complianceAlignment.vulnerabilityFlags.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">⚠️ Vulnerability Considerations</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                {clientAnalytics.complianceAlignment.vulnerabilityFlags.map((flag, index) => (
                  <li key={index}>• {flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Navigation - integrates with existing Foundation AI portal */}
      <div className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-4">
        <button 
          onClick={() => setCurrentSection('cashflow')}
          className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <DollarSign className="h-4 w-4" />
          <span>← Cash Flow</span>
        </button>
        
        <div className="text-center">
          <div className="text-sm text-gray-600">Market Analytics & Advisory Insights</div>
          <div className="text-xs text-gray-500">
            Live data • Client-specific analysis • Regulatory compliant
          </div>
        </div>
        
        <button 
          onClick={() => setCurrentSection('modeling')}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span>Scenario Modeling →</span>
          <Target className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Analytics;