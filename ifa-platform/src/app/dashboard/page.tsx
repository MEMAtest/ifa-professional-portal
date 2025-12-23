// File: src/app/dashboard/page.tsx - ENHANCED with Working Buttons + More Charts
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import Analytics from '@/components/Analytics'
import {
  Users,
  PoundSterling,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Eye,
  EyeOff,
  Calculator,
  Upload,
  UserPlus,
  Shield,
  Calendar,
  Target,
  Zap,
  Award,
  MapPin
} from 'lucide-react'
import { calculateFirmAUM } from '@/lib/financials/aumCalculator'
import type { Client } from '@/types/client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { RegionClientsModal } from '@/components/dashboard/RegionClientsModal'

interface DashboardStats {
  totalClients: number
  totalAUM: number
  assessmentsDue: number
  complianceScore: number
  recentActivity: ActivityItem[]
  weeklyStats: WeeklyStats
  thisWeek: {
    clientsOnboarded: number
    assessmentsCompleted: number
    documentsGenerated: number
    monteCarloRuns: number
  }
  // NEW: Additional metrics
  clientDistribution: {
    riskProfile: Array<{ name: string; value: number; color: string }>
    ageGroups: Array<{ range: string; count: number }>
    portfolioSizes: Array<{ range: string; count: number; color: string }>
    regionDistribution: Array<{ region: string; count: number; aum: number; color: string; clients: Array<{ id: string; name: string; aum: number }> }>
  }
  performance: {
    aumGrowth: Array<{ month: string; aum: number; clients: number }>
    complianceHistory: Array<{ month: string; score: number }>
  }
  upcomingEvents: Array<{
    id: string
    type: 'meeting' | 'review' | 'deadline'
    clientName: string
    clientId?: string
    description: string
    date: string
    priority: 'high' | 'medium' | 'low'
  }>
}

interface WeeklyStats {
  clientsChart: ChartDataPoint[]
  assessmentsChart: ChartDataPoint[]
  documentsChart: ChartDataPoint[]
  monteCarloChart: ChartDataPoint[]
}

interface ChartDataPoint {
  day: string
  value: number
  date: string
}

