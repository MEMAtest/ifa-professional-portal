// app/rebalancing/page.tsx
// ================================================================
// ✅ WORKING VERSION - Mock data for portfolio rebalancing

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Percent,
  Calendar,
  Users,
  Search,
  Filter,
  ChevronRight,
  BarChart3
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import clientLogger from '@/lib/logging/clientLogger'

// Types for portfolio rebalancing
interface PortfolioRebalance {
  id: string
  client_id: string
  client_name: string
  client_ref: string
  portfolio_value: number
  target_allocation: Record<string, number>
  current_allocation: Record<string, number>
  drift_percentage: number
  rebalance_required: boolean
  last_rebalanced: string
  next_review_date: string
  risk_level: string
  recommendations: RebalanceAction[]
  status: 'current' | 'needs_review' | 'urgent' | 'scheduled'
}

interface RebalanceAction {
  asset_class: string
  current_weight: number
  target_weight: number
  drift: number
  action: 'buy' | 'sell' | 'hold'
  amount: number
  priority: 'high' | 'medium' | 'low'
}

interface Client {
  id: string
  client_ref: string
  personal_details: {
    firstName: string
    lastName: string
  }
}

export default function RebalancingPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // State
  const [portfolios, setPortfolios] = useState<PortfolioRebalance[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'urgent' | 'needs_review' | 'current'>('all')
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioRebalance | null>(null)

  // Stats
  const [stats, setStats] = useState({
    totalPortfolios: 0,
    needsRebalancing: 0,
    urgentRebalancing: 0,
    averageDrift: 0,
    totalValue: 0
  })

  const loadClients = useCallback(async (): Promise<Client[]> => {
    // ✅ Load real clients from database
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('id, client_ref, personal_details')
      .order('personal_details->firstName')

    if (error) {
      clientLogger.error('Error loading clients:', error)
      return []
    }

    const normalizedClients = (clientData || []) as Client[]
    setClients(normalizedClients)
    return normalizedClients
  }, [supabase])

  const calculateStats = useCallback((portfolioData: PortfolioRebalance[]) => {
    const needsRebalancing = portfolioData.filter(p => p.rebalance_required)
    const urgent = portfolioData.filter(p => p.status === 'urgent')
    const totalValue = portfolioData.reduce((sum, p) => sum + p.portfolio_value, 0)
    const averageDrift = portfolioData.reduce((sum, p) => sum + p.drift_percentage, 0) / portfolioData.length

    setStats({
      totalPortfolios: portfolioData.length,
      needsRebalancing: needsRebalancing.length,
      urgentRebalancing: urgent.length,
      averageDrift: Math.round(averageDrift * 10) / 10,
      totalValue
    })
  }, [])

  const createMockPortfolioData = useCallback((clientList: Client[]) => {
    const list = clientList || []
    // Create realistic mock portfolio data
    const mockPortfolios: PortfolioRebalance[] = [
      {
        id: '1',
        client_id: list[0]?.id || 'mock-1',
        client_name: list[0]
          ? `${list[0].personal_details.firstName} ${list[0].personal_details.lastName}`
          : 'Geoffrey Clarkson',
        client_ref: list[0]?.client_ref || 'C250626917',
        portfolio_value: 250000,
        target_allocation: {
          'UK Equities': 30,
          'Global Equities': 25,
          'Bonds': 35,
          'Cash': 10
        },
        current_allocation: {
          'UK Equities': 35,
          'Global Equities': 28,
          'Bonds': 30,
          'Cash': 7
        },
        drift_percentage: 8.5,
        rebalance_required: true,
        last_rebalanced: '2024-06-15T00:00:00Z',
        next_review_date: '2024-12-15T00:00:00Z',
        risk_level: 'moderate',
        status: 'needs_review',
        recommendations: [
          {
            asset_class: 'UK Equities',
            current_weight: 35,
            target_weight: 30,
            drift: 5,
            action: 'sell',
            amount: 12500,
            priority: 'medium'
          },
          {
            asset_class: 'Bonds',
            current_weight: 30,
            target_weight: 35,
            drift: -5,
            action: 'buy',
            amount: 12500,
            priority: 'medium'
          }
        ]
      },
      {
        id: '2',
        client_id: list[1]?.id || 'mock-2',
        client_name: list[1]
          ? `${list[1].personal_details.firstName} ${list[1].personal_details.lastName}`
          : 'Sarah Mitchell',
        client_ref: list[1]?.client_ref || 'C250625166',
        portfolio_value: 180000,
        target_allocation: {
          'UK Equities': 40,
          'Global Equities': 35,
          'Bonds': 20,
          'Cash': 5
        },
        current_allocation: {
          'UK Equities': 48,
          'Global Equities': 32,
          'Bonds': 15,
          'Cash': 5
        },
        drift_percentage: 12.3,
        rebalance_required: true,
        last_rebalanced: '2024-03-20T00:00:00Z',
        next_review_date: '2024-11-30T00:00:00Z',
        risk_level: 'aggressive',
        status: 'urgent',
        recommendations: [
          {
            asset_class: 'UK Equities',
            current_weight: 48,
            target_weight: 40,
            drift: 8,
            action: 'sell',
            amount: 14400,
            priority: 'high'
          },
          {
            asset_class: 'Bonds',
            current_weight: 15,
            target_weight: 20,
            drift: -5,
            action: 'buy',
            amount: 9000,
            priority: 'high'
          }
        ]
      }
    ]

    // Add more mock portfolios for other clients
    const additionalMockPortfolios = list.slice(2, 5).map((client, index) => ({
      id: `${index + 3}`,
      client_id: client.id,
      client_name: `${client.personal_details.firstName} ${client.personal_details.lastName}`,
      client_ref: client.client_ref,
      portfolio_value: 150000 + (index * 50000),
      target_allocation: {
        'UK Equities': 25,
        'Global Equities': 30,
        'Bonds': 40,
        'Cash': 5
      },
      current_allocation: {
        'UK Equities': 26 + index,
        'Global Equities': 29 + index,
        'Bonds': 40 - index,
        'Cash': 5
      },
      drift_percentage: 2.1 + index,
      rebalance_required: index > 1,
      last_rebalanced: '2024-09-01T00:00:00Z',
      next_review_date: '2025-03-01T00:00:00Z',
      risk_level: 'conservative',
      status: (index > 1 ? 'needs_review' : 'current') as 'current' | 'needs_review' | 'urgent' | 'scheduled',
      recommendations: []
    }))

    const allPortfolios = [...mockPortfolios, ...additionalMockPortfolios]
    setPortfolios(allPortfolios)
    calculateStats(allPortfolios)
  }, [calculateStats])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const loadedClients = await loadClients()
      createMockPortfolioData(loadedClients)
    } catch (error) {
      clientLogger.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load portfolio data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [loadClients, createMockPortfolioData, toast])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, loadData])

  const getStatusBadge = (status: string) => {
    const variants = {
      current: 'default',
      needs_review: 'secondary',
      urgent: 'destructive',
      scheduled: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-UK', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-UK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Filter portfolios
  const filteredPortfolios = portfolios.filter(portfolio => {
    const matchesSearch = searchTerm === '' || 
      portfolio.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      portfolio.client_ref.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || portfolio.status === filterStatus

    return matchesSearch && matchesStatus
  })

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Portfolio Rebalancing</h1>
        <p className="text-gray-600">Monitor and manage portfolio drift and rebalancing requirements</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Portfolios</p>
                <p className="text-2xl font-bold">{stats.totalPortfolios}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Need Rebalancing</p>
                <p className="text-2xl font-bold">{stats.needsRebalancing}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Urgent</p>
                <p className="text-2xl font-bold">{stats.urgentRebalancing}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Percent className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Drift</p>
                <p className="text-2xl font-bold">{stats.averageDrift}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total AUM</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center space-x-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search portfolios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="urgent">Urgent</option>
              <option value="needs_review">Needs Review</option>
              <option value="current">Current</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Portfolio List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Portfolios ({filteredPortfolios.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPortfolios.length === 0 ? (
                <div className="text-center py-12">
                  <RotateCcw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No portfolios found</p>
                  <p className="text-gray-400">Adjust your filters or check back later</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPortfolios.map((portfolio) => (
                    <div
                      key={portfolio.id}
                      className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedPortfolio(portfolio)}
                    >
                      <div className={`p-2 rounded-lg ${
                        portfolio.status === 'urgent' ? 'bg-red-100' :
                        portfolio.status === 'needs_review' ? 'bg-yellow-100' : 'bg-green-100'
                      }`}>
                        {portfolio.status === 'urgent' ? (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        ) : portfolio.status === 'needs_review' ? (
                          <RotateCcw className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium">{portfolio.client_name}</h3>
                            <span className="text-sm text-gray-500">({portfolio.client_ref})</span>
                            {getStatusBadge(portfolio.status)}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{formatCurrency(portfolio.portfolio_value)}</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm text-gray-600">
                            Drift: <span className={`font-medium ${
                              portfolio.drift_percentage > 10 ? 'text-red-600' :
                              portfolio.drift_percentage > 5 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {portfolio.drift_percentage}%
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Last rebalanced: {formatDate(portfolio.last_rebalanced)}
                          </div>
                        </div>

                        {portfolio.recommendations.length > 0 && (
                          <div className="flex items-center space-x-1 mt-2">
                            <AlertCircle className="h-3 w-3 text-orange-500" />
                            <span className="text-xs text-orange-600">
                              {portfolio.recommendations.length} recommendation(s)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Details */}
        <div>
          {selectedPortfolio ? (
            <div className="space-y-6">
              {/* Portfolio Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedPortfolio.client_name}</span>
                    {getStatusBadge(selectedPortfolio.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Portfolio Value</span>
                      <span className="font-medium">{formatCurrency(selectedPortfolio.portfolio_value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Risk Level</span>
                      <span className="font-medium capitalize">{selectedPortfolio.risk_level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Drift Percentage</span>
                      <span className={`font-medium ${
                        selectedPortfolio.drift_percentage > 10 ? 'text-red-600' :
                        selectedPortfolio.drift_percentage > 5 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {selectedPortfolio.drift_percentage}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Review</span>
                      <span className="font-medium">{formatDate(selectedPortfolio.next_review_date)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current vs Target Allocation */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.keys(selectedPortfolio.target_allocation).map((assetClass) => {
                      const target = selectedPortfolio.target_allocation[assetClass]
                      const current = selectedPortfolio.current_allocation[assetClass]
                      const diff = current - target
                      
                      return (
                        <div key={assetClass} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{assetClass}</span>
                            <span className={`${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                              {current}% / {target}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full relative"
                              style={{ width: `${Math.min(current, 100)}%` }}
                            >
                              <div
                                className="absolute top-0 h-2 bg-gray-400 opacity-50"
                                style={{ 
                                  left: `${Math.min(target, current)}%`,
                                  width: `${Math.abs(diff)}%`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              {selectedPortfolio.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rebalance Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedPortfolio.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{rec.asset_class}</h4>
                              <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                                {rec.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {rec.action === 'buy' ? 'Buy' : 'Sell'} {formatCurrency(rec.amount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {rec.current_weight}% → {rec.target_weight}%
                            </p>
                            <p className={`text-xs ${rec.drift > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {rec.drift > 0 ? '+' : ''}{rec.drift}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        className="w-full" 
                        onClick={() => router.push(`/clients/${selectedPortfolio.client_id}`)}
                      >
                        View Client Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <div className="text-center">
                <RotateCcw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Select a portfolio</p>
                <p className="text-gray-400">Choose from the list to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
