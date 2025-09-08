// services/SuitabilityAssessmentService.ts - FIXED VERSION (No Object Errors)
import { createClient } from "@/lib/supabase/client"

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
      console.log('Loading clients from Supabase...')
      
      // Load actual clients from Supabase - ONLY ACTIVE CLIENTS
      const { data: clients, error } = await this.supabase  // ✅ Use this.supabase
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
        console.error('Supabase error:', error)
        throw error
      }

      if (!clients || clients.length === 0) {
        console.log('No active clients found in database')
        return []
      }

      // Transform Supabase data to clean display format
      const transformedClients = clients.map(this.transformClientData)
      
      console.log(`Loaded ${transformedClients.length} active clients from Supabase`)
      
      // Debug: Log first client to see data structure
      if (transformedClients.length > 0) {
        console.log('Sample transformed client:', transformedClients[0])
      }
      
      return transformedClients

    } catch (error) {
      console.error('Error loading clients:', error)
      throw new Error('Failed to load client assessments')
    }
  }

  private transformClientData = (client: any): SuitabilityClient => {
    try {
      const personal = client.personal_details || {}
      const contact = client.contact_info || {}
      const financial = client.financial_profile || {}
      const risk = client.risk_profile || {}
      const vulnerability = client.vulnerability_assessment || {}

      // DEBUG: Log raw data to understand structure
      console.log('Transforming client:', client.id, {
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
        assessmentStatus: this.determineStatus(risk, client.status, this.extractInvestmentAmount(financial)),
        completionPercentage: this.calculateCompletion(risk, this.extractInvestmentAmount(financial)),
        vulnerableClient: Boolean(vulnerability.is_vulnerable),
        tags: this.generateTags(personal, financial, this.extractAge(personal)),
        portfolioPerformance: this.safeNumber(financial.portfolio_performance, this.mockPerformance()),
        lastAssessment: this.safeString(risk.last_assessment_date),
        nextReview: this.calculateNextReview(risk.last_assessment_date, vulnerability.is_vulnerable),
        priority: this.determinePriority(this.extractInvestmentAmount(financial), vulnerability.is_vulnerable),
        status: this.safeString(client.status) || 'unknown'
      }

      console.log('Transformed client result:', transformedClient.name, {
        name: transformedClient.name,
        occupation: transformedClient.occupation,
        clientRef: transformedClient.clientRef
      })

      return transformedClient

    } catch (error) {
      console.error('Error transforming client data:', error, client)
      // Return safe fallback client
      return this.createFallbackClient(client.id)
    }
  }

  // CRITICAL: Ensure string fields never return objects
  private safeString(value: any): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object') {
      console.warn('Object found where string expected:', value)
      return JSON.stringify(value) // Convert object to string safely
    }
    return String(value)
  }

  private safeNumber(value: any, fallback: number = 0): number {
    if (typeof value === 'number' && !isNaN(value)) return value
    const parsed = parseFloat(value)
    return isNaN(parsed) ? fallback : parsed
  }

  private extractOccupation(personal: any): string {
    const occupation = personal.occupation || personal.job_title || personal.profession || ''
    
    // CRITICAL: Handle case where occupation might be an object
    if (typeof occupation === 'object') {
      console.warn('Occupation is object:', occupation)
      return occupation.title || occupation.name || 'Not specified'
    }
    
    return this.safeString(occupation) || 'Not specified'
  }

  private extractName(personal: any): string {
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
      console.error('Error extracting name:', error, personal)
      return 'Unknown Client'
    }
  }

  private extractInvestmentAmount(financial: any): number {
    try {
      // Try multiple fields to find investment amount
      const possibleFields = [
        'investment_amount',
        'investmentAmount', 
        'net_worth',
        'netWorth',
        'total_assets',
        'totalAssets',
        'liquid_assets',
        'liquidAssets',
        'portfolio_value',
        'portfolioValue'
      ]
      
      for (const field of possibleFields) {
        const value = financial[field]
        if (value && typeof value === 'number' && value > 0) {
          console.log(`Found investment amount in field '${field}':`, value)
          return value
        }
      }
      
      // Try annual income fields as fallback
      const incomeFields = ['annual_income', 'annualIncome', 'yearly_income']
      for (const field of incomeFields) {
        const value = financial[field]
        if (value && typeof value === 'number' && value > 0) {
          console.log(`Using income field '${field}' as investment estimate:`, value * 2)
          return Math.max(value * 2, 25000) // Estimate investment as 2x income
        }
      }
      
      return 0 // No financial data found
      
    } catch (error) {
      console.error('Error extracting investment amount:', error, financial)
      return 0
    }
  }

  private extractRiskProfile(risk: any): number {
    try {
      const possibleFields = [
        'final_risk_profile',
        'finalRiskProfile',
        'risk_level',
        'riskLevel',
        'attitude_to_risk',
        'attitudeToRisk',
        'risk_tolerance',
        'riskTolerance'
      ]
      
      for (const field of possibleFields) {
        const value = risk[field]
        if (value && typeof value === 'number' && value >= 1 && value <= 5) {
          return value
        }
      }
      
      return 3 // Default to balanced
      
    } catch (error) {
      console.error('Error extracting risk profile:', error, risk)
      return 3
    }
  }

  private extractAge(personal: any): number {
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
      console.error('Error extracting age:', error, personal)
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
    } catch (e) {
      console.error('Error calculating age from', dateOfBirth, e)
      return 0
    }
  }

  private determineStatus(risk: any, clientStatus: string, investmentAmount: number): SuitabilityClient['assessmentStatus'] {
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
      if (this.needsReview(risk.last_assessment_date)) {
        return 'review_needed'
      }
      
      return 'not_started'
      
    } catch (error) {
      console.error('Error determining status:', error)
      return 'not_started'
    }
  }

  private calculateCompletion(risk: any, investmentAmount: number): number {
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
      console.error('Error calculating completion:', error)
      return 0
    }
  }

  private generateTags(personal: any, financial: any, age: number): string[] {
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
      console.error('Error generating tags:', error)
      return []
    }
  }

  private mockPerformance(): number {
    return Number((Math.random() * 10 - 2).toFixed(1))
  }

  private calculateNextReview(lastAssessment: string | null, isVulnerable: boolean): string | null {
    try {
      if (!lastAssessment) return null
      
      const last = new Date(lastAssessment)
      const next = new Date(last)
      next.setMonth(next.getMonth() + (isVulnerable ? 6 : 12))
      
      return next.toISOString().split('T')[0]
    } catch (error) {
      console.error('Error calculating next review:', error)
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
      console.error('Error checking review need:', error)
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