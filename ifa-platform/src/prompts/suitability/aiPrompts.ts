// =====================================================
// FILE: src/prompts/suitability/aiPrompts.ts
// AI PROMPTS FOR SUITABILITY ASSESSMENT
// =====================================================

export const suitabilityAIPrompts = {
  fieldSuggestion: {
    system: `You are a UK financial advisory AI assistant helping complete suitability assessments.
    Follow FCA guidelines including COBS 9.2, Consumer Duty, and vulnerability guidance.
    Provide specific, actionable suggestions based on the client's circumstances.
    Always prioritize client best interests and regulatory compliance.
    Output valid JSON format for all responses.`,
    
    user: (fieldId: string, sectionId: string, context: any) => `
      Based on the following client information:
      ${JSON.stringify(context, null, 2)}
      
      Provide a suitable value/suggestion for the field "${fieldId}" in section "${sectionId}".
      
      Consider:
      - Client's age and life stage
      - Financial capacity and circumstances
      - Risk tolerance and capacity for loss
      - Investment objectives and timeline
      - Regulatory requirements
      
      Return ONLY a JSON object with:
      {
        "suggestion": "the suggested value",
        "reasoning": "brief explanation",
        "confidence": 0.0-1.0,
        "alternatives": ["other options if applicable"],
        "regulatory_consideration": "any FCA compliance notes"
      }
    `
  },
  
  riskAssessment: {
    system: `You are a risk assessment specialist analyzing client risk profiles for FCA-compliant financial advice.
    Consider both attitude to risk (ATR) and capacity for loss (CFL).
    Ensure recommendations align with FCA COBS 9.2 suitability requirements.`,
    
    user: (clientData: any) => `
      Client Profile:
      Age: ${clientData.personal_information?.age}
      Employment: ${clientData.personal_information?.employment_status}
      Annual Income: £${clientData.financial_situation?.annual_income}
      Monthly Expenses: £${clientData.financial_situation?.monthly_expenditure}
      Liquid Assets: £${clientData.financial_situation?.liquid_assets}
      Net Worth: £${clientData.financial_situation?.net_worth}
      Investment Amount: £${clientData.objectives?.investment_amount}
      Time Horizon: ${clientData.objectives?.time_horizon} years
      Primary Objective: ${clientData.objectives?.primary_objective}
      
      ATR Score: ${clientData.atrScore || 'Not assessed'}
      CFL Score: ${clientData.cflScore || 'Not assessed'}
      
      Analyze and provide:
      1. Recommended risk level (1-7 scale)
      2. Capacity for loss assessment
      3. Any discrepancies between ATR and CFL
      4. Suitable asset allocation
      5. Risk-related warnings or considerations
      
      Return JSON with:
      {
        "suggestedATR": 1-7,
        "suggestedCFL": "percentage",
        "reasoning": "detailed explanation",
        "riskProfile": "Conservative/Balanced/Growth/Aggressive",
        "warnings": ["any concerns"],
        "recommendedAllocation": {
          "equities": percentage,
          "bonds": percentage,
          "alternatives": percentage,
          "cash": percentage
        },
        "fcaConsiderations": "compliance notes"
      }
    `
  },
  
  validation: {
    system: `You are a compliance expert reviewing suitability assessments for FCA compliance.
    Check against Consumer Duty requirements, vulnerability guidance, and COBS rules.
    Identify any gaps, inconsistencies, or compliance issues.`,
    
    user: (formData: any) => `
      Review this suitability assessment for compliance:
      ${JSON.stringify(formData, null, 2)}
      
      Check for:
      1. Missing critical information (COBS 9.2)
      2. Inconsistencies between sections
      3. Consumer Duty compliance
      4. Vulnerability considerations
      5. Cost and charges transparency
      6. Suitable recommendations
      
      Return JSON with:
      {
        "issues": [
          {
            "field": "fieldname",
            "issue": "description",
            "severity": "high|medium|low",
            "fcaReference": "relevant rule"
          }
        ],
        "suggestions": ["improvements"],
        "fcaCompliant": true/false,
        "consumerDutyMet": true/false,
        "vulnerabilityAddressed": true/false,
        "overallAssessment": "summary"
      }
    `
  },
  
  financialAnalysis: {
    system: `You are a financial analyst providing insights on client financial situations.
    Calculate key metrics, identify opportunities, and highlight concerns.
    Consider tax efficiency, emergency funds, and investment capacity.`,
    
    user: (financialData: any) => `
      Analyze the client's financial situation:
      
      Income: £${financialData.annual_income} per year
      Expenses: £${financialData.monthly_expenditure} per month
      Liquid Assets: £${financialData.liquid_assets}
      Property Value: £${financialData.property_value}
      Mortgage: £${financialData.outstanding_mortgage}
      Other Liabilities: £${financialData.other_liabilities}
      
      Provide comprehensive analysis including:
      1. Cash flow assessment
      2. Emergency fund adequacy
      3. Investment capacity
      4. Debt management recommendations
      5. Tax efficiency opportunities
      
      Return JSON with:
      {
        "fieldSuggestions": {
          "emergency_fund": amount,
          "investment_capacity": amount,
          "recommended_savings_rate": percentage
        },
        "insights": [
          "key findings and observations"
        ],
        "warnings": [
          "any financial concerns"
        ],
        "opportunities": [
          "potential improvements"
        ],
        "metrics": {
          "debtToIncomeRatio": number,
          "savingsRate": percentage,
          "liquidityRatio": number,
          "netWorthGrowthPotential": percentage
        }
      }
    `
  },
  
  vulnerabilityAssessment: {
    system: `You are a vulnerability specialist trained in FCA vulnerability guidance.
    Identify vulnerability factors and recommend appropriate support measures.
    Be sensitive, supportive, and practical in recommendations.`,
    
    user: (clientData: any) => `
      Assess vulnerability indicators for:
      
      Age: ${clientData.age}
      Health Status: ${clientData.health_concerns}
      Life Events: ${clientData.life_events}
      Cognitive Confidence: ${clientData.cognitive_confidence}
      Support Network: ${clientData.support_network}
      Financial Complexity: ${clientData.financial_complexity}
      
      Historical Issues: ${JSON.stringify(clientData.vulnerabilityHistory)}
      
      Provide assessment covering:
      1. Vulnerability status and factors
      2. Required support adjustments
      3. Communication preferences
      4. Review frequency recommendations
      5. Additional safeguards needed
      
      Return JSON with:
      {
        "vulnerabilityStatus": "None|Low|Medium|High",
        "identifiedFactors": ["list of factors"],
        "supportRecommendations": [
          {
            "area": "communication|decision-making|documentation",
            "recommendation": "specific support measure"
          }
        ],
        "reviewFrequency": "Monthly|Quarterly|Annually",
        "additionalSafeguards": ["recommended protections"],
        "fcaGuidanceAlignment": "how recommendations align with FG21/1"
      }
    `
  },
  
  recommendationGeneration: {
    system: `You are a senior financial advisor generating FCA-compliant investment recommendations.
    Ensure all recommendations are suitable, provide fair value, and meet Consumer Duty requirements.
    Consider the whole client circumstances and long-term best interests.`,
    
    user: (assessmentData: any) => `
      Generate comprehensive investment recommendation based on:
      
      CLIENT PROFILE:
      ${JSON.stringify(assessmentData.personal_information, null, 2)}
      
      FINANCIAL SITUATION:
      ${JSON.stringify(assessmentData.financial_situation, null, 2)}
      
      OBJECTIVES:
      ${JSON.stringify(assessmentData.objectives, null, 2)}
      
      RISK PROFILE:
      ATR: ${assessmentData.atrScore} (${assessmentData.atrCategory})
      CFL: ${assessmentData.cflScore} (${assessmentData.cflCategory})
      
      Generate detailed recommendation including:
      1. Executive summary
      2. Recommended strategy
      3. Product selection with rationale
      4. Asset allocation
      5. Implementation timeline
      6. Ongoing monitoring plan
      7. Cost justification
      8. Risk warnings
      
      Return JSON with:
      {
        "executiveSummary": "2-3 sentence overview",
        "recommendedStrategy": "Strategic approach",
        "productRecommendations": [
          {
            "productType": "ISA|Pension|GIA|Bond",
            "provider": "provider name",
            "rationale": "why suitable",
            "allocation": percentage,
            "costs": "annual charges"
          }
        ],
        "assetAllocation": {
          "equities": {
            "percentage": number,
            "breakdown": {
              "uk": percentage,
              "developed": percentage,
              "emerging": percentage
            }
          },
          "fixedIncome": {
            "percentage": number,
            "breakdown": {
              "government": percentage,
              "corporate": percentage,
              "highYield": percentage
            }
          },
          "alternatives": percentage,
          "cash": percentage
        },
        "implementationPlan": [
          {
            "phase": 1,
            "timeline": "Immediate|1 month|3 months",
            "actions": ["specific steps"]
          }
        ],
        "ongoingService": {
          "reviewFrequency": "Quarterly|Bi-annual|Annual",
          "rebalancingTriggers": ["conditions"],
          "reportingSchedule": "frequency"
        },
        "totalCosts": {
          "initial": percentage,
          "ongoing": percentage,
          "breakdown": {
            "adviceFee": percentage,
            "platformFee": percentage,
            "fundCharges": percentage
          }
        },
        "keyRisks": ["important risk warnings"],
        "consumerDutyStatement": "How this meets Consumer Duty requirements",
        "suitabilityStatement": "Why this is suitable for the client"
      }
    `
  },
  
  documentGeneration: {
    system: `You are a document specialist creating FCA-compliant suitability reports.
    Ensure clear, fair, and not misleading communication.
    Include all required regulatory disclosures and warnings.`,
    
    user: (assessmentData: any, reportType: string) => `
      Generate ${reportType} report content for:
      
      Assessment Data:
      ${JSON.stringify(assessmentData, null, 2)}
      
      Create structured content for:
      1. Executive summary
      2. Client objectives and circumstances
      3. Risk profile analysis
      4. Recommendation details
      5. Cost and charges breakdown
      6. Risk warnings and limitations
      7. Next steps and implementation
      
      Return JSON with report sections:
      {
        "reportTitle": "Suitability Assessment Report",
        "reportDate": "date",
        "sections": [
          {
            "title": "Section Title",
            "content": "Formatted content with proper paragraphs",
            "subsections": [
              {
                "title": "Subsection",
                "content": "content"
              }
            ]
          }
        ],
        "disclaimers": ["Required regulatory disclaimers"],
        "appendices": [
          {
            "title": "Appendix Title",
            "content": "Supporting information"
          }
        ]
      }
    `
  }
}

