import { createClient } from "@/lib/supabase/client"
// =====================================================
// FILE: src/services/aiAssistantService.ts
// FIXED VERSION - NO TYPE ERRORS
// =====================================================

import { 
  SuitabilityFormData, 
  PulledPlatformData, 
  AISuggestion,
  ChartData
} from '@/types/suitability'
import { suitabilityAIPrompts } from '@/prompts/suitability/aiPrompts'
import { createBrowserClient } from '@supabase/ssr'

// =====================================================
// CONFIGURATION
// =====================================================

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || '/api/ai/complete'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_BASE = 1000

// =====================================================
// TYPES
// =====================================================

interface CachedResponse {
  data: any
  timestamp: number
  expiresAt: number
}

interface AIMetrics {
  totalRequests: number
  cacheHits: number
  apiCalls: number
  errors: number
  avgResponseTime: number
}

// Extended types for internal use
interface ExtendedAISuggestion extends AISuggestion {
  sectionId?: string
  generatedAt?: string
}

interface ExtendedPulledPlatformData extends PulledPlatformData {
  previousAssessments?: any[]
  cflDate?: string
  atrDate?: string
}

interface ExtendedChartData extends ChartData {
  title?: string
  description?: string
}

// =====================================================
// AI ASSISTANT SERVICE CLASS
// =====================================================

