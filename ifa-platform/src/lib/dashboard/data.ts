import { calculateFirmAUM } from '@/lib/financials/aumCalculator'
import type { Client } from '@/types/client'
import type { ActivityItem, WeeklyStats } from '@/components/dashboard/types'
import type { DashboardEvent } from '@/lib/dashboard/types'

export const transformClientData = (rawClient: any): Client => {
  return {
    ...rawClient,
    id: rawClient.id,
    clientRef: rawClient.client_ref,
    personalDetails: rawClient.personal_details,
    contactInfo: rawClient.contact_info,
    financialProfile: rawClient.financial_profile,
    riskProfile: rawClient.risk_profile,
    investmentObjectives: rawClient.investment_objectives,
    vulnerabilityAssessment: rawClient.vulnerability_assessment,
    createdAt: rawClient.created_at,
    updatedAt: rawClient.updated_at
  }
}

export const calculateClientStatistics = (clients: Client[]) => {
  const firmAUM = calculateFirmAUM(clients)

  return {
    totalClients: clients.length,
    totalAUM: firmAUM.totalAUM,
    complianceScore: 96.5,
    recentActivity: [] as ActivityItem[]
  }
}

export const generateMockWeeklyData = (): WeeklyStats => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const now = new Date()

  return {
    clientsChart: days.map((day, index) => ({
      day,
      value: Math.floor(Math.random() * 5) + 1,
      date: new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000).toISOString()
    })),
    assessmentsChart: days.map((day, index) => ({
      day,
      value: Math.floor(Math.random() * 8) + 2,
      date: new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000).toISOString()
    })),
    documentsChart: days.map((day, index) => ({
      day,
      value: Math.floor(Math.random() * 12) + 3,
      date: new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000).toISOString()
    })),
    monteCarloChart: days.map((day, index) => ({
      day,
      value: Math.floor(Math.random() * 6) + 1,
      date: new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000).toISOString()
    }))
  }
}

