// app/compliance/page.tsx
// ================================================================
// Compliance Hub - Main Dashboard with 3 tabs:
// 1. QA & File Reviews - Four-Eyes Check workflow
// 2. Registers - Complaints, Breaches, Vulnerability
// 3. Settings & Rules - Compliance configuration
// ================================================================

'use client'

import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  Clock,
  Eye,
  Download,
  Search,
  Filter,
  Calendar,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  AlertCircle,
  Settings,
  Plus,
  ChevronRight,
  FileWarning,
  UserX,
  Scale,
  Bell,
  RefreshCw,
  LayoutGrid
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

// Import sub-components
import QADashboard from '@/components/compliance/QADashboard'
import RegistersDashboard from '@/components/compliance/RegistersDashboard'
import ComplianceSettings from '@/components/compliance/ComplianceSettings'
import AMLDashboard from '@/components/compliance/AMLDashboard'
import ConsumerDutyDashboard from '@/components/compliance/ConsumerDutyDashboard'
import ProdServicesDashboard from '@/components/compliance/ProdServicesDashboard'
import { ProdServicesClientPanel } from '@/components/compliance/ProdServicesClientPanel'
import ComplianceWorkflowHub from '@/components/compliance/ComplianceWorkflowHub'

// Error Boundary Component to catch and handle errors gracefully
interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class TabErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Tab Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

// Error Fallback UI Component
function TabErrorFallback({
  onRetry,
  tabName
}: {
  onRetry: () => void
  tabName: string
}) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800">
              Failed to Load {tabName}
            </h3>
            <p className="text-red-700 mt-1">
              Something went wrong while loading this section. This could be due to a network issue or the data not being available.
            </p>
            <div className="mt-4 flex items-center space-x-3">
              <Button onClick={onRetry} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="ghost"
                className="text-red-600"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Types
interface ComplianceStats {
  pendingReviews: number
  overdueReviews: number
  reviewsThisMonth: number
  passRate: number
  openComplaints: number
  openBreaches: number
  activeVulnerabilities: number
  complianceScore: number
}

type TabType = 'qa-reviews' | 'registers' | 'aml' | 'consumer-duty' | 'prod-services' | 'workflow-hub' | 'settings'

