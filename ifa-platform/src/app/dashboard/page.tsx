// File: src/app/dashboard/page.tsx - ENHANCED with Working Buttons + More Charts
'use client'
import { useState, useEffect } from 'react'
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
  Award
} from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

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
  }
  performance: {
    aumGrowth: Array<{ month: string; aum: number; clients: number }>
    complianceHistory: Array<{ month: string; score: number }>
  }
  upcomingEvents: Array<{
    id: string
    type: 'meeting' | 'review' | 'deadline'
    clientName: string
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
      portfolioSizes: []
    },
    performance: {
      aumGrowth: [],
      complianceHistory: []
    },
    upcomingEvents: []
  })
  const [loading, setLoading] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)

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

  // Enhanced data fetching with additional metrics
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const [
        clientStats,
        weeklyActivity,
        assessmentData,
        documentData,
        monteCarloData,
        clientDistribution,
        performanceData,
        upcomingEvents
      ] = await Promise.all([
        fetchClientStatistics(),
        fetchWeeklyActivity(),
        fetchAssessmentStats(),
        fetchDocumentStats(),
        fetchMonteCarloStats(),
        fetchClientDistribution(),
        fetchPerformanceData(),
        fetchUpcomingEvents()
      ])

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
        recentActivity: [
          ...clientStats.recentActivity,
          ...assessmentData.recentActivity,
          ...documentData.recentActivity,
          ...monteCarloData.recentActivity
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Existing fetch functions...
  const fetchClientStatistics = async () => {
    try {
      const response = await fetch('/api/clients/statistics')
      if (!response.ok) throw new Error('Failed to fetch client stats')
      
      const data = await response.json()
      return {
        totalClients: data.totalClients || 0,
        totalAUM: 2450000,
        complianceScore: 96.5,
        recentActivity: [
          {
            id: '1',
            type: 'client_added' as const,
            clientName: 'Geoffrey Clarkson',
            description: 'Client profile migrated from legacy system',
            timestamp: new Date().toISOString()
          }
        ]
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

  // NEW: Fetch client distribution data
  const fetchClientDistribution = async () => {
    try {
      return {
        riskProfile: [
          { name: 'Conservative', value: 25, color: '#22c55e' },
          { name: 'Balanced', value: 45, color: '#3b82f6' },
          { name: 'Growth', value: 25, color: '#f59e0b' },
          { name: 'Aggressive', value: 5, color: '#ef4444' }
        ],
        ageGroups: [
          { range: '25-35', count: 5 },
          { range: '36-45', count: 12 },
          { range: '46-55', count: 18 },
          { range: '56-65', count: 15 },
          { range: '65+', count: 10 }
        ],
        portfolioSizes: [
          { range: '£0-50k', count: 15, color: '#94a3b8' },
          { range: '£50k-200k', count: 25, color: '#3b82f6' },
          { range: '£200k-500k', count: 12, color: '#f59e0b' },
          { range: '£500k+', count: 8, color: '#10b981' }
        ]
      }
    } catch (error) {
      return {
        riskProfile: [],
        ageGroups: [],
        portfolioSizes: []
      }
    }
  }

  // NEW: Fetch performance trends
  const fetchPerformanceData = async () => {
    try {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      return {
        aumGrowth: months.map((month, index) => ({
          month,
          aum: 2000000 + (index * 75000) + Math.random() * 50000,
          clients: 45 + (index * 3) + Math.floor(Math.random() * 5)
        })),
        complianceHistory: months.map((month) => ({
          month,
          score: 92 + Math.random() * 6
        }))
      }
    } catch (error) {
      return {
        aumGrowth: [],
        complianceHistory: []
      }
    }
  }

  // NEW: Fetch upcoming events
  const fetchUpcomingEvents = async () => {
    try {
      return [
        {
          id: '1',
          type: 'meeting' as const,
          clientName: 'John Smith',
          description: 'Quarterly portfolio review',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high' as const
        },
        {
          id: '2',
          type: 'review' as const,
          clientName: 'Sarah Wilson',
          description: 'Annual risk assessment due',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium' as const
        },
        {
          id: '3',
          type: 'deadline' as const,
          clientName: 'Multiple Clients',
          description: 'Consumer Duty compliance review',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high' as const
        }
      ]
    } catch (error) {
      return []
    }
  }

  const fetchAssessmentStats = async () => {
    try {
      return {
        due: 3,
        recentActivity: [
          {
            id: '2',
            type: 'assessment_completed' as const,
            clientName: 'Eddie Sauna',
            description: 'Annual suitability assessment completed',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    } catch (error) {
      return { due: 0, recentActivity: [] }
    }
  }

  const fetchDocumentStats = async () => {
    try {
      return {
        recentActivity: [
          {
            id: '3',
            type: 'document_signed' as const,
            clientName: 'John Smith',
            description: 'Investment agreement signed',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    } catch (error) {
      return { recentActivity: [] }
    }
  }

  const fetchMonteCarloStats = async () => {
    try {
      return {
        recentActivity: [
          {
            id: '4',
            type: 'monte_carlo_run' as const,
            clientName: 'Sarah Wilson',
            description: 'Retirement projection simulation completed',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    } catch (error) {
      return { recentActivity: [] }
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
                  <YAxis />
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
                <BarChart data={stats.clientDistribution.portfolioSizes} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="range" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

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
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates across your client portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.clientName}
                      </p>
                      <p className="text-sm text-gray-500">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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
                  {stats.upcomingEvents.map((event) => (
                    <div key={event.id} className={`p-3 rounded-lg border ${getPriorityColor(event.priority)}`}>
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}