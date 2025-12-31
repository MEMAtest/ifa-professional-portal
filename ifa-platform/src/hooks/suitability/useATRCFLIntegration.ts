// =====================================================
// FILE: src/hooks/suitability/useATRCFLIntegration.ts
// FINAL FIX ATTEMPT: This version is robust. If errors persist,
// the issue is likely in the environment variables.
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import type { PulledPlatformData } from '@/types/suitability'

interface ATRAssessment {
  id: string
  client_id: string
  risk_level: number
  risk_category: string
  assessment_date: string
  total_score?: number | null
  version?: number | null
}

interface CFLAssessment {
  id: string
  client_id: string
  capacity_level: number
  capacity_category: 'Low' | 'Medium' | 'High'
  assessment_date: string
  total_score?: number | null
  max_loss_percentage?: number | null
  version?: number | null
}

interface PersonaAssessment {
  id: string
  client_id: string
  persona_type: string
  persona_level: string
  confidence?: number | null
  assessment_date: string
  version?: number | null
  is_current?: boolean | null
}

interface UseATRCFLIntegrationOptions {
  clientId: string
  autoFetch?: boolean
  refreshInterval?: number
  enableRealtime?: boolean
  onDataPulled?: (data: PulledPlatformData) => void
  onError?: (error: Error) => void
}

type ApiResponse<T> =
  | { success: true; data: T | null }
  | { success: false; error?: string }

function normalizeAtrLevelToTenScale(level: unknown): number | undefined {
  const parsed = typeof level === 'number' ? level : level != null ? Number(level) : NaN
  if (!Number.isFinite(parsed)) return undefined

  // ATR uses a 1–5 risk level; normalize to a 1–10 scale for cross-assessment comparisons.
  if (parsed >= 1 && parsed <= 5) return Math.round(parsed * 2)
  if (parsed >= 1 && parsed <= 10) return Math.round(parsed)
  return undefined
}

async function fetchApiJson<T>(url: string): Promise<ApiResponse<T> | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null
    return json
  } catch (error) {
    console.error('API fetch error:', error)
    return null
  }
}

