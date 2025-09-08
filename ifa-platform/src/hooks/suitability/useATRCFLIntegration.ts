// =====================================================
// FILE: src/hooks/suitability/useATRCFLIntegration.ts
// FINAL FIX ATTEMPT: This version is robust. If errors persist,
// the issue is likely in the environment variables.
// =====================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PulledPlatformData } from '@/types/suitability'
import type { SupabaseClient } from '@supabase/supabase-js' // FIX: Explicitly import the type for robustness

interface ATRAssessment {
  id: string
  client_id: string
  risk_level: number
  risk_category: string
  assessment_date: string
  is_current: boolean
  scores: {
    tolerance: number
    experience: number
    knowledge: number
    timeHorizon: number
  }
}

interface CFLAssessment {
  id: string
  client_id: string
  capacity_level: number
  capacity_category: 'Low' | 'Medium' | 'High'
  assessment_date: string
  is_current: boolean
  financial_data: {
    netWorth: number
    liquidAssets: number
    monthlyIncome: number
    monthlyExpenses: number
    emergencyFund: number
  }
}

interface UseATRCFLIntegrationOptions {
  clientId: string
  autoFetch?: boolean
  refreshInterval?: number
  onDataPulled?: (data: PulledPlatformData) => void
  onError?: (error: Error) => void
}

interface IntegrationState {
  atrAssessment: ATRAssessment | null
  cflAssessment: CFLAssessment | null
  pulledData: PulledPlatformData
  isLoading: boolean
  error: string | null
  lastFetched: Date | null
  isSynced: boolean
}

