// File: src/app/dashboard/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
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
  EyeOff
} from 'lucide-react'

interface DashboardStats {
  totalClients: number
  totalAUM: number
  assessmentsDue: number
  complianceScore: number
  recentActivity: ActivityItem[]
}

interface ActivityItem {
  id: string
  type: 'client_added' | 'assessment_completed' | 'document_signed' | 'review_due'
  clientName: string
  description: string
  timestamp: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalAUM: 0,
    assessmentsDue: 0,
    complianceScore: 0,
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)

  // Mock data for Analytics component demonstration
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

  const fetchDashboardData = async () => {
    try {
      // Get client count (only if user and firmId exist)
      let clientCount = 0;
      if (user?.firmId) {
        const { count } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('firm_id', user.firmId);
        clientCount = count || 0;
      }

      // Mock data for demonstration (other modules will provide real data)
      setStats({
        totalClients: clientCount,
        totalAUM: 2450000, // Mock AUM
        assessmentsDue: 3, // Mock assessments due
        complianceScore: 96.5, // Mock compliance score
        recentActivity: [
          {
            id: '1',
            type: 'client_added',
            clientName: 'Geoffrey Clarkson',
            description: 'Client profile migrated from legacy system',
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            type: 'assessment_completed',
            clientName: 'Eddie Sauna',
            description: 'Annual suitability assessment completed',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'client_added':
        return <Users className="h-4 w-4 text-blue-500" />
      case 'assessment_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'document_signed':
        return <FileText className="h-4 w-4 text-purple-500" />
      case 'review_due':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
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

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            New Assessment
          </Button>
          <Button variant="secondary" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Add Client
          </Button>
          <Button variant="secondary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Generate Report
          </Button>
          <Button 
            variant={showAnalytics ? "default" : "secondary"} 
            className="flex items-center gap-2"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            {showAnalytics ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">
                Active client relationships
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
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.complianceScore}%</div>
              <p className="text-xs text-muted-foreground">
                Excellent compliance rating
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reviews Due</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assessmentsDue}</div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
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
          {/* Module Status */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Module Integration Status</CardTitle>
              <CardDescription>
                Platform modules and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="font-medium text-green-800">Foundation & Authentication</h4>
                      <p className="text-sm text-green-600">Fully operational</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-700">✅ Active</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="font-medium text-green-800">Analytics Dashboard</h4>
                      <p className="text-sm text-green-600">Live market data + client intelligence</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-700">✅ Active</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Client Management</h4>
                      <p className="text-sm text-yellow-600">Ready for integration</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-yellow-700">🔄 Pending</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Document Management</h4>
                      <p className="text-sm text-yellow-600">DocuSeal integration ready</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-yellow-700">🔄 Pending</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-blue-800">Enhanced Assessment Forms</h4>
                      <p className="text-sm text-blue-600">13 sections + vulnerability analysis</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-blue-700">📋 Planned</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates across your client portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.map((activity) => (
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
        </div>

        {/* Integration Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Ready to integrate other platform modules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-600 mb-4">
                The foundation is now ready! Other development tracks can integrate their modules:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Client AI:</strong> Can integrate client management system into /clients route</li>
                <li><strong>Document AI:</strong> Can integrate document vault into /documents route</li>
                <li><strong>Analytics AI:</strong> ✅ <strong>INTEGRATED</strong> - Live market analytics with client intelligence</li>
                <li><strong>Assessment AI:</strong> Can integrate enhanced forms into /assessments route</li>
              </ul>
              <p className="text-gray-600 mt-4">
                All database tables, authentication, and UI components are ready for integration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}