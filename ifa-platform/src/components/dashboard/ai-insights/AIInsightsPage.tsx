// src/app/dashboard/ai-insights/page.tsx
// AI Portfolio Insights - DeepSeek Powered Analysis
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { calculateInvestmentTotal, calculatePensionTotal } from '@/lib/financials/aumCalculator'
import {
  Brain,
  RefreshCw,
  Users,
  PoundSterling,
  Shield,
  AlertTriangle,
  TrendingUp,
  Loader2,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Lightbulb
} from 'lucide-react'
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

// Types
interface PortfolioMetrics {
  totalClients: number
  totalAUM: number
  riskDistribution: {
    conservative: number
    balanced: number
    growth: number
    aggressive: number
  }
  complianceHealth: {
    score: number
    compliantClients: number
    warningClients: number
    issueClients: number
  }
  vulnerabilitySummary: {
    totalVulnerable: number
    byCategory: Record<string, number>
    recentlyAssessed: number
  }
  aumTrends: Array<{
    month: string
    aum: number
    clientCount: number
  }>
  // NEW: Regulatory Risk Metrics
  regulatoryRisk: {
    monteCarloAnalysis: {
      clientsWithAnalysis: number
      clientsWithoutAnalysis: number
      averageSuccessRate: number
      clientsAtRisk: number // Success rate < 70%
    }
    riskFlags: {
      missingATR: number
      missingCFL: number
      mismatchedRisk: number // ATR doesn't match CFL
      highRiskNoCapacity: number
      noRecentReview: number
    }
    consumerDuty: {
      vulnerableNoProtection: number
      highRiskVulnerable: number
      incompleteAssessments: number
    }
  }
}

interface AIInsight {
  title: string
  summary: string
  recommendations: string[]
  confidence: number
}

interface PanelInsights {
  riskDistribution: AIInsight | null
  complianceHealth: AIInsight | null
  vulnerability: AIInsight | null
  aumTrends: AIInsight | null
  regulatoryRisk: AIInsight | null
}

// Colors
const RISK_COLORS = {
  conservative: '#22c55e',
  balanced: '#3b82f6',
  growth: '#f59e0b',
  aggressive: '#ef4444'
}

const COMPLIANCE_COLORS = {
  compliant: '#22c55e',
  warning: '#f59e0b',
  issue: '#ef4444'
}

// System prompt for AI analysis - Enhanced for Regulatory Risk
const PORTFOLIO_ANALYST_PROMPT = `You are a senior compliance officer and financial advisor AI specializing in UK FCA regulations for an IFA (Independent Financial Adviser) practice.

Your expertise includes:
- FCA Consumer Duty (PS22/9) requirements
- PROD (Product Governance) rules
- COBS (Conduct of Business Sourcebook)
- Vulnerable customer identification and protection
- Suitability assessment requirements
- Risk profiling best practices (ATR, CFL, Capacity for Loss)

Your role is to:
1. Identify regulatory compliance risks and gaps
2. Flag clients requiring urgent attention (vulnerable, mismatched risk profiles, missing assessments)
3. Ensure Consumer Duty obligations are met (good outcomes, fair value, understanding)
4. Highlight Monte Carlo analysis gaps and retirement readiness concerns
5. Recommend specific remediation actions with regulatory references

Always respond in valid JSON format with this exact structure:
{
  "title": "Brief insight title (max 8 words)",
  "summary": "2-3 sentence executive summary focusing on regulatory implications",
  "recommendations": ["specific action 1 with FCA reference", "action 2", "action 3"],
  "confidence": 0.85
}

Be direct about compliance risks. Flag any potential Consumer Duty breaches immediately.`

