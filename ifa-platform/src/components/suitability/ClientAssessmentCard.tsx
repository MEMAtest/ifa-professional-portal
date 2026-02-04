// components/suitability/ClientAssessmentCard.tsx - FIXED VERSION
'use client'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Plus,
  Star,
  Eye,
  ChevronRight,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import type { SuitabilityClient } from '@/services/SuitabilityAssessmentService'
import clientLogger from '@/lib/logging/clientLogger'

interface ClientAssessmentCardProps {
  client: SuitabilityClient
  onClick: (client: SuitabilityClient) => void
}

// Professional Abstract Person Icon Component
const PersonIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

export default function ClientAssessmentCard({ client, onClick }: ClientAssessmentCardProps) {
  // Status configuration
  const statusConfig = {
    completed: { 
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
      icon: CheckCircle, 
      label: 'Completed'
    },
    in_progress: { 
      color: 'bg-blue-50 text-blue-700 border-blue-200', 
      icon: Clock, 
      label: 'In Progress'
    },
    review_needed: { 
      color: 'bg-orange-50 text-orange-700 border-orange-200', 
      icon: AlertTriangle, 
      label: 'Review Needed'
    },
    draft: { 
      color: 'bg-gray-50 text-gray-700 border-gray-200', 
      icon: Plus, 
      label: 'Draft'
    },
    not_started: { 
      color: 'bg-purple-50 text-purple-700 border-purple-200', 
      icon: Plus, 
      label: 'Not Started'
    }
  }

  const status = statusConfig[client.assessmentStatus]
  const StatusIcon = status.icon

  const formatCurrency = (amount: number) => {
    if (amount === 0) return 'Not specified'
    if (amount >= 1000000) {
      return `£${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `£${(amount / 1000).toFixed(0)}K`
    }
    return `£${amount.toLocaleString()}`
  }

  const getRiskLevelColor = (riskLevel: number) => {
    if (riskLevel <= 2) return 'text-green-600'
    if (riskLevel <= 3) return 'text-blue-600'
    if (riskLevel <= 4) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRiskLevelLabel = (riskLevel: number) => {
    const labels = {
      1: 'Conservative',
      2: 'Moderate', 
      3: 'Balanced',
      4: 'Growth',
      5: 'Aggressive'
    }
    return labels[riskLevel as keyof typeof labels] || 'Unknown'
  }

  const getNextReviewDate = () => {
    if (!client.nextReview) return 'Not scheduled'
    return new Date(client.nextReview).toLocaleDateString('en-GB')
  }

  // Handle card click with error boundary
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      onClick(client)
    } catch (error) {
      clientLogger.error('Error in card click handler:', error)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:border-blue-200"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick(e as any)
        }
      }}
    >
      {/* Client Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <PersonIcon className="h-6 w-6 text-blue-600" />
            </div>
            {client.priority === 'high' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <Star className="h-2 w-2 text-white fill-current" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {client.name}
            </h3>
            <p className="text-sm text-gray-500">{client.clientRef}</p>
            {client.age > 0 && (
              <p className="text-xs text-gray-400">Age {client.age}</p>
            )}
          </div>
        </div>
        <div className={`px-3 py-1 rounded-xl text-xs font-medium border ${status.color} flex items-center space-x-1`}>
          <StatusIcon className="h-3 w-3" />
          <span>{status.label}</span>
        </div>
      </div>

      {/* Client Details Grid */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Portfolio Value</div>
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(client.investmentAmount)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Risk Profile</div>
            <div className={`text-lg font-bold ${getRiskLevelColor(client.riskProfile)}`}>
              {client.riskProfile}/5
            </div>
            <div className="text-xs text-gray-500">
              {getRiskLevelLabel(client.riskProfile)}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Performance YTD</div>
            <div className={`text-lg font-bold flex items-center ${
              client.portfolioPerformance >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {client.portfolioPerformance >= 0 ? 
                <ArrowUpRight className="h-4 w-4 mr-1" /> : 
                <ArrowDownRight className="h-4 w-4 mr-1" />
              }
              {client.portfolioPerformance >= 0 ? '+' : ''}{client.portfolioPerformance}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Suitability Score</div>
            <div className="text-lg font-bold text-gray-900">
              {client.suitabilityScore > 0 ? `${client.suitabilityScore}%` : 'Not assessed'}
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-medium">Assessment Progress</span>
          <span className="text-xs text-gray-500">{client.completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              client.completionPercentage > 0 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                : 'bg-gray-300'
            }`}
            style={{ width: `${Math.max(client.completionPercentage, 5)}%` }}
          />
        </div>
        {client.completionPercentage === 0 && (
          <p className="text-xs text-gray-500 text-center">Assessment not started</p>
        )}
      </div>

      {/* Tags and Alerts */}
      <div className="flex flex-wrap gap-2 mb-6">
        {client.tags.map((tag, index) => (
          <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
            {tag}
          </span>
        ))}
        {client.vulnerableClient && (
          <span className="px-3 py-1 bg-red-50 text-red-700 text-xs rounded-full flex items-center space-x-1 font-medium">
            <AlertTriangle className="h-3 w-3" />
            <span>Vulnerable</span>
          </span>
        )}
        {client.occupation && client.occupation !== 'Not specified' && (
          <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs rounded-full font-medium">
            {client.occupation}
          </span>
        )}
      </div>

      {/* Action Button */}
      <button 
        onClick={handleCardClick}
        className="w-full py-3 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl font-medium group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all duration-300 flex items-center justify-center space-x-2 border border-blue-200 group-hover:border-transparent"
      >
        <Eye className="h-4 w-4" />
        <span>View Assessment</span>
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Review Date */}
      {client.nextReview && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Next Review</span>
            </span>
            <span className="font-medium">{getNextReviewDate()}</span>
          </div>
        </div>
      )}
    </div>
  )
}