// =====================================================
// HELPER FUNCTIONS FOR PROMPT ENHANCEMENT
// =====================================================

export function enhancePromptWithContext(
  basePrompt: string,
  additionalContext: Record<string, any>
): string {
  const contextString = Object.entries(additionalContext)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n')
  
  return `${basePrompt}\n\nAdditional Context:\n${contextString}`
}

export function addRegulatoryContext(prompt: string): string {
  const regulatoryContext = `
    Key Regulatory Requirements:
    - COBS 9.2: Assessing suitability
    - COBS 9.3: Guidance on assessing suitability
    - PRIN 12: Consumer Duty
    - FG21/1: Guidance for firms on fair treatment of vulnerable customers
    - COBS 6.1ZA: Costs and charges disclosure
    
    Ensure all suggestions and recommendations comply with these requirements.
  `
  
  return `${prompt}\n\n${regulatoryContext}`
}

export function addVulnerabilityConsiderations(
  prompt: string,
  vulnerabilityFactors?: string[]
): string {
  if (!vulnerabilityFactors || vulnerabilityFactors.length === 0) {
    return prompt
  }
  
  const vulnerabilityContext = `
    Identified Vulnerability Factors:
    ${vulnerabilityFactors.map(f => `- ${f}`).join('\n')}
    
    Please ensure recommendations account for these vulnerabilities and suggest appropriate support measures.
  `
  
  return `${prompt}\n\n${vulnerabilityContext}`
}

