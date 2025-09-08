// =====================================================
// FILE: src/hooks/suitability/useSuitabilityProgress.ts
// =====================================================

import { useState, useCallback, useEffect } from 'react'
import { SuitabilityFormData, SuitabilitySection } from '@/types/suitability'
import { AssessmentService } from '@/services/AssessmentService'

interface UseSuitabilityProgressOptions {
  clientId?: string
  formData: SuitabilityFormData
  sections: SuitabilitySection[]
}

interface SectionProgress {
  [sectionId: string]: {
    completed: number
    total: number
    percentage: number
  }
}

export const useSuitabilityProgress = ({
  clientId,
  formData,
  sections
}: UseSuitabilityProgressOptions) => {
  const [overallProgress, setOverallProgress] = useState(0)
  const [sectionProgress, setSectionProgress] = useState<SectionProgress>({})
  const [isTracking, setIsTracking] = useState(false)
  
  const calculateSectionProgress = useCallback((section: SuitabilitySection) => {
    const sectionData = formData[section.id as keyof SuitabilityFormData] || {}
    let totalRequired = 0
    let completedRequired = 0
    
    section.fields.forEach(field => {
      if (field.required) {
        totalRequired++
        if ((sectionData as any)[field.id]) {
          completedRequired++
        }
      }
    })
    
    section.conditionalFields?.forEach(group => {
      if (group.condition(formData, {})) {
        group.fields.forEach(field => {
          if (field.required) {
            totalRequired++
            if ((sectionData as any)[field.id]) {
              completedRequired++
            }
          }
        })
      }
    })
    
    return {
      completed: completedRequired,
      total: totalRequired,
      percentage: totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0
    }
  }, [formData])
  
  const calculateOverallProgress = useCallback(() => {
    const progress: SectionProgress = {}
    let totalSections = 0
    let completedSections = 0
    
    sections.forEach(section => {
      const sectionData = calculateSectionProgress(section)
      progress[section.id] = sectionData
      
      totalSections++
      if (sectionData.percentage === 100) {
        completedSections++
      }
    })
    
    setSectionProgress(progress)
    const overall = Math.round((completedSections / totalSections) * 100)
    setOverallProgress(overall)
    
    return overall
  }, [sections, calculateSectionProgress])
  
  const trackProgress = useCallback(async () => {
    if (!clientId || isTracking) return
    
    setIsTracking(true)
    try {
      const progress = calculateOverallProgress()
      
      await AssessmentService.updateProgress(clientId, {
        assessmentType: 'suitability',
        status: progress === 100 ? 'completed' : 'in_progress',
        progressPercentage: progress,
        metadata: {
          lastUpdated: new Date().toISOString(),
          sectionProgress
        }
      })
    } catch (error) {
      console.error('Failed to track progress:', error)
    } finally {
      setIsTracking(false)
    }
  }, [clientId, calculateOverallProgress, sectionProgress])
  
  useEffect(() => {
    calculateOverallProgress()
  }, [formData, calculateOverallProgress])
  
  return {
    overallProgress,
    sectionProgress,
    trackProgress,
    isTracking
  }
}
