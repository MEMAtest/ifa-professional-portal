// src/components/ai/AIServiceMonitor.tsx
// ================================================================
// AI SERVICE MONITORING DASHBOARD
// Real-time metrics and performance tracking
// ================================================================

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  Activity, 
  Zap, 
  Database, 
  AlertCircle, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart2
} from 'lucide-react'
import { aiAssistantService } from '@/services/aiAssistantService'

interface AIMetrics {
  totalRequests: number
  cacheHits: number
  apiCalls: number
  errors: number
  rateLimitHits: number
  avgResponseTime: number
  cacheSize: number
  queueSize: number
  rateLimitRemaining: number
}

const AIServiceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Fetch metrics every 5 seconds
  useEffect(() => {
    const fetchMetrics = () => {
      const currentMetrics = aiAssistantService.getMetrics()
      setMetrics(currentMetrics)
      setLastUpdate(new Date())
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    const currentMetrics = aiAssistantService.getMetrics()
    setMetrics(currentMetrics)
    setLastUpdate(new Date())
    setTimeout(() => setIsRefreshing(false), 500)
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Activity className="h-6 w-6 animate-pulse text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  const cacheHitRate = metrics.totalRequests > 0 
    ? (metrics.cacheHits / metrics.totalRequests * 100).toFixed(1)
    : '0.0'
  
  const errorRateNum = metrics.totalRequests > 0
    ? (metrics.errors / metrics.totalRequests * 100)
    : 0
  
  const errorRate = errorRateNum.toFixed(1)
  const successRate = 100 - errorRateNum
  const cacheHitRateNum = metrics.totalRequests > 0 
    ? (metrics.cacheHits / metrics.totalRequests * 100)
    : 0

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            AI Service Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Requests</span>
            </div>
            <p className="text-2xl font-bold">{metrics.totalRequests}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">API Calls</span>
            </div>
            <p className="text-2xl font-bold">{metrics.apiCalls}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Cache Hits</span>
            </div>
            <p className="text-2xl font-bold">{metrics.cacheHits}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Avg Response</span>
            </div>
            <p className="text-2xl font-bold">{metrics.avgResponseTime.toFixed(0)}ms</p>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Cache Hit Rate</span>
              <Badge variant={cacheHitRateNum > 60 ? 'success' : 'warning'}>
                {cacheHitRate}%
              </Badge>
            </div>
            <Progress value={cacheHitRateNum} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Success Rate</span>
              <Badge variant={successRate > 95 ? 'success' : successRate > 90 ? 'warning' : 'destructive'}>
                {successRate.toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={successRate} 
              className="h-2"
              style={{
                '--progress-background': successRate > 95 ? '#10b981' : successRate > 90 ? '#f59e0b' : '#ef4444'
              } as React.CSSProperties}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Rate Limit Usage</span>
              <Badge variant={metrics.rateLimitRemaining > 50 ? 'success' : metrics.rateLimitRemaining > 20 ? 'warning' : 'destructive'}>
                {metrics.rateLimitRemaining}/100 remaining
              </Badge>
            </div>
            <Progress 
              value={100 - metrics.rateLimitRemaining} 
              className="h-2"
            />
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full ${metrics.queueSize > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span>Queue: {metrics.queueSize}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full ${metrics.rateLimitHits > 0 ? 'bg-orange-500' : 'bg-green-500'}`} />
            <span>Rate Limits: {metrics.rateLimitHits}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full ${metrics.errors > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
            <span>Errors: {metrics.errors}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Cache: {metrics.cacheSize} items</span>
          </div>
        </div>

        {/* Alerts */}
        {metrics.errors > 5 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              High error rate detected ({errorRate}%). Check API connectivity and logs.
            </AlertDescription>
          </Alert>
        )}

        {metrics.rateLimitRemaining < 20 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Approaching rate limit. {metrics.rateLimitRemaining} requests remaining this minute.
            </AlertDescription>
          </Alert>
        )}

        {metrics.queueSize > 10 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {metrics.queueSize} requests queued. High demand detected.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default AIServiceMonitor