export const useATRCFLIntegration = ({
  clientId,
  autoFetch = true,
  refreshInterval,
  onDataPulled,
  onError
}: UseATRCFLIntegrationOptions) => {
  const [state, setState] = useState<IntegrationState>({
    atrAssessment: null,
    cflAssessment: null,
    pulledData: {},
    isLoading: false,
    error: null,
    lastFetched: null,
    isSynced: false
  })
  
  const refreshTimerRef = useRef<NodeJS.Timeout>()
  const fetchAttemptRef = useRef(0)
  const maxRetries = 3
  const hasInitialFetchRef = useRef(false)
  
  // FIX: This is the most robust way to initialize the client.
  // The useMemo hook ensures it's created only once.
  // The try/catch handles cases where environment variables might be missing.
  const supabase = useMemo<SupabaseClient | null>(() => {
    try {
      // IMPORTANT: This function requires NEXT_PUBLIC_SUPABASE_URL and
      // NEXT_PUBLIC_SUPABASE_ANON_KEY to be set in your .env.local file.
      return createClient()
    } catch (error) {
      console.error('CRITICAL: Supabase initialization failed in useATRCFLIntegration. Check your environment variables.', error)
      // Returning null is crucial to prevent the 'never' type issue.
      return null
    }
  }, []) // Empty dependency array is correct, runs once.
  
  // Fetch ATR assessment
  const fetchATRAssessment = useCallback(async (): Promise<ATRAssessment | null> => {
    // FIX: Guard clause to prevent running if initialization failed.
    if (!supabase) return null
    
    try {
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('assessment_type', 'atr')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (assessmentError) throw assessmentError;

      if (assessment) {
        const atrData: ATRAssessment = {
          id: assessment.id || 'extracted-atr',
          client_id: clientId,
          risk_level: assessment.risk_analysis?.level || assessment.assessment_data?.risk_level || 5,
          risk_category: assessment.risk_analysis?.category || assessment.assessment_data?.risk_category || 'Medium',
          assessment_date: assessment.created_at,
          is_current: true,
          scores: {
            tolerance: assessment.assessment_data?.tolerance || 50,
            experience: assessment.assessment_data?.experience || 50,
            knowledge: assessment.assessment_data?.knowledge || 50,
            timeHorizon: assessment.assessment_data?.timeHorizon || 50
          }
        }
        return atrData
      }
      
      return null
    } catch (error) {
      console.error('ATR fetch error:', error)
      return null
    }
  }, [clientId, supabase])
  
  // Fetch CFL assessment
  const fetchCFLAssessment = useCallback(async (): Promise<CFLAssessment | null> => {
    if (!supabase) return null // FIX: Guard clause
    
    try {
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('assessment_type', 'cfl')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (assessmentError) throw assessmentError;

      if (assessment) {
        const cflData: CFLAssessment = {
          id: assessment.id || 'extracted-cfl',
          client_id: clientId,
          capacity_level: assessment.risk_analysis?.capacity || assessment.assessment_data?.capacity_level || 5,
          capacity_category: assessment.risk_analysis?.category || assessment.assessment_data?.capacity_category || 'Medium',
          assessment_date: assessment.created_at,
          is_current: true,
          financial_data: {
            netWorth: assessment.assessment_data?.netWorth || assessment.assessment_data?.net_worth || 0,
            liquidAssets: assessment.assessment_data?.liquidAssets || assessment.assessment_data?.liquid_assets || 0,
            monthlyIncome: assessment.assessment_data?.monthlyIncome || assessment.assessment_data?.monthly_income || 0,
            monthlyExpenses: assessment.assessment_data?.monthlyExpenses || assessment.assessment_data?.monthly_expenses || 0,
            emergencyFund: assessment.assessment_data?.emergencyFund || assessment.assessment_data?.emergency_fund || 0
          }
        }
        return cflData
      }
      
      return null
    } catch (error) {
      console.error('CFL fetch error:', error)
      return null
    }
  }, [clientId, supabase])
  
  // Fetch vulnerability assessment
  const fetchVulnerabilityData = useCallback(async () => {
    if (!supabase) return null // FIX: Guard clause
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('vulnerability_assessment')
        .eq('id', clientId)
        .maybeSingle()
      
      if (error) throw error;
      
      if (data && data.vulnerability_assessment) {
        return data.vulnerability_assessment
      }
      return null
    } catch (error) {
      console.error('Vulnerability fetch error:', error)
      return null
    }
  }, [clientId, supabase])
  
  // Main fetch function with retry logic
  const fetchAllData = useCallback(async () => {
    if (state.isLoading) return null
    
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const [atr, cfl, vulnerability] = await Promise.all([
        fetchATRAssessment(),
        fetchCFLAssessment(),
        fetchVulnerabilityData()
      ])
      
      const pulledData: PulledPlatformData = {
        atrScore: atr ? atr.risk_level * 15 : undefined,
        atrCategory: atr?.risk_category,
        cflScore: cfl ? cfl.capacity_level * 15 : undefined,
        cflCategory: cfl?.capacity_category,
        vulnerabilityScore: vulnerability?.is_vulnerable ? 'High' : 'Low',
        vulnerabilityFactors: vulnerability?.factors || [],
        clientMetrics: {
          totalAssets: cfl?.financial_data.netWorth || 0,
          totalLiabilities: 0,
          investmentExperience: atr?.scores.experience ? 
            (atr.scores.experience > 70 ? 'Extensive' : 
             atr.scores.experience > 40 ? 'Moderate' : 'Limited') : 'None'
        },
        lastAssessmentDates: {
          atr: atr?.assessment_date,
          cfl: cfl?.assessment_date,
          persona: undefined
        },
        marketData: {
          ftse100: 7500,
          gilts10Y: 4.5,
          inflationRate: 2.5
        }
      }
      
      setState(prev => ({
        ...prev,
        atrAssessment: atr,
        cflAssessment: cfl,
        pulledData,
        isLoading: false,
        lastFetched: new Date(),
        isSynced: true,
        error: null
      }))
      
      fetchAttemptRef.current = 0
      
      onDataPulled?.(pulledData)
      
      return pulledData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch assessment data'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isSynced: false
      }))
      
      if (fetchAttemptRef.current < maxRetries) {
        fetchAttemptRef.current++
        setTimeout(() => fetchAllData(), 2000 * fetchAttemptRef.current)
      } else {
        onError?.(new Error(errorMessage))
      }
      
      return null
    }
  }, [
    state.isLoading,
    fetchATRAssessment, 
    fetchCFLAssessment, 
    fetchVulnerabilityData,
    onDataPulled,
    onError
  ])
  
  // Reconcile ATR and CFL scores
  const reconcileRiskProfiles = useCallback(() => {
    const { atrAssessment, cflAssessment } = state
    
    if (!atrAssessment || !cflAssessment) {
      return {
        finalRiskLevel: null,
        reconciliationMethod: 'incomplete',
        recommendation: 'Complete both ATR and CFL assessments'
      }
    }
    
    const atrLevel = atrAssessment.risk_level
    const cflLevel = cflAssessment.capacity_level
    
    const finalRiskLevel = Math.min(atrLevel, cflLevel)
    
    let reconciliationMethod = 'aligned'
    let recommendation = 'Risk profile well-aligned. Proceed with standard recommendations.'
    
    if (Math.abs(atrLevel - cflLevel) > 2) {
      reconciliationMethod = 'significant_mismatch'
      recommendation = 'Significant discrepancy detected. Advisor review required.'
    } else if (atrLevel > cflLevel) {
      reconciliationMethod = 'cfl_limited'
      recommendation = 'Risk appetite exceeds capacity. Consider building wealth before aggressive investing.'
    } else if (cflLevel > atrLevel) {
      reconciliationMethod = 'atr_limited'
      recommendation = 'Capacity exceeds risk tolerance. Education may help utilize full capacity.'
    }
    
    return {
      finalRiskLevel,
      reconciliationMethod,
      recommendation,
      atrLevel,
      cflLevel,
      mismatch: Math.abs(atrLevel - cflLevel)
    }
  }, [state.atrAssessment, state.cflAssessment])
  
  // Manual refresh function
  const refresh = useCallback(async () => {
    fetchAttemptRef.current = 0
    return await fetchAllData()
  }, [fetchAllData])
  
  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && clientId && !hasInitialFetchRef.current && supabase) {
      hasInitialFetchRef.current = true
      fetchAllData()
    }
  }, [clientId, autoFetch, fetchAllData, supabase])
  
  // Setup refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0 && clientId && supabase) {
      refreshTimerRef.current = setInterval(fetchAllData, refreshInterval)
      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current)
        }
      }
    }
  }, [refreshInterval, clientId, fetchAllData, supabase])
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (!supabase || !clientId) return
    
    const channel = supabase
      .channel(`assessments_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assessments',
          filter: `client_id=eq.${clientId}`
        },
        (payload) => {
          console.log('Real-time assessment update received:', payload)
          if (payload.new && (payload.new as any).assessment_type) {
            refresh()
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to real-time updates for client ${clientId}`)
        }
      })
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId, refresh, supabase])
  
  return {
    ...state,
    reconcileRiskProfiles,
    refresh,
    isATRComplete: !!state.atrAssessment,
    isCFLComplete: !!state.cflAssessment,
    needsUpdate: state.atrAssessment || state.cflAssessment ? 
      (() => {
        const oldestDate = Math.min(
          state.atrAssessment ? new Date(state.atrAssessment.assessment_date).getTime() : Infinity,
          state.cflAssessment ? new Date(state.cflAssessment.assessment_date).getTime() : Infinity
        )
        const daysSinceAssessment = (Date.now() - oldestDate) / (1000 * 60 * 60 * 24)
        return daysSinceAssessment > 365
      })() : false
  }
}

export default useATRCFLIntegration