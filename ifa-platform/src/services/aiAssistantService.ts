// src/services/aiAssistantService.ts
// ================================================================
// AI ASSISTANT SERVICE WITH DEEPSEEK INTEGRATION
// Phase 3 Implementation with Rate Limiting, Caching, and Queue
// ================================================================

import { 
  SuitabilityData, 
  PulledPlatformData, 
  AISuggestion, 
  AIAnalysisRequest,
  AIAnalysisResponse,
  ChartData,
  DeepSeekPromptTemplate,
  SuitabilityDataEnhanced
} from '@/types/assessment'
import { createBrowserClient } from '@supabase/ssr'

// ================================================================
// DEEPSEEK CONFIGURATION
// ================================================================

const DEEPSEEK_API_URL = process.env.NEXT_PUBLIC_DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat' // Updated to use chat model for financial advice
const RATE_LIMIT_PER_MINUTE = 100
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour in milliseconds
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_BASE = 1000 // Base delay for exponential backoff

// ================================================================
// TYPES FOR RATE LIMITING AND QUEUE
// ================================================================

interface QueuedRequest {
  id: string
  prompt: string
  resolve: (value: any) => void
  reject: (reason?: any) => void
  retryCount: number
  timestamp: number
}

interface CachedResponse {
  data: any
  timestamp: number
  expiresAt: number
}

interface RateLimitWindow {
  count: number
  resetTime: number
}

// ================================================================
// PROMPT TEMPLATES (Same as before, keeping for reference)
// ================================================================

