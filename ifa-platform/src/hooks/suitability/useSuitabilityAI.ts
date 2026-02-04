// =====================================================
// FILE: src/hooks/suitability/useSuitabilityAI.ts
// FIXED VERSION WITH PROPER TYPE HANDLING
// =====================================================

import { useState, useCallback } from 'react'
import { 
  SuitabilityFormData, 
  PulledPlatformData, 
  AISuggestion 
} from '@/types/suitability'
import { aiAssistantService } from '@/services/aiAssistantService'
import clientLogger from '@/lib/logging/clientLogger'

interface UseSuitabilityAIOptions {
  clientId?: string
  formData: SuitabilityFormData
  onDataPulled?: (data: PulledPlatformData) => void
}

export const useSuitabilityAI = ({
  clientId,
  formData,
  onDataPulled
}: UseSuitabilityAIOptions) => {
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AISuggestion>>({})
  const [isLoadingAI, setIsLoadingAI] = useState<Record<string, boolean>>({})
  const [isPullingData, setIsPullingData] = useState(false)
  
  const pullPlatformData = useCallback(async () => {
    if (!clientId || isPullingData) return
    
    setIsPullingData(true)
    try {
      const data = await aiAssistantService.pullPlatformData(clientId)
      if (onDataPulled) {
        onDataPulled(data)
      }
      return data
    } catch (error) {
      clientLogger.error('Error pulling platform data:', error)
      throw error
    } finally {
      setIsPullingData(false)
    }
  }, [clientId, isPullingData, onDataPulled])
  
  const getAISuggestion = useCallback(async (sectionId: string) => {
    if (!clientId) return
    
    setIsLoadingAI(prev => ({ ...prev, [sectionId]: true }))
    
    try {
      // Convert SuitabilityFormData to the format expected by aiAssistantService
      const formDataForAI = {
        [sectionId]: formData[sectionId as keyof SuitabilityFormData] || {}
      }
      
      const suggestion = await aiAssistantService.generateSuggestion(
        sectionId,
        formDataForAI as any, // Type assertion for compatibility
        {}
      )
      
      // Ensure the suggestion has a timestamp
      const aiSuggestion: AISuggestion = {
        insights: suggestion.insights || [],
        warnings: suggestion.warnings,
        fieldSuggestions: suggestion.fieldSuggestions,
        confidence: suggestion.confidence || 0,
        sources: suggestion.sources || [],
        timestamp: new Date().toISOString()
      }
      
      setAiSuggestions(prev => ({ ...prev, [sectionId]: aiSuggestion }))
      return aiSuggestion
    } catch (error) {
      clientLogger.error('AI suggestion error:', error)
      throw error
    } finally {
      setIsLoadingAI(prev => ({ ...prev, [sectionId]: false }))
    }
  }, [clientId, formData])
  
  return {
    aiSuggestions,
    isLoadingAI,
    isPullingData,
    getAISuggestion,
    pullPlatformData
  }
}