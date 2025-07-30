// components/suitability/SuitabilityMetricsCards.tsx
'use client'
import { 
  Users, 
  PieChart, 
  CheckCircle, 
  AlertTriangle, 
  Target, 
  Activity 
} from 'lucide-react'
import type { SuitabilityMetrics } from '@/services/SuitabilityAssessmentService'

interface MetricsCardsProps {
  metrics: SuitabilityMetrics
  isLoading?: boolean
}

export default function SuitabilityMetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `£${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `£${(amount / 1000).toFixed(0)}K`
    }
    return `£${amount.toLocaleString()}`
  }

  const metricCards = [
    { 
      icon: Users, 
      value: metrics.totalClients, 
      label: 'Active Clients', 
      color: 'blue',
      trend: '+12%'
    },
    { 
      icon: PieChart, 
      value: formatCurrency(metrics.totalAUM), 
      label: 'Total AUM', 
      color: 'emerald',
      trend: '+8.2%'
    },
    { 
      icon: CheckCircle, 
      value: metrics.completed, 
      label: 'Completed', 
      color: 'green',
      trend: '+24%'
    },
    { 
      icon: AlertTriangle, 
      value: metrics.needReview, 
      label: 'Need Review', 
      color: 'orange',
      trend: '-5%'
    },
    { 
      icon: Target, 
      value: metrics.avgRiskLevel, 
      label: 'Avg Risk Level', 
      color: 'purple',
      trend: 'Stable'
    },
    { 
      icon: Activity, 
      value: metrics.vulnerable, 
      label: 'Vulnerable', 
      color: 'red',
      trend: `${metrics.vulnerable} Active`
    }
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
              <div className="w-12 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="w-16 h-8 bg-gray-200 rounded mb-2"></div>
            <div className="w-20 h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
      {metricCards.map((metric, index) => (
        <div 
          key={index} 
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-xl bg-${metric.color}-100`}>
              <metric.icon className={`h-5 w-5 text-${metric.color}-600`} />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {metric.trend}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {metric.value}
          </div>
          <div className="text-sm text-gray-600">
            {metric.label}
          </div>
        </div>
      ))}
    </div>
  )
}