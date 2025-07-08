// ================================================================
// FILE 5: Create Investor Personas Data
// Path: ifa-platform/src/data/investorPersonas.ts
// ================================================================

export interface InvestorPersona {
  type: string
  avatar: string
  description: string
  motivations: string[]
  fears: string[]
  communicationStyle: string
  suitableStrategies: string[]
  warningTriggers: string[]
  emotionalDrivers: {
    primary: string
    secondary: string
    deepFear: string
  }
  psychologicalProfile: {
    decisionMaking: string
    stressResponse: string
    trustBuilding: string
    confidence: string
  }
  emotionalTriggers: {
    positive: string[]
    negative: string[]
  }
  communicationNeeds: {
    frequency: string
    style: string
    format: string
    meetingPreference: string
  }
  consumerDutyAlignment: {
    products: string
    value: string
    outcome: string
    support: string
  }
  behavioralTraits: string[]
  monitoringNeeds: string
}

export const investorPersonas: Record<string, InvestorPersona> = {
  "1": {
    type: "The Security Seeker",
    avatar: "🛡️",
    description: "Prioritizes capital preservation and seeks guaranteed returns with minimal risk",
    motivations: ["Capital protection", "Predictable income", "Peace of mind"],
    fears: ["Market volatility", "Capital loss", "Complex products"],
    communicationStyle: "Clear, simple explanations with emphasis on security and guarantees",
    suitableStrategies: ["Cash ISAs", "Government bonds", "Guaranteed products"],
    warningTriggers: ["Volatile investments", "Complex structures", "High fees"],
    emotionalDrivers: {
      primary: "Security and protection of wealth above all else",
      secondary: "Steady, predictable income for peace of mind",
      deepFear: "Losing money and not being able to recover financially"
    },
    psychologicalProfile: {
      decisionMaking: "Highly cautious and risk-averse - seeks certainty",
      stressResponse: "Becomes anxious with any volatility or uncertainty",
      trustBuilding: "Values transparency and proven track records",
      confidence: "Low in market-based investments, high in guaranteed products"
    },
    emotionalTriggers: {
      positive: ["Guarantees", "Capital protection", "Simplicity", "Track record"],
      negative: ["Volatility", "Complexity", "High fees", "Past losses"]
    },
    communicationNeeds: {
      frequency: "Regular contact for reassurance",
      style: "Simple, clear language avoiding jargon",
      format: "Written confirmations and guarantees",
      meetingPreference: "Face-to-face with detailed documentation"
    },
    consumerDutyAlignment: {
      products: "Simple, transparent products with capital guarantees",
      value: "Low fees with clear, predictable returns",
      outcome: "Capital preservation with modest, steady growth",
      support: "Regular communication and educational support"
    },
    behavioralTraits: ["Risk-averse", "Security-focused", "Conservative"],
    monitoringNeeds: "Frequent updates, conservative approach validation"
  },
  "2": {
    type: "The Cautious Accumulator",
    avatar: "🏦",
    description: "Seeks steady growth while maintaining a conservative approach to risk",
    motivations: ["Steady growth", "Income generation", "Wealth preservation"],
    fears: ["Significant losses", "Inflation erosion", "Market timing"],
    communicationStyle: "Detailed analysis with focus on defensive strategies and steady returns",
    suitableStrategies: ["Mixed asset funds", "Corporate bonds", "Dividend stocks"],
    warningTriggers: ["Aggressive growth", "Speculative investments", "High volatility"],
    emotionalDrivers: {
      primary: "Steady wealth accumulation without significant risk",
      secondary: "Protection against inflation while growing assets",
      deepFear: "Significant portfolio declines during retirement years"
    },
    psychologicalProfile: {
      decisionMaking: "Methodical and research-focused - prefers proven strategies",
      stressResponse: "Seeks reassurance during market downturns",
      trustBuilding: "Values expertise and consistent communication",
      confidence: "Moderate in balanced approaches, low in aggressive strategies"
    },
    emotionalTriggers: {
      positive: ["Steady performance", "Dividend income", "Defensive positioning", "Proven strategies"],
      negative: ["High volatility", "Speculative investments", "Market timing", "Aggressive tactics"]
    },
    communicationNeeds: {
      frequency: "Quarterly reviews with market updates",
      style: "Professional analysis with risk management focus",
      format: "Detailed reports with performance comparisons",
      meetingPreference: "Structured meetings with clear agendas"
    },
    consumerDutyAlignment: {
      products: "Diversified, defensive investment solutions",
      value: "Reasonable fees for professional risk management",
      outcome: "Steady growth with capital protection focus",
      support: "Regular reviews and market education"
    },
    behavioralTraits: ["Methodical", "Risk-aware", "Income-focused"],
    monitoringNeeds: "Quarterly performance reviews, defensive strategy confirmation"
  },
  "3": {
    type: "The Balanced Navigator",
    avatar: "⚖️",
    description: "Balances growth objectives with risk management through diversified approach",
    motivations: ["Balanced growth", "Diversification", "Long-term planning"],
    fears: ["Poor diversification", "Missing opportunities", "Inadequate returns"],
    communicationStyle: "Analytical discussions with scenario modeling and probability-based explanations",
    suitableStrategies: ["Mixed asset portfolios", "Global diversification", "Target date funds"],
    warningTriggers: ["Asset concentration", "Strategy drift", "Changing goals"],
    emotionalDrivers: {
      primary: "Optimized returns with controlled risk",
      secondary: "Financial goals achievement and lifestyle maintenance",
      deepFear: "Sub-optimal decisions that compromise long-term wealth"
    },
    psychologicalProfile: {
      decisionMaking: "Analytical and evidence-based - wants to see the data",
      stressResponse: "Seeks logical explanations and maintains long-term perspective",
      trustBuilding: "Respects competence and appreciates transparent communication",
      confidence: "High in balanced approaches, moderate in extreme strategies"
    },
    emotionalTriggers: {
      positive: ["Data-driven decisions", "Diversification", "Performance attribution", "Strategic thinking"],
      negative: ["Emotional decisions", "Concentration risk", "Short-term thinking", "Poor communication"]
    },
    communicationNeeds: {
      frequency: "Bi-annual reviews with performance attribution",
      style: "Analytical with supporting data and rationale",
      format: "Detailed reports with charts and benchmarking",
      meetingPreference: "Professional presentations with Q&A sessions"
    },
    consumerDutyAlignment: {
      products: "Diversified multi-asset funds with clear risk/return objectives",
      value: "Competitive fees for sophisticated portfolio management and rebalancing",
      outcome: "Long-term wealth growth with managed volatility and good diversification",
      support: "Bi-annual reviews, performance attribution reports, strategy updates"
    },
    behavioralTraits: ["Rational decision making", "Goal oriented", "Analytically minded"],
    monitoringNeeds: "Bi-annual reviews, performance reports, rebalancing notifications"
  },
  "4": {
    type: "The Growth Seeker",
    avatar: "📈",
    description: "Focuses on long-term growth potential and willing to accept higher volatility",
    motivations: ["Capital growth", "Wealth building", "Long-term planning"],
    fears: ["Inflation erosion", "Conservative returns", "Missing growth opportunities"],
    communicationStyle: "Forward-looking discussions with growth scenarios and market insights",
    suitableStrategies: ["Growth funds", "Equity portfolios", "International exposure"],
    warningTriggers: ["Defensive positioning", "Short-term thinking", "Risk reduction"],
    emotionalDrivers: {
      primary: "Wealth accumulation and financial freedom",
      secondary: "Legacy building and lifestyle enhancement",
      deepFear: "Falling behind inflation and missing life opportunities"
    },
    psychologicalProfile: {
      decisionMaking: "Future-focused and opportunity-driven - thinks in decades",
      stressResponse: "Views volatility as opportunity, maintains growth focus",
      trustBuilding: "Values expertise in growth investing and market insights",
      confidence: "High in long-term markets, comfortable with volatility"
    },
    emotionalTriggers: {
      positive: ["Growth potential", "Long-term thinking", "Market opportunities", "Wealth building"],
      negative: ["Overly conservative advice", "Short-term focus", "Guaranteed products", "Inflation risk"]
    },
    communicationNeeds: {
      frequency: "Annual reviews with market outlook updates",
      style: "Growth-focused with future scenarios and opportunities",
      format: "Forward-looking projections and market analysis",
      meetingPreference: "Strategic discussions about opportunities and trends"
    },
    consumerDutyAlignment: {
      products: "Growth-oriented funds with strong long-term track records and clear strategies",
      value: "Acceptable fees for active management and access to growth opportunities",
      outcome: "Strong long-term returns that significantly outpace inflation",
      support: "Annual reviews, market outlook sessions, long-term planning workshops"
    },
    behavioralTraits: ["Optimistic outlook", "Long-term focus", "Growth oriented"],
    monitoringNeeds: "Annual reviews, growth tracking, long-term projections"
  },
  "5": {
    type: "The Ambitious Achiever",
    avatar: "🚀",
    description: "Seeks maximum growth potential and comfortable with high volatility for superior returns",
    motivations: ["Maximum returns", "Wealth maximization", "Financial independence"],
    fears: ["Conservative positioning", "Opportunity cost", "Inflation"],
    communicationStyle: "Sophisticated analysis with advanced strategies and alternative options",
    suitableStrategies: ["Aggressive growth funds", "Alternative investments", "Emerging markets"],
    warningTriggers: ["Risk reduction", "Conservative advice", "Short-term focus"],
    emotionalDrivers: {
      primary: "Maximizing wealth potential and achieving financial dominance",
      secondary: "Independence from traditional constraints and early retirement",
      deepFear: "Mediocre returns and missing transformative opportunities"
    },
    psychologicalProfile: {
      decisionMaking: "Confident and aggressive - willing to act on conviction",
      stressResponse: "Sees volatility as natural, may increase risk during downturns",
      trustBuilding: "Respects sophisticated analysis and cutting-edge strategies",
      confidence: "Very high in markets and personal judgment, impatient with restrictions"
    },
    emotionalTriggers: {
      positive: ["Maximum growth", "Sophisticated strategies", "Market leadership", "Alternative investments"],
      negative: ["Conservative restrictions", "Average returns", "Regulatory limitations", "Risk aversion"]
    },
    communicationNeeds: {
      frequency: "Ongoing access with strategic updates as needed",
      style: "Sophisticated analysis with advanced concepts and alternatives",
      format: "Detailed strategy papers and opportunity analysis",
      meetingPreference: "Strategic partnerships with access to exclusive opportunities"
    },
    consumerDutyAlignment: {
      products: "High-growth portfolios with access to sophisticated investment opportunities",
      value: "Premium fees for alpha generation and advanced portfolio management",
      outcome: "Superior long-term returns that significantly exceed market benchmarks",
      support: "Ongoing strategic consultation and access to exclusive opportunities"
    },
    behavioralTraits: ["Confident", "Ambitious", "Results-driven"],
    monitoringNeeds: "Ongoing monitoring, performance versus aggressive benchmarks"
  }
}