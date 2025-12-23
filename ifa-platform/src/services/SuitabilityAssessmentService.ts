// services/SuitabilityAssessmentService.ts - FIXED VERSION (No Object Errors)
// Phase 2: Type Safety - Removed all `any` types
// Phase 3: Error Handling - Proper logging and error propagation
import { createClient } from "@/lib/supabase/client"
import { logger, DatabaseError, getErrorMessage } from "@/lib/errors"

// =====================================================
// RAW DATABASE RECORD TYPES
// These represent the JSON structures stored in Supabase
// =====================================================

/**
 * Personal details JSON structure from database
 */
interface RawPersonalDetails {
  first_name?: string
  firstName?: string
  fname?: string
  last_name?: string
  lastName?: string
  lname?: string
  full_name?: string
  fullName?: string
  name?: string
  age?: number
  date_of_birth?: string
  dateOfBirth?: string
  dob?: string
  occupation?: string | { title?: string; name?: string }
  job_title?: string
  profession?: string
}

/**
 * Financial profile JSON structure from database
 */
interface RawFinancialProfile {
  investment_amount?: number
  investmentAmount?: number
  net_worth?: number
  netWorth?: number
  total_assets?: number
  totalAssets?: number
  liquid_assets?: number
  liquidAssets?: number
  portfolio_value?: number
  portfolioValue?: number
  annual_income?: number
  annualIncome?: number
  yearly_income?: number
  portfolio_performance?: number
}

/**
 * Risk profile JSON structure from database
 */
interface RawRiskProfile {
  final_risk_profile?: number
  finalRiskProfile?: number
  risk_level?: number
  riskLevel?: number
  attitude_to_risk?: number
  attitudeToRisk?: number
  risk_tolerance?: number
  riskTolerance?: number
  suitability_score?: number
  last_assessment_date?: string
  atr_complete?: boolean
  cfl_complete?: boolean
  capacity_for_loss?: number
}

/**
 * Vulnerability assessment JSON structure from database
 */
interface RawVulnerabilityAssessment {
  is_vulnerable?: boolean
}

/**
 * Raw client record from Supabase
 */
interface RawClientRecord {
  id: string
  client_ref?: string
  personal_details?: RawPersonalDetails | null
  contact_info?: Record<string, unknown> | null
  financial_profile?: RawFinancialProfile | null
  risk_profile?: RawRiskProfile | null
  vulnerability_assessment?: RawVulnerabilityAssessment | null
  status?: string
  created_at?: string
  updated_at?: string
}

// =====================================================
// EXPORTED TYPES
// =====================================================

export interface SuitabilityClient {
  id: string
  name: string
  clientRef: string
  age: number
  occupation: string
  investmentAmount: number
  riskProfile: number
  suitabilityScore: number
  assessmentStatus: 'completed' | 'in_progress' | 'draft' | 'review_needed' | 'not_started'
  completionPercentage: number
  vulnerableClient: boolean
  tags: string[]
  portfolioPerformance: number
  lastAssessment: string | null
  nextReview: string | null
  priority: 'high' | 'medium' | 'low'
  status: string
}

export interface SuitabilityMetrics {
  totalClients: number
  totalAUM: number
  completed: number
  needReview: number
  avgRiskLevel: number
  vulnerable: number
}

class SuitabilityAssessmentService {
  private static instance: SuitabilityAssessmentService
  private supabase = createClient() // ✅ Create supabase client as class property
  
  public static getInstance(): SuitabilityAssessmentService {
    if (!SuitabilityAssessmentService.instance) {
      SuitabilityAssessmentService.instance = new SuitabilityAssessmentService()
    }
    return SuitabilityAssessmentService.instance
  }