export default function AIInsightsPage() {
  const supabase = createClient()

  // State
  const [metrics, setMetrics] = useState<PortfolioMetrics>({
    totalClients: 0,
    totalAUM: 0,
    riskDistribution: { conservative: 0, balanced: 0, growth: 0, aggressive: 0 },
    complianceHealth: { score: 0, compliantClients: 0, warningClients: 0, issueClients: 0 },
    vulnerabilitySummary: { totalVulnerable: 0, byCategory: {}, recentlyAssessed: 0 },
    aumTrends: [],
    regulatoryRisk: {
      monteCarloAnalysis: { clientsWithAnalysis: 0, clientsWithoutAnalysis: 0, averageSuccessRate: 0, clientsAtRisk: 0 },
      riskFlags: { missingATR: 0, missingCFL: 0, mismatchedRisk: 0, highRiskNoCapacity: 0, noRecentReview: 0 },
      consumerDuty: { vulnerableNoProtection: 0, highRiskVulnerable: 0, incompleteAssessments: 0 }
    }
  })
  const [aiInsights, setAiInsights] = useState<PanelInsights>({
    riskDistribution: null,
    complianceHealth: null,
    vulnerability: null,
    aumTrends: null,
    regulatoryRisk: null
  })
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch portfolio data from Supabase
  const fetchPortfolioData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch clients and Monte Carlo results in parallel
      const [clientsResult, monteCarloResult] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('monte_carlo_results').select('client_id, success_probability, created_at')
      ])

      const { data: clients, error: clientsError } = clientsResult
      const { data: monteCarloResults } = monteCarloResult

      if (clientsError) throw clientsError

      if (!clients || clients.length === 0) {
        setMetrics({
          totalClients: 0,
          totalAUM: 0,
          riskDistribution: { conservative: 0, balanced: 0, growth: 0, aggressive: 0 },
          complianceHealth: { score: 100, compliantClients: 0, warningClients: 0, issueClients: 0 },
          vulnerabilitySummary: { totalVulnerable: 0, byCategory: {}, recentlyAssessed: 0 },
          aumTrends: [],
          regulatoryRisk: {
            monteCarloAnalysis: { clientsWithAnalysis: 0, clientsWithoutAnalysis: 0, averageSuccessRate: 0, clientsAtRisk: 0 },
            riskFlags: { missingATR: 0, missingCFL: 0, mismatchedRisk: 0, highRiskNoCapacity: 0, noRecentReview: 0 },
            consumerDuty: { vulnerableNoProtection: 0, highRiskVulnerable: 0, incompleteAssessments: 0 }
          }
        })
        setLoading(false)
        return
      }

      // Build Monte Carlo lookup by client
      const monteCarloByClient = new Map<string, number[]>()
      monteCarloResults?.forEach((mc: any) => {
        if (mc.client_id) {
          const existing = monteCarloByClient.get(mc.client_id) || []
          existing.push(mc.success_probability || 0)
          monteCarloByClient.set(mc.client_id, existing)
        }
      })

      // Calculate metrics
      const riskDistribution = { conservative: 0, balanced: 0, growth: 0, aggressive: 0 }
      let totalAUM = 0
      let vulnerableCount = 0
      const vulnerabilityCategories: Record<string, number> = {}
      let compliantCount = 0
      let warningCount = 0
      let issueCount = 0

      // Regulatory risk tracking
      let clientsWithMonteCarlo = 0
      let totalSuccessRate = 0
      let clientsAtRisk = 0
      let missingATR = 0
      let missingCFL = 0
      let mismatchedRisk = 0
      let highRiskNoCapacity = 0
      let noRecentReview = 0
      let vulnerableNoProtection = 0
      let highRiskVulnerable = 0
      let incompleteAssessments = 0

      const now = new Date()
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      const fifteenMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth() - 3, now.getDate())

      clients.forEach((client: any) => {
        // Risk distribution
        const riskProfile: any = client.risk_profile || {}
        const atr = riskProfile.attitudeToRisk || riskProfile.attitude_to_risk || null
        const cfl = riskProfile.capacityForLoss || riskProfile.capacity_for_loss || null

        if (atr) {
          if (atr <= 3) riskDistribution.conservative++
          else if (atr <= 5) riskDistribution.balanced++
          else if (atr <= 7) riskDistribution.growth++
          else riskDistribution.aggressive++
        }

        // AUM calculation - using proper calculator (investments + pensions + liquid assets)
        const financialProfile: any = client.financial_profile || {}
        const investments = calculateInvestmentTotal(financialProfile.existingInvestments || financialProfile.existing_investments || [])
        const pensions = calculatePensionTotal(financialProfile.pensionArrangements || financialProfile.pension_arrangements || [])
        const liquidAssets = Number(financialProfile.liquidAssets || financialProfile.liquid_assets || 0)
        totalAUM += investments + pensions + liquidAssets

        // Vulnerability assessment
        const va: any = client.vulnerability_assessment || {}
        const isVulnerable = va?.is_vulnerable || va?.isVulnerable
        if (isVulnerable) {
          vulnerableCount++
          const factors = va.vulnerability_factors || va.vulnerabilityFactors || []
          factors.forEach((factor: string) => {
            vulnerabilityCategories[factor] = (vulnerabilityCategories[factor] || 0) + 1
          })

          // Check if vulnerable client has protection measures documented
          if (!va.protection_measures && !va.protectionMeasures) {
            vulnerableNoProtection++
          }

          // High risk + vulnerable = concern
          if (atr && atr >= 7) {
            highRiskVulnerable++
          }
        }

        // Compliance health (based on last review/assessment date)
        const lastReview = client.updated_at ? new Date(client.updated_at) : null
        if (lastReview) {
          if (lastReview >= oneYearAgo) {
            compliantCount++
          } else if (lastReview >= fifteenMonthsAgo) {
            warningCount++
          } else {
            issueCount++
            noRecentReview++
          }
        } else {
          issueCount++
          noRecentReview++
        }

        // Risk flag calculations
        if (!atr) missingATR++
        if (!cfl) missingCFL++

        // Check for ATR/CFL mismatch (high ATR but low CFL = concern)
        if (atr && cfl) {
          const atrNum = Number(atr)
          const cflLower = String(cfl).toLowerCase()
          if (atrNum >= 7 && (cflLower.includes('low') || cflLower.includes('none') || cflLower === 'limited')) {
            mismatchedRisk++
            highRiskNoCapacity++
          }
        }

        // Check for incomplete assessments
        if (!atr || !cfl || !va) {
          incompleteAssessments++
        }

        // Monte Carlo analysis check
        const clientMC = monteCarloByClient.get(client.id)
        if (clientMC && clientMC.length > 0) {
          clientsWithMonteCarlo++
          const avgSuccess = clientMC.reduce((a, b) => a + b, 0) / clientMC.length
          totalSuccessRate += avgSuccess
          if (avgSuccess < 70) {
            clientsAtRisk++
          }
        }
      })

      // Calculate compliance score
      const complianceScore = clients.length > 0
        ? Math.round((compliantCount / clients.length) * 100)
        : 100

      // Generate AUM trends (mock 6-month history based on current data)
      const aumTrends = generateAUMTrends(totalAUM, clients.length)

      // Calculate Monte Carlo average success rate
      const avgMonteCarloSuccess = clientsWithMonteCarlo > 0
        ? Math.round(totalSuccessRate / clientsWithMonteCarlo)
        : 0

      setMetrics({
        totalClients: clients.length,
        totalAUM,
        riskDistribution,
        complianceHealth: {
          score: complianceScore,
          compliantClients: compliantCount,
          warningClients: warningCount,
          issueClients: issueCount
        },
        vulnerabilitySummary: {
          totalVulnerable: vulnerableCount,
          byCategory: vulnerabilityCategories,
          recentlyAssessed: compliantCount
        },
        aumTrends,
        regulatoryRisk: {
          monteCarloAnalysis: {
            clientsWithAnalysis: clientsWithMonteCarlo,
            clientsWithoutAnalysis: clients.length - clientsWithMonteCarlo,
            averageSuccessRate: avgMonteCarloSuccess,
            clientsAtRisk
          },
          riskFlags: {
            missingATR,
            missingCFL,
            mismatchedRisk,
            highRiskNoCapacity,
            noRecentReview
          },
          consumerDuty: {
            vulnerableNoProtection,
            highRiskVulnerable,
            incompleteAssessments
          }
        }
      })

      setLastRefreshed(new Date())
    } catch (err) {
      console.error('Error fetching portfolio data:', err)
      setError('Failed to load portfolio data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Generate mock AUM trends (in production, this would come from historical data)
  const generateAUMTrends = (currentAUM: number, clientCount: number): Array<{ month: string; aum: number; clientCount: number }> => {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const trends: Array<{ month: string; aum: number; clientCount: number }> = []

    for (let i = 0; i < 6; i++) {
      const growthFactor = 1 - (0.02 * (5 - i)) // Simulates gradual growth
      trends.push({
        month: months[i],
        aum: Math.round(currentAUM * growthFactor),
        clientCount: Math.max(1, clientCount - (5 - i))
      })
    }

    return trends
  }

  // Call DeepSeek AI for insights
  const generateAIInsights = useCallback(async () => {
    if (metrics.totalClients === 0) return

    setAiLoading(true)

    try {
      const insights: PanelInsights = {
        riskDistribution: null,
        complianceHealth: null,
        vulnerability: null,
        aumTrends: null,
        regulatoryRisk: null
      }

      // Generate insights in parallel
      const [riskInsight, complianceInsight, vulnerabilityInsight, aumInsight, regulatoryInsight] = await Promise.all([
        callAIEndpoint(`Analyze this risk distribution for an IFA portfolio:
          - Conservative clients (ATR 1-3): ${metrics.riskDistribution.conservative}
          - Balanced clients (ATR 4-5): ${metrics.riskDistribution.balanced}
          - Growth clients (ATR 6-7): ${metrics.riskDistribution.growth}
          - Aggressive clients (ATR 8-10): ${metrics.riskDistribution.aggressive}
          Total clients: ${metrics.totalClients}

          Provide insights on portfolio balance and any concerns.`),

        callAIEndpoint(`Analyze this compliance health data for an IFA practice:
          - Compliance score: ${metrics.complianceHealth.score}%
          - Compliant clients (reviewed < 12 months): ${metrics.complianceHealth.compliantClients}
          - Warning clients (reviewed 12-15 months): ${metrics.complianceHealth.warningClients}
          - Issue clients (reviewed > 15 months or never): ${metrics.complianceHealth.issueClients}

          Focus on FCA Consumer Duty requirements.`),

        callAIEndpoint(`Analyze this vulnerability data for Consumer Duty compliance:
          - Total vulnerable clients: ${metrics.vulnerabilitySummary.totalVulnerable}
          - Vulnerability categories: ${JSON.stringify(metrics.vulnerabilitySummary.byCategory)}
          - Total clients: ${metrics.totalClients}
          - Vulnerable percentage: ${metrics.totalClients > 0 ? Math.round((metrics.vulnerabilitySummary.totalVulnerable / metrics.totalClients) * 100) : 0}%

          Provide recommendations for enhanced protection measures.`),

        callAIEndpoint(`Analyze this AUM trend data:
          - Current AUM: £${formatCurrency(metrics.totalAUM)}
          - 6-month trend: ${JSON.stringify(metrics.aumTrends)}
          - Client count: ${metrics.totalClients}

          Provide growth analysis and forecasting insights.`),

        callAIEndpoint(`CRITICAL REGULATORY RISK ANALYSIS for FCA compliance:

          MONTE CARLO RETIREMENT ANALYSIS:
          - Clients WITH Monte Carlo analysis: ${metrics.regulatoryRisk.monteCarloAnalysis.clientsWithAnalysis}
          - Clients WITHOUT Monte Carlo analysis: ${metrics.regulatoryRisk.monteCarloAnalysis.clientsWithoutAnalysis}
          - Average success probability: ${metrics.regulatoryRisk.monteCarloAnalysis.averageSuccessRate}%
          - Clients AT RISK (success < 70%): ${metrics.regulatoryRisk.monteCarloAnalysis.clientsAtRisk}

          RISK PROFILE FLAGS:
          - Missing ATR (Attitude to Risk): ${metrics.regulatoryRisk.riskFlags.missingATR}
          - Missing CFL (Capacity for Loss): ${metrics.regulatoryRisk.riskFlags.missingCFL}
          - Mismatched ATR/CFL (high risk, low capacity): ${metrics.regulatoryRisk.riskFlags.mismatchedRisk}
          - High risk clients with no capacity: ${metrics.regulatoryRisk.riskFlags.highRiskNoCapacity}
          - No recent review (>15 months): ${metrics.regulatoryRisk.riskFlags.noRecentReview}

          CONSUMER DUTY CONCERNS:
          - Vulnerable clients without protection measures: ${metrics.regulatoryRisk.consumerDuty.vulnerableNoProtection}
          - High risk vulnerable clients: ${metrics.regulatoryRisk.consumerDuty.highRiskVulnerable}
          - Incomplete assessments: ${metrics.regulatoryRisk.consumerDuty.incompleteAssessments}

          Total portfolio: ${metrics.totalClients} clients

          Provide URGENT regulatory risk assessment. Flag any potential FCA breaches. Reference COBS 9.2 (suitability), Consumer Duty, and PRIN 2A where applicable.`)
      ])

      insights.riskDistribution = riskInsight
      insights.complianceHealth = complianceInsight
      insights.vulnerability = vulnerabilityInsight
      insights.aumTrends = aumInsight
      insights.regulatoryRisk = regulatoryInsight

      setAiInsights(insights)
    } catch (err) {
      console.error('Error generating AI insights:', err)
      // Don't show error to user - gracefully degrade to no AI insights
    } finally {
      setAiLoading(false)
    }
  }, [metrics])

  // Helper to call AI endpoint
  const callAIEndpoint = async (prompt: string): Promise<AIInsight | null> => {
    try {
      const response = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: PORTFOLIO_ANALYST_PROMPT },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        throw new Error('AI request failed')
      }

      const data = await response.json()
      return JSON.parse(data.content)
    } catch (err) {
      console.error('AI call error:', err)
      return null
    }
  }

  // Initial load
  useEffect(() => {
    fetchPortfolioData()
  }, [fetchPortfolioData])

  // Generate AI insights after data loads
  useEffect(() => {
    if (!loading && metrics.totalClients > 0) {
      generateAIInsights()
    }
  }, [loading, metrics.totalClients, generateAIInsights])

  // Refresh handler
  const handleRefresh = async () => {
    await fetchPortfolioData()
    await generateAIInsights()
  }

  // Chart data
  const riskChartData = useMemo(() => [
    { name: 'Conservative', value: metrics.riskDistribution.conservative, color: RISK_COLORS.conservative },
    { name: 'Balanced', value: metrics.riskDistribution.balanced, color: RISK_COLORS.balanced },
    { name: 'Growth', value: metrics.riskDistribution.growth, color: RISK_COLORS.growth },
    { name: 'Aggressive', value: metrics.riskDistribution.aggressive, color: RISK_COLORS.aggressive }
  ].filter(d => d.value > 0), [metrics.riskDistribution])

  const complianceChartData = useMemo(() => [
    { name: 'Compliant', value: metrics.complianceHealth.compliantClients, color: COMPLIANCE_COLORS.compliant },
    { name: 'Warning', value: metrics.complianceHealth.warningClients, color: COMPLIANCE_COLORS.warning },
    { name: 'Issues', value: metrics.complianceHealth.issueClients, color: COMPLIANCE_COLORS.issue }
  ].filter(d => d.value > 0), [metrics.complianceHealth])

  const vulnerabilityChartData = useMemo(() => {
    return Object.entries(metrics.vulnerabilitySummary.byCategory).map(([category, count]) => ({
      category: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count
    }))
  }, [metrics.vulnerabilitySummary.byCategory])

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading portfolio data...</p>
          </div>
        </div>
      </Layout>
    )
  }

  // Empty state
  if (metrics.totalClients === 0) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-12">
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Client Data Available</h3>
              <p className="text-gray-600 mb-4">
                Start by adding clients to generate AI portfolio insights.
              </p>
              <Button onClick={() => window.location.href = '/clients/new'}>
                Add First Client
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Portfolio Insights</h1>
              <p className="text-sm text-gray-500">
                DeepSeek-powered analysis of your client portfolio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastRefreshed && (
              <span className="text-sm text-gray-500">
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={handleRefresh}
              disabled={loading || aiLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(loading || aiLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Clients</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.totalClients}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total AUM</p>
                  <p className="text-3xl font-bold text-gray-900">
                    £{formatCurrency(metrics.totalAUM)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <PoundSterling className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Compliance Score</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.complianceHealth.score}%
                  </p>
                </div>
                <div className={`p-3 rounded-full ${
                  metrics.complianceHealth.score >= 80 ? 'bg-green-100' :
                  metrics.complianceHealth.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <Shield className={`h-6 w-6 ${
                    metrics.complianceHealth.score >= 80 ? 'text-green-600' :
                    metrics.complianceHealth.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1: Risk Distribution & Compliance Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Distribution Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Risk Distribution
                  </CardTitle>
                  <CardDescription>Client portfolio by risk appetite</CardDescription>
                </div>
                {aiLoading && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {riskChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {riskChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No risk data available
                  </div>
                )}
              </div>

              {/* AI Insight */}
              {aiInsights.riskDistribution && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-900">{aiInsights.riskDistribution.title}</p>
                      <p className="text-sm text-purple-700 mt-1">{aiInsights.riskDistribution.summary}</p>
                      {aiInsights.riskDistribution.recommendations.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {aiInsights.riskDistribution.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i} className="text-sm text-purple-600 flex items-start gap-1">
                              <Lightbulb className="h-3 w-3 mt-1 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Health Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    Compliance Health
                  </CardTitle>
                  <CardDescription>Review status by FCA requirements</CardDescription>
                </div>
                {aiLoading && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
              </div>
            </CardHeader>
            <CardContent>
              {/* Compliance Gauge */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-48 h-24">
                  <div className="absolute inset-0 flex items-end justify-center">
                    <div
                      className="text-4xl font-bold"
                      style={{
                        color: metrics.complianceHealth.score >= 80 ? COMPLIANCE_COLORS.compliant :
                               metrics.complianceHealth.score >= 60 ? COMPLIANCE_COLORS.warning :
                               COMPLIANCE_COLORS.issue
                      }}
                    >
                      {metrics.complianceHealth.score}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{metrics.complianceHealth.compliantClients}</p>
                  <p className="text-xs text-green-600">Compliant</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-yellow-700">{metrics.complianceHealth.warningClients}</p>
                  <p className="text-xs text-yellow-600">Due Soon</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">{metrics.complianceHealth.issueClients}</p>
                  <p className="text-xs text-red-600">Overdue</p>
                </div>
              </div>

              {/* AI Insight */}
              {aiInsights.complianceHealth && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-900">{aiInsights.complianceHealth.title}</p>
                      <p className="text-sm text-purple-700 mt-1">{aiInsights.complianceHealth.summary}</p>
                      {aiInsights.complianceHealth.recommendations.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {aiInsights.complianceHealth.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i} className="text-sm text-purple-600 flex items-start gap-1">
                              <Lightbulb className="h-3 w-3 mt-1 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Vulnerability & AUM Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vulnerability Summary Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Vulnerability Summary
                  </CardTitle>
                  <CardDescription>Consumer Duty protection status</CardDescription>
                </div>
                {aiLoading && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary stat */}
              <div className="flex items-center gap-4 mb-4 p-4 bg-orange-50 rounded-lg">
                <div className="p-3 bg-orange-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-900">
                    {metrics.vulnerabilitySummary.totalVulnerable}
                  </p>
                  <p className="text-sm text-orange-700">
                    Vulnerable clients ({metrics.totalClients > 0
                      ? Math.round((metrics.vulnerabilitySummary.totalVulnerable / metrics.totalClients) * 100)
                      : 0}% of portfolio)
                  </p>
                </div>
              </div>

              {/* Category breakdown */}
              <div className="h-48">
                {vulnerabilityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vulnerabilityChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p>No vulnerable clients identified</p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Insight */}
              {aiInsights.vulnerability && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-900">{aiInsights.vulnerability.title}</p>
                      <p className="text-sm text-purple-700 mt-1">{aiInsights.vulnerability.summary}</p>
                      {aiInsights.vulnerability.recommendations.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {aiInsights.vulnerability.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i} className="text-sm text-purple-600 flex items-start gap-1">
                              <Lightbulb className="h-3 w-3 mt-1 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AUM Trends Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    AUM Trends
                  </CardTitle>
                  <CardDescription>6-month assets under management</CardDescription>
                </div>
                {aiLoading && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {metrics.aumTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.aumTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis
                        tickFormatter={(value) => `£${(value / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip
                        formatter={(value: number) => [`£${formatCurrency(value)}`, 'AUM']}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="aum"
                        stroke="#22c55e"
                        strokeWidth={3}
                        dot={{ fill: '#22c55e', r: 4 }}
                        name="AUM"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No trend data available
                  </div>
                )}
              </div>

              {/* AI Insight */}
              {aiInsights.aumTrends && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-900">{aiInsights.aumTrends.title}</p>
                      <p className="text-sm text-purple-700 mt-1">{aiInsights.aumTrends.summary}</p>
                      {aiInsights.aumTrends.recommendations.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {aiInsights.aumTrends.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i} className="text-sm text-purple-600 flex items-start gap-1">
                              <Lightbulb className="h-3 w-3 mt-1 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Regulatory Risk Panel - Full Width */}
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <Shield className="h-5 w-5" />
                  Regulatory Risk Dashboard
                </CardTitle>
                <CardDescription>FCA Compliance & Consumer Duty Analysis</CardDescription>
              </div>
              {aiLoading && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
            </div>
          </CardHeader>
          <CardContent>
            {/* Three Column Grid for Risk Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Monte Carlo Analysis */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Monte Carlo Analysis
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">With Analysis</span>
                    <span className="font-bold text-green-600">{metrics.regulatoryRisk.monteCarloAnalysis.clientsWithAnalysis}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Without Analysis</span>
                    <span className={`font-bold ${metrics.regulatoryRisk.monteCarloAnalysis.clientsWithoutAnalysis > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.regulatoryRisk.monteCarloAnalysis.clientsWithoutAnalysis}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Success Rate</span>
                    <span className={`font-bold ${metrics.regulatoryRisk.monteCarloAnalysis.averageSuccessRate < 70 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.regulatoryRisk.monteCarloAnalysis.averageSuccessRate}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm font-medium text-red-700">At Risk (&lt;70%)</span>
                    <span className="font-bold text-red-600">{metrics.regulatoryRisk.monteCarloAnalysis.clientsAtRisk}</span>
                  </div>
                </div>
              </div>

              {/* Risk Profile Flags */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Risk Profile Flags
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Missing ATR</span>
                    <span className={`font-bold ${metrics.regulatoryRisk.riskFlags.missingATR > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.regulatoryRisk.riskFlags.missingATR}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Missing CFL</span>
                    <span className={`font-bold ${metrics.regulatoryRisk.riskFlags.missingCFL > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.regulatoryRisk.riskFlags.missingCFL}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ATR/CFL Mismatch</span>
                    <span className={`font-bold ${metrics.regulatoryRisk.riskFlags.mismatchedRisk > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.regulatoryRisk.riskFlags.mismatchedRisk}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm font-medium text-red-700">No Recent Review</span>
                    <span className="font-bold text-red-600">{metrics.regulatoryRisk.riskFlags.noRecentReview}</span>
                  </div>
                </div>
              </div>

              {/* Consumer Duty Concerns */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  Consumer Duty Concerns
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Vulnerable - No Protection</span>
                    <span className={`font-bold ${metrics.regulatoryRisk.consumerDuty.vulnerableNoProtection > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.regulatoryRisk.consumerDuty.vulnerableNoProtection}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">High Risk + Vulnerable</span>
                    <span className={`font-bold ${metrics.regulatoryRisk.consumerDuty.highRiskVulnerable > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.regulatoryRisk.consumerDuty.highRiskVulnerable}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm font-medium text-red-700">Incomplete Assessments</span>
                    <span className="font-bold text-red-600">{metrics.regulatoryRisk.consumerDuty.incompleteAssessments}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Regulatory Insight - Prominent */}
            {aiInsights.regulatoryRisk && (
              <div className="p-4 bg-red-100 rounded-lg border border-red-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-200 rounded-full">
                    <Brain className="h-5 w-5 text-red-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-900">{aiInsights.regulatoryRisk.title}</p>
                    <p className="text-sm text-red-800 mt-1">{aiInsights.regulatoryRisk.summary}</p>
                    {aiInsights.regulatoryRisk.recommendations.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-red-700 uppercase mb-2">Recommended Actions:</p>
                        <ul className="space-y-2">
                          {aiInsights.regulatoryRisk.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm text-red-800 flex items-start gap-2 bg-white/50 p-2 rounded">
                              <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Loading Overlay */}
        {aiLoading && (
          <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            <span className="text-sm text-gray-700">Generating AI insights...</span>
          </div>
        )}
      </div>
    </Layout>
  )
}
