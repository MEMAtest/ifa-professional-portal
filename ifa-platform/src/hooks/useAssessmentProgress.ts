// File: /hooks/useAssessmentProgress.ts

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseRealtimeEnabled } from '@/lib/supabase/realtime'

interface AssessmentProgressData {
  progress: Record<string, {
    status: 'not_started' | 'in_progress' | 'completed' | 'needs_review'
    startedAt?: string
    completedAt?: string
    completedBy?: string
    score?: any
    metadata?: any
  }>
  overallProgress: number
  completedCount: number
  totalAssessments: number
}

interface UpdateProgressParams {
  assessmentType: string
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review'
  score?: any
  metadata?: any
}

export function useAssessmentProgress(clientId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [isSubscribed, setIsSubscribed] = useState(false)

  // Fetch assessment progress
  const { data, isLoading, error, refetch } = useQuery<AssessmentProgressData>({
    queryKey: ['assessment-progress', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/assessments/progress/${clientId}`)
      if (!response.ok) throw new Error('Failed to fetch assessment progress')
      return response.json()
    },
    enabled: !!clientId,
    staleTime: 30000, // 30 seconds
  })

  // Update assessment progress
  const updateProgress = useMutation({
    mutationFn: async (params: UpdateProgressParams) => {
      const response = await fetch(`/api/assessments/progress/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!response.ok) throw new Error('Failed to update assessment progress')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-progress', clientId] })
      queryClient.invalidateQueries({ queryKey: ['assessment-history', clientId] })
    },
  })

  // Set up real-time subscription
  useEffect(() => {
    if (!isSupabaseRealtimeEnabled()) return
    if (!clientId || isSubscribed) return

    const channel = supabase
      .channel(`assessment-progress-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assessment_progress',
          filter: `client_id=eq.${clientId}`,
        },
        (payload: unknown) => {
          console.log('Assessment progress change:', payload)
          refetch()
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true)
        }
      })

    return () => {
      channel.unsubscribe()
      setIsSubscribed(false)
    }
  }, [clientId, refetch, isSubscribed])

  // Helper functions
  const startAssessment = useCallback(
    (assessmentType: string) => {
      return updateProgress.mutate({
        assessmentType,
        status: 'in_progress',
      })
    },
    [updateProgress]
  )

  const completeAssessment = useCallback(
    (assessmentType: string, score: any, metadata?: any) => {
      return updateProgress.mutate({
        assessmentType,
        status: 'completed',
        score,
        metadata,
      })
    },
    [updateProgress]
  )

  const markForReview = useCallback(
    (assessmentType: string) => {
      return updateProgress.mutate({
        assessmentType,
        status: 'needs_review',
      })
    },
    [updateProgress]
  )

  return {
    progress: data?.progress || {},
    overallProgress: data?.overallProgress || 0,
    completedCount: data?.completedCount || 0,
    totalAssessments: data?.totalAssessments || 6,
    isLoading,
    error,
    updateProgress: updateProgress.mutate,
    startAssessment,
    completeAssessment,
    markForReview,
    isUpdating: updateProgress.isPending,
  }
}