// =====================================================
// PROMPT TEMPLATES FOR SPECIFIC SCENARIOS
// =====================================================

export const scenarioPrompts = {
  retirementPlanning: {
    system: `Specialist in retirement planning and pension optimization.
    Consider tax efficiency, lifetime allowances, and income sustainability.`,
    
    enhance: (data: any) => `
      Focus on retirement planning for client aged ${data.age} 
      with target retirement at ${data.target_retirement_age}.
      Current pension value: £${data.pension_value}
      State pension forecast: £${data.state_pension}
    `
  },
  
  estatePlanning: {
    system: `Expert in estate planning and inheritance tax mitigation.
    Consider IHT thresholds, gifting allowances, and trust structures.`,
    
    enhance: (data: any) => `
      Estate planning considerations for estate valued at £${data.net_worth}.
      Beneficiaries: ${data.beneficiaries}
      IHT exposure: £${Math.max(0, data.net_worth - 325000)}
    `
  },
  
  protectionPlanning: {
    system: `Specialist in life insurance and protection planning.
    Consider income protection, critical illness, and life cover needs.`,
    
    enhance: (data: any) => `
      Protection needs for ${data.employment_status} individual
      with ${data.dependents} dependents.
      Outstanding mortgage: £${data.mortgage}
      Monthly expenses: £${data.monthly_expenses}
    `
  }
}

// =====================================================
// EXPORT DEFAULT
// =====================================================

export default suitabilityAIPrompts