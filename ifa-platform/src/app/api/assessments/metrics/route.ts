// =====================================================
// FILE: src/app/api/assessments/metrics/route.ts
// FIXED VERSION - Using correct snake_case column names
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('Metrics API request received')
    
    // Get current date for calculations
    const now = new Date()
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // ===== CLIENT COVERAGE METRICS =====
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })

    // Get assessment progress for all types
    const { data: progressData } = await supabase
      .from('assessment_progress')
      .select('client_id, assessment_type, status')
      .eq('status', 'completed')

    // Count unique clients per assessment type
    const assessmentCoverage: Record<string, Set<string>> = {
      atr: new Set(),
      cfl: new Set(),
      persona: new Set(),
      suitability: new Set(),
      monte_carlo: new Set(),
      cashflow: new Set()
    }

    progressData?.forEach(item => {
      // Normalize assessment types
      let type = item.assessment_type
      if (type === 'investor_persona') type = 'persona'
      
      if (assessmentCoverage[type]) {
        assessmentCoverage[type].add(item.client_id)
      }
    })

    // Count unique clients with any assessment
    const allAssessedClients = new Set<string>()
    Object.values(assessmentCoverage).forEach(clientSet => {
      clientSet.forEach(clientId => allAssessedClients.add(clientId))
    })

    const assessedClients = allAssessedClients.size

    // ===== RISK DISTRIBUTION =====
    const { data: riskDistribution } = await supabase
      .from('atr_assessments')
      .select('risk_category')
      .eq('is_current', true)

    const riskCounts = {
      'Very Low': 0,
      'Low': 0,
      'Medium': 0,
      'High': 0,
      'Very High': 0
    }

    riskDistribution?.forEach(item => {
      if (item.risk_category in riskCounts) {
        riskCounts[item.risk_category as keyof typeof riskCounts]++
      }
    })

    // ===== COMPLIANCE STATUS =====
    // Check ATR assessments
    const { data: overdueATR } = await supabase
      .from('atr_assessments')
      .select('client_id, assessment_date')
      .eq('is_current', true)
      .lt('assessment_date', twelveMonthsAgo.toISOString())

    // Check CFL assessments
    const { data: overdueCFL } = await supabase
      .from('cfl_assessments')
      .select('client_id, assessment_date')
      .eq('is_current', true)
      .lt('assessment_date', twelveMonthsAgo.toISOString())

    // Check Persona assessments
    const { data: overduePersona } = await supabase
      .from('persona_assessments')
      .select('client_id, assessment_date')
      .eq('is_current', true)
      .lt('assessment_date', twelveMonthsAgo.toISOString())

    // Check Suitability assessments
    const { data: overdueSuitability } = await supabase
      .from('suitability_assessments')
      .select('client_id, assessment_date')
      .eq('is_current', true)
      .lt('assessment_date', twelveMonthsAgo.toISOString())

    const overdueCount = (overdueATR?.length || 0) + 
                        (overdueCFL?.length || 0) + 
                        (overduePersona?.length || 0) + 
                        (overdueSuitability?.length || 0)

    // Assessments due for review (between 10-12 months old)
    const tenMonthsAgo = new Date()
    tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10)

    const { data: dueForReviewATR } = await supabase
      .from('atr_assessments')
      .select('client_id')
      .eq('is_current', true)
      .gte('assessment_date', twelveMonthsAgo.toISOString())
      .lte('assessment_date', tenMonthsAgo.toISOString())

    const { data: dueForReviewCFL } = await supabase
      .from('cfl_assessments')
      .select('client_id')
      .eq('is_current', true)
      .gte('assessment_date', twelveMonthsAgo.toISOString())
      .lte('assessment_date', tenMonthsAgo.toISOString())

    const dueForReviewCount = (dueForReviewATR?.length || 0) + (dueForReviewCFL?.length || 0)

    // ===== ACTIVITY METRICS =====
    const { count: assessmentsLast7Days } = await supabase
      .from('atr_assessments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: cflLast7Days } = await supabase
      .from('cfl_assessments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: personaLast7Days } = await supabase
      .from('persona_assessments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    const totalLast7Days = (assessmentsLast7Days || 0) + (cflLast7Days || 0) + (personaLast7Days || 0)

    const { count: assessmentsLast30Days } = await supabase
      .from('atr_assessments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // ===== DEMOGRAPHIC INSIGHTS =====
    
    // Get all client details using snake_case columns
    const { data: clientsWithDetails } = await supabase
      .from('clients')
      .select('personal_details, contact_info, financial_profile, vulnerability_assessment')

    // Gender distribution (currently all NULL in database)
    const genderDistribution = {
      male: 0,
      female: 0,
      other: 0,
      notSpecified: 0
    }

    // Age distribution
    const ageGroups = {
      'Under 30': 0,
      '30-40': 0,
      '40-50': 0,
      '50-60': 0,
      '60-70': 0,
      'Over 70': 0
    }

    // Location distribution
    const locationDistribution: Record<string, number> = {}

    clientsWithDetails?.forEach(client => {
      // Gender (check both cases since data might be inconsistent)
      const gender = client.personal_details?.gender?.toLowerCase()
      if (gender === 'male' || gender === 'm') {
        genderDistribution.male++
      } else if (gender === 'female' || gender === 'f') {
        genderDistribution.female++
      } else if (gender && gender !== 'null') {
        genderDistribution.other++
      } else {
        genderDistribution.notSpecified++
      }

      // Age calculation
      const dob = client.personal_details?.dateOfBirth
      if (dob) {
        const birthDate = new Date(dob)
        const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        
        if (age < 30) ageGroups['Under 30']++
        else if (age < 40) ageGroups['30-40']++
        else if (age < 50) ageGroups['40-50']++
        else if (age < 60) ageGroups['50-60']++
        else if (age < 70) ageGroups['60-70']++
        else ageGroups['Over 70']++
      }

      // Location
      const city = client.contact_info?.address?.city
      if (city && city.trim() !== '') {
        locationDistribution[city] = (locationDistribution[city] || 0) + 1
      }
    })

    // Top 5 cities
    const topCities = Object.entries(locationDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }))

    // Financial metrics
    let totalNetWorth = 0
    let totalAnnualIncome = 0
    let clientsWithFinancialData = 0
    let clientsWithNetWorth = 0
    let clientsWithIncome = 0

    const wealthBrackets = {
      'Under £100k': 0,
      '£100k-£250k': 0,
      '£250k-£500k': 0,
      '£500k-£1M': 0,
      'Over £1M': 0
    }

    clientsWithDetails?.forEach(client => {
      const netWorth = Number(client.financial_profile?.netWorth) || 0
      const annualIncome = Number(client.financial_profile?.annualIncome) || 0
      
      if (netWorth > 0) {
        totalNetWorth += netWorth
        clientsWithNetWorth++
        
        if (netWorth < 100000) wealthBrackets['Under £100k']++
        else if (netWorth < 250000) wealthBrackets['£100k-£250k']++
        else if (netWorth < 500000) wealthBrackets['£250k-£500k']++
        else if (netWorth < 1000000) wealthBrackets['£500k-£1M']++
        else wealthBrackets['Over £1M']++
      }
      
      if (annualIncome > 0) {
        totalAnnualIncome += annualIncome
        clientsWithIncome++
      }
      
      if (netWorth > 0 || annualIncome > 0) {
        clientsWithFinancialData++
      }
    })

    const averageNetWorth = clientsWithNetWorth > 0 ? totalNetWorth / clientsWithNetWorth : 0
    const averageAnnualIncome = clientsWithIncome > 0 ? totalAnnualIncome / clientsWithIncome : 0

    // Vulnerability statistics
    let vulnerableCount = 0
    const vulnerabilityFactors: Record<string, number> = {}

    clientsWithDetails?.forEach(client => {
      // Check if is_vulnerable is true (as string or boolean)
      const isVulnerable = client.vulnerability_assessment?.is_vulnerable
      if (isVulnerable === true || isVulnerable === 'true') {
        vulnerableCount++
        
        // Count vulnerability factors
        const factors = client.vulnerability_assessment?.factors || []
        if (Array.isArray(factors)) {
          factors.forEach((factor: string) => {
            if (factor) {
              vulnerabilityFactors[factor] = (vulnerabilityFactors[factor] || 0) + 1
            }
          })
        }
      }
    })

    // Assessment counts by type
    const { count: atrCount } = await supabase
      .from('atr_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('is_current', true)

    const { count: cflCount } = await supabase
      .from('cfl_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('is_current', true)

    const { count: personaCount } = await supabase
      .from('persona_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('is_current', true)

    const { count: suitabilityCount } = await supabase
      .from('suitability_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('is_current', true)

    // Count Monte Carlo from results table (no assessments table)
    const { count: monteCarloCount } = await supabase
      .from('monte_carlo_results')
      .select('client_id', { count: 'exact', head: true })
      .not('client_id', 'is', null)

    // Version statistics
    const { data: atrVersions } = await supabase
      .from('atr_assessments')
      .select('version')
      .order('version', { ascending: false })

    const maxATRVersion = atrVersions?.[0]?.version || 0
    const averageVersions = atrVersions?.length ? 
      atrVersions.reduce((sum, v) => sum + (v.version || 1), 0) / atrVersions.length : 0

    // ===== COMPILE ALL METRICS =====
    const metrics = {
      // Core metrics
      clientCoverage: {
        assessed: assessedClients,
        total: totalClients || 0,
        percentage: totalClients ? Math.round((assessedClients / totalClients) * 100) : 0,
        byType: {
          atr: assessmentCoverage.atr.size,
          cfl: assessmentCoverage.cfl.size,
          persona: assessmentCoverage.persona.size,
          suitability: assessmentCoverage.suitability.size,
          monte_carlo: assessmentCoverage.monte_carlo.size,
          cashflow: assessmentCoverage.cashflow.size
        }
      },
      
      complianceStatus: {
        needReview: dueForReviewCount,
        upToDate: assessedClients - overdueCount - dueForReviewCount,
        overdue: overdueCount
      },
      
      riskDistribution: riskCounts,
      
      activityMetrics: {
        last7Days: totalLast7Days,
        last30Days: assessmentsLast30Days || 0,
        averagePerMonth: Math.round((assessmentsLast30Days || 0) / 30 * 30)
      },
      
      // Demographics
      demographics: {
        gender: genderDistribution,
        ageGroups: ageGroups,
        topCities: topCities,
        vulnerableClients: {
          count: vulnerableCount,
          percentage: totalClients ? Math.round((vulnerableCount / totalClients) * 100) : 0,
          topFactors: Object.entries(vulnerabilityFactors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([factor, count]) => ({ factor, count }))
        }
      },
      
      // Financial insights
      financialInsights: {
        averageNetWorth: Math.round(averageNetWorth),
        averageAnnualIncome: Math.round(averageAnnualIncome),
        wealthDistribution: wealthBrackets,
        clientsWithFinancialData: clientsWithFinancialData,
        clientsWithNetWorth: clientsWithNetWorth,
        clientsWithIncome: clientsWithIncome
      },
      
      // Assessment statistics
      assessmentStats: {
        byType: {
          atr: atrCount || 0,
          cfl: cflCount || 0,
          persona: personaCount || 0,
          suitability: suitabilityCount || 0,
          monte_carlo: monteCarloCount || 0,
          cashflow: assessmentCoverage.cashflow.size // From progress table
        },
        totalAssessments: (atrCount || 0) + (cflCount || 0) + (personaCount || 0) + (suitabilityCount || 0),
        averageVersions: Math.round(averageVersions * 10) / 10,
        maxVersionReached: maxATRVersion
      },
      
      // Summary stats for quick display
      summary: {
        totalClients: totalClients || 0,
        assessedClients: assessedClients,
        overdueReviews: overdueCount,
        recentActivity: totalLast7Days,
        femaleClients: genderDistribution.female,
        maleClients: genderDistribution.male,
        over60Clients: ageGroups['60-70'] + ageGroups['Over 70'],
        highRiskClients: riskCounts['High'] + riskCounts['Very High'],
        vulnerableClients: vulnerableCount,
        clientsWithData: clientsWithFinancialData
      }
    }

    console.log('Metrics compiled successfully:', {
      totalClients,
      assessedClients,
      genderData: genderDistribution,
      ageData: ageGroups,
      vulnerableCount,
      financialData: clientsWithFinancialData
    })
    
    return NextResponse.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}