export default function ComplianceHubPage() {
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // State
  const [activeTab, setActiveTab] = useState<TabType>('workflow-hub')
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const [registersSubTab, setRegistersSubTab] = useState<string>('complaints')
  const [qaFilter, setQaFilter] = useState<string | undefined>(undefined)
  const [qaRiskFilter, setQaRiskFilter] = useState<string | undefined>(undefined)
  const [consumerDutyOutcome, setConsumerDutyOutcome] = useState<string | undefined>(undefined)
  const [amlFilter, setAmlFilter] = useState<string | undefined>(undefined)

  // Check URL params for tab and filters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab')
    const filter = urlParams.get('filter')
    const risk = urlParams.get('risk')
    const sub = urlParams.get('sub')
    const outcome = urlParams.get('outcome')

    // Set tab based on URL
    if (tab === 'aml') {
      setActiveTab('aml')
      if (filter) setAmlFilter(filter)
    } else if (tab === 'consumer-duty') {
      setActiveTab('consumer-duty')
      if (outcome) setConsumerDutyOutcome(outcome)
    } else if (tab === 'qa') {
      setActiveTab('qa-reviews')
      if (filter) setQaFilter(filter)
      if (risk) setQaRiskFilter(risk)
    } else if (tab === 'registers') {
      setActiveTab('registers')
      if (sub) setRegistersSubTab(sub)
    } else if (tab === 'workflow-hub' || tab === 'workflow') {
      setActiveTab('workflow-hub')
    } else if (tab === 'prod-services') {
      setActiveTab('prod-services')
    }
  }, [])
  const [stats, setStats] = useState<ComplianceStats>({
    pendingReviews: 0,
    overdueReviews: 0,
    reviewsThisMonth: 0,
    passRate: 0,
    openComplaints: 0,
    openBreaches: 0,
    activeVulnerabilities: 0,
    complianceScore: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      // Fetch file reviews stats
      const { data: pendingReviews } = await supabase
        .from('file_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      const { data: overdueReviews } = await supabase
        .from('file_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString())

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: reviewsThisMonth } = await supabase
        .from('file_reviews')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())

      const { count: approvedReviews } = await supabase
        .from('file_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('created_at', startOfMonth.toISOString())

      // Fetch complaints stats
      const { count: openComplaints } = await supabase
        .from('complaint_register')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'investigating'])

      // Fetch breaches stats
      const { count: openBreaches } = await supabase
        .from('breach_register')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'investigating'])

      // Fetch vulnerability stats
      const { count: activeVulnerabilities } = await supabase
        .from('vulnerability_register')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')

      // Calculate pass rate
      const passRate = reviewsThisMonth && reviewsThisMonth > 0
        ? Math.round((approvedReviews || 0) / reviewsThisMonth * 100)
        : 0

      // Calculate compliance score (simplified)
      const complianceScore = calculateComplianceScore({
        openComplaints: openComplaints || 0,
        openBreaches: openBreaches || 0,
        overdueReviews: overdueReviews || 0,
        passRate
      })

      setStats({
        pendingReviews: pendingReviews?.length || 0,
        overdueReviews: overdueReviews || 0,
        reviewsThisMonth: reviewsThisMonth || 0,
        passRate,
        openComplaints: openComplaints || 0,
        openBreaches: openBreaches || 0,
        activeVulnerabilities: activeVulnerabilities || 0,
        complianceScore
      })
    } catch (error) {
      console.error('Error loading compliance stats:', error)
      // Set default stats if tables don't exist yet
      setStats({
        pendingReviews: 0,
        overdueReviews: 0,
        reviewsThisMonth: 0,
        passRate: 100,
        openComplaints: 0,
        openBreaches: 0,
        activeVulnerabilities: 0,
        complianceScore: 100
      })
    }
  }, [supabase])

  const calculateComplianceScore = (data: {
    openComplaints: number
    openBreaches: number
    overdueReviews: number
    passRate: number
  }): number => {
    let score = 100

    // Deduct for open complaints (5 points each, max 20)
    score -= Math.min(data.openComplaints * 5, 20)

    // Deduct for open breaches (10 points each, max 30)
    score -= Math.min(data.openBreaches * 10, 30)

    // Deduct for overdue reviews (3 points each, max 15)
    score -= Math.min(data.overdueReviews * 3, 15)

    // Factor in pass rate (max 35 point impact)
    score -= Math.round((100 - data.passRate) * 0.35)

    return Math.max(0, score)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadStats()
    toast({
      title: 'Refreshed',
      description: 'Compliance data has been updated'
    })
    setRefreshing(false)
  }

  useEffect(() => {
    if (user) {
      loadStats().finally(() => setLoading(false))
    }
  }, [user, loadStats])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const tabs = [
    {
      key: 'workflow-hub' as TabType,
      label: 'Workflow Hub',
      icon: LayoutGrid,
      badge: undefined,
      badgeColor: 'secondary'
    },
    {
      key: 'qa-reviews' as TabType,
      label: 'QA & File Reviews',
      icon: ClipboardCheck,
      badge: stats.pendingReviews > 0 ? stats.pendingReviews : undefined,
      badgeColor: stats.overdueReviews > 0 ? 'destructive' : 'secondary'
    },
    {
      key: 'registers' as TabType,
      label: 'Registers',
      icon: BookOpen,
      badge: stats.openComplaints + stats.openBreaches > 0
        ? stats.openComplaints + stats.openBreaches
        : undefined,
      badgeColor: 'destructive'
    },
    {
      key: 'aml' as TabType,
      label: 'AML/CTF',
      icon: Shield,
      badge: undefined,
      badgeColor: 'secondary'
    },
    {
      key: 'consumer-duty' as TabType,
      label: 'Consumer Duty',
      icon: Scale,
      badge: undefined,
      badgeColor: 'secondary'
    },
    {
      key: 'prod-services' as TabType,
      label: 'PROD & Services',
      icon: FileText,
      badge: undefined,
      badgeColor: 'secondary'
    },
    {
      key: 'settings' as TabType,
      label: 'Settings & Rules',
      icon: Settings
    }
  ]

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100'
    if (score >= 70) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Compliance Hub</h1>
          <p className="text-gray-600">
            Manage QA reviews, compliance registers, and regulatory settings
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards - All Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Compliance Score - With Breakdown */}
        <Card
          className={`${getScoreBg(stats.complianceScore)} cursor-pointer hover:shadow-md transition-shadow relative`}
          onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getScoreBg(stats.complianceScore)}`}>
                <Shield className={`h-6 w-6 ${getScoreColor(stats.complianceScore)}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Compliance Score</p>
                  <Tooltip
                    position="left"
                    maxWidth={320}
                    content={(
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">What this means</p>
                        <p className="text-xs leading-relaxed text-gray-100/90">
                          A quick health signal based on open complaints, open breaches, overdue QA reviews, and
                          QA pass rate. It helps you spot risk hotspots at a glance.
                        </p>
                        <p className="text-xs leading-relaxed text-gray-100/80">
                          This is not a regulatory metric — just an internal prioritisation aid.
                        </p>
                      </div>
                    )}
                  >
                    <span className="inline-flex items-center justify-center rounded-full border border-gray-200 p-1 text-gray-400 hover:text-gray-600">
                      <AlertCircle className="h-4 w-4" />
                    </span>
                  </Tooltip>
                </div>
                <p className={`text-2xl font-bold ${getScoreColor(stats.complianceScore)}`}>
                  {stats.complianceScore}%
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>Click to view breakdown</span>
              <span>{showScoreBreakdown ? 'Hide' : 'Show'}</span>
            </div>
            {showScoreBreakdown && (
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                {stats.openComplaints > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-red-600">Complaints ({stats.openComplaints})</span>
                    <span className="text-red-600">−{Math.min(stats.openComplaints * 5, 20)} pts</span>
                  </div>
                )}
                {stats.openBreaches > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-red-600">Breaches ({stats.openBreaches})</span>
                    <span className="text-red-600">−{Math.min(stats.openBreaches * 10, 30)} pts</span>
                  </div>
                )}
                {stats.overdueReviews > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-yellow-600">Overdue Reviews ({stats.overdueReviews})</span>
                    <span className="text-yellow-600">−{Math.min(stats.overdueReviews * 3, 15)} pts</span>
                  </div>
                )}
                {stats.passRate < 100 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-yellow-600">Pass Rate ({stats.passRate}%)</span>
                    <span className="text-yellow-600">−{Math.round((100 - stats.passRate) * 0.35)} pts</span>
                  </div>
                )}
                {stats.complianceScore === 100 && (
                  <p className="text-xs text-green-600">All clear - no deductions</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Reviews - Clickable */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveTab('qa-reviews')}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <ClipboardCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Reviews</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold">{stats.pendingReviews}</p>
                  {stats.overdueReviews > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {stats.overdueReviews} overdue
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">Click to view →</p>
          </CardContent>
        </Card>

        {/* Open Issues - Clickable */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setActiveTab('registers')
            setRegistersSubTab('complaints')
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Open Issues</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold">
                    {stats.openComplaints + stats.openBreaches}
                  </p>
                  <span className="text-xs text-gray-500">
                    ({stats.openComplaints} complaints, {stats.openBreaches} breaches)
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-2">Click to view →</p>
          </CardContent>
        </Card>

        {/* Vulnerable Clients - Clickable */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setActiveTab('registers')
            setRegistersSubTab('vulnerability')
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <UserX className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Vulnerable Clients</p>
                <p className="text-2xl font-bold">{stats.activeVulnerabilities}</p>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2">Click to view →</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats - All Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveTab('qa-reviews')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Reviews This Month</span>
              </div>
              <span className="text-lg font-semibold">{stats.reviewsThisMonth}</span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setActiveTab('qa-reviews')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Pass Rate</span>
              </div>
              <span className={`text-lg font-semibold ${
                stats.passRate >= 90 ? 'text-green-600' :
                stats.passRate >= 70 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stats.passRate}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Scale className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Consumer Duty Status</span>
              </div>
              <Badge variant={stats.complianceScore >= 80 ? 'default' : 'destructive'}>
                {stats.complianceScore >= 80 ? 'Compliant' : 'Action Required'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(({ key, label, icon: Icon, badge, badgeColor }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`
                  flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
                {badge !== undefined && (
                  <Badge
                    variant={badgeColor as 'default' | 'secondary' | 'destructive' | 'outline'}
                    className="ml-2"
                  >
                    {badge}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content with Error Boundaries */}
      <div className="mt-6">
        {activeTab === 'qa-reviews' && (
          <TabErrorBoundary
            key="qa-reviews"
            fallback={<TabErrorFallback tabName="QA & File Reviews" onRetry={() => setActiveTab('qa-reviews')} />}
          >
            <QADashboard onStatsChange={loadStats} initialFilter={qaFilter} riskFilter={qaRiskFilter} />
          </TabErrorBoundary>
        )}
        {activeTab === 'registers' && (
          <TabErrorBoundary
            key="registers"
            fallback={<TabErrorFallback tabName="Registers" onRetry={() => setActiveTab('registers')} />}
          >
            <RegistersDashboard onStatsChange={loadStats} initialTab={registersSubTab} />
          </TabErrorBoundary>
        )}
        {activeTab === 'aml' && (
          <TabErrorBoundary
            key="aml"
            fallback={<TabErrorFallback tabName="AML/CTF" onRetry={() => setActiveTab('aml')} />}
          >
            <AMLDashboard onStatsChange={loadStats} />
          </TabErrorBoundary>
        )}
        {activeTab === 'consumer-duty' && (
          <TabErrorBoundary
            key="consumer-duty"
            fallback={<TabErrorFallback tabName="Consumer Duty" onRetry={() => setActiveTab('consumer-duty')} />}
          >
            <ConsumerDutyDashboard onStatsChange={loadStats} />
          </TabErrorBoundary>
        )}
        {activeTab === 'prod-services' && (
          <TabErrorBoundary
            key="prod-services"
            fallback={<TabErrorFallback tabName="PROD & Services" onRetry={() => setActiveTab('prod-services')} />}
          >
            <div className="space-y-6">
              <ProdServicesDashboard />
              <ProdServicesClientPanel />
            </div>
          </TabErrorBoundary>
        )}
        {activeTab === 'workflow-hub' && (
          <TabErrorBoundary
            key="workflow-hub"
            fallback={<TabErrorFallback tabName="Workflow Hub" onRetry={() => setActiveTab('workflow-hub')} />}
          >
            <ComplianceWorkflowHub />
          </TabErrorBoundary>
        )}
        {activeTab === 'settings' && (
          <TabErrorBoundary
            key="settings"
            fallback={<TabErrorFallback tabName="Settings & Rules" onRetry={() => setActiveTab('settings')} />}
          >
            <ComplianceSettings />
          </TabErrorBoundary>
        )}
      </div>
    </div>
  )
}
