import { createClient } from "@/lib/supabase/client"
import clientLogger from '@/lib/logging/clientLogger'
// /src/services/ClientAnalyticsService.ts
// Core analytics service that connects market data to individual client stories

interface ClientStoryAnalytics {
  clientId: string;
  riskProfile: number;
  persona: any;
  currentAllocation?: PortfolioAllocation;
  marketImpact: MarketImpactAnalysis;
  decisionGuidance: DecisionGuidance[];
  complianceAlignment: ComplianceScore;
  timestamp: string;
}

interface MarketImpactAnalysis {
  ftseImpact: {
    currentMove: number;
    impactOnClient: 'low' | 'moderate' | 'high';
    reasoning: string;
    actionNeeded: boolean;
  };
  interestRateImpact: {
    currentRate: number;
    impactOnStrategy: string;
    opportunityFlag: boolean;
  };
  inflationImpact: {
    currentRate: number;
    riskToGoals: 'low' | 'moderate' | 'high';
    protectionNeeded: boolean;
  };
}

interface DecisionGuidance {
  scenario: string;
  impact: string;
  recommendation: string;
  reasoning: string;
  riskLevel: 'low' | 'moderate' | 'high';
}

interface ComplianceScore {
  suitabilityAlignment: number;
  consumerDutyScore: number;
  riskProfileConfidence: number;
  vulnerabilityFlags: string[];
}

interface PortfolioAllocation {
  equities: number;
  bonds: number;
  cash: number;
  alternatives?: number;
}

interface MarketData {
  ftse: {
    price: number;
    change: number;
    changePercent: number;
  };
  bankRate: number;
  inflation: number;
  timestamp: string;
}

class ClientAnalyticsService {
  private alphaVantageKey = 'H5J30OQNWEZ37XAD';
  private boEUrl = 'https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp';