interface IntegrationState {
  atrAssessment: ATRAssessment | null
  cflAssessment: CFLAssessment | null
  personaAssessment: PersonaAssessment | null
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
  enableRealtime = false,
  onDataPulled,
  onError
}: UseATRCFLIntegrationOptions) => {
  const [state, setState] = useState<IntegrationState>({
    atrAssessment: null,
    cflAssessment: null,
    personaAssessment: null,
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
  const fetchInFlightRef = useRef(false)
  
  // Fetch ATR assessment
  const fetchATRAssessment = useCallback(async (): Promise<ATRAssessment | null> => {
    try {
      const json = await fetchApiJson<ATRAssessment>(`/api/assessments/atr?clientId=${clientId}`)
      if (!json || !json.success) return null
      return json.data || null
    } catch (error) {
      console.error('ATR fetch error:', error)
      return null
    }
  }, [clientId])
  
  // Fetch CFL assessment
  const fetchCFLAssessment = useCallback(async (): Promise<CFLAssessment | null> => {
    try {
      const json = await fetchApiJson<CFLAssessment>(`/api/assessments/cfl?clientId=${clientId}`)
      if (!json || !json.success) return null
      return json.data || null
    } catch (error) {
      console.error('CFL fetch error:', error)
      return null
    }
  }, [clientId])

  const fetchPersonaAssessment = useCallback(async (): Promise<PersonaAssessment | null> => {
    try {
      const json = await fetchApiJson<PersonaAssessment>(`/api/assessments/persona?clientId=${clientId}`)
      if (!json || !json.success) return null
      return json.data || null
    } catch (error) {
      console.error('Persona fetch error:', error)
      return null
    }
  }, [clientId])

  const fetchVulnerabilityData = useCallback(async () => {
    const json = await fetchApiJson<any>(`/api/assessments/vulnerability?clientId=${clientId}`)
    if (!json || !json.success) return null
    return (json as any).assessment || null
  }, [clientId])
  
  // Main fetch function with retry logic
  const fetchAllData = useCallback(async () => {
    if (fetchInFlightRef.current) return null
    fetchInFlightRef.current = true
    
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const [atr, cfl, persona, vulnerability] = await Promise.all([
        fetchATRAssessment(),
        fetchCFLAssessment(),
        fetchPersonaAssessment(),
        fetchVulnerabilityData()
      ])

      const vulnerabilityFactors = Array.isArray(vulnerability?.vulnerabilityFactors)
        ? vulnerability.vulnerabilityFactors
        : undefined

      const pulledData: PulledPlatformData = {
        atrScore: normalizeAtrLevelToTenScale(atr?.risk_level),
        atrCategory: atr?.risk_category,
        cflScore: cfl?.capacity_level,
        cflCategory: cfl?.capacity_category,
        vulnerabilityScore:
          vulnerability == null ? undefined : vulnerability?.isVulnerable ? 'High' : 'Low',
        vulnerabilityFactors,
        lastAssessmentDates: {
          atr: atr?.assessment_date,
          cfl: cfl?.assessment_date,
          persona: persona?.assessment_date
        }
      }
      
      setState(prev => ({
        ...prev,
        atrAssessment: atr,
        cflAssessment: cfl,
        personaAssessment: persona,
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
    } finally {
      fetchInFlightRef.current = false
    }
  }, [
    fetchATRAssessment, 
    fetchCFLAssessment, 
    fetchPersonaAssessment,
    fetchVulnerabilityData,
    onDataPulled,
    onError
  ])
  
  const atrAssessment = state.atrAssessment
  const cflAssessment = state.cflAssessment

  // Reconcile ATR and CFL scores
  const reconcileRiskProfiles = useCallback(() => {
    if (!atrAssessment || !cflAssessment) {
      return {
        finalRiskLevel: null,
        reconciliationMethod: 'incomplete',
        recommendation: 'Complete both ATR and CFL assessments'
      }
    }
    
    const atrLevel = normalizeAtrLevelToTenScale(atrAssessment.risk_level)
    const cflLevel = cflAssessment.capacity_level
    
    const finalRiskLevel = atrLevel ? Math.min(atrLevel, cflLevel) : null
    
    let reconciliationMethod = 'aligned'
    let recommendation = 'Risk profile well-aligned. Proceed with standard recommendations.'
    
    if (atrLevel && Math.abs(atrLevel - cflLevel) >= 5) {
      reconciliationMethod = 'significant_mismatch'
      recommendation = 'Significant discrepancy detected. Advisor review required.'
    } else if (atrLevel && atrLevel > cflLevel) {
      reconciliationMethod = 'cfl_limited'
      recommendation = 'Risk appetite exceeds capacity. Consider building wealth before aggressive investing.'
    } else if (atrLevel && cflLevel > atrLevel) {
      reconciliationMethod = 'atr_limited'
      recommendation = 'Capacity exceeds risk tolerance. Education may help utilize full capacity.'
    }
    
    return {
      finalRiskLevel,
      reconciliationMethod,
      recommendation,
      atrLevel,
      cflLevel,
      mismatch: atrLevel ? Math.abs(atrLevel - cflLevel) : null
    }
  }, [atrAssessment, cflAssessment])
  
  // Manual refresh function
  const refresh = useCallback(async () => {
    fetchAttemptRef.current = 0
    return await fetchAllData()
  }, [fetchAllData])
  
  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && clientId && !hasInitialFetchRef.current) {
      hasInitialFetchRef.current = true
      fetchAllData()
    }
  }, [clientId, autoFetch, fetchAllData])
  
  // Setup refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0 && clientId) {
      refreshTimerRef.current = setInterval(fetchAllData, refreshInterval)
      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current)
        }
      }
    }
  }, [refreshInterval, clientId, fetchAllData])
  
  return {
    ...state,
    reconcileRiskProfiles,
    refresh,
    isATRComplete: !!state.atrAssessment,
    isCFLComplete: !!state.cflAssessment,
    isPersonaComplete: !!state.personaAssessment,
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