export const calculateClientDistribution = (clients: Client[]) => {
  const firmAUM = calculateFirmAUM(clients)

  const portfolioSizeCounts = {
    '£0-50k': 0,
    '£50k-200k': 0,
    '£200k-500k': 0,
    '£500k+': 0
  }

  firmAUM.byClient.forEach((client) => {
    if (client.aum < 50000) {
      portfolioSizeCounts['£0-50k']++
    } else if (client.aum < 200000) {
      portfolioSizeCounts['£50k-200k']++
    } else if (client.aum < 500000) {
      portfolioSizeCounts['£200k-500k']++
    } else {
      portfolioSizeCounts['£500k+']++
    }
  })

  const riskCounts = {
    Conservative: 0,
    Balanced: 0,
    Growth: 0,
    Aggressive: 0
  }

  clients.forEach((client) => {
    const riskLevel = client.riskProfile?.attitudeToRisk || client.riskProfile?.assessmentScore
    if (riskLevel) {
      if (riskLevel <= 2) riskCounts.Conservative++
      else if (riskLevel <= 3) riskCounts.Balanced++
      else if (riskLevel <= 4) riskCounts.Growth++
      else riskCounts.Aggressive++
    } else {
      riskCounts.Balanced++
    }
  })

  const ageGroups = {
    '25-35': 0,
    '36-45': 0,
    '46-55': 0,
    '56-65': 0,
    '65+': 0
  }

  clients.forEach((client) => {
    const dob = client.personalDetails?.dateOfBirth
    if (dob) {
      const age = new Date().getFullYear() - new Date(dob).getFullYear()
      if (age < 36) ageGroups['25-35']++
      else if (age < 46) ageGroups['36-45']++
      else if (age < 56) ageGroups['46-55']++
      else if (age < 66) ageGroups['56-65']++
      else ageGroups['65+']++
    }
  })

  const regionData: Record<string, { count: number; aum: number; clients: Array<{ id: string; name: string; aum: number }> }> = {
    London: { count: 0, aum: 0, clients: [] },
    'South East': { count: 0, aum: 0, clients: [] },
    'South West': { count: 0, aum: 0, clients: [] },
    Midlands: { count: 0, aum: 0, clients: [] },
    North: { count: 0, aum: 0, clients: [] },
    Scotland: { count: 0, aum: 0, clients: [] },
    Wales: { count: 0, aum: 0, clients: [] },
    Other: { count: 0, aum: 0, clients: [] }
  }

  clients.forEach((client) => {
    const address = client.contactInfo?.address
    const region = getRegionFromAddress(address)
    const clientAUM = firmAUM.byClient.find((entry) => entry.clientId === client.id)?.aum || 0
    const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() || 'Unknown'

    regionData[region].count++
    regionData[region].aum += clientAUM
    regionData[region].clients.push({
      id: client.id,
      name: clientName,
      aum: clientAUM
    })
  })

  const regionColors: Record<string, string> = {
    London: '#ef4444',
    'South East': '#f97316',
    'South West': '#22c55e',
    Midlands: '#3b82f6',
    North: '#8b5cf6',
    Scotland: '#06b6d4',
    Wales: '#ec4899',
    Other: '#94a3b8'
  }

  return {
    riskProfile: [
      { name: 'Conservative', value: riskCounts.Conservative, color: '#22c55e' },
      { name: 'Balanced', value: riskCounts.Balanced, color: '#3b82f6' },
      { name: 'Growth', value: riskCounts.Growth, color: '#f59e0b' },
      { name: 'Aggressive', value: riskCounts.Aggressive, color: '#ef4444' }
    ].filter((item) => item.value > 0),
    ageGroups: Object.entries(ageGroups).map(([range, count]) => ({ range, count })),
    portfolioSizes: [
      { range: '£0-50k', count: portfolioSizeCounts['£0-50k'], color: '#94a3b8' },
      { range: '£50k-200k', count: portfolioSizeCounts['£50k-200k'], color: '#3b82f6' },
      { range: '£200k-500k', count: portfolioSizeCounts['£200k-500k'], color: '#f59e0b' },
      { range: '£500k+', count: portfolioSizeCounts['£500k+'], color: '#10b981' }
    ],
    regionDistribution: Object.entries(regionData)
      .map(([region, data]) => ({
        region,
        count: data.count,
        aum: data.aum,
        color: regionColors[region],
        clients: data.clients.sort((a, b) => b.aum - a.aum)
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
  }
}

export const calculatePerformanceData = (clients: Client[]) => {
  const months = generateRecentMonths()
  const firmAUM = calculateFirmAUM(clients)
  const currentAUM = firmAUM.totalAUM
  const clientCount = firmAUM.clientCount

  return {
    aumGrowth: months.map((month, index) => {
      const monthsBack = 5 - index
      const growthFactor = Math.pow(0.975, monthsBack)
      const variance = 1 + (Math.random() - 0.5) * 0.02
      return {
        month,
        aum: Math.round(currentAUM * growthFactor * variance),
        clients: Math.max(1, clientCount - monthsBack)
      }
    }),
    complianceHistory: months.map((month) => ({
      month,
      score: 92 + Math.random() * 6
    }))
  }
}

export const mapActivityLogEntries = (entries: any[]): ActivityItem[] => {
  const typeMap: Record<string, ActivityItem['type']> = {
    client_added: 'client_added',
    client_created: 'client_added',
    assessment_completed: 'assessment_completed',
    suitability_completed: 'assessment_completed',
    assessment: 'assessment_completed',
    atr_completed: 'assessment_completed',
    atr_updated: 'assessment_completed',
    document_signed: 'document_signed',
    document_generated: 'document_signed',
    document_downloaded: 'document_signed',
    monte_carlo: 'monte_carlo_run',
    monte_carlo_run: 'monte_carlo_run',
    simulation_completed: 'monte_carlo_run',
    stress_test: 'monte_carlo_run',
    cashflow: 'document_signed',
    profile_update: 'profile_update',
    review_scheduled: 'review_due',
    review: 'review_due',
    review_completed: 'assessment_completed',
    communication: 'client_added',
    communication_logged: 'client_added'
  }

  return entries.map((activity) => {
    const activityType = typeMap[activity.type] || typeMap[activity.action] || 'client_added'

    return {
      id: activity.id,
      type: activityType,
      clientName: activity.clientName || 'Unknown Client',
      clientId: activity.client_id,
      description: activity.action || 'Activity recorded',
      timestamp: activity.date || activity.created_at
    }
  })
}

export const mapUpcomingReviews = (reviews: any[]): DashboardEvent[] => {
  return reviews.map((review) => ({
    id: review.id,
    type: review.review_type === 'annual' || review.review_type === 'prod_policy'
      ? 'review'
      : review.review_type === 'meeting'
        ? 'meeting'
        : 'deadline',
    clientName: review.review_type === 'prod_policy'
      ? 'Firm PROD Review'
      : (review.client_name || 'Unknown Client'),
    clientId: review.client_id,
    description: review.review_type === 'annual'
      ? 'Annual review due'
      : review.review_type === 'suitability'
        ? 'Suitability review due'
        : review.review_type === 'vulnerability'
          ? 'Vulnerability check due'
          : review.review_type === 'prod_policy'
            ? 'Firm PROD policy review due'
            : `${review.review_type || 'Review'} due`,
    date: review.due_date,
    priority: review.status === 'overdue'
      ? 'high'
      : new Date(review.due_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        ? 'high'
        : 'medium'
  }))
}

const generateRecentMonths = () => {
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(date.toLocaleString('default', { month: 'short' }))
  }
  return months
}

const getRegionFromAddress = (address: any): string => {
  if (!address) return 'Other'
  const postcode = (address.postcode || '').toUpperCase()
  const city = (address.city || address.town || '').toLowerCase()

  if (postcode.match(/^(E|EC|N|NW|SE|SW|W|WC)\d/)) return 'London'
  if (city.includes('london')) return 'London'

  if (postcode.match(/^(AB|DD|DG|EH|FK|G|HS|IV|KA|KW|KY|ML|PA|PH|TD|ZE)\d/)) return 'Scotland'
  if (city.includes('edinburgh') || city.includes('glasgow') || city.includes('aberdeen')) return 'Scotland'

  if (postcode.match(/^(CF|LL|NP|SA|SY)\d/)) return 'Wales'
  if (city.includes('cardiff') || city.includes('swansea')) return 'Wales'

  if (postcode.match(/^(BN|BR|CB|CM|CO|CT|DA|GU|HP|LU|ME|MK|OX|RG|RH|SG|SL|SM|SS|TN|TW|UB)\d/)) return 'South East'
  if (city.includes('brighton') || city.includes('reading') || city.includes('oxford')) return 'South East'

  if (postcode.match(/^(BA|BH|BS|DT|EX|GL|PL|SN|SP|TA|TQ|TR)\d/)) return 'South West'
  if (city.includes('bristol') || city.includes('bath') || city.includes('exeter')) return 'South West'

  if (postcode.match(/^(B|CV|DE|DY|LE|NG|NN|PE|ST|WR|WS|WV)\d/)) return 'Midlands'
  if (city.includes('birmingham') || city.includes('nottingham') || city.includes('leicester')) return 'Midlands'

  if (postcode.match(/^(BD|BL|CA|CH|CW|DH|DL|DN|FY|HG|HD|HU|HX|L|LA|LS|M|NE|OL|PR|S|SK|SR|TS|WA|WF|WN|YO)\d/)) return 'North'
  if (city.includes('manchester') || city.includes('leeds') || city.includes('liverpool') || city.includes('newcastle')) return 'North'

  return 'Other'
}