  /**
   * Generate complete client-story analytics
   * Connects market conditions to specific client profile
   */
  async generateClientStoryAnalytics(
    clientData: any, 
    riskMetrics: any, 
    clientPersona: any
  ): Promise<ClientStoryAnalytics> {
    try {
      const marketData = await this.getMarketData();
      const economicData = await this.getEconomicIndicators();
      
      return {
        clientId: clientData.id || 'current',
        riskProfile: riskMetrics.finalRiskProfile,
        persona: clientPersona,
        marketImpact: this.analyzeMarketImpact(marketData, riskMetrics, clientPersona),
        decisionGuidance: this.generateDecisionGuidance(riskMetrics, clientPersona, marketData),
        complianceAlignment: this.assessComplianceAlignment(riskMetrics, clientPersona),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      clientLogger.error('Client analytics generation error:', error);
      // Return fallback analytics with mock data
      return this.getFallbackAnalytics(riskMetrics, clientPersona);
    }
  }

  /**
   * Analyze how market movements specifically impact this client
   * Based on their risk profile and investor persona
   */
  private analyzeMarketImpact(marketData: MarketData, riskMetrics: any, persona: any): MarketImpactAnalysis {
    const riskProfile = riskMetrics.finalRiskProfile;
    const ftseMove = marketData.ftse?.changePercent || 0;
    
    // Client-specific impact analysis
    const impactLevel = this.calculateImpactLevel(riskProfile, Math.abs(ftseMove));
    const reasoning = this.generateImpactReasoning(riskProfile, persona, ftseMove);
    
    return {
      ftseImpact: {
        currentMove: ftseMove,
        impactOnClient: impactLevel,
        reasoning: reasoning,
        actionNeeded: this.shouldTakeAction(riskProfile, Math.abs(ftseMove))
      },
      interestRateImpact: {
        currentRate: marketData.bankRate || 5.25,
        impactOnStrategy: this.analyzeRateImpact(riskProfile, persona, marketData.bankRate),
        opportunityFlag: this.identifyRateOpportunity(riskProfile, marketData.bankRate)
      },
      inflationImpact: {
        currentRate: marketData.inflation || 2.1,
        riskToGoals: this.assessInflationRisk(riskProfile, persona, marketData.inflation),
        protectionNeeded: this.needsInflationProtection(riskProfile, persona, marketData.inflation)
      }
    };
  }

  /**
   * Generate personalized decision guidance
   * Based on client's specific risk profile and current market conditions
   */
  private generateDecisionGuidance(riskMetrics: any, persona: any, marketData: MarketData): DecisionGuidance[] {
    const guidance: DecisionGuidance[] = [];
    const riskProfile = riskMetrics.finalRiskProfile;
    
    // Portfolio allocation guidance
    guidance.push({
      scenario: "Portfolio Allocation Strategy",
      impact: `Risk Profile ${riskProfile} suggests ${this.getOptimalAllocation(riskProfile)}`,
      recommendation: this.getAllocationRecommendation(riskProfile, persona),
      reasoning: `Based on ATR score ${riskMetrics.atrScore?.toFixed(1)} and CFL score ${riskMetrics.cflScore?.toFixed(1)}`,
      riskLevel: 'low'
    });

    // Market volatility guidance
    const ftseMove = Math.abs(marketData.ftse?.changePercent || 0);
    if (ftseMove > 1.5) {
      guidance.push({
        scenario: "Market Volatility Response",
        impact: this.getVolatilityImpact(riskProfile, persona, ftseMove),
        recommendation: this.getVolatilityRecommendation(riskProfile, persona),
        reasoning: `${persona?.type || 'Current'} investors typically ${this.getPersonaVolatilityResponse(persona)}`,
        riskLevel: riskProfile <= 2 ? 'high' : riskProfile <= 4 ? 'moderate' : 'low'
      });
    }

    // Interest rate environment guidance
    guidance.push({
      scenario: "Interest Rate Environment",
      impact: this.getRateEnvironmentImpact(riskProfile, marketData.bankRate),
      recommendation: this.getRateEnvironmentRecommendation(riskProfile, marketData.bankRate),
      reasoning: `Current BoE rate ${marketData.bankRate}% affects ${persona?.type || 'investment'} strategy`,
      riskLevel: 'low'
    });

    // Cash flow and timing guidance
    if (riskProfile <= 3) {
      guidance.push({
        scenario: "Cash Flow Protection",
        impact: "Conservative profile requires robust cash management",
        recommendation: this.getCashFlowRecommendation(riskProfile, persona),
        reasoning: `${persona?.type || 'Conservative'} investors need ${this.getEmergencyFundRecommendation(riskProfile)}`,
        riskLevel: 'moderate'
      });
    }

    return guidance;
  }

  /**
   * Calculate impact level based on risk profile and market movement
   */
  private calculateImpactLevel(riskProfile: number, moveSize: number): 'low' | 'moderate' | 'high' {
    // Lower risk profiles are more sensitive to market movements
    const sensitivityThreshold = 6 - riskProfile; // Risk 1 = 5%, Risk 5 = 1%
    
    if (moveSize > sensitivityThreshold) return 'high';
    if (moveSize > sensitivityThreshold * 0.6) return 'moderate';
    return 'low';
  }

  /**
   * Generate client-specific reasoning for market impact
   */
  private generateImpactReasoning(riskProfile: number, persona: any, ftseMove: number): string {
    const moveDirection = ftseMove > 0 ? 'rise' : 'fall';
    const magnitude = Math.abs(ftseMove);
    const personaType = persona?.type || 'Current client';
    
    if (riskProfile <= 2) {
      return `${personaType} with conservative profile feels ${magnitude > 1 ? 'significant' : 'moderate'} concern from ${magnitude.toFixed(1)}% market ${moveDirection}. Focus remains on capital preservation and limiting downside exposure.`;
    } else if (riskProfile >= 4) {
      return `${personaType} with growth-oriented profile can ${magnitude > 3 ? 'weather' : 'easily handle'} this ${magnitude.toFixed(1)}% market ${moveDirection}. Maintain long-term perspective and consider opportunities.`;
    } else {
      return `${personaType} should monitor this ${magnitude.toFixed(1)}% ${moveDirection} but maintain balanced approach. Review if movement persists or accelerates.`;
    }
  }

  /**
   * Determine if action should be taken based on market movement
   */
  private shouldTakeAction(riskProfile: number, moveSize: number): boolean {
    const actionThreshold = 6 - riskProfile; // Conservative clients need action sooner
    return moveSize > actionThreshold;
  }

  /**
   * Get optimal portfolio allocation for risk profile
   */
  private getOptimalAllocation(riskProfile: number): string {
    const allocations: Record<number, string> = {
      1: "10% equities, 90% bonds/cash (ultra-conservative)",
      2: "25% equities, 75% bonds/cash (conservative)", 
      3: "50% equities, 50% bonds (balanced)",
      4: "70% equities, 30% bonds (growth)",
      5: "85% equities, 15% bonds (aggressive growth)"
    };
    return allocations[riskProfile as keyof typeof allocations] || "Balanced allocation";
  }

  /**
   * Generate allocation recommendation with persona context
   */
  private getAllocationRecommendation(riskProfile: number, persona: any): string {
    const allocation = this.getOptimalAllocation(riskProfile);
    const personaType = persona?.type || 'Current investor';
    const reviewFreq = persona?.communicationNeeds?.frequency || 'regular';
    
    return `Implement ${allocation} aligned with ${personaType} temperament. Schedule ${reviewFreq} reviews to monitor alignment and adjust as needed.`;
  }

  /**
   * Analyze interest rate impact on strategy
   */
  private analyzeRateImpact(riskProfile: number, persona: any, currentRate: number): string {
    if (riskProfile <= 2) {
      return `High rates (${currentRate}%) benefit conservative strategy through improved cash and bond yields. Consider extending duration in safe assets.`;
    } else if (riskProfile >= 4) {
      return `Current rates (${currentRate}%) create headwinds for growth assets but may offer buying opportunities. Maintain equity focus for long-term growth.`;
    } else {
      return `Balanced approach benefits from ${currentRate}% rates. Mix of bonds for yield and equities for growth remains appropriate.`;
    }
  }

  /**
   * Identify opportunities from interest rate environment
   */
  private identifyRateOpportunity(riskProfile: number, currentRate: number): boolean {
    // High rates create opportunities for conservative investors
    // Low rates create opportunities for growth investors
    if (riskProfile <= 2 && currentRate > 4) return true;
    if (riskProfile >= 4 && currentRate < 3) return true;
    return false;
  }

  /**
   * Assess inflation risk to client goals
   */
  private assessInflationRisk(riskProfile: number, persona: any, inflationRate: number): 'low' | 'moderate' | 'high' {
    // Conservative investors face higher inflation risk
    if (riskProfile <= 2 && inflationRate > 3) return 'high';
    if (riskProfile <= 2 && inflationRate > 2) return 'moderate';
    if (riskProfile >= 4 && inflationRate > 4) return 'moderate';
    return 'low';
  }

  /**
   * Determine if inflation protection is needed
   */
  private needsInflationProtection(riskProfile: number, persona: any, inflationRate: number): boolean {
    return (riskProfile <= 2 && inflationRate > 2.5) || inflationRate > 4;
  }

  /**
   * Get volatility impact description
   */
  private getVolatilityImpact(riskProfile: number, persona: any, moveSize: number): string {
    const personaType = persona?.type || 'Current client';
    
    if (riskProfile <= 2) {
      return `${moveSize.toFixed(1)}% movement causes significant stress for ${personaType}. Portfolio may need defensive positioning.`;
    } else if (riskProfile >= 4) {
      return `${moveSize.toFixed(1)}% movement within normal range for ${personaType}. Potential opportunity to rebalance.`;
    } else {
      return `${moveSize.toFixed(1)}% movement requires monitoring for ${personaType}. Assess if trend continues.`;
    }
  }

  /**
   * Get volatility recommendation
   */
  private getVolatilityRecommendation(riskProfile: number, persona: any): string {
    if (riskProfile <= 2) {
      return "Consider increasing cash allocation temporarily. Avoid making major changes during emotional stress.";
    } else if (riskProfile >= 4) {
      return "Maintain strategic allocation. Consider opportunistic rebalancing if fundamentals remain strong.";
    } else {
      return "Monitor closely but avoid knee-jerk reactions. Review allocation if volatility persists beyond normal range.";
    }
  }

  /**
   * Get persona-specific volatility response
   */
  private getPersonaVolatilityResponse(persona: any): string {
    const personaType = persona?.type || '';
    
    if (personaType.includes('Guardian') || personaType.includes('Conservative')) {
      return "seek safety and may want to reduce risk during volatile periods";
    } else if (personaType.includes('Growth') || personaType.includes('Aggressive')) {
      return "view volatility as opportunity and maintain long-term focus";
    } else {
      return "need reassurance during volatile periods while maintaining strategic direction";
    }
  }

  /**
   * Get rate environment impact
   */
  private getRateEnvironmentImpact(riskProfile: number, currentRate: number): string {
    if (currentRate > 4) {
      return riskProfile <= 2 ? 
        "High rates boost income from safe assets, supporting conservative strategy" :
        "High rates create headwinds for growth assets but improve bond opportunities";
    } else {
      return riskProfile <= 2 ? 
        "Low rates reduce income from safe assets, may need to extend duration" :
        "Low rates support growth assets, maintain equity allocation";
    }
  }

  /**
   * Get rate environment recommendation
   */
  private getRateEnvironmentRecommendation(riskProfile: number, currentRate: number): string {
    if (currentRate > 4) {
      return riskProfile <= 2 ? 
        "Consider locking in higher yields with longer-term bonds and CDs" :
        "Maintain patience with growth strategy, consider adding quality bonds";
    } else {
      return riskProfile <= 2 ? 
        "Focus on inflation-protected bonds and dividend-paying equities" :
        "Favorable environment for growth assets, maintain strategic allocation";
    }
  }

  /**
   * Get cash flow recommendation
   */
  private getCashFlowRecommendation(riskProfile: number, persona: any): string {
    const emergencyMonths = riskProfile <= 2 ? "12-18 months" : "6-12 months";
    return `Maintain ${emergencyMonths} of expenses in cash equivalents. Consider laddered CDs or money market funds for better yields.`;
  }

  /**
   * Get emergency fund recommendation
   */
  private getEmergencyFundRecommendation(riskProfile: number): string {
    if (riskProfile <= 2) return "substantial emergency reserves for peace of mind";
    if (riskProfile >= 4) return "adequate emergency reserves while maximizing growth";
    return "balanced emergency reserves supporting overall strategy";
  }

  /**
   * Assess compliance alignment
   */
  private assessComplianceAlignment(riskMetrics: any, clientPersona: any): ComplianceScore {
    let suitabilityAlignment = 85; // Base score
    let consumerDutyScore = 80;   // Base score
    let riskProfileConfidence = 90; // Base score
    let vulnerabilityFlags: string[] = [];

    // Check ATR/CFL alignment
    if (riskMetrics.atrScore && riskMetrics.cflScore) {
      const alignment = Math.abs(riskMetrics.atrScore - riskMetrics.cflScore);
      if (alignment > 1.5) {
        suitabilityAlignment -= 15;
        vulnerabilityFlags.push("Significant ATR/CFL misalignment requires review");
      }
    }

    // Check persona alignment
    if (clientPersona) {
      consumerDutyScore += 15; // Bonus for having persona
      if (clientPersona.consumerDutyAlignment) {
        consumerDutyScore += 5; // Additional bonus
      }
    }

    return {
      suitabilityAlignment: Math.max(0, suitabilityAlignment),
      consumerDutyScore: Math.min(100, consumerDutyScore),
      riskProfileConfidence: riskProfileConfidence,
      vulnerabilityFlags
    };
  }

  /**
   * Fetch market data from Alpha Vantage API
   */
  async getMarketData(): Promise<MarketData> {
    try {
      // Fetch FTSE 100 data from Alpha Vantage
      const ftseResponse = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=UKX&apikey=${this.alphaVantageKey}`
      );
      
      if (!ftseResponse.ok) {
        throw new Error(`Alpha Vantage API error: ${ftseResponse.status}`);
      }
      
      const ftseData = await ftseResponse.json();
      
      // Parse Alpha Vantage response
      const globalQuote = ftseData['Global Quote'];
      if (!globalQuote) {
        throw new Error('Invalid Alpha Vantage response format');
      }
      
      const ftsePrice = parseFloat(globalQuote['05. price'] || '0');
      const ftseChange = parseFloat(globalQuote['09. change'] || '0');
      const ftseChangePercent = parseFloat(
        (globalQuote['10. change percent'] || '0%').replace('%', '')
      );

      return {
        ftse: {
          price: ftsePrice,
          change: ftseChange,
          changePercent: ftseChangePercent
        },
        bankRate: await this.getBankRate(),
        inflation: await this.getInflationRate(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      clientLogger.error('Market data fetch error:', error);
      // Return realistic mock data for development
      return this.getMockMarketData();
    }
  }

  /**
   * Get Bank of England base rate
   */
  async getBankRate(): Promise<number> {
    try {
      // Note: BoE doesn't have a simple API endpoint
      // In production, would need proper integration or web scraping
      // For now, return current known rate
      return 5.25;
    } catch (error) {
      clientLogger.error('Bank rate fetch error:', error);
      return 5.25; // Fallback to current rate
    }
  }

  /**
   * Get UK inflation rate from Alpha Vantage
   */
  async getInflationRate(): Promise<number> {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=INFLATION&country=united%20kingdom&apikey=${this.alphaVantageKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Inflation API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        return parseFloat(data.data[0].value);
      }
      
      throw new Error('No inflation data available');
    } catch (error) {
      clientLogger.error('Inflation data fetch error:', error);
      return 2.1; // Fallback to approximate current rate
    }
  }

  /**
   * Get economic indicators (placeholder for future expansion)
   */
  async getEconomicIndicators(): Promise<any> {
    // Placeholder for additional economic data
    return {
      gdpGrowth: 0.5,
      unemployment: 4.2,
      consumerConfidence: 85
    };
  }

  /**
   * Get mock market data for development/fallback
   */
  private getMockMarketData(): MarketData {
    return {
      ftse: {
        price: 8234 + (Math.random() - 0.5) * 100,
        change: (Math.random() - 0.5) * 50,
        changePercent: (Math.random() - 0.5) * 2
      },
      bankRate: 5.25,
      inflation: 2.1 + (Math.random() - 0.5) * 0.5,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get fallback analytics when API fails
   */
  private getFallbackAnalytics(riskMetrics: any, clientPersona: any): ClientStoryAnalytics {
    const mockMarketData = this.getMockMarketData();
    
    return {
      clientId: 'current',
      riskProfile: riskMetrics.finalRiskProfile || 3,
      persona: clientPersona,
      marketImpact: this.analyzeMarketImpact(mockMarketData, riskMetrics, clientPersona),
      decisionGuidance: this.generateDecisionGuidance(riskMetrics, clientPersona, mockMarketData),
      complianceAlignment: this.assessComplianceAlignment(riskMetrics, clientPersona),
      timestamp: new Date().toISOString()
    };
  }
}

export default ClientAnalyticsService;
export type { ClientStoryAnalytics, MarketImpactAnalysis, DecisionGuidance, ComplianceScore, MarketData };