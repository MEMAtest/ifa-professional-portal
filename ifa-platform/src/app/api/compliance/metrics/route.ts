// app/api/compliance/metrics/route.ts
// ================================================================
// COMPLIANCE METRICS API
// Aggregates data from all compliance tables for the metrics dashboard
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'

export const dynamic = 'force-dynamic'

// Generate last 12 months labels
function getLast12Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(date.toLocaleDateString('en-GB', { month: 'short' }))
  }
  return months
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'reports:read')
    if (permissionError) {
      return permissionError
    }
    const { firmId } = firmResult

    const months = getLast12Months()
    const supabase = getSupabaseServiceClient() as any

    // Parallel fetch all compliance data
    const [
      fileReviewsResult,
      complaintsResult,
      breachesResult,
      vulnerabilityResult,
      amlResult,
      consumerDutyResult,
      clientsResult
    ] = await Promise.all([
      // File Reviews
      supabase.from('file_reviews').select('*').eq('firm_id', firmId),
      // Complaints
      supabase.from('complaint_register').select('*').eq('firm_id', firmId),
      // Breaches
      supabase.from('breach_register').select('*').eq('firm_id', firmId),
      // Vulnerability
      supabase.from('vulnerability_register').select('*').eq('firm_id', firmId),
      // AML
      supabase.from('aml_client_status').select('*').eq('firm_id', firmId),
      // Consumer Duty
      supabase.from('consumer_duty_status').select('*').eq('firm_id', firmId),
      // Total clients for reference
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('firm_id', firmId)
    ])

    const fileReviews: any[] = fileReviewsResult.data || []
    const complaints: any[] = complaintsResult.data || []
    const breaches: any[] = breachesResult.data || []
    const vulnerability: any[] = vulnerabilityResult.data || []
    const amlStatuses: any[] = amlResult.data || []
    const consumerDuty: any[] = consumerDutyResult.data || []
    const totalClients = clientsResult.count || 0

    // Calculate QA metrics
    const qaTotal = fileReviews.length
    const qaPending = fileReviews.filter(r => r.status === 'pending').length
    const qaApproved = fileReviews.filter(r => r.status === 'approved').length
    const qaRejected = fileReviews.filter(r => r.status === 'rejected').length
    const qaEscalated = fileReviews.filter(r => r.status === 'escalated').length
    const qaPassRate = qaTotal > 0 ? Math.round((qaApproved / qaTotal) * 100) : 0

    const qaByRisk = {
      low: fileReviews.filter(r => r.risk_rating === 'low').length,
      medium: fileReviews.filter(r => r.risk_rating === 'medium').length,
      high: fileReviews.filter(r => r.risk_rating === 'high').length,
      critical: fileReviews.filter(r => r.risk_rating === 'critical').length
    }

    // Calculate overdue reviews (due_date in the past, not completed)
    const now = new Date()
    const overdueReviews = fileReviews.filter(r => {
      if (r.status === 'approved' || r.status === 'completed') return false
      if (!r.due_date) return false
      return new Date(r.due_date) < now
    }).length

    // Calculate complaint metrics
    const complaintTotal = complaints.length
    const complaintOpen = complaints.filter(c => c.status === 'open').length
    const complaintInvestigating = complaints.filter(c => c.status === 'investigating').length
    const complaintResolved = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length
    const complaintEscalated = complaints.filter(c => c.status === 'escalated').length
    const complaintFcaReportable = complaints.filter(c => c.fca_reportable).length
    const totalRedress = complaints.reduce((sum, c) => sum + (parseFloat(c.redress_amount) || 0), 0)

    const complaintByCategory = {
      service: complaints.filter(c => c.category === 'service').length,
      advice: complaints.filter(c => c.category === 'advice').length,
      product: complaints.filter(c => c.category === 'product').length,
      fees: complaints.filter(c => c.category === 'fees').length,
      communication: complaints.filter(c => c.category === 'communication').length,
      other: complaints.filter(c => c.category === 'other').length
    }

    // Calculate breach metrics
    const breachTotal = breaches.length
    const breachOpen = breaches.filter(b => b.status === 'open').length
    const breachInvestigating = breaches.filter(b => b.status === 'investigating').length
    const breachRemediated = breaches.filter(b => b.status === 'remediated').length
    const breachClosed = breaches.filter(b => b.status === 'closed').length
    const breachFcaNotified = breaches.filter(b => b.fca_notified).length
    const affectedClients = breaches.reduce((sum, b) => sum + (b.affected_clients || 0), 0)

    const breachBySeverity = {
      minor: breaches.filter(b => b.severity === 'minor').length,
      moderate: breaches.filter(b => b.severity === 'moderate').length,
      serious: breaches.filter(b => b.severity === 'serious').length,
      critical: breaches.filter(b => b.severity === 'critical').length
    }

    // Calculate vulnerability metrics
    const vulnActive = vulnerability.filter(v => v.status === 'active' || v.status === 'monitoring').length
    const vulnByType = {
      health: vulnerability.filter(v => v.vulnerability_type === 'health').length,
      life_events: vulnerability.filter(v => v.vulnerability_type === 'life_events').length,
      resilience: vulnerability.filter(v => v.vulnerability_type === 'resilience').length,
      capability: vulnerability.filter(v => v.vulnerability_type === 'capability').length
    }
    const vulnBySeverity = {
      low: vulnerability.filter(v => v.severity === 'low').length,
      medium: vulnerability.filter(v => v.severity === 'medium').length,
      high: vulnerability.filter(v => v.severity === 'high').length
    }
    const vulnOverdue = vulnerability.filter(v => {
      if (v.status === 'resolved') return false
      if (!v.next_review_date) return false
      return new Date(v.next_review_date) < now
    }).length

    // Calculate AML metrics
    const amlTotal = amlStatuses.length || totalClients
    const amlVerified = amlStatuses.filter(a => a.verification_status === 'verified').length
    const amlPending = amlStatuses.filter(a => a.verification_status === 'pending').length
    const amlFailed = amlStatuses.filter(a => a.verification_status === 'failed').length
    const amlExpired = amlStatuses.filter(a => a.verification_status === 'expired').length
    const pepCount = amlStatuses.filter(a => a.pep_status === true || a.pep_status === 'yes').length

    const amlByRisk = {
      low: amlStatuses.filter(a => a.risk_rating === 'low').length,
      medium: amlStatuses.filter(a => a.risk_rating === 'medium' || a.risk_rating === 'standard').length,
      high: amlStatuses.filter(a => a.risk_rating === 'high').length,
      edd: amlStatuses.filter(a => a.risk_rating === 'edd' || a.risk_rating === 'enhanced').length
    }

    const amlOverdue = amlStatuses.filter(a => {
      if (!a.next_review_date) return false
      return new Date(a.next_review_date) < now
    }).length

    // Calculate Consumer Duty metrics
    const cdAssessed = consumerDuty.length
    const cdFullyCompliant = consumerDuty.filter(c =>
      c.products_services_status === 'compliant' &&
      c.price_value_status === 'compliant' &&
      c.consumer_understanding_status === 'compliant' &&
      c.consumer_support_status === 'compliant'
    ).length
    const cdMostlyCompliant = consumerDuty.filter(c => {
      const statuses = [c.products_services_status, c.price_value_status, c.consumer_understanding_status, c.consumer_support_status]
      const compliantCount = statuses.filter(s => s === 'compliant').length
      return compliantCount >= 3 && compliantCount < 4
    }).length
    const cdNeedsAttention = consumerDuty.filter(c => {
      const statuses = [c.products_services_status, c.price_value_status, c.consumer_understanding_status, c.consumer_support_status]
      return statuses.some(s => s === 'partially_compliant')
    }).length
    const cdNonCompliant = consumerDuty.filter(c => {
      const statuses = [c.products_services_status, c.price_value_status, c.consumer_understanding_status, c.consumer_support_status]
      return statuses.some(s => s === 'non_compliant')
    }).length

    const cdByOutcome = {
      products_services: {
        compliant: consumerDuty.filter(c => c.products_services_status === 'compliant').length,
        partial: consumerDuty.filter(c => c.products_services_status === 'partially_compliant').length,
        non: consumerDuty.filter(c => c.products_services_status === 'non_compliant').length
      },
      price_value: {
        compliant: consumerDuty.filter(c => c.price_value_status === 'compliant').length,
        partial: consumerDuty.filter(c => c.price_value_status === 'partially_compliant').length,
        non: consumerDuty.filter(c => c.price_value_status === 'non_compliant').length
      },
      consumer_understanding: {
        compliant: consumerDuty.filter(c => c.consumer_understanding_status === 'compliant').length,
        partial: consumerDuty.filter(c => c.consumer_understanding_status === 'partially_compliant').length,
        non: consumerDuty.filter(c => c.consumer_understanding_status === 'non_compliant').length
      },
      consumer_support: {
        compliant: consumerDuty.filter(c => c.consumer_support_status === 'compliant').length,
        partial: consumerDuty.filter(c => c.consumer_support_status === 'partially_compliant').length,
        non: consumerDuty.filter(c => c.consumer_support_status === 'non_compliant').length
      }
    }

    // Calculate overall compliance score
    // Deductions based on: open complaints, breaches, overdue reviews, QA pass rate
    let complianceScore = 100
    complianceScore -= Math.min(complaintOpen * 5, 20)  // -5 per open complaint, max 20
    complianceScore -= Math.min(breachOpen * 10, 30)    // -10 per open breach, max 30
    complianceScore -= Math.min(overdueReviews * 3, 15) // -3 per overdue review, max 15
    complianceScore -= Math.round((100 - qaPassRate) * 0.35) // QA impact
    complianceScore = Math.max(0, Math.min(100, complianceScore))

    // Calculate open issues total
    const openIssues = complaintOpen + complaintInvestigating + breachOpen + breachInvestigating + vulnOverdue

    // High risk clients
    const highRiskClients = amlByRisk.high + amlByRisk.edd + qaByRisk.high + qaByRisk.critical

    // Generate trend data from actual database records
    // Calculate real monthly data by grouping records by created_at month
    const nowDate = new Date()
    const trendData = {
      // Compliance score trend - based on actual issue counts per month
      // Since we don't have historical snapshots, show "No historical data" placeholder
      complianceScore: months.map((month, i) => {
        const monthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - (11 - i), 1)
        const nextMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() - (11 - i) + 1, 1)

        // Count issues that were open during that month
        const monthComplaints = complaints.filter(c => {
          const created = new Date(c.created_at)
          return created >= monthDate && created < nextMonth
        }).length

        const monthBreaches = breaches.filter(b => {
          const created = new Date(b.created_at)
          return created >= monthDate && created < nextMonth
        }).length

        // Calculate a score based on actual data (100 - deductions)
        const monthScore = Math.max(0, Math.min(100, 100 - (monthComplaints * 5) - (monthBreaches * 10)))

        return { month, score: monthScore }
      }),

      // Review activity - actual completed vs due per month
      reviewActivity: months.map((month, i) => {
        const monthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - (11 - i), 1)
        const nextMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() - (11 - i) + 1, 1)

        const completed = fileReviews.filter(r => {
          if (r.status !== 'approved' && r.status !== 'completed') return false
          const completedDate = r.completed_at ? new Date(r.completed_at) : null
          if (!completedDate) return false
          return completedDate >= monthDate && completedDate < nextMonth
        }).length

        const due = fileReviews.filter(r => {
          if (!r.due_date) return false
          const dueDate = new Date(r.due_date)
          return dueDate >= monthDate && dueDate < nextMonth
        }).length

        return { month, completed, due }
      }),

      // Issue volume - actual complaints and breaches created per month
      issueVolume: months.map((month, i) => {
        const monthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - (11 - i), 1)
        const nextMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() - (11 - i) + 1, 1)

        const monthComplaints = complaints.filter(c => {
          const created = new Date(c.created_at)
          return created >= monthDate && created < nextMonth
        }).length

        const monthBreaches = breaches.filter(b => {
          const created = new Date(b.created_at)
          return created >= monthDate && created < nextMonth
        }).length

        return { month, complaints: monthComplaints, breaches: monthBreaches }
      })
    }

    // Calculate actual trends (comparing last month to previous)
    const currentMonthScore = trendData.complianceScore[11]?.score || complianceScore
    const prevMonthScore = trendData.complianceScore[10]?.score || complianceScore
    const complianceScoreTrend = currentMonthScore - prevMonthScore

    const currentMonthComplaints = trendData.issueVolume[11]?.complaints || 0
    const prevMonthComplaints = trendData.issueVolume[10]?.complaints || 0
    const openIssuesTrend = currentMonthComplaints - prevMonthComplaints

    const currentMonthReviews = trendData.reviewActivity[11]?.completed || 0
    const prevMonthReviews = trendData.reviewActivity[10]?.completed || 0
    const qaPassRateTrend = currentMonthReviews - prevMonthReviews

    const metrics = {
      summary: {
        complianceScore,
        complianceScoreTrend,  // Real trend from actual data
        qaPassRate,
        qaPassRateTrend,       // Real trend from actual data
        openIssues,
        openIssuesTrend,       // Real trend from actual data
        overdueReviews,
        highRiskClients
      },
      qaReviews: {
        total: qaTotal,
        pending: qaPending,
        approved: qaApproved,
        rejected: qaRejected,
        escalated: qaEscalated,
        passRate: qaPassRate,
        byRiskRating: qaByRisk
      },
      complaints: {
        total: complaintTotal,
        open: complaintOpen,
        investigating: complaintInvestigating,
        resolved: complaintResolved,
        escalated: complaintEscalated,
        fcaReportable: complaintFcaReportable,
        byCategory: complaintByCategory,
        totalRedress
      },
      breaches: {
        total: breachTotal,
        open: breachOpen,
        investigating: breachInvestigating,
        remediated: breachRemediated,
        closed: breachClosed,
        bySeverity: breachBySeverity,
        fcaNotified: breachFcaNotified,
        affectedClients
      },
      vulnerability: {
        activeClients: vulnActive,
        byType: vulnByType,
        bySeverity: vulnBySeverity,
        overdueReviews: vulnOverdue
      },
      aml: {
        totalClients: amlTotal,
        verified: amlVerified,
        pending: amlPending,
        failed: amlFailed,
        expired: amlExpired,
        byRiskRating: amlByRisk,
        pepCount,
        overdueReviews: amlOverdue
      },
      consumerDuty: {
        assessed: cdAssessed,
        fullyCompliant: cdFullyCompliant,
        mostlyCompliant: cdMostlyCompliant,
        needsAttention: cdNeedsAttention,
        nonCompliant: cdNonCompliant,
        byOutcome: cdByOutcome
      },
      trends: trendData
    }

    return NextResponse.json({ success: true, metrics })
  } catch (error) {
    log.error('Error fetching compliance metrics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch compliance metrics' },
      { status: 500 }
    )
  }
}