const promptTemplates: Record<string, DeepSeekPromptTemplate> = {
  // Template 1: Personal Information Analysis
  personalInfoAnalysis: {
    id: 'personal_info',
    name: 'Personal Information Analysis',
    template: `You are an FCA-compliant financial advisor assistant analyzing client personal information.

Given the following data:
- Current form data: {formData}
- CFL Score: {cflScore} (Category: {cflCategory})
- ATR Score: {atrScore} (Category: {atrCategory})
- Vulnerability factors: {vulnerabilityFactors}

Analyze the personal information section and provide:
1. Smart defaults for missing fields based on patterns
2. Validation of employment status vs income levels
3. Retirement planning insights based on age and target retirement
4. Partner assessment recommendations if married/civil partnership

Output as JSON:
{
  "fieldSuggestions": {
    "field_id": "suggested_value"
  },
  "insights": ["insight1", "insight2"],
  "warnings": ["warning1"],
  "confidence": 0.85
}

Constraints:
- Ensure all suggestions comply with FCA Consumer Duty
- Flag any potential vulnerability indicators
- Consider capacity for loss in all recommendations`,
    variables: ['formData', 'cflScore', 'cflCategory', 'atrScore', 'atrCategory', 'vulnerabilityFactors'],
    outputFormat: 'json',
    constraints: ['FCA compliant', 'Consumer Duty aligned', 'Risk-appropriate']
  },

  // Template 2: Financial Situation Projection
  financialProjection: {
    id: 'financial_projection',
    name: 'Financial Situation Analysis with Projections',
    template: `Analyze the client's financial situation and provide projections.

Client Financial Data:
- Annual Income: {annualIncome}
- Monthly Expenditure: {monthlyExpenditure}
- Current Assets: {liquidAssets}
- Property Value: {propertyValue}
- Liabilities: {liabilities}
- CFL Score: {cflScore} indicating {cflCategory} capacity for loss
- Investment Amount: {investmentAmount}
- Time Horizon: {timeHorizon} years

Previous assessments show: {previousAssessments}

Provide:
1. Net worth calculation validation
2. Emergency fund adequacy (considering CFL)
3. Investment capacity analysis
4. 5-year financial projection
5. Risk-adjusted recommendations

Output JSON with:
{
  "fieldSuggestions": {},
  "insights": [],
  "warnings": [],
  "projection": {
    "years": [1,2,3,4,5],
    "netWorthProjection": [],
    "investmentGrowth": []
  },
  "chartData": {
    "type": "line",
    "data": {}
  }
}

Consider inflation at 2.5% and risk-appropriate growth rates.`,
    variables: ['annualIncome', 'monthlyExpenditure', 'liquidAssets', 'propertyValue', 'liabilities', 'cflScore', 'cflCategory', 'investmentAmount', 'timeHorizon', 'previousAssessments'],
    outputFormat: 'json',
    constraints: ['Conservative projections', 'Include downside scenarios', 'FCA compliant']
  },

  // Template 3: Risk Assessment Reconciliation
  riskReconciliation: {
    id: 'risk_reconciliation',
    name: 'Risk Assessment with ATR/CFL Reconciliation',
    template: `Reconcile risk assessment data with pulled ATR and CFL scores.

Assessment Data:
- Client stated risk preference: {statedRisk}
- ATR Assessment Score: {atrScore} ({atrCategory})
- CFL Assessment Score: {cflScore} ({cflCategory})
- Investment experience: {experience}
- Previous losses: {previousLosses}
- Max acceptable loss: {maxLoss}%

Analyze and provide:
1. Consistency check between stated preference and assessments
2. Final risk profile recommendation
3. Any discrepancies requiring advisor attention
4. Suggested portfolio allocation based on reconciled risk

Output JSON:
{
  "fieldSuggestions": {
    "risk_reconciliation": "detailed explanation"
  },
  "insights": ["key findings"],
  "warnings": ["any conflicts"],
  "recommendedAllocation": {
    "equities": percentage,
    "bonds": percentage,
    "alternatives": percentage,
    "cash": percentage
  }
}

Ensure recommendations align with FCA's "Know Your Customer" requirements.`,
    variables: ['statedRisk', 'atrScore', 'atrCategory', 'cflScore', 'cflCategory', 'experience', 'previousLosses', 'maxLoss'],
    outputFormat: 'json',
    constraints: ['Prioritize client protection', 'Document any conflicts', 'Suitable recommendations only']
  },

  // Template 4: Comprehensive Recommendation Generation
  recommendationGeneration: {
    id: 'recommendation_gen',
    name: 'Comprehensive Recommendation Generation',
    template: `Generate a comprehensive, FCA-compliant investment recommendation.

Complete Assessment Data:
{fullAssessmentData}

Platform Data:
- CFL: {cflData}
- ATR: {atrData}
- Vulnerability: {vulnerabilityData}
- Historical Data: {historicalData}

Generate a detailed recommendation including:
1. Executive summary
2. Risk-aligned strategy
3. Product selection rationale
4. Implementation timeline
5. Ongoing monitoring plan
6. Fee transparency
7. Consumer Duty compliance statement

Output as structured JSON with all sections.
Ensure recommendation is suitable, fair value, and in client's best interests.`,
    variables: ['fullAssessmentData', 'cflData', 'atrData', 'vulnerabilityData', 'historicalData'],
    outputFormat: 'json',
    constraints: ['Full FCA compliance', 'Clear language', 'Evidence-based', 'Client-focused']
  },

  // Template 5: Vulnerability and Support Assessment
  vulnerabilityAssessment: {
    id: 'vulnerability_check',
    name: 'Vulnerability and Support Needs Analysis',
    template: `Analyze vulnerability indicators and support requirements.

Client Information:
- Age: {age}
- Health concerns: {healthConcerns}
- Life events: {lifeEvents}
- Support network: {supportNetwork}
- Cognitive confidence: {cognitiveConfidence}
- Financial complexity: {financialComplexity}

Historical vulnerability data: {vulnerabilityHistory}

Assess:
1. Current vulnerability status
2. Required support adjustments
3. Communication preferences
4. Review frequency recommendations
5. Additional safeguards needed

Provide compassionate, supportive recommendations while maintaining professionalism.

Output JSON with specific support recommendations.`,
    variables: ['age', 'healthConcerns', 'lifeEvents', 'supportNetwork', 'cognitiveConfidence', 'financialComplexity', 'vulnerabilityHistory'],
    outputFormat: 'json',
    constraints: ['Sensitive approach', 'Practical support', 'Regular review triggers']
  }
}

