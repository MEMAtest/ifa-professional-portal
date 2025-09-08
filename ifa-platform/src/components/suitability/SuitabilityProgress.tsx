// =====================================================
// FILE: src/components/suitability/SuitabilityProgress.tsx
// FIXED VERSION - REMOVED CONFUSING ELEMENTS
// =====================================================

import React from 'react'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { AlertCircle, Activity, Shield, Heart } from 'lucide-react'
import type { ValidationError, PulledPlatformData } from '@/types/suitability'

interface SuitabilityProgressProps {
  overallProgress: number
  sectionProgress: Record<string, { completed: number; total: number; percentage: number }>
  validationErrors: ValidationError[]
  crossValidationErrors: ValidationError[]
  pulledData: PulledPlatformData
  isTracking: boolean
}

export const SuitabilityProgress: React.FC<SuitabilityProgressProps> = ({
  overallProgress,
  sectionProgress,
  validationErrors,
  crossValidationErrors,
  pulledData,
  isTracking
}) => {
  const totalFields = Object.values(sectionProgress).reduce((sum, s) => sum + s.total, 0)
  const completedFields = Object.values(sectionProgress).reduce((sum, s) => sum + s.completed, 0)
  const totalValidationIssues = validationErrors.length + crossValidationErrors.length
  
  return (
    <div className="space-y-3">
      {/* Main Progress Bar */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-700">Overall Progress</h3>
          <span className="text-2xl font-bold text-blue-600">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-3" />
        <p className="text-sm text-gray-500 mt-2">
          {completedFields} of {totalFields} fields completed
        </p>
      </div>
      
      {/* Validation Issues Alert */}
      {totalValidationIssues > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <span className="text-amber-800 font-medium">
              {totalValidationIssues} validation {totalValidationIssues === 1 ? 'issue' : 'issues'} found
            </span>
            <span className="text-amber-700 text-sm block mt-1">
              Please review and correct before submission
            </span>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Pulled Data Indicators */}
      {pulledData && Object.keys(pulledData).length > 0 && (
        <div className="bg-white rounded-lg border p-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Integrated Data</p>
          <div className="flex gap-2 flex-wrap">
            {pulledData.atrCategory && (
              <Badge variant="outline" className="bg-green-50 border-green-200">
                <Activity className="h-3 w-3 mr-1 text-green-600" />
                <span className="text-green-700">ATR: {pulledData.atrCategory}</span>
              </Badge>
            )}
            {pulledData.cflCategory && (
              <Badge variant="outline" className="bg-blue-50 border-blue-200">
                <Shield className="h-3 w-3 mr-1 text-blue-600" />
                <span className="text-blue-700">CFL: {pulledData.cflCategory}</span>
              </Badge>
            )}
            {pulledData.vulnerabilityScore && (
              <Badge variant="outline" className="bg-orange-50 border-orange-200">
                <Heart className="h-3 w-3 mr-1 text-orange-600" />
                <span className="text-orange-700">Vulnerability: {pulledData.vulnerabilityScore}</span>
              </Badge>
            )}
          </div>
        </div>
      )}
      
      {/* Auto-save Status */}
      {isTracking && (
        <div className="text-sm text-blue-600 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          Saving progress...
        </div>
      )}
    </div>
  )
}

export default SuitabilityProgress