// ===================================================================
// File: src/components/documents/DocumentVaultDashboard.tsx
// Main Document Vault Dashboard - Replaces the basic documents page
// Enterprise-grade document management interface
// ===================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { useToast } from '@/hooks/use-toast'
import clientLogger from '@/lib/logging/clientLogger'
import {
  FileText,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  Send,
  Eye,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Archive,
  Trash2,
  RefreshCw,
  Activity,
  BarChart3,
  Plus,
  Settings,
  Upload,
  Mail,
  Zap,
  Calendar,
  Target,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

// ===================================================================
// TYPES (Based on API responses)
// ===================================================================

interface DashboardStats {
  totalDocuments: number
  pendingSignatures: number
  signedThisWeek: number
  averageTimeToSign: number
  documentsByType: Array<{
    type: string
    count: number
    percentage: number
  }>
  documentsByCategory: Array<{
    category: string
    count: number
    compliance_rate: number
  }>
  recentActivity: Array<{
    id: string
    action: string
    documentName: string
    clientName: string
    timestamp: string
    status: string
  }>
  metrics: {
    documentsThisMonth: number
    documentsLastMonth: number
    monthlyGrowth: number
    complianceScore: number
    storageUsed: number
  }
  quickStats: {
    totalActive: number
    pendingReview: number
    expiringSoon: number
    recentUploads: number
  }
}

interface Document {
  id: string
  name: string
  client_name: string
  type: string
  category: string
  signature_status: string
  compliance_status: string
  created_at: string
  file_size: number
  requires_signature: boolean
}

interface ActivityItem {
  id: string
  documentId: string
  documentName: string
  clientName: string
  action: string
  performedBy: string
  performedByName?: string
  performedAt: string
  status?: string
  priority?: 'low' | 'medium' | 'high'
}

// ===================================================================
// MAIN DASHBOARD COMPONENT
// ===================================================================

export default function DocumentVaultDashboard() {
  // ===================================================================
  // STATE MANAGEMENT
  // ===================================================================
  
  const { toast } = useToast()
  
  // Data state
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [dateRange, setDateRange] = useState('30d')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  
  // Bulk operations state
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)

  // ===================================================================
  // DATA LOADING
  // ===================================================================
  
  const loadDashboardData = useCallback(async () => {
    try {
      setError(null)
      
      // Load dashboard statistics
      const statsResponse = await fetch(`/api/documents/dashboard/stats?dateRange=${dateRange}`)
      if (!statsResponse.ok) {
        throw new Error('Failed to load dashboard statistics')
      }
      const statsData = await statsResponse.json()
      setStats(statsData)
      
      // Load documents
      const docsResponse = await fetch('/api/documents?limit=50&page=1')
      if (!docsResponse.ok) {
        throw new Error('Failed to load documents')
      }
      const docsData = await docsResponse.json()
      setDocuments(docsData.documents || [])
      
      // Load recent activities
      const activityResponse = await fetch('/api/documents/activity/feed?limit=15')
      if (!activityResponse.ok) {
        console.warn('Activity feed not available:', activityResponse.statusText)
        setActivities([])
      } else {
        const activityData = await activityResponse.json()
        setActivities(activityData.activities || [])
      }
      
    } catch (err) {
      clientLogger.error('Dashboard loading error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [dateRange, toast])

  // Initial load
  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData, refreshInterval])

  // Auto-refresh setup
  useEffect(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }
    
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    setRefreshInterval(interval)
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [loadDashboardData, refreshInterval])

  // ===================================================================
  // BULK OPERATIONS
  // ===================================================================
  
  const handleBulkAction = async (action: string) => {
    if (selectedDocuments.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select documents to perform bulk actions',
        variant: 'destructive'
      })
      return
    }

    setBulkActionLoading(true)
    
    try {
      const response = await fetch('/api/documents/bulk/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: selectedDocuments,
          action,
          actionParams: {}
        })
      })

      if (!response.ok) {
        throw new Error(`Bulk ${action} failed`)
      }

      const result = await response.json()
      
      toast({
        title: 'Bulk Operation Complete',
        description: `${action} completed for ${result.results?.successful?.length || 0} documents`
      })
      
      // Clear selection and refresh
      setSelectedDocuments([])
      setShowBulkActions(false)
      await loadDashboardData()
      
    } catch (err) {
      clientLogger.error('Bulk action error:', err)
      toast({
        title: 'Bulk Action Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleDocumentSelect = (documentId: string, checked: boolean) => {
    if (checked) {
      setSelectedDocuments(prev => [...prev, documentId])
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId))
    }
    
    setShowBulkActions(checked || selectedDocuments.length > 1)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleDocumentIds = filteredDocuments.map(doc => doc.id)
      setSelectedDocuments(visibleDocumentIds)
      setShowBulkActions(true)
    } else {
      setSelectedDocuments([])
      setShowBulkActions(false)
    }
  }

  // ===================================================================
  // FILTERING AND SEARCH
  // ===================================================================
  
  const filteredDocuments = documents.filter(doc => {
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!doc.name.toLowerCase().includes(query) && 
          !doc.client_name.toLowerCase().includes(query)) {
        return false
      }
    }
    
    // Status filter
    if (statusFilter !== 'all' && doc.signature_status !== statusFilter) {
      return false
    }
    
    // Type filter
    if (typeFilter !== 'all' && doc.type !== typeFilter) {
      return false
    }
    
    return true
  })

  // ===================================================================
  // UTILITY FUNCTIONS
  // ===================================================================
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getTimeAgo = (dateString: string): string => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString()
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default'  // green
      case 'sent': return 'secondary'     // blue
      case 'pending': return 'outline'    // yellow
      case 'expired': return 'destructive' // red
      default: return 'outline'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <FileText className="h-4 w-4" />
      case 'sent': return <Send className="h-4 w-4" />
      case 'viewed': return <Eye className="h-4 w-4" />
      case 'signed': return <CheckCircle className="h-4 w-4" />
      case 'downloaded': return <Download className="h-4 w-4" />
      case 'archived': return <Archive className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  // ===================================================================
  // LOADING AND ERROR STATES
  // ===================================================================
  
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading Document Vault...</span>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="p-6 max-w-md">
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="font-semibold">Error Loading Dashboard</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadDashboardData} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </Card>
        </div>
      </Layout>
    )
  }

  // ===================================================================
  // MAIN RENDER
  // ===================================================================
  
  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        
        {/* ===================================================================
             HEADER SECTION
        =================================================================== */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Document Vault</h1>
            <p className="text-muted-foreground">
              Manage all documents across your client base
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadDashboardData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </div>
        </div>

        {/* ===================================================================
             OVERVIEW METRICS CARDS
        =================================================================== */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.quickStats.totalActive || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.metrics?.monthlyGrowth !== undefined && (
  <div className="text-2xl font-bold">
    {stats.metrics.monthlyGrowth > 0 ? '+' : ''}{stats.metrics.monthlyGrowth.toFixed(1)}%
  </div>
)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Signatures</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingSignatures || 0}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting client signatures
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signed This Week</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.signedThisWeek || 0}</div>
              <p className="text-xs text-muted-foreground">
                Avg. {stats?.averageTimeToSign || 0}h to sign
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.metrics.complianceScore || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {stats?.quickStats.pendingReview || 0} pending review
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ===================================================================
             MAIN CONTENT GRID
        =================================================================== */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* ===================================================================
               DOCUMENTS LIST (Left Side - 2 columns)
          =================================================================== */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Documents</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                    
                    {/* Bulk Actions */}
                    {showBulkActions && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {selectedDocuments.length} selected
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkAction('send')}
                          disabled={bulkActionLoading}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkAction('archive')}
                          disabled={bulkActionLoading}
                        >
                          <Archive className="h-4 w-4 mr-1" />
                          Archive
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents or clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Filters Row */}
                {showFilters && (
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="completed">Signed</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {stats?.documentsByType.map(type => (
                          <SelectItem key={type.type} value={type.type}>
                            {type.type} ({type.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setStatusFilter('all')
                        setTypeFilter('all')
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                {/* Select All Checkbox */}
                <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                  <Checkbox
                    checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    Select all ({filteredDocuments.length} documents)
                  </span>
                </div>
                
                {/* Documents List */}
                <div className="space-y-3">
                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No documents found</p>
                      {searchQuery && (
                        <p className="text-sm">Try adjusting your search or filters</p>
                      )}
                    </div>
                  ) : (
                    filteredDocuments.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onCheckedChange={(checked) => handleDocumentSelect(doc.id, checked as boolean)}
                        />
                        
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{doc.name}</h3>
                            <Badge variant={getStatusBadgeVariant(doc.signature_status)}>
                              {doc.signature_status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>👤 {doc.client_name}</span>
                            <span>📁 {doc.category || doc.type}</span>
                            <span>📏 {formatFileSize(doc.file_size || 0)}</span>
                            <span>🕒 {getTimeAgo(doc.created_at)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                          {doc.requires_signature && doc.signature_status === 'pending' && (
                            <Button size="sm" variant="ghost">
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* ===================================================================
               RIGHT SIDEBAR - Activity Feed & Analytics
          =================================================================== */}
          <div className="space-y-4">
            
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent activity
                    </p>
                  ) : (
                    activities.map(activity => (
                      <div key={activity.id} className="flex items-start gap-3 text-sm">
                        <div className="flex-shrink-0 mt-0.5">
                          {getActionIcon(activity.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{activity.performedByName || 'User'}</span>
                            {' '}{activity.action}{' '}
                            <span className="font-medium">{activity.documentName}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.clientName} • {getTimeAgo(activity.performedAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Document Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.documentsByType.slice(0, 5).map(item => (
                    <div key={item.type} className="flex items-center justify-between">
                      <span className="text-sm">{item.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.count}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Storage & Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Storage Used</span>
                    <span className="text-sm font-medium">
                      {formatFileSize(stats?.metrics.storageUsed || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Monthly Growth</span>
                    <span className={`text-sm font-medium flex items-center gap-1 ${
                      (stats?.metrics.monthlyGrowth || 0) > 0 ? 'text-green-600' : 
                      (stats?.metrics.monthlyGrowth || 0) < 0 ? 'text-red-600' : ''
                    }`}>
                      {(stats?.metrics.monthlyGrowth || 0) > 0 && <ArrowUp className="h-3 w-3" />}
                      {(stats?.metrics.monthlyGrowth || 0) < 0 && <ArrowDown className="h-3 w-3" />}
                      {(stats?.metrics.monthlyGrowth || 0) === 0 && <Minus className="h-3 w-3" />}
                      {stats?.metrics.monthlyGrowth || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Compliance Rate</span>
                    <span className="text-sm font-medium">
                      {stats?.metrics.complianceScore || 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}