class AIAssistantService {
  private supabase: any
  private responseCache: Map<string, CachedResponse> = new Map()
  private metrics: AIMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    apiCalls: 0,
    errors: 0,
    avgResponseTime: 0
  }
  
  constructor() {
    this.supabase = createClient()
    
    // Start cache cleanup interval
    this.startCacheCleanup()
  }
  
  // =====================================================
  // CACHE MANAGEMENT
  // =====================================================
  
  private startCacheCleanup() {
    setInterval(() => {
      const now = Date.now()
      const expiredKeys: string[] = []
      
      this.responseCache.forEach((value, key) => {
        if (value.expiresAt < now) {
          expiredKeys.push(key)
        }
      })
      
      expiredKeys.forEach(key => this.responseCache.delete(key))
    }, 5 * 60 * 1000) // 5 minutes
  }
  
  private getCacheKey(sectionId: string, context: any): string {
    const contextStr = JSON.stringify(context)
    const hash = contextStr.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return `ai_${sectionId}_${Math.abs(hash)}`
  }
  
  private getFromCache(key: string): any | null {
    const cached = this.responseCache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      this.metrics.cacheHits++
      return cached.data
    }
    return null
  }
  
  private saveToCache(key: string, data: any) {
    const now = Date.now()
    this.responseCache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS
    })
  }
  
  // =====================================================
  // AI SUGGESTION GENERATION
  // =====================================================
  
  async generateSuggestion(
    sectionId: string,
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): Promise<AISuggestion> {
    this.metrics.totalRequests++
    const startTime = Date.now()
    
    try {
      // Check cache
      const cacheKey = this.getCacheKey(sectionId, { formData, pulledData })
      const cachedResponse = this.getFromCache(cacheKey)
      if (cachedResponse) {
        return cachedResponse
      }
      
      // Build context for AI
      const context = this.buildContext(sectionId, formData, pulledData)
      
      // Get appropriate prompt template
      const promptTemplate = this.getPromptForSection(sectionId)
      
      // Make AI request with proper prompts
      const messages = [
        {
          role: 'system',
          content: promptTemplate.system
        },
        {
          role: 'user',
          content: promptTemplate.user(sectionId, sectionId, context)
        }
      ]
      
      const response = await this.makeAIRequest(messages)
      
      // Parse and validate response
      const suggestion = this.parseAIResponse(response, sectionId)
      
      // Add metadata
      suggestion.sources = this.getUsedSources(pulledData)
      suggestion.confidence = suggestion.confidence || 0.8
      
      // Cache the response
      this.saveToCache(cacheKey, suggestion)
      
      // Update metrics
      const responseTime = Date.now() - startTime
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime * (this.metrics.apiCalls - 1) + responseTime) / this.metrics.apiCalls
      
      return suggestion
      
    } catch (error) {
      console.error('AI suggestion error:', error)
      this.metrics.errors++
      
      // Return fallback suggestion
      return this.createFallbackSuggestion(sectionId, formData, pulledData)
    }
  }
  
  // =====================================================
  // AI REQUEST HANDLING
  // =====================================================
  
  private async makeAIRequest(messages: any[]): Promise<any> {
    this.metrics.apiCalls++
    
    let attempt = 0
    let lastError: any
    
    while (attempt < MAX_RETRY_ATTEMPTS) {
      try {
        const response = await fetch(AI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages })
        })
        
        if (!response.ok) {
          throw new Error(`AI service error: ${response.status}`)
        }
        
        const result = await response.json()
        return result.content
        
      } catch (error) {
        lastError = error
        attempt++
        
        if (attempt < MAX_RETRY_ATTEMPTS) {
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, RETRY_DELAY_BASE * Math.pow(2, attempt))
          )
        }
      }
    }
    
    throw lastError
  }
  
  // =====================================================
  // PROMPT MANAGEMENT
  // =====================================================
  
  private getPromptForSection(sectionId: string) {
    const promptMap: Record<string, keyof typeof suitabilityAIPrompts> = {
      'personal_information': 'fieldSuggestion',
      'financial_situation': 'fieldSuggestion',
      'objectives': 'fieldSuggestion',
      'risk_assessment': 'riskAssessment',
      'knowledge_experience': 'fieldSuggestion',
      'existing_arrangements': 'fieldSuggestion',
      'vulnerability_assessment': 'fieldSuggestion',
      'regulatory_compliance': 'validation',
      'costs_charges': 'fieldSuggestion',
      'recommendation': 'fieldSuggestion',
      'suitability_declaration': 'validation'
    }
    
    const promptKey = promptMap[sectionId] || 'fieldSuggestion'
    return suitabilityAIPrompts[promptKey]
  }
  
  private buildContext(
    sectionId: string,
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): any {
    return {
      currentSection: sectionId,
      sectionData: formData[sectionId as keyof SuitabilityFormData] || {},
      personalInfo: formData.personal_information || {},
      financialSituation: formData.financial_situation || {},
      objectives: formData.objectives || {},
      riskAssessment: formData.risk_assessment || {},
      ...pulledData,
      completionStatus: this.calculateCompletionStatus(formData),
      validationIssues: this.getValidationIssues(formData)
    }
  }
  
  private parseAIResponse(response: string, sectionId: string): AISuggestion {
    try {
      const parsed = typeof response === 'string' ? JSON.parse(response) : response
      
      return {
        fieldSuggestions: parsed.suggestion ? 
          { [sectionId]: parsed.suggestion } : 
          (parsed.fieldSuggestions || {}),
        insights: Array.isArray(parsed.insights) ? 
          parsed.insights : 
          (parsed.reasoning ? [parsed.reasoning] : []),
        warnings: Array.isArray(parsed.warnings) ? 
          parsed.warnings : 
          [],
        confidence: typeof parsed.confidence === 'number' ? 
          parsed.confidence : 
          0.7,
        sources: [],
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      throw error
    }
  }
  
  // =====================================================
  // RISK ASSESSMENT SPECIFIC
  // =====================================================
  
  async analyzeRiskProfile(
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): Promise<any> {
    const messages = [
      {
        role: 'system',
        content: suitabilityAIPrompts.riskAssessment.system
      },
      {
        role: 'user',
        content: suitabilityAIPrompts.riskAssessment.user({
          personal_information: formData.personal_information,
          financial_situation: formData.financial_situation,
          objectives: formData.objectives,
          risk_assessment: formData.risk_assessment,
          ...pulledData
        })
      }
    ]
    
    const response = await this.makeAIRequest(messages)
    return JSON.parse(response)
  }
  
  // =====================================================
  // VALIDATION SUPPORT
  // =====================================================
  
  async validateCompliance(
    formData: SuitabilityFormData
  ): Promise<any> {
    const messages = [
      {
        role: 'system',
        content: suitabilityAIPrompts.validation.system
      },
      {
        role: 'user',
        content: suitabilityAIPrompts.validation.user(formData)
      }
    ]
    
    const response = await this.makeAIRequest(messages)
    return JSON.parse(response)
  }
  
  // =====================================================
  // PLATFORM DATA PULLING
  // =====================================================
  
  async pullPlatformData(clientId: string): Promise<PulledPlatformData> {
    try {
      const [cflData, atrData, vulnerabilityData, clientMetrics, assessmentHistory] = 
        await Promise.all([
          this.pullCFLData(clientId),
          this.pullATRData(clientId),
          this.pullVulnerabilityData(clientId),
          this.pullClientMetrics(clientId),
          this.pullAssessmentHistory(clientId)
        ])
      
      const extendedData: ExtendedPulledPlatformData = {
        ...cflData,
        ...atrData,
        vulnerabilityFactors: vulnerabilityData.factors,
        vulnerabilityScore: vulnerabilityData.score,
        clientMetrics,
        previousAssessments: assessmentHistory
      }
      
      // Return only the properties defined in PulledPlatformData
      const { previousAssessments, cflDate, atrDate, ...platformData } = extendedData
      return platformData
    } catch (error) {
      console.error('Error pulling platform data:', error)
      return {}
    }
  }
  
  private async pullCFLData(clientId: string): Promise<Partial<ExtendedPulledPlatformData>> {
    try {
      const response = await fetch(`/api/assessments/cfl?clientId=${clientId}`)
      if (!response.ok) return {}
      
      const data = await response.json()
      return {
        cflScore: data.score || 50,
        cflCategory: data.category || 'Medium',
        cflDate: data.assessmentDate
      }
    } catch (error) {
      console.error('Error pulling CFL data:', error)
      return { cflScore: 50, cflCategory: 'Medium' }
    }
  }
  
  private async pullATRData(clientId: string): Promise<Partial<ExtendedPulledPlatformData>> {
    try {
      const response = await fetch(`/api/assessments/atr?clientId=${clientId}`)
      if (!response.ok) return {}
      
      const data = await response.json()
      return {
        atrScore: data.score || 50,
        atrCategory: data.category || 'Balanced',
        atrDate: data.assessmentDate
      }
    } catch (error) {
      console.error('Error pulling ATR data:', error)
      return { atrScore: 50, atrCategory: 'Balanced' }
    }
  }
  
  private async pullVulnerabilityData(clientId: string) {
    try {
      const response = await fetch(`/api/clients/${clientId}`)
      if (!response.ok) return { factors: [], score: 'Low' }
      
      const client = await response.json()
      return {
        factors: client.vulnerabilityAssessment?.vulnerabilityFactors || [],
        score: client.vulnerabilityAssessment?.is_vulnerable ? 'High' : 'Low'
      }
    } catch (error) {
      console.error('Error pulling vulnerability data:', error)
      return { factors: [], score: 'Unknown' }
    }
  }
  
  private async pullClientMetrics(clientId: string) {
    try {
      const response = await fetch(`/api/clients/${clientId}`)
      if (!response.ok) return {}
      
      const client = await response.json()
      return {
        totalAssets: client.financialProfile?.totalAssets || 0,
        totalLiabilities: client.financialProfile?.totalLiabilities || 0,
        monthlyIncome: client.financialProfile?.monthlyIncome || 0,
        monthlyExpenses: client.financialProfile?.monthlyExpenses || 0,
        investmentExperience: client.investmentProfile?.experience || 'None'
      }
    } catch (error) {
      console.error('Error pulling client metrics:', error)
      return {}
    }
  }
  
  private async pullAssessmentHistory(clientId: string) {
    try {
      const response = await fetch(`/api/assessments?clientId=${clientId}&limit=5`)
      if (!response.ok) return []
      
      const data = await response.json()
      const assessments = Array.isArray(data) ? data : 
                         (data.data && Array.isArray(data.data)) ? data.data : []
      
      return assessments.map((a: any) => ({
        id: a.id,
        type: a.type,
        date: a.createdAt || a.created_at,
        score: a.score,
        status: a.status
      }))
    } catch (error) {
      console.error('Error pulling assessment history:', error)
      return []
    }
  }
  
  // =====================================================
  // CHART GENERATION
  // =====================================================
  
  async generateChartData(
    sectionId: string,
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): Promise<ChartData | null> {
    switch (sectionId) {
      case 'financial_situation':
        return this.generateFinancialChart(formData, pulledData)
      case 'risk_assessment':
        return this.generateRiskChart(formData, pulledData)
      case 'objectives':
        return this.generateObjectivesChart(formData, pulledData)
      case 'recommendation':
        return this.generateAllocationChart(formData, pulledData)
      default:
        return null
    }
  }
  
  private generateFinancialChart(
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): ChartData {
    const financial = formData.financial_situation || {}
    
    const chart: ExtendedChartData = {
      type: 'pie',
      title: 'Net Worth Breakdown',
      description: 'Visual representation of your current financial position',
      data: {
        labels: ['Liquid Assets', 'Property Equity', 'Liabilities'],
        datasets: [{
          data: [
            Math.abs(financial.liquid_assets || 0),
            Math.max(0, (financial.property_value || 0) - (financial.outstanding_mortgage || 0)),
            Math.abs((financial.other_liabilities || 0) + (financial.outstanding_mortgage || 0))
          ],
          backgroundColor: ['#10B981', '#3B82F6', '#EF4444'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    }
    
    // Return without the title property to match ChartData type
    const { title, ...validChart } = chart
    return validChart
  }
  
  private generateRiskChart(
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): ChartData {
    const chart: ExtendedChartData = {
      type: 'radar',
      title: 'Risk Profile Analysis',
      description: 'Multi-dimensional view of your risk characteristics',
      data: {
        labels: [
          'Risk Tolerance',
          'Risk Capacity',
          'Investment Knowledge',
          'Time Horizon',
          'Loss Acceptance'
        ],
        datasets: [{
          label: 'Your Profile',
          data: [
            pulledData.atrScore || 50,
            pulledData.cflScore || 50,
            this.calculateKnowledgeScore(formData),
            this.calculateTimeHorizonScore(formData),
            this.calculateLossAcceptanceScore(formData)
          ],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)'
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    }
    
    const { title, ...validChart } = chart
    return validChart
  }
  
  private generateObjectivesChart(
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): ChartData {
    const objectives = formData.objectives || {}
    const years = Array.from({ length: objectives.time_horizon || 10 }, (_, i) => i + 1)
    const initialAmount = objectives.investment_amount || 0
    const monthlyContribution = objectives.additional_contributions || 0
    
    const chart: ExtendedChartData = {
      type: 'line',
      title: 'Investment Growth Projection',
      description: 'Projected portfolio value over your investment timeline',
      data: {
        labels: years.map(y => `Year ${y}`),
        datasets: [
          {
            label: 'Conservative (3% p.a.)',
            data: this.calculateProjection(initialAmount, monthlyContribution, 0.03, years.length),
            borderColor: 'rgb(34, 197, 94)',
            tension: 0.4
          },
          {
            label: 'Moderate (5% p.a.)',
            data: this.calculateProjection(initialAmount, monthlyContribution, 0.05, years.length),
            borderColor: 'rgb(59, 130, 246)',
            tension: 0.4
          },
          {
            label: 'Growth (7% p.a.)',
            data: this.calculateProjection(initialAmount, monthlyContribution, 0.07, years.length),
            borderColor: 'rgb(245, 158, 11)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' }
        }
      }
    }
    
    const { title, ...validChart } = chart
    return validChart
  }
  
  private generateAllocationChart(
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): ChartData {
    const riskLevel = formData.risk_assessment?.attitude_to_risk || '4 - Medium Risk'
    const riskNum = parseInt(riskLevel.match(/\d/)?.[0] || '4')
    
    let allocation = { equities: 60, bonds: 35, alternatives: 5 }
    
    if (riskNum <= 2) {
      allocation = { equities: 20, bonds: 70, alternatives: 10 }
    } else if (riskNum >= 6) {
      allocation = { equities: 80, bonds: 15, alternatives: 5 }
    }
    
    // Use 'pie' instead of 'doughnut' as it's a valid ChartData type
    const chart: ExtendedChartData = {
      type: 'pie',
      title: 'Recommended Asset Allocation',
      description: 'Strategic allocation based on your risk profile',
      data: {
        labels: ['Equities', 'Bonds', 'Alternatives'],
        datasets: [{
          data: [allocation.equities, allocation.bonds, allocation.alternatives],
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    }
    
    const { title, ...validChart } = chart
    return validChart
  }
  
  // =====================================================
  // HELPER METHODS
  // =====================================================
  
  private calculateCompletionStatus(formData: SuitabilityFormData): any {
    const sections = [
      'personal_information',
      'contact_details',
      'financial_situation',
      'objectives',
      'risk_assessment',
      'knowledge_experience',
      'existing_arrangements',
      'vulnerability_assessment',
      'regulatory_compliance',
      'costs_charges',
      'recommendation',
      'suitability_declaration'
    ]
    
    const completed = sections.filter(section => {
      const data = formData[section as keyof SuitabilityFormData]
      return data && Object.keys(data).length > 0
    })
    
    return {
      completedSections: completed,
      totalSections: sections.length,
      percentage: Math.round((completed.length / sections.length) * 100)
    }
  }
  
  private getValidationIssues(formData: SuitabilityFormData): string[] {
    const issues: string[] = []
    
    // Check required fields
    if (!formData.personal_information?.client_name) {
      issues.push('Client name is required')
    }
    
    if (!formData.objectives?.primary_objective) {
      issues.push('Primary objective is required')
    }
    
    if (!formData.risk_assessment?.attitude_to_risk) {
      issues.push('Risk assessment is incomplete')
    }
    
    return issues
  }
  
  private calculateKnowledgeScore(formData: SuitabilityFormData): number {
    const knowledge = formData.knowledge_experience?.investment_knowledge
    const knowledgeMap: Record<string, number> = {
      'Basic': 25,
      'Intermediate': 50,
      'Advanced': 75,
      'Expert': 100
    }
    return knowledgeMap[knowledge || 'Basic'] || 25
  }
  
  private calculateTimeHorizonScore(formData: SuitabilityFormData): number {
    const horizon = formData.objectives?.time_horizon || 0
    return Math.min(100, (horizon / 30) * 100)
  }
  
  private calculateLossAcceptanceScore(formData: SuitabilityFormData): number {
    const maxLoss = formData.risk_assessment?.max_acceptable_loss || 0
    return Math.min(100, (maxLoss / 50) * 100)
  }
  
  private calculateProjection(
    initial: number,
    monthly: number,
    rate: number,
    years: number
  ): number[] {
    const monthlyRate = rate / 12
    return Array.from({ length: years }, (_, i) => {
      const months = (i + 1) * 12
      const futureValueLump = initial * Math.pow(1 + rate, i + 1)
      const futureValueContributions = monthly * 
        ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      return Math.round(futureValueLump + futureValueContributions)
    })
  }
  
  private getUsedSources(pulledData: PulledPlatformData): string[] {
    const sources: string[] = []
    if (pulledData.cflScore) sources.push('CFL Assessment')
    if (pulledData.atrScore) sources.push('ATR Assessment')
    if (pulledData.vulnerabilityFactors) sources.push('Vulnerability Assessment')
    sources.push('AI Analysis')
    return sources
  }
  
  private createFallbackSuggestion(
    sectionId: string,
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): AISuggestion {
    const insights: string[] = []
    const warnings: string[] = []
    const fieldSuggestions: Record<string, any> = {}
    
    // Section-specific fallback logic
    switch (sectionId) {
      case 'personal_information':
        if (formData.personal_information?.age) {
          const age = formData.personal_information.age
          if (age > 55) {
            insights.push('Consider retirement planning as a priority')
          }
          if (!formData.personal_information.target_retirement_age) {
            fieldSuggestions.target_retirement_age = Math.max(age + 10, 65)
          }
        }
        break
        
      case 'financial_situation':
        const income = formData.financial_situation?.annual_income || 0
        const expenditure = (formData.financial_situation?.monthly_expenditure || 0) * 12
        
        if (expenditure > income * 0.8) {
          warnings.push('High expenditure relative to income may limit investment capacity')
        }
        
        if (!formData.financial_situation?.emergency_fund) {
          fieldSuggestions.emergency_fund = Math.round(expenditure / 12 * 6)
          insights.push('Recommend building emergency fund of 6 months expenses')
        }
        break
        
      case 'risk_assessment':
        if (pulledData.atrScore && pulledData.cflScore) {
          if (Math.abs(pulledData.atrScore - pulledData.cflScore) > 30) {
            warnings.push('Significant discrepancy between ATR and CFL scores')
          }
        }
        break
    }
    
    return {
      fieldSuggestions,
      insights: insights.length ? insights : ['Analysis completed'],
      warnings,
      confidence: 0.6,
      sources: this.getUsedSources(pulledData),
      timestamp: new Date().toISOString()
    }
  }
  
  // =====================================================
  // METRICS & MONITORING
  // =====================================================
  
  getMetrics(): AIMetrics {
    return { ...this.metrics }
  }
  
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      apiCalls: 0,
      errors: 0,
      avgResponseTime: 0
    }
  }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

export const aiAssistantService = new AIAssistantService()
export type { AIAssistantService }