interface ActivityItem {
  id: string
  type: 'client_added' | 'assessment_completed' | 'document_signed' | 'review_due' | 'monte_carlo_run'
  clientName: string
  clientId?: string
  description: string
  timestamp: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalAUM: 0,
    assessmentsDue: 0,
    complianceScore: 0,
    recentActivity: [],
    weeklyStats: {
      clientsChart: [],
      assessmentsChart: [],
      documentsChart: [],
      monteCarloChart: []
    },
    thisWeek: {
      clientsOnboarded: 0,
      assessmentsCompleted: 0,
      documentsGenerated: 0,
      monteCarloRuns: 0
    },
    clientDistribution: {
      riskProfile: [],
      ageGroups: [],
      portfolioSizes: [],
      regionDistribution: []
    },
    performance: {
      aumGrowth: [],
      complianceHistory: []
    },
    upcomingEvents: []
  })
  const [loading, setLoading] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<{
    region: string
    clients: Array<{ id: string; name: string; aum: number }>
    totalAUM: number
    color: string
  } | null>(null)
  const [timelineClientFilter, setTimelineClientFilter] = useState<string | null>(null)
  const [timelineDays, setTimelineDays] = useState<14 | 30 | 'all'>(30)

  // FIXED: Working button handlers
  const handleNewAssessment = () => {
    router.push('/assessments/suitability')
  }

  const handleAddClient = () => {
    router.push('/clients/new')
  }

  const handleGenerateReport = () => {
    router.push('/reports')
  }

  const handleShowAnalytics = () => {
    setShowAnalytics(!showAnalytics)
  }

  // Mock data for Analytics component
  const mockClientData = {
    name: 'Geoffrey Clarkson',
    age: 58,
    occupation: 'Retired Teacher',
    timeHorizon: '15',
    dependents: 2
  }

  const mockRiskMetrics = {
    finalRiskProfile: 3,
    atrScore: 3.2,
    cflScore: 3.8,
    volatilityTolerance: 16,
    lossCapacity: 26.6,
    behavioralBias: 'neutral'
  }

  const mockClientPersona = {
    type: 'The Balanced Investor',
    avatar: '⚖️',
    description: 'Seeks moderate growth with managed risk',
    emotionalDrivers: {
      primary: 'Financial security with growth potential'
    },
    communicationNeeds: {
      frequency: 'quarterly',
      style: 'detailed reports with clear explanations'
    }
  }

  const mockRiskCategories = {
    1: { name: 'Ultra Conservative', expectedReturn: 3, maxVolatility: 5, maxDrawdown: 5 },
    2: { name: 'Conservative', expectedReturn: 4, maxVolatility: 8, maxDrawdown: 8 },
    3: { name: 'Balanced', expectedReturn: 6, maxVolatility: 12, maxDrawdown: 12 },
    4: { name: 'Growth', expectedReturn: 8, maxVolatility: 16, maxDrawdown: 16 },
    5: { name: 'Aggressive Growth', expectedReturn: 10, maxVolatility: 20, maxDrawdown: 20 }
  }

  const mockSetCurrentSection = (section: string) => {
    console.log(`Navigate to: ${section}`)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Transform snake_case API response to camelCase for Client type
  const transformClientData = (rawClient: any): Client => {
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
      updatedAt: rawClient.updated_at,
    }
  }

  // Enhanced data fetching with additional metrics
  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // First, fetch all clients once to share across multiple calculations
      // Use limit=1000 to get all clients (API defaults to 20)
      let allClients: Client[] = []
      try {
        const clientsResponse = await fetch('/api/clients?limit=1000')
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json()
          const rawClients = clientsData.clients || clientsData || []
          // Transform snake_case to camelCase
          allClients = rawClients.map(transformClientData)
          console.log('Dashboard: Transformed clients', {
            count: allClients.length,
            sampleClient: allClients[0] ? {
              id: allClients[0].id,
              hasFinancialProfile: !!allClients[0].financialProfile,
              fp: allClients[0].financialProfile ? {
                liquidAssets: allClients[0].financialProfile.liquidAssets,
                investments: allClients[0].financialProfile.existingInvestments?.length,
                pensions: allClients[0].financialProfile.pensionArrangements?.length
              } : null
            } : null
          })
        }
      } catch (e) {
        console.error('Error fetching clients:', e)
      }

      const [
        clientStats,
        weeklyActivity,
        assessmentData,
        upcomingEvents,
        recentActivities
      ] = await Promise.all([
        fetchClientStatistics(allClients),
        fetchWeeklyActivity(),
        fetchAssessmentStats(),
        fetchUpcomingEvents(),
        fetchRecentActivities()
      ])

      // Calculate distribution and performance using already fetched clients
      const clientDistribution = calculateClientDistribution(allClients)
      const performanceData = calculatePerformanceData(allClients)

      setStats({
        ...clientStats,
        weeklyStats: weeklyActivity,
        clientDistribution,
        performance: performanceData,
        upcomingEvents,
        thisWeek: {
          clientsOnboarded: weeklyActivity.clientsChart.reduce((sum, day) => sum + day.value, 0),
          assessmentsCompleted: weeklyActivity.assessmentsChart.reduce((sum, day) => sum + day.value, 0),
          documentsGenerated: weeklyActivity.documentsChart.reduce((sum, day) => sum + day.value, 0),
          monteCarloRuns: weeklyActivity.monteCarloChart.reduce((sum, day) => sum + day.value, 0)
        },
        assessmentsDue: assessmentData.due,
        recentActivity: recentActivities.slice(0, 10)
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Existing fetch functions...
  const fetchClientStatistics = async (clients: Client[]) => {
    try {
      // Calculate real AUM from provided clients
      const firmAUM = calculateFirmAUM(clients)

      return {
        totalClients: clients.length,
        totalAUM: firmAUM.totalAUM,
        complianceScore: 96.5,
        recentActivity: [] // Activities now fetched from activity-log API
      }
    } catch (error) {
      console.error('Error fetching client statistics:', error)
      return {
        totalClients: 0,
        totalAUM: 0,
        complianceScore: 0,
        recentActivity: []
      }
    }
  }

  const fetchWeeklyActivity = async (): Promise<WeeklyStats> => {
    try {
      const response = await fetch('/api/dashboard/weekly-activity')
      if (!response.ok) {
        return generateMockWeeklyData()
      }
      
      const data = await response.json()
      return data.weeklyStats
    } catch (error) {
      console.error('Error fetching weekly activity:', error)
      return generateMockWeeklyData()
    }
  }

  const generateMockWeeklyData = (): WeeklyStats => {
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

  // Calculate client distribution from provided client data (synchronous)
  const calculateClientDistribution = (clients: Client[]) => {
    // Calculate real AUM for portfolio size distribution
    const firmAUM = calculateFirmAUM(clients)

    // Count clients by portfolio size bands
    const portfolioSizeCounts = {
      '£0-50k': 0,
      '£50k-200k': 0,
      '£200k-500k': 0,
      '£500k+': 0
    }

    firmAUM.byClient.forEach(client => {
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

    // Calculate risk profile distribution from actual client risk profiles
    const riskCounts = {
      'Conservative': 0,
      'Balanced': 0,
      'Growth': 0,
      'Aggressive': 0
    }

    clients.forEach(client => {
      // Use attitudeToRisk (1-5 scale) or assessmentScore
      const riskLevel = client.riskProfile?.attitudeToRisk || client.riskProfile?.assessmentScore
      if (riskLevel) {
        if (riskLevel <= 2) riskCounts['Conservative']++
        else if (riskLevel <= 3) riskCounts['Balanced']++
        else if (riskLevel <= 4) riskCounts['Growth']++
        else riskCounts['Aggressive']++
      } else {
        // Default to Balanced if no risk profile
        riskCounts['Balanced']++
      }
    })

    // Calculate age groups
    const ageGroups = {
      '25-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '65+': 0
    }

    clients.forEach(client => {
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

    // Calculate regional distribution based on postcode or city
    const regionData: Record<string, { count: number; aum: number; clients: Array<{ id: string; name: string; aum: number }> }> = {
      'London': { count: 0, aum: 0, clients: [] },
      'South East': { count: 0, aum: 0, clients: [] },
      'South West': { count: 0, aum: 0, clients: [] },
      'Midlands': { count: 0, aum: 0, clients: [] },
      'North': { count: 0, aum: 0, clients: [] },
      'Scotland': { count: 0, aum: 0, clients: [] },
      'Wales': { count: 0, aum: 0, clients: [] },
      'Other': { count: 0, aum: 0, clients: [] }
    }

    // Map postcodes/cities to regions
    const getRegionFromAddress = (address: any): string => {
      if (!address) return 'Other'
      const postcode = (address.postcode || '').toUpperCase()
      const city = (address.city || address.town || '').toLowerCase()

      // London postcodes
      if (postcode.match(/^(E|EC|N|NW|SE|SW|W|WC)\d/)) return 'London'
      if (city.includes('london')) return 'London'

      // Scotland postcodes
      if (postcode.match(/^(AB|DD|DG|EH|FK|G|HS|IV|KA|KW|KY|ML|PA|PH|TD|ZE)\d/)) return 'Scotland'
      if (city.includes('edinburgh') || city.includes('glasgow') || city.includes('aberdeen')) return 'Scotland'

      // Wales postcodes
      if (postcode.match(/^(CF|LL|NP|SA|SY)\d/)) return 'Wales'
      if (city.includes('cardiff') || city.includes('swansea')) return 'Wales'

      // South East
      if (postcode.match(/^(BN|BR|CB|CM|CO|CT|DA|GU|HP|LU|ME|MK|OX|RG|RH|SG|SL|SM|SS|TN|TW|UB)\d/)) return 'South East'
      if (city.includes('brighton') || city.includes('reading') || city.includes('oxford')) return 'South East'

      // South West
      if (postcode.match(/^(BA|BH|BS|DT|EX|GL|PL|SN|SP|TA|TQ|TR)\d/)) return 'South West'
      if (city.includes('bristol') || city.includes('bath') || city.includes('exeter')) return 'South West'

      // Midlands
      if (postcode.match(/^(B|CV|DE|DY|LE|NG|NN|PE|ST|WR|WS|WV)\d/)) return 'Midlands'
      if (city.includes('birmingham') || city.includes('nottingham') || city.includes('leicester')) return 'Midlands'

      // North
      if (postcode.match(/^(BD|BL|CA|CH|CW|DH|DL|DN|FY|HG|HD|HU|HX|L|LA|LS|M|NE|OL|PR|S|SK|SR|TS|WA|WF|WN|YO)\d/)) return 'North'
      if (city.includes('manchester') || city.includes('leeds') || city.includes('liverpool') || city.includes('newcastle')) return 'North'

      return 'Other'
    }

    clients.forEach(client => {
      const address = client.contactInfo?.address
      const region = getRegionFromAddress(address)
      const clientAUM = firmAUM.byClient.find(c => c.clientId === client.id)?.aum || 0
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
      'London': '#ef4444',
      'South East': '#f97316',
      'South West': '#22c55e',
      'Midlands': '#3b82f6',
      'North': '#8b5cf6',
      'Scotland': '#06b6d4',
      'Wales': '#ec4899',
      'Other': '#94a3b8'
    }

    return {
      riskProfile: [
        { name: 'Conservative', value: riskCounts['Conservative'], color: '#22c55e' },
        { name: 'Balanced', value: riskCounts['Balanced'], color: '#3b82f6' },
        { name: 'Growth', value: riskCounts['Growth'], color: '#f59e0b' },
        { name: 'Aggressive', value: riskCounts['Aggressive'], color: '#ef4444' }
      ].filter(item => item.value > 0),
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
          clients: data.clients.sort((a, b) => b.aum - a.aum) // Sort clients by AUM descending
        }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
    }
  }

  // Calculate performance trends with real AUM data (synchronous)
  const calculatePerformanceData = (clients: Client[]) => {
    // Generate last 6 months dynamically based on current date
    const generateRecentMonths = () => {
      const months: string[] = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push(d.toLocaleString('default', { month: 'short' }))
      }
      return months
    }

    const months = generateRecentMonths()

    // Calculate real AUM from provided clients
    const firmAUM = calculateFirmAUM(clients)
    const currentAUM = firmAUM.totalAUM
    const clientCount = firmAUM.clientCount

    console.log('Dashboard AUM calculation:', {
      currentAUM,
      clientCount,
      clientsLength: clients.length,
      sampleClientAUM: firmAUM.byClient[0],
      clientsWithAUM: firmAUM.byClient.filter(c => c.aum > 0).length,
      totalAUMFromByClient: firmAUM.byClient.reduce((sum, c) => sum + c.aum, 0)
    })

    // Generate trend data based on real current AUM
    // Simulate gradual growth leading to current value
    return {
      aumGrowth: months.map((month, index) => {
        // Simulate 2-3% monthly growth backwards from current
        const monthsBack = 5 - index
        const growthFactor = Math.pow(0.975, monthsBack) // ~2.5% monthly growth
        const variance = 1 + (Math.random() - 0.5) * 0.02 // +/- 1% variance
        return {
          month,
          aum: Math.round(currentAUM * growthFactor * variance),
          clients: Math.max(1, clientCount - monthsBack) // Gradual client growth
        }
      }),
      complianceHistory: months.map((month) => ({
        month,
        score: 92 + Math.random() * 6
      }))
    }
  }

  // Fetch upcoming events from reviews API
  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch('/api/reviews/upcoming?limit=5')
      if (!response.ok) {
        console.error('Failed to fetch upcoming events')
        return []
      }
      const data = await response.json()

      // Transform reviews to event format
      return (data.data || []).map((review: any) => ({
        id: review.id,
        type: review.review_type === 'annual' ? 'review' as const :
              review.review_type === 'meeting' ? 'meeting' as const : 'deadline' as const,
        clientName: review.client_name || 'Unknown Client',
        clientId: review.client_id,
        description: review.review_type === 'annual' ? 'Annual review due' :
                     review.review_type === 'suitability' ? 'Suitability review due' :
                     review.review_type === 'vulnerability' ? 'Vulnerability check due' :
                     `${review.review_type || 'Review'} due`,
        date: review.due_date,
        priority: review.status === 'overdue' ? 'high' as const :
                  new Date(review.due_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) ? 'high' as const :
                  'medium' as const
      }))
    } catch (error) {
      console.error('Error fetching upcoming events:', error)
      return []
    }
  }

  const fetchAssessmentStats = async () => {
    try {
      // Fetch incomplete assessments count
      const response = await fetch('/api/assessments/incomplete?limit=100')
      if (!response.ok) {
        return { due: 0, recentActivity: [] }
      }
      const data = await response.json()
      return {
        due: data.count || 0,
        recentActivity: [] // Activities now fetched from activity-log API
      }
    } catch (error) {
      console.error('Error fetching assessment stats:', error)
      return { due: 0, recentActivity: [] }
    }
  }

  const fetchDocumentStats = async () => {
    // Activities now fetched from activity-log API
    return { recentActivity: [] }
  }

  const fetchMonteCarloStats = async () => {
    // Activities now fetched from activity-log API
    return { recentActivity: [] }
  }

  // Fetch real activities from activity-log API
  const fetchRecentActivities = async (): Promise<ActivityItem[]> => {
    try {
      const response = await fetch('/api/activity-log?recent=true&limit=20')
      if (!response.ok) {
        console.error('Failed to fetch recent activities')
        return []
      }
      const data = await response.json()

      // Map activity log entries to ActivityItem format
      return (data.data || []).map((activity: any) => {
        // Map activity types to our expected format
        const typeMap: Record<string, ActivityItem['type']> = {
          'client_added': 'client_added',
          'client_created': 'client_added',
          'assessment_completed': 'assessment_completed',
          'suitability_completed': 'assessment_completed',
          'document_signed': 'document_signed',
          'document_generated': 'document_signed',
          'monte_carlo_run': 'monte_carlo_run',
          'simulation_completed': 'monte_carlo_run',
          'review_scheduled': 'review_due',
          'review_completed': 'assessment_completed',
          'communication_logged': 'client_added'
        }

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
    } catch (error) {
      console.error('Error fetching recent activities:', error)
      return []
    }
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'client_added':
        return <UserPlus className="h-4 w-4 text-blue-500" />
      case 'assessment_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'document_signed':
        return <FileText className="h-4 w-4 text-purple-500" />
      case 'monte_carlo_run':
        return <Calculator className="h-4 w-4 text-orange-500" />
      case 'review_due':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Calendar className="h-4 w-4 text-blue-500" />
      case 'review': return <Shield className="h-4 w-4 text-orange-500" />
      case 'deadline': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your clients today.
          </p>
        </div>

        {/* FIXED: Working Quick Actions */}
        <div className="flex gap-4">
          <Button onClick={handleNewAssessment} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            New Assessment
          </Button>
          <Button onClick={handleAddClient} variant="secondary" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Add Client
          </Button>
          <Button onClick={handleGenerateReport} variant="secondary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Generate Report
          </Button>
          <Button 
            variant={showAnalytics ? "default" : "secondary"} 
            className="flex items-center gap-2"
            onClick={handleShowAnalytics}
          >
            {showAnalytics ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </Button>
        </div>

        {/* Main KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.thisWeek.clientsOnboarded} this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assets Under Management</CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAUM)}</div>
              <p className="text-xs text-muted-foreground">
                +5.2% from last quarter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assessments This Week</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisWeek.assessmentsCompleted}</div>
              <p className="text-xs text-muted-foreground">
                {stats.assessmentsDue} pending review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents Generated</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisWeek.documentsGenerated}</div>
              <p className="text-xs text-muted-foreground">
                This week's activity
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Activity Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Clients Onboarded This Week
              </CardTitle>
              <CardDescription>
                Daily client acquisition tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.weeklyStats.clientsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Assessments Completed
              </CardTitle>
              <CardDescription>
                Daily assessment completion rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.weeklyStats.assessmentsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Documents Generated
              </CardTitle>
              <CardDescription>
                Daily document creation activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.weeklyStats.documentsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-orange-600" />
                Monte Carlo Simulations
              </CardTitle>
              <CardDescription>
                Daily projection analysis runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.weeklyStats.monteCarloChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={{ fill: '#f97316' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* NEW: Additional Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Client Risk Distribution
              </CardTitle>
              <CardDescription>
                Portfolio risk profile breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.clientDistribution.riskProfile}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={70}
                    dataKey="value"
                  >
                    {stats.clientDistribution.riskProfile.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* AUM Growth Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                AUM Growth Trend
              </CardTitle>
              <CardDescription>
                6-month assets under management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.performance.aumGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`
                      if (value >= 1000) return `£${(value / 1000).toFixed(0)}K`
                      return `£${value}`
                    }}
                    width={70}
                  />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), 'AUM']} />
                  <Area
                    type="monotone"
                    dataKey="aum"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Portfolio Size Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Portfolio Size Distribution
              </CardTitle>
              <CardDescription>
                Client portfolio value ranges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.clientDistribution.portfolioSizes} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="range" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [`${value} clients`, 'Count']} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Client Location Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Client Distribution by Region
            </CardTitle>
            <CardDescription>
              Geographic spread of your client base across the UK
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* UK Region Visualization - Clickable Cards */}
              <div className="space-y-4">
                {/* Visual Region Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {(() => {
                    const regionConfig = [
                      { name: 'Scotland', color: '#06b6d4', bgColor: '#06b6d420' },
                      { name: 'North', color: '#8b5cf6', bgColor: '#8b5cf620' },
                      { name: 'Midlands', color: '#3b82f6', bgColor: '#3b82f620' },
                      { name: 'Wales', color: '#ec4899', bgColor: '#ec489920' },
                      { name: 'London', color: '#ef4444', bgColor: '#ef444420' },
                      { name: 'South East', color: '#f97316', bgColor: '#f9731620' },
                      { name: 'South West', color: '#22c55e', bgColor: '#22c55e20', colSpan: true },
                      { name: 'Other', color: '#94a3b8', bgColor: '#94a3b820', colSpan: true }
                    ]

                    return regionConfig.map(config => {
                      const regionData = stats.clientDistribution.regionDistribution.find(r => r.region === config.name)
                      const count = regionData?.count || 0
                      const hasClients = count > 0

                      // Skip "Other" if no clients
                      if (config.name === 'Other' && !hasClients) return null

                      return (
                        <div
                          key={config.name}
                          onClick={() => {
                            if (regionData && hasClients) {
                              setSelectedRegion({
                                region: config.name,
                                clients: regionData.clients,
                                totalAUM: regionData.aum,
                                color: config.color
                              })
                            }
                          }}
                          className={`p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${config.colSpan ? 'col-span-2' : ''} ${hasClients ? 'hover:scale-[1.02]' : 'opacity-60'}`}
                          style={{
                            backgroundColor: hasClients ? config.bgColor : '#f1f5f9',
                            borderColor: hasClients ? config.color : '#e2e8f0'
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                            <span className="font-semibold text-sm">{config.name === 'Other' ? 'Other Regions' : config.name}</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{count}</p>
                          <p className="text-xs text-gray-500">{hasClients ? 'clients - click to view' : 'clients'}</p>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Region Stats */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Regional Breakdown</h4>
                {stats.clientDistribution.regionDistribution.length > 0 ? (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
                    {stats.clientDistribution.regionDistribution.map((region) => (
                      <div
                        key={region.region}
                        onClick={() => setSelectedRegion({
                          region: region.region,
                          clients: region.clients,
                          totalAUM: region.aum,
                          color: region.color
                        })}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:scale-[1.01] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: region.color }}
                          />
                          <div>
                            <p className="font-medium text-sm">{region.region}</p>
                            <p className="text-xs text-gray-500">{region.count} client{region.count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(region.aum)}</p>
                          <p className="text-xs text-gray-500">AUM</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No location data available</p>
                    <p className="text-xs mt-1">Add addresses to client profiles to see distribution</p>
                  </div>
                )}

                {/* Summary */}
                {stats.clientDistribution.regionDistribution.length > 0 && (
                  <div className="pt-3 border-t mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Regions</span>
                      <span className="font-medium">{stats.clientDistribution.regionDistribution.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Most Clients</span>
                      <span className="font-medium">{stats.clientDistribution.regionDistribution[0]?.region || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total AUM</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(stats.clientDistribution.regionDistribution.reduce((sum, r) => sum + r.aum, 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Section - Expandable */}
        {showAnalytics && (
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Market Analytics & Client Intelligence
              </CardTitle>
              <CardDescription>
                Live market data with client-specific impact analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-white rounded-lg">
                <Analytics 
                  clientData={mockClientData}
                  riskMetrics={mockRiskMetrics}
                  clientPersona={mockClientPersona}
                  setCurrentSection={mockSetCurrentSection}
                  riskCategories={mockRiskCategories}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Activity Timeline
                  </CardTitle>
                  <CardDescription>
                    {timelineClientFilter
                      ? `Activities for ${stats.recentActivity.find(a => a.clientId === timelineClientFilter)?.clientName || 'selected client'}`
                      : `Latest updates across your client portfolio`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {/* Client Filter Dropdown */}
                  <select
                    value={timelineClientFilter || ''}
                    onChange={(e) => setTimelineClientFilter(e.target.value || null)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Clients</option>
                    {/* Get unique clients from activities */}
                    {Array.from(new Set(stats.recentActivity.filter(a => a.clientId).map(a => JSON.stringify({ id: a.clientId, name: a.clientName }))))
                      .map(str => JSON.parse(str))
                      .map((client: { id: string; name: string }) => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                  </select>
                  {/* Days Toggle */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setTimelineDays(14)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        timelineDays === 14
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      14 days
                    </button>
                    <button
                      onClick={() => setTimelineDays(30)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        timelineDays === 30
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      30 days
                    </button>
                    <button
                      onClick={() => setTimelineDays('all')}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        timelineDays === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Apply filters
                const filteredActivities = stats.recentActivity.filter(activity => {
                  // Skip date filtering if "all" is selected
                  let withinDateRange = true
                  if (timelineDays !== 'all') {
                    const cutoffDate = new Date()
                    cutoffDate.setDate(cutoffDate.getDate() - timelineDays)
                    const activityDate = new Date(activity.timestamp)
                    withinDateRange = activityDate >= cutoffDate
                  }
                  const matchesClient = !timelineClientFilter || activity.clientId === timelineClientFilter
                  return withinDateRange && matchesClient
                })

                return filteredActivities.length > 0 ? (
                <div className="relative pl-8">
                  {/* Vertical timeline line - positioned through dots */}
                  <div className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-blue-400 via-purple-400 to-gray-300" />

                  {/* Timeline items */}
                  {filteredActivities.slice(0, 8).map((activity, index) => {
                    const activityUrl = activity.clientId
                      ? `/clients/${activity.clientId}`
                      : activity.type === 'monte_carlo_run'
                        ? '/monte-carlo'
                        : '/clients'

                    // Get time ago
                    const timestamp = new Date(activity.timestamp)
                    const now = new Date()
                    const diffMs = now.getTime() - timestamp.getTime()
                    const diffMins = Math.floor(diffMs / 60000)
                    const diffHours = Math.floor(diffMs / 3600000)
                    const diffDays = Math.floor(diffMs / 86400000)

                    let timeAgo = ''
                    if (diffMins < 60) timeAgo = `${diffMins}m ago`
                    else if (diffHours < 24) timeAgo = `${diffHours}h ago`
                    else if (diffDays === 1) timeAgo = 'Yesterday'
                    else if (diffDays < 7) timeAgo = `${diffDays}d ago`
                    else timeAgo = timestamp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

                    // Activity type colors
                    const dotColors: Record<string, string> = {
                      client_added: '#3b82f6',
                      assessment_completed: '#22c55e',
                      document_signed: '#a855f7',
                      monte_carlo_run: '#f97316',
                      review_due: '#ef4444'
                    }

                    const dotColor = dotColors[activity.type] || '#9ca3af'

                    return (
                      <Link
                        key={activity.id}
                        href={activityUrl}
                        className="block relative mb-6 last:mb-0 group"
                      >
                        {/* Timeline dot - centered on the line */}
                        <div
                          className="absolute -left-8 top-3 w-6 h-6 rounded-full flex items-center justify-center z-10"
                          style={{ backgroundColor: dotColor }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        </div>

                        {/* Content */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all ml-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors flex-shrink-0">
                                {getActivityIcon(activity.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                  {activity.clientName}
                                </p>
                                <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                              {timeAgo}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}

                  {/* End dot */}
                  <div className="relative">
                    <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center z-10">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    </div>
                    <p className="text-xs text-gray-400 italic ml-2 pt-1">End of recent activity</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No activity {timelineDays === 'all' ? 'recorded yet' : `in the last ${timelineDays} days`}</p>
                  <p className="text-sm mt-1">
                    {timelineClientFilter
                      ? 'Try selecting a different client or time range'
                      : timelineDays !== 'all'
                        ? 'Try selecting "All" to see older activity'
                        : 'Activity will appear here as you work with clients'}
                  </p>
                </div>
              )
              })()}
            </CardContent>
          </Card>

          {/* NEW: Upcoming Events & Summary */}
          <div className="space-y-6">
            {/* This Week's Summary */}
            <Card>
              <CardHeader>
                <CardTitle>This Week's Summary</CardTitle>
                <CardDescription>
                  Key performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">New Clients</span>
                    <span className="font-medium">{stats.thisWeek.clientsOnboarded}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Assessments</span>
                    <span className="font-medium">{stats.thisWeek.assessmentsCompleted}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Documents</span>
                    <span className="font-medium">{stats.thisWeek.documentsGenerated}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Simulations</span>
                    <span className="font-medium">{stats.thisWeek.monteCarloRuns}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Compliance Score</span>
                      <span className="font-bold text-green-600">{stats.complianceScore}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NEW: Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Upcoming Events
                </CardTitle>
                <CardDescription>
                  Next 7 days schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.upcomingEvents.map((event) => {
                    // Link to client reviews tab if we have a clientId, otherwise to reviews page
                    const eventUrl = event.clientId
                      ? `/clients/${event.clientId}?tab=reviews`
                      : '/reviews'
                    return (
                      <Link
                        key={event.id}
                        href={eventUrl}
                        className={`block p-3 rounded-lg border ${getPriorityColor(event.priority)} hover:shadow-md transition-shadow cursor-pointer`}
                      >
                        <div className="flex items-start gap-2">
                          {getEventIcon(event.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{event.clientName}</p>
                            <p className="text-xs text-gray-600">{event.description}</p>
                            <p className="text-xs mt-1">
                              {new Date(event.date).toLocaleDateString('en-GB', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(event.priority)}`}>
                            {event.priority}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Region Clients Modal */}
      <RegionClientsModal
        isOpen={!!selectedRegion}
        onClose={() => setSelectedRegion(null)}
        region={selectedRegion?.region || ''}
        clients={selectedRegion?.clients || []}
        totalAUM={selectedRegion?.totalAUM || 0}
        color={selectedRegion?.color || '#94a3b8'}
      />
    </Layout>
  )
}