  async loadClientsWithAssessments(): Promise<SuitabilityClient[]> {
    try {
      logger.debug('Loading clients from Supabase')

      // Load actual clients from Supabase - ONLY ACTIVE CLIENTS
      const { data: clients, error } = await this.supabase
        .from('clients')
        .select(`
          id,
          client_ref,
          personal_details,
          contact_info,
          financial_profile,
          risk_profile,
          vulnerability_assessment,
          status,
          created_at,
          updated_at
        `)
        .in('status', ['active', 'prospect']) // Only get active/prospect clients
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) {
        logger.error('Supabase error loading clients', error)
        throw new DatabaseError('Failed to load clients from database', {
          originalError: getErrorMessage(error)
        })
      }

      if (!clients || clients.length === 0) {
        logger.info('No active clients found in database')
        return []
      }

      // Transform Supabase data to clean display format
      const transformedClients = clients.map(this.transformClientData)

      logger.info(`Loaded ${transformedClients.length} active clients from Supabase`)

      return transformedClients

    } catch (error) {
      logger.error('Error loading clients', error)
      throw new DatabaseError('Failed to load client assessments', {
        originalError: getErrorMessage(error)
      })
    }
  }

  private transformClientData = (client: RawClientRecord): SuitabilityClient => {
    try {
      const personal: RawPersonalDetails = client.personal_details || {}
      const contact = client.contact_info || {}
      const financial: RawFinancialProfile = client.financial_profile || {}
      const risk: RawRiskProfile = client.risk_profile || {}
      const vulnerability: RawVulnerabilityAssessment = client.vulnerability_assessment || {}

      // Debug logging - only in development
      logger.debug('Transforming client', {
        clientId: client.id,
        personal_keys: Object.keys(personal),
        contact_keys: Object.keys(contact),
        financial_keys: Object.keys(financial)
      })

      // CRITICAL: Ensure ALL fields return strings/numbers, never objects
      const transformedClient: SuitabilityClient = {
        id: this.safeString(client.id),
        name: this.extractName(personal),
        clientRef: this.safeString(client.client_ref) || `CLI-${client.id.slice(-6)}`,
        age: this.extractAge(personal),
        occupation: this.extractOccupation(personal),
        investmentAmount: this.extractInvestmentAmount(financial),
        riskProfile: this.extractRiskProfile(risk),
        suitabilityScore: this.safeNumber(risk.suitability_score, 0),
        assessmentStatus: this.determineStatus(risk, client.status ?? 'unknown', this.extractInvestmentAmount(financial)),
        completionPercentage: this.calculateCompletion(risk, this.extractInvestmentAmount(financial)),
        vulnerableClient: Boolean(vulnerability.is_vulnerable),
        tags: this.generateTags(personal, financial, this.extractAge(personal)),
        // FIX: Removed mockPerformance() - use actual data or null/0
        portfolioPerformance: this.safeNumber(financial.portfolio_performance, 0),
        lastAssessment: this.safeString(risk.last_assessment_date),
        nextReview: this.calculateNextReview(risk.last_assessment_date ?? null, vulnerability.is_vulnerable ?? false),
        priority: this.determinePriority(this.extractInvestmentAmount(financial), vulnerability.is_vulnerable ?? false),
        status: this.safeString(client.status) || 'unknown'
      }

      return transformedClient

    } catch (error) {
      logger.error('Error transforming client data', error, { clientId: client.id })
      // Return safe fallback client
      return this.createFallbackClient(client.id)
    }
  }

  // CRITICAL: Ensure string fields never return objects
  private safeString(value: unknown): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object') {
      logger.warn('Object found where string expected', { value })
      return JSON.stringify(value) // Convert object to string safely
    }
    return String(value)
  }

  private safeNumber(value: unknown, fallback: number = 0): number {
    if (typeof value === 'number' && !isNaN(value)) return value
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? fallback : parsed
    }
    return fallback
  }

  private extractOccupation(personal: RawPersonalDetails): string {
    const occupation = personal.occupation || personal.job_title || personal.profession || ''

    // CRITICAL: Handle case where occupation might be an object
    if (typeof occupation === 'object') {
      logger.warn('Occupation is object', { occupation })
      return occupation.title || occupation.name || 'Not specified'
    }

    return this.safeString(occupation) || 'Not specified'
  }

  private extractName(personal: RawPersonalDetails): string {
    try {
      // Try multiple name field combinations
      const firstName = this.safeString(personal.first_name || personal.firstName || personal.fname)
      const lastName = this.safeString(personal.last_name || personal.lastName || personal.lname)
      const fullName = this.safeString(personal.full_name || personal.fullName || personal.name)

      if (fullName) return fullName
      if (firstName || lastName) return `${firstName} ${lastName}`.trim()

      // If no name found, return a safe placeholder
      return 'Unnamed Client'

    } catch (error) {
      logger.error('Error extracting name', error, { personal })
      return 'Unknown Client'
    }
  }

  private extractInvestmentAmount(financial: RawFinancialProfile): number {
    try {
      // Try investment amount fields first (type-safe access)
      const investmentValue = financial.investment_amount ?? financial.investmentAmount
      if (typeof investmentValue === 'number' && investmentValue > 0) {
        return investmentValue
      }

      // Try net worth
      const netWorthValue = financial.net_worth ?? financial.netWorth
      if (typeof netWorthValue === 'number' && netWorthValue > 0) {
        return netWorthValue
      }

      // Try total assets
      const totalAssetsValue = financial.total_assets ?? financial.totalAssets
      if (typeof totalAssetsValue === 'number' && totalAssetsValue > 0) {
        return totalAssetsValue
      }

      // Try liquid assets
      const liquidAssetsValue = financial.liquid_assets ?? financial.liquidAssets
      if (typeof liquidAssetsValue === 'number' && liquidAssetsValue > 0) {
        return liquidAssetsValue
      }

      // Try portfolio value
      const portfolioValue = financial.portfolio_value ?? financial.portfolioValue
      if (typeof portfolioValue === 'number' && portfolioValue > 0) {
        return portfolioValue
      }

      // Fallback to annual income * 2 as estimate
      const incomeValue = financial.annual_income ?? financial.annualIncome ?? financial.yearly_income
      if (typeof incomeValue === 'number' && incomeValue > 0) {
        return Math.max(incomeValue * 2, 25000)
      }

      return 0 // No financial data found

    } catch (error) {
      logger.error('Error extracting investment amount', error, { financial })
      return 0
    }
  }

  private extractRiskProfile(risk: RawRiskProfile): number {
    try {
      // Type-safe access to risk profile fields
      const finalRisk = risk.final_risk_profile ?? risk.finalRiskProfile
      if (typeof finalRisk === 'number' && finalRisk >= 1 && finalRisk <= 5) {
        return finalRisk
      }

      const riskLevel = risk.risk_level ?? risk.riskLevel
      if (typeof riskLevel === 'number' && riskLevel >= 1 && riskLevel <= 5) {
        return riskLevel
      }

      const atr = risk.attitude_to_risk ?? risk.attitudeToRisk
      if (typeof atr === 'number' && atr >= 1 && atr <= 5) {
        return atr
      }

      const tolerance = risk.risk_tolerance ?? risk.riskTolerance
      if (typeof tolerance === 'number' && tolerance >= 1 && tolerance <= 5) {
        return tolerance
      }

      return 3 // Default to balanced

    } catch (error) {
      logger.error('Error extracting risk profile', error, { risk })
      return 3
    }
  }

  private extractAge(personal: RawPersonalDetails): number {
    try {
      // Try to get age directly
      if (personal.age && typeof personal.age === 'number') {
        return personal.age
      }
      
      // Try to calculate from date of birth
      const dob = personal.date_of_birth || personal.dateOfBirth || personal.dob
      if (dob) {
        return this.calculateAge(dob)
      }
      
      return 0 // Unknown age

    } catch (error) {
      logger.error('Error extracting age', error, { personal })
      return 0
    }
  }

  private calculateAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 0

    try {
      const today = new Date()
      const birth = new Date(dateOfBirth)
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }

      return age > 0 ? age : 0
    } catch (error) {
      logger.error('Error calculating age', error, { dateOfBirth })
      return 0
    }
  }

  private determineStatus(risk: RawRiskProfile, clientStatus: string, investmentAmount: number): SuitabilityClient['assessmentStatus'] {
    try {
      // If has suitability score and assessment date = completed
      if (risk.suitability_score && risk.last_assessment_date) {
        return 'completed'
      }
      
      // If has some risk data but no suitability score = in progress
      if (risk.risk_level || risk.final_risk_profile) {
        return 'in_progress'
      }
      
      // If has investment amount but no assessment = needs to start
      if (investmentAmount > 0) {
        return 'not_started'
      }
      
      // If client is draft status
      if (clientStatus === 'draft') {
        return 'draft'
      }
      
      // Check if needs review
      if (this.needsReview(risk.last_assessment_date ?? null)) {
        return 'review_needed'
      }
      
      return 'not_started'

    } catch (error) {
      logger.error('Error determining status', error)
      return 'not_started'
    }
  }

  private calculateCompletion(risk: RawRiskProfile, investmentAmount: number): number {
    try {
      let completed = 0
      
      // Has basic financial data
      if (investmentAmount > 0) completed += 25
      
      // Has risk assessment
      if (risk.atr_complete || risk.risk_level) completed += 25
      
      // Has capacity for loss
      if (risk.cfl_complete || risk.capacity_for_loss) completed += 25
      
      // Has suitability score
      if (risk.suitability_score) completed += 25
      
      return completed

    } catch (error) {
      logger.error('Error calculating completion', error)
      return 0
    }
  }

  private generateTags(personal: RawPersonalDetails, financial: RawFinancialProfile, age: number): string[] {
    try {
      const tags: string[] = []
      
      if (age > 0 && age < 35) tags.push('Young Professional')
      if (age > 65) tags.push('Retired')
      
      const occupation = this.safeString(personal.occupation || '').toLowerCase()
      if (occupation.includes('tech') || occupation.includes('engineer') || occupation.includes('developer')) {
        tags.push('Tech')
      }
      if (occupation.includes('director') || occupation.includes('manager')) {
        tags.push('Professional')
      }
      
      const investment = this.extractInvestmentAmount(financial)
      if (investment > 200000) tags.push('High Value')
      if (investment > 500000) tags.push('HNW')
      
      return tags

    } catch (error) {
      logger.error('Error generating tags', error)
      return []
    }
  }

  // REMOVED: mockPerformance() - was returning random values for production data
  // Portfolio performance should come from actual financial data or be 0/null

  private calculateNextReview(lastAssessment: string | null, isVulnerable: boolean): string | null {
    try {
      if (!lastAssessment) return null
      
      const last = new Date(lastAssessment)
      const next = new Date(last)
      next.setMonth(next.getMonth() + (isVulnerable ? 6 : 12))
      
      return next.toISOString().split('T')[0]
    } catch (error) {
      logger.error('Error calculating next review', error, { lastAssessment, isVulnerable })
      return null
    }
  }

  private needsReview(lastAssessment: string | null): boolean {
    try {
      if (!lastAssessment) return false

      const last = new Date(lastAssessment)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      return last < sixMonthsAgo
    } catch (error) {
      logger.error('Error checking review need', error, { lastAssessment })
      return false
    }
  }

  private determinePriority(investmentAmount: number, isVulnerable: boolean): SuitabilityClient['priority'] {
    if (isVulnerable) return 'high'
    if (investmentAmount > 200000) return 'high'
    if (investmentAmount > 50000) return 'medium'
    return 'low'
  }

  private createFallbackClient(id: string): SuitabilityClient {
    return {
      id: this.safeString(id),
      name: 'Data Error Client',
      clientRef: `ERR-${id.slice(-6)}`,
      age: 0,
      occupation: 'Data extraction error',
      investmentAmount: 0,
      riskProfile: 3,
      suitabilityScore: 0,
      assessmentStatus: 'not_started',
      completionPercentage: 0,
      vulnerableClient: false,
      tags: ['Error'],
      portfolioPerformance: 0,
      lastAssessment: null,
      nextReview: null,
      priority: 'low',
      status: 'error'
    }
  }

  calculateMetrics(clients: SuitabilityClient[]): SuitabilityMetrics {
    return {
      totalClients: clients.length,
      totalAUM: clients.reduce((sum, c) => sum + c.investmentAmount, 0),
      completed: clients.filter(c => c.assessmentStatus === 'completed').length,
      needReview: clients.filter(c => c.assessmentStatus === 'review_needed').length,
      avgRiskLevel: clients.length > 0 
        ? Number((clients.reduce((sum, c) => sum + c.riskProfile, 0) / clients.length).toFixed(1))
        : 0,
      vulnerable: clients.filter(c => c.vulnerableClient).length
    }
  }

  filterClients(
    clients: SuitabilityClient[], 
    searchTerm: string, 
    statusFilter: string
  ): SuitabilityClient[] {
    return clients.filter(client => {
      const matchesSearch = searchTerm === '' || 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.clientRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.occupation.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || client.assessmentStatus === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }

  sortClients(clients: SuitabilityClient[], sortBy: string): SuitabilityClient[] {
    const sorted = [...clients]
    
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'value':
        return sorted.sort((a, b) => b.investmentAmount - a.investmentAmount)
      case 'risk':
        return sorted.sort((a, b) => b.riskProfile - a.riskProfile)
      case 'performance':
        return sorted.sort((a, b) => b.portfolioPerformance - a.portfolioPerformance)
      case 'priority':
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
        return sorted.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      default:
        return sorted
    }
  }
}

export const suitabilityService = SuitabilityAssessmentService.getInstance()