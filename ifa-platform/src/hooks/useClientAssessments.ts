// File: /hooks/useClientAssessments.ts

import { useQuery } from '@tanstack/react-query'
import { useAssessmentProgress } from './useAssessmentProgress'
import { integratedClientService } from '@/services/integratedClientService'

interface AssessmentHistory {
  id: string
  assessmentType: string
  action: string
  performedAt: string
  performedBy: {
    id: string
    email: string
    full_name: string
  }
  changes: any
  metadata: any
}

interface ComplianceAlert {
  id: string
  type: 'review_due' | 'vulnerability_check' | 'documentation' | 'follow_up'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  dueDate: string
}

export function useClientAssessments(clientId: string) {
  // Get client data
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => integratedClientService.getClientById(clientId),
    enabled: !!clientId,
  })

  // Get assessment progress
  const {
    progress,
    overallProgress,
    completedCount,
    totalAssessments,
    isLoading: progressLoading,
    startAssessment,
    completeAssessment,
    markForReview,
  } = useAssessmentProgress(clientId)

  // Get assessment history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['assessment-history', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/assessments/history/${clientId}?limit=10`)
      if (!response.ok) throw new Error('Failed to fetch assessment history')
      return response.json()
    },
    enabled: !!clientId,
  })

  // Get compliance alerts
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ['compliance-alerts', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/assessments/compliance/${clientId}`)
      if (!response.ok) throw new Error('Failed to fetch compliance alerts')
      return response.json()
    },
    enabled: !!clientId,
  })

  // Calculate risk metrics from assessment data
  const riskMetrics = client?.riskProfile ? {
    attitudeToRisk: client.riskProfile.attitudeToRisk || 3,
    capacityForLoss: parseInt(client.riskProfile.capacityForLoss) || 3,
    volatilityTolerance: 15, // Default value
    timeHorizon: 10, // Default value
    knowledgeExperience: parseInt(client.riskProfile.knowledgeExperience) || 3,
    finalRiskProfile: Math.round(
      ((client.riskProfile.attitudeToRisk || 3) + 
       (parseInt(client.riskProfile.capacityForLoss) || 3)) / 2
    ),
  } : null

  return {
    client,
    progress,
    overallProgress,
    completedCount,
    totalAssessments,
    assessmentHistory: historyData?.history || [],
    complianceAlerts: complianceData?.alerts || [],
    riskMetrics,
    isLoading: clientLoading || progressLoading,
    isHistoryLoading: historyLoading,
    isComplianceLoading: complianceLoading,
    startAssessment,
    completeAssessment,
    markForReview,
  }
}