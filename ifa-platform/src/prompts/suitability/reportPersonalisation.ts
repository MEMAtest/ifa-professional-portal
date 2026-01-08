export type ReportPersonalisationInput = {
  client: {
    name: string
    age?: number
    occupation?: string
    employmentStatus?: string
    dependants?: number
  }
  objectives: {
    primary?: string
    secondary?: string[]
    timeHorizonYears?: number
    incomeRequirement?: string
  }
  risk: {
    atr?: number
    cfl?: number
    combinedCategory?: string
    atrCategory?: string
    cflCategory?: string
  }
  recommendation: {
    portfolioName?: string
    totalInvestment?: number
    assetAllocation?: {
      equities: number
      bonds: number
      cash: number
      alternatives: number
    }
    products: Array<{
      name: string
      provider?: string
      amount?: number
      reason?: string
    }>
  }
  alternatives?: Array<{
    name: string
    pros: string[]
    cons: string[]
  }>
}

export const personalisationPrompts = {
  whySuitable: {
    system:
      'You are a senior UK financial adviser writing suitability explanations. Be specific to this client and use a professional, warm tone. Use second person ("you", "your"). Return JSON only.',
    user: (data: ReportPersonalisationInput) => `Return a JSON object with a single key "narrative" containing 3-4 paragraphs explaining why the recommendation is suitable. Link products to objectives and mention how the allocation aligns with the risk profile.

CLIENT: ${data.client.name}
AGE: ${data.client.age ?? 'Not provided'}
OCCUPATION: ${data.client.occupation ?? 'Not provided'}
EMPLOYMENT STATUS: ${data.client.employmentStatus ?? 'Not provided'}
DEPENDANTS: ${data.client.dependants ?? 'Not provided'}

OBJECTIVES:
Primary: ${data.objectives.primary ?? 'Not provided'}
Secondary: ${(data.objectives.secondary && data.objectives.secondary.length ? data.objectives.secondary.join(', ') : 'None')}
Time horizon (years): ${data.objectives.timeHorizonYears ?? 'Not provided'}
Income requirement: ${data.objectives.incomeRequirement ?? 'Not provided'}

RISK PROFILE:
ATR: ${data.risk.atr ?? 'Not assessed'} / 10
CFL: ${data.risk.cfl ?? 'Not assessed'} / 10
Combined category: ${data.risk.combinedCategory ?? 'Not assessed'}

RECOMMENDATION:
Portfolio: ${data.recommendation.portfolioName ?? 'Not provided'}
Total investment: ${data.recommendation.totalInvestment ?? 'Not provided'}
Asset allocation: ${data.recommendation.assetAllocation ? `${data.recommendation.assetAllocation.equities}% equities, ${data.recommendation.assetAllocation.bonds}% bonds, ${data.recommendation.assetAllocation.cash}% cash, ${data.recommendation.assetAllocation.alternatives}% alternatives` : 'Not provided'}
Products:
${data.recommendation.products.map((p) => `- ${p.name} (${p.provider ?? 'Provider not provided'}), amount ${p.amount ?? 'Not provided'}`).join('\n')}
`
  },
  executiveSummary: {
    system:
      'You are a senior UK financial adviser writing an executive summary for a suitability report. Use a clear, concise tone. Return JSON only.',
    user: (data: ReportPersonalisationInput) => `Return a JSON object with a single key "summary" containing a 150-200 word executive summary. Cover who the client is, their objectives, the recommendation, why it is suitable, and the next step.

CLIENT: ${data.client.name}
AGE: ${data.client.age ?? 'Not provided'}
OCCUPATION: ${data.client.occupation ?? 'Not provided'}

OBJECTIVES:
Primary: ${data.objectives.primary ?? 'Not provided'}
Secondary: ${(data.objectives.secondary && data.objectives.secondary.length ? data.objectives.secondary.join(', ') : 'None')}
Time horizon (years): ${data.objectives.timeHorizonYears ?? 'Not provided'}
Income requirement: ${data.objectives.incomeRequirement ?? 'Not provided'}

RISK PROFILE:
ATR: ${data.risk.atr ?? 'Not assessed'} / 10
CFL: ${data.risk.cfl ?? 'Not assessed'} / 10
Combined category: ${data.risk.combinedCategory ?? 'Not assessed'}

RECOMMENDATION:
Portfolio: ${data.recommendation.portfolioName ?? 'Not provided'}
Total investment: ${data.recommendation.totalInvestment ?? 'Not provided'}
Products:
${data.recommendation.products.map((p) => `- ${p.name} (${p.provider ?? 'Provider not provided'}), amount ${p.amount ?? 'Not provided'}`).join('\n')}
`
  },
  alternativeRejection: {
    system:
      'You are a senior UK financial adviser explaining why alternative options were not suitable. Be specific to the client and objectives. Return JSON only.',
    user: (data: ReportPersonalisationInput) => `Return a JSON object with a key "rejections" containing an array of objects with "option" and "reason" fields. Provide 1-2 sentences per alternative.

CLIENT: ${data.client.name}
OBJECTIVES: ${data.objectives.primary ?? 'Not provided'}
RISK CATEGORY: ${data.risk.combinedCategory ?? 'Not assessed'}

ALTERNATIVES:
${(data.alternatives || []).map((o) => `- ${o.name}: pros (${o.pros.join('; ') || 'None'}), cons (${o.cons.join('; ') || 'None'})`).join('\n')}
`
  },
  objectiveAlignment: {
    system:
      'You are a senior UK financial adviser mapping client objectives to the recommendation. Return JSON only.',
    user: (data: ReportPersonalisationInput) => `Return a JSON object with a key "alignments" containing an array of {"objective","narrative","products"}. For each objective, explain how the recommendation addresses it and list relevant products.

OBJECTIVES:
Primary: ${data.objectives.primary ?? 'Not provided'}
Secondary: ${(data.objectives.secondary && data.objectives.secondary.length ? data.objectives.secondary.join(', ') : 'None')}

RECOMMENDATION PRODUCTS:
${data.recommendation.products.map((p) => `- ${p.name} (${p.provider ?? 'Provider not provided'})`).join('\n')}
`
  },
  productJustification: {
    system:
      'You are a senior UK financial adviser providing product-by-product justification. Be specific and concise. Return JSON only.',
    user: (data: ReportPersonalisationInput) => `Return a JSON object with a key "justifications" containing an array of {"product","narrative"}. For each product, explain why it is suitable and how it supports objectives.

CLIENT OBJECTIVE: ${data.objectives.primary ?? 'Not provided'}
RISK CATEGORY: ${data.risk.combinedCategory ?? 'Not assessed'}

PRODUCTS:
${data.recommendation.products.map((p) => `- ${p.name} (${p.provider ?? 'Provider not provided'}), amount ${p.amount ?? 'Not provided'}`).join('\n')}
`
  },
  riskReconciliation: {
    system:
      'You are a senior UK financial adviser explaining ATR vs CFL reconciliation in line with FCA guidance. Return JSON only.',
    user: (data: ReportPersonalisationInput) => `Return a JSON object with a single key "narrative" explaining how ATR and CFL were reconciled and why the lower measure was used.

ATR: ${data.risk.atr ?? 'Not assessed'} / 10 (${data.risk.atrCategory ?? 'Not assessed'})
CFL: ${data.risk.cfl ?? 'Not assessed'} / 10 (${data.risk.cflCategory ?? 'Not assessed'})
Combined category: ${data.risk.combinedCategory ?? 'Not assessed'}
`
  }
}