// ================================================================
// ENHANCED AI ASSISTANT SERVICE CLASS
// ================================================================

class AIAssistantService {
  private supabase: any
  private apiKey: string | null
  
  // Cache management
  private responseCache: Map<string, CachedResponse> = new Map()
  private cacheCleanupInterval: NodeJS.Timeout | null = null
  
  // Rate limiting
  private rateLimitWindow: RateLimitWindow = {
    count: 0,
    resetTime: Date.now() + 60000
  }
  
  // Request queue
  private requestQueue: QueuedRequest[] = []
  private isProcessingQueue = false
  
  // Metrics tracking
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    apiCalls: 0,
    errors: 0,
    rateLimitHits: 0,
    avgResponseTime: 0
  }

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    this.apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || null
    
    // Start cache cleanup interval
    this.startCacheCleanup()
    
    // Start queue processor
    this.startQueueProcessor()
  }

  // ================================================================
  // CACHE MANAGEMENT
  // ================================================================

  private startCacheCleanup() {
    // Clean up expired cache entries every 5 minutes
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now()
      const expiredKeys: string[] = []
      
      this.responseCache.forEach((value, key) => {
        if (value.expiresAt < now) {
          expiredKeys.push(key)
        }
      })
      
      expiredKeys.forEach(key => this.responseCache.delete(key))
      
      if (expiredKeys.length > 0) {
        console.log(`[AI Cache] Cleaned up ${expiredKeys.length} expired entries`)
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  private getCacheKey(prompt: string): string {
    // Create a hash of the prompt for consistent caching
    const hash = prompt.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return `deepseek_${Math.abs(hash)}`
  }

  private getFromCache(key: string): any | null {
    const cached = this.responseCache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      this.metrics.cacheHits++
      console.log('[AI Cache] Cache hit for request')
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
    console.log('[AI Cache] Response cached')
  }

  // ================================================================
  // RATE LIMITING
  // ================================================================

  private checkRateLimit(): boolean {
    const now = Date.now()
    
    // Reset window if needed
    if (now > this.rateLimitWindow.resetTime) {
      this.rateLimitWindow = {
        count: 0,
        resetTime: now + 60000 // Next minute
      }
    }
    
    // Check if we can make a request
    if (this.rateLimitWindow.count >= RATE_LIMIT_PER_MINUTE) {
      this.metrics.rateLimitHits++
      return false
    }
    
    this.rateLimitWindow.count++
    return true
  }

  private getTimeUntilReset(): number {
    return Math.max(0, this.rateLimitWindow.resetTime - Date.now())
  }

  // ================================================================
  // REQUEST QUEUE MANAGEMENT
  // ================================================================

  private async addToQueue(prompt: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        prompt,
        resolve,
        reject,
        retryCount: 0,
        timestamp: Date.now()
      }
      
      this.requestQueue.push(request)
      console.log(`[AI Queue] Request queued. Queue size: ${this.requestQueue.length}`)
    })
  }

  private async startQueueProcessor() {
    setInterval(async () => {
      if (this.isProcessingQueue || this.requestQueue.length === 0) {
        return
      }
      
      this.isProcessingQueue = true
      
      while (this.requestQueue.length > 0 && this.checkRateLimit()) {
        const request = this.requestQueue.shift()
        if (!request) continue
        
        try {
          const result = await this.executeDeepSeekRequest(request.prompt)
          request.resolve(result)
        } catch (error) {
          if (request.retryCount < MAX_RETRY_ATTEMPTS) {
            request.retryCount++
            // Add back to queue with exponential backoff
            setTimeout(() => {
              this.requestQueue.push(request)
            }, RETRY_DELAY_BASE * Math.pow(2, request.retryCount))
          } else {
            request.reject(error)
          }
        }
      }
      
      this.isProcessingQueue = false
    }, 100) // Check queue every 100ms
  }

  // ================================================================
  // DEEPSEEK API METHODS
  // ================================================================

  async queryDeepSeek(prompt: string): Promise<any> {
    this.metrics.totalRequests++
    const startTime = Date.now()
    
    // Check cache first
    const cacheKey = this.getCacheKey(prompt)
    const cachedResponse = this.getFromCache(cacheKey)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Check rate limit
    if (!this.checkRateLimit()) {
      const waitTime = this.getTimeUntilReset()
      console.log(`[AI Rate Limit] Queuing request. Wait time: ${waitTime}ms`)
      return this.addToQueue(prompt)
    }
    
    // Execute request
    try {
      const result = await this.executeDeepSeekRequest(prompt)
      
      // Update metrics
      const responseTime = Date.now() - startTime
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime * (this.metrics.apiCalls - 1) + responseTime) / this.metrics.apiCalls
      
      return result
    } catch (error) {
      this.metrics.errors++
      throw error
    }
  }

  private async executeDeepSeekRequest(prompt: string): Promise<any> {
    if (!this.apiKey) {
      console.warn('DeepSeek API key not configured, using fallback logic')
      return this.getFallbackResponse(prompt)
    }

    this.metrics.apiCalls++
    
    try {
      console.log('[AI API] Making DeepSeek request')
      
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Request-ID': `fintech_${Date.now()}` // For tracking
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert FCA-compliant financial advisor assistant. Always provide accurate, helpful suggestions while ensuring regulatory compliance and client best interests. Output valid JSON when requested.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Lower temperature for consistent financial advice
          max_tokens: 2000,
          response_format: { type: "json_object" } // Ensure JSON responses
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content
      
      if (!content) {
        throw new Error('Empty response from DeepSeek API')
      }
      
      // Cache the successful response
      const cacheKey = this.getCacheKey(prompt)
      this.saveToCache(cacheKey, content)
      
      console.log('[AI API] Request successful')
      return content
      
    } catch (error) {
      console.error('[AI API] DeepSeek request failed:', error)
      
      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('429')) {
        console.log('[AI API] Rate limit hit, adding to queue')
        return this.addToQueue(prompt)
      }
      
      throw error
    }
  }

  // ================================================================
  // SUGGESTION GENERATION WITH ENHANCED ERROR HANDLING
  // ================================================================

  async generateSuggestion(
    sectionId: string, 
    formData: SuitabilityData,
    pulledData: PulledPlatformData
  ): Promise<AISuggestion> {
    const requestId = `${sectionId}_${Date.now()}`
    console.log(`[AI Suggestion] Starting generation for section: ${sectionId}`)
    
    try {
      // Select appropriate template
      const templateId = this.getTemplateForSection(sectionId)
      const template = promptTemplates[templateId]
      
      if (!template) {
        throw new Error(`No template found for section: ${sectionId}`)
      }

      // Build the prompt
      const prompt = this.buildPromptFromTemplate(template, {
        formData,
        ...pulledData,
        ...this.extractSectionData(sectionId, formData)
      })

      // Query DeepSeek
      const response = await this.queryDeepSeek(prompt)
      
      // Parse and validate response
      let suggestion: AISuggestion
      try {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response
        
        // Validate response structure
        if (!parsed.fieldSuggestions || !parsed.insights) {
          throw new Error('Invalid response structure')
        }
        
        suggestion = {
          sectionId,
          fieldSuggestions: parsed.fieldSuggestions || {},
          insights: Array.isArray(parsed.insights) ? parsed.insights : [],
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
          sources: this.getUsedSources(pulledData),
          generatedAt: new Date().toISOString()
        }
        
        console.log(`[AI Suggestion] Successfully generated for ${sectionId}`)
      } catch (parseError) {
        console.error('[AI Suggestion] Failed to parse response:', parseError)
        // Return fallback if parsing fails
        suggestion = this.createFallbackSuggestion(sectionId, formData, pulledData)
      }

      // Log metrics
      await this.logAIMetrics(requestId, sectionId, true)
      
      return suggestion
      
    } catch (error) {
      console.error(`[AI Suggestion] Error for section ${sectionId}:`, error)
      
      // Log failure metrics
      await this.logAIMetrics(requestId, sectionId, false, error)
      
      // Return comprehensive fallback
      return this.createFallbackSuggestion(sectionId, formData, pulledData)
    }
  }

  // ================================================================
  // METRICS AND LOGGING
  // ================================================================

  private async logAIMetrics(
    requestId: string,
    sectionId: string,
    success: boolean,
    error?: any
  ) {
    try {
      await fetch('/api/documents/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'ai_suggestion_request',
          requestId,
          sectionId,
          success,
          error: error?.message,
          metrics: {
            cacheHitRate: this.metrics.cacheHits / this.metrics.totalRequests,
            avgResponseTime: this.metrics.avgResponseTime,
            errorRate: this.metrics.errors / this.metrics.totalRequests,
            rateLimitHits: this.metrics.rateLimitHits
          },
          timestamp: new Date().toISOString()
        })
      })
    } catch (err) {
      console.error('[AI Metrics] Failed to log metrics:', err)
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.responseCache.size,
      queueSize: this.requestQueue.length,
      rateLimitRemaining: RATE_LIMIT_PER_MINUTE - this.rateLimitWindow.count
    }
  }

  // ================================================================
  // PLATFORM DATA PULLING METHODS (unchanged from original)
  // ================================================================

  async pullPlatformData(clientId: string): Promise<PulledPlatformData> {
    try {
      const [cflData, atrData, vulnerabilityData, clientMetrics, assessmentHistory] = await Promise.all([
        this.pullCFLData(clientId),
        this.pullATRData(clientId),
        this.pullVulnerabilityData(clientId),
        this.pullClientMetrics(clientId),
        this.pullAssessmentHistory(clientId)
      ])

      return {
        ...cflData,
        ...atrData,
        vulnerabilityFactors: vulnerabilityData.factors,
        vulnerabilityScore: vulnerabilityData.score,
        clientMetrics,
        previousAssessments: assessmentHistory
      }
    } catch (error) {
      console.error('Error pulling platform data:', error)
      return {}
    }
  }

  private async pullCFLData(clientId: string): Promise<Partial<PulledPlatformData>> {
    try {
      const response = await fetch(`/api/assessments/cfl?clientId=${clientId}`)
      if (!response.ok) throw new Error('Failed to fetch CFL data')
      
      const data = await response.json()
      return {
        cflScore: data.score,
        cflCategory: data.category,
        cflDate: data.assessmentDate
      }
    } catch (error) {
      console.error('Error pulling CFL data:', error)
      return {}
    }
  }

  private async pullATRData(clientId: string): Promise<Partial<PulledPlatformData>> {
    try {
      const response = await fetch(`/api/assessments/atr?clientId=${clientId}`)
      if (!response.ok) throw new Error('Failed to fetch ATR data')
      
      const data = await response.json()
      return {
        atrScore: data.score,
        atrCategory: data.category,
        atrDate: data.assessmentDate
      }
    } catch (error) {
      console.error('Error pulling ATR data:', error)
      return {}
    }
  }

  private async pullVulnerabilityData(clientId: string) {
    try {
      const response = await fetch(`/api/clients/${clientId}`)
      if (!response.ok) throw new Error('Failed to fetch client data')
      
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
      if (!response.ok) throw new Error('Failed to fetch client metrics')
      
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
      const response = await fetch(`/api/assessments?clientId=${clientId}`)
      if (!response.ok) throw new Error('Failed to fetch assessment history')
      
      const assessments = await response.json()
      return assessments.map((a: any) => ({
        id: a.id,
        type: a.type,
        date: a.createdAt,
        score: a.score
      }))
    } catch (error) {
      console.error('Error pulling assessment history:', error)
      return []
    }
  }

  // ================================================================
  // CHART GENERATION METHODS (unchanged)
  // ================================================================

  async generateChartData(
    sectionId: string,
    formData: SuitabilityData,
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

  private generateFinancialChart(formData: SuitabilityData, pulledData: PulledPlatformData): ChartData {
    const financial = formData.financial_situation || {}
    
    return {
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
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 20,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || ''
                const value = context.parsed || 0
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
                const percentage = ((value / total) * 100).toFixed(1)
                return `${label}: £${value.toLocaleString()} (${percentage}%)`
              }
            }
          }
        }
      }
    }
  }

  private generateRiskChart(formData: SuitabilityData, pulledData: PulledPlatformData): ChartData {
    return {
      type: 'radar',
      title: 'Risk Profile Analysis',
      description: 'Multi-dimensional view of your risk characteristics',
      data: {
        labels: ['Risk Tolerance', 'Risk Capacity', 'Investment Knowledge', 'Time Horizon', 'Loss Acceptance'],
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
          borderColor: 'rgb(59, 130, 246)',
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(59, 130, 246)'
        }, {
          label: 'Balanced Profile',
          data: [50, 50, 50, 50, 50],
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderColor: 'rgb(156, 163, 175)',
          borderDash: [5, 5],
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 25
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    }
  }

  private generateObjectivesChart(formData: SuitabilityData, pulledData: PulledPlatformData): ChartData {
    const objectives = formData.objectives || {}
    const years = Array.from({ length: objectives.time_horizon || 10 }, (_, i) => i + 1)
    const initialAmount = objectives.investment_amount || 0
    const monthlyContribution = objectives.additional_contributions || 0
    
    return {
      type: 'line',
      title: 'Investment Growth Projection',
      description: 'Projected portfolio value over your investment timeline',
      data: {
        labels: years.map(y => `Year ${y}`),
        datasets: [{
          label: 'Conservative (3% p.a.)',
          data: this.calculateProjectionWithContributions(initialAmount, monthlyContribution, 0.03, years.length),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4
        }, {
          label: 'Moderate (5% p.a.)',
          data: this.calculateProjectionWithContributions(initialAmount, monthlyContribution, 0.05, years.length),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        }, {
          label: 'Growth (7% p.a.)',
          data: this.calculateProjectionWithContributions(initialAmount, monthlyContribution, 0.07, years.length),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                return `${context.dataset.label}: £${context.parsed.y.toLocaleString()}`
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: (value: any) => `£${(value / 1000).toFixed(0)}k`
            }
          }
        }
      }
    }
  }

  private generateAllocationChart(formData: SuitabilityData, pulledData: PulledPlatformData): ChartData {
    const riskLevel = formData.risk_assessment?.attitude_to_risk || '4 - Medium Risk'
    const riskNum = parseInt(riskLevel.match(/\d/)?.[0] || '4')
    
    let allocation = { equities: 60, bonds: 35, alternatives: 5 }
    
    if (riskNum <= 2) {
      allocation = { equities: 20, bonds: 70, alternatives: 10 }
    } else if (riskNum >= 6) {
      allocation = { equities: 80, bonds: 15, alternatives: 5 }
    }
    
    return {
      type: 'doughnut', // Now supported by ChartData type
      title: 'Recommended Asset Allocation',
      description: 'Strategic allocation based on your risk profile',
      data: {
        labels: ['Equities', 'Bonds', 'Alternatives'],
        datasets: [{
          data: [allocation.equities, allocation.bonds, allocation.alternatives],
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                return `${context.label}: ${context.parsed}%`
              }
            }
          }
        }
      }
    }
  }

  // ================================================================
  // PLATFORM SYNC METHODS (unchanged)
  // ================================================================

  async syncToPlatform(
    clientId: string,
    assessmentId: string,
    formData: SuitabilityDataEnhanced
  ): Promise<boolean> {
    try {
      await this.updateClientProfile(clientId, formData)
      
      if (formData._metadata.completionPercentage >= 80) {
        await this.queueDocumentGeneration(assessmentId, clientId, formData)
      }
      
      await this.updateAnalytics(clientId, assessmentId, formData)
      
      return true
    } catch (error) {
      console.error('Platform sync error:', error)
      return false
    }
  }

  private async updateClientProfile(clientId: string, formData: SuitabilityDataEnhanced) {
    const updates = {
      lastAssessmentDate: new Date().toISOString(),
      riskProfile: {
        attitudeToRisk: formData.risk_assessment?.attitude_to_risk,
        lastUpdated: new Date().toISOString()
      },
      financialProfile: {
        annualIncome: formData.financial_situation?.annual_income,
        monthlyExpenditure: formData.financial_situation?.monthly_expenditure,
        netWorth: formData.financial_situation?.net_worth
      }
    }

    await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
  }

  private async queueDocumentGeneration(
    assessmentId: string,
    clientId: string,
    formData: SuitabilityDataEnhanced
  ) {
    await fetch('/api/documents/generate-from-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId,
        clientId,
        assessmentType: 'suitability',
        includeAI: true,
        aiSuggestions: formData._aiSuggestions,
        chartData: formData._chartData
      })
    })
  }

  private async updateAnalytics(
    clientId: string,
    assessmentId: string,
    formData: SuitabilityDataEnhanced
  ) {
    await fetch('/api/documents/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        assessmentId,
        type: 'suitability_completed',
        metrics: {
          completionPercentage: formData._metadata.completionPercentage,
          aiSuggestionsUsed: formData._metadata.aiEnabled,
          sectionsWithAI: Object.keys(formData._aiSuggestions)
        }
      })
    })
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  private getTemplateForSection(sectionId: string): string {
    const templateMap: Record<string, string> = {
      'personal_information': 'personalInfoAnalysis',
      'financial_situation': 'financialProjection',
      'risk_assessment': 'riskReconciliation',
      'vulnerability_assessment': 'vulnerabilityAssessment',
      'recommendation': 'recommendationGeneration'
    }
    return templateMap[sectionId] || 'personalInfoAnalysis'
  }

  private buildPromptFromTemplate(
    template: DeepSeekPromptTemplate,
    data: Record<string, any>
  ): string {
    let prompt = template.template
    
    template.variables.forEach(variable => {
      const value = data[variable] || 'Not provided'
      const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
      prompt = prompt.replace(new RegExp(`{${variable}}`, 'g'), valueStr)
    })
    
    return prompt
  }

  private extractSectionData(sectionId: string, formData: SuitabilityData): Record<string, any> {
    const section = formData[sectionId] || {}
    const extracted: Record<string, any> = {}
    
    switch (sectionId) {
      case 'financial_situation':
        extracted.annualIncome = section.annual_income
        extracted.monthlyExpenditure = section.monthly_expenditure
        extracted.liquidAssets = section.liquid_assets
        extracted.propertyValue = section.property_value
        extracted.liabilities = section.other_liabilities
        break
      case 'objectives':
        extracted.investmentAmount = section.investment_amount
        extracted.timeHorizon = section.time_horizon
        break
      case 'risk_assessment':
        extracted.statedRisk = section.attitude_to_risk
        extracted.experience = section.risk_experience
        extracted.previousLosses = section.previous_losses
        extracted.maxLoss = section.max_acceptable_loss
        break
      case 'vulnerability_assessment':
        extracted.age = formData.personal_information?.age
        extracted.healthConcerns = section.health_concerns
        extracted.lifeEvents = section.life_events
        extracted.supportNetwork = section.support_network
        extracted.cognitiveConfidence = section.cognitive_ability
        extracted.financialComplexity = 'Standard' // Could be calculated
        extracted.vulnerabilityHistory = section.vulnerability_notes
        break
      case 'recommendation':
        extracted.fullAssessmentData = formData
        break
    }
    
    return extracted
  }

  private getUsedSources(pulledData: PulledPlatformData): string[] {
    const sources: string[] = [] // Explicitly type as string array
    if (pulledData.cflScore) sources.push('CFL Assessment')
    if (pulledData.atrScore) sources.push('ATR Assessment')
    if (pulledData.vulnerabilityFactors) sources.push('Vulnerability Assessment')
    if (pulledData.previousAssessments?.length) sources.push('Historical Data')
    sources.push('AI Analysis')
    return sources
  }

  private calculateKnowledgeScore(formData: SuitabilityData): number {
    const knowledge = formData.knowledge_experience?.investment_knowledge
    const knowledgeMap: Record<string, number> = {
      'Basic': 25,
      'Intermediate': 50,
      'Advanced': 75,
      'Expert': 100
    }
    return knowledgeMap[knowledge || 'Basic'] || 25
  }

  private calculateTimeHorizonScore(formData: SuitabilityData): number {
    const horizon = formData.objectives?.time_horizon || 0
    return Math.min(100, (horizon / 30) * 100)
  }

  private calculateLossAcceptanceScore(formData: SuitabilityData): number {
    const maxLoss = formData.risk_assessment?.max_acceptable_loss || 0
    return Math.min(100, (maxLoss / 50) * 100)
  }

  private calculateProjectionWithContributions(
    initial: number, 
    monthly: number, 
    rate: number, 
    years: number
  ): number[] {
    const monthlyRate = rate / 12
    return Array.from({ length: years }, (_, i) => {
      const months = (i + 1) * 12
      const futureValueLump = initial * Math.pow(1 + rate, i + 1)
      const futureValueContributions = monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      return Math.round(futureValueLump + futureValueContributions)
    })
  }

  private getFallbackResponse(prompt: string): any {
    return JSON.stringify({
      fieldSuggestions: {},
      insights: ['AI service temporarily unavailable. Using rule-based suggestions.'],
      warnings: [],
      confidence: 0.5
    })
  }

  private createFallbackSuggestion(
    sectionId: string,
    formData: SuitabilityData,
    pulledData: PulledPlatformData
  ): AISuggestion {
    const insights: string[] = []
    const warnings: string[] = []
    const fieldSuggestions: Record<string, any> = {}

    // Enhanced fallback logic based on section
    switch (sectionId) {
      case 'personal_information':
        if (formData.personal_information?.age) {
          const age = formData.personal_information.age
          const retirementAge = formData.personal_information.target_retirement_age || 65
          
          if (age > 55) {
            insights.push('Consider retirement planning as a priority given proximity to retirement')
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
            warnings.push('Significant discrepancy between ATR and CFL scores requires advisor review')
          }
        }
        
        if (!formData.risk_assessment?.risk_reconciliation) {
          fieldSuggestions.risk_reconciliation = 'Risk profile requires reconciliation between assessments'
        }
        break
    }

    return {
      sectionId,
      fieldSuggestions,
      insights: insights.length ? insights : ['Standard analysis completed'],
      warnings,
      confidence: 0.6,
      sources: ['Rule-based Analysis', ...this.getUsedSources(pulledData)],
      generatedAt: new Date().toISOString()
    }
  }

  // Cleanup method
  destroy() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
    }
  }
}

// Export singleton instance
export const aiAssistantService = new AIAssistantService()

// Export types for use in components
export type { AIAssistantService }