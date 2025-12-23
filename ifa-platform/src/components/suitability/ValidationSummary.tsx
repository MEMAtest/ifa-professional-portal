// =====================================================
// FILE: src/components/suitability/ValidationSummary.tsx
// STANDALONE VALIDATION SUMMARY COMPONENT
// =====================================================

import React, { memo, useMemo } from 'react'
import { AlertCircle, CheckCircle, AlertTriangle, ChevronRight, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { ValidationError, ValidationWarning } from '@/types/suitability'

interface ValidationSummaryProps {
  errors: ValidationError[]
  warnings?: ValidationWarning[]
  compliance?: {
    compliant: boolean
    remediations?: string[]
    fcaChecks?: {
      suitability: boolean
      affordability: boolean
      riskAppropriate: boolean
      consumerDuty: boolean
    }
  }
  onNavigateToError?: (sectionId: string, fieldId: string) => void
  className?: string
  showQuickFix?: boolean
  onQuickFix?: (errorId: string) => void
}

export const ValidationSummary = memo(function ValidationSummary({
  errors = [],
  warnings = [],
  compliance,
  onNavigateToError,
  className,
  showQuickFix = false,
  onQuickFix
}: ValidationSummaryProps) {
  // Group errors by section for better organization
  const errorsBySection = useMemo(() => errors.reduce((acc, error) => {
    if (!acc[error.sectionId]) {
      acc[error.sectionId] = []
    }
    acc[error.sectionId].push(error)
    return acc
  }, {} as Record<string, ValidationError[]>), [errors])

  // Count critical errors
  const criticalErrors = useMemo(() => errors.filter(e => e.severity === 'critical'), [errors])
  const standardErrors = useMemo(() => errors.filter(e => e.severity === 'error'), [errors])

  // FCA compliance status
  const fcaCompliant = compliance?.fcaChecks ? 
    Object.values(compliance.fcaChecks).every(check => check) : 
    compliance?.compliant

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          {errors.length === 0 && warnings.length === 0 ? (
            <>
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span className="text-lg font-semibold text-green-700">All Validations Passed</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-6 w-6 text-red-500" />
              <span className="text-lg font-semibold">Validation Summary</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {criticalErrors.length > 0 && (
            <Badge variant="destructive">
              {criticalErrors.length} Critical
            </Badge>
          )}
          {standardErrors.length > 0 && (
            <Badge variant="outline" className="border-red-300 text-red-700">
              {standardErrors.length} Errors
            </Badge>
          )}
          {warnings.length > 0 && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
              {warnings.length} Warnings
            </Badge>
          )}
        </div>
      </div>

      {/* FCA Compliance Status */}
      {compliance && (
        <Card className={cn(
          "border-2",
          fcaCompliant ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className={cn(
                "h-5 w-5",
                fcaCompliant ? "text-green-600" : "text-orange-600"
              )} />
              FCA Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {compliance.fcaChecks && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {Object.entries(compliance.fcaChecks).map(([check, passed]) => (
                  <div key={check} className="flex items-center gap-2 text-sm">
                    {passed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className={cn(
                      "capitalize",
                      passed ? "text-green-700" : "text-orange-700"
                    )}>
                      {check.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {!fcaCompliant && compliance.remediations && compliance.remediations.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-orange-200">
                <p className="text-sm font-medium text-orange-800">Required Actions:</p>
                {compliance.remediations.map((remediation, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-orange-700">{remediation}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Critical Errors */}
      {criticalErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-800">
              Critical Issues ({criticalErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalErrors.map((error, index) => (
              <ErrorItem
                key={`critical-${index}`}
                error={error}
                onNavigate={onNavigateToError}
                showQuickFix={showQuickFix}
                onQuickFix={onQuickFix}
                variant="critical"
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Standard Errors by Section */}
      {standardErrors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Errors to Resolve ({standardErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(errorsBySection).map(([sectionId, sectionErrors]) => {
              const nonCriticalErrors = sectionErrors.filter(e => e.severity !== 'critical')
              if (nonCriticalErrors.length === 0) return null
              
              return (
                <div key={sectionId} className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 capitalize">
                    {sectionId.replace(/_/g, ' ')}
                  </h4>
                  {nonCriticalErrors.map((error, index) => (
                    <ErrorItem
                      key={`${sectionId}-${index}`}
                      error={error}
                      onNavigate={onNavigateToError}
                      showQuickFix={showQuickFix}
                      onQuickFix={onQuickFix}
                      variant="standard"
                    />
                  ))}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-yellow-800">
              Warnings ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className="p-3 bg-white border border-yellow-200 rounded-md"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800">{warning.message}</p>
                    {warning.type && (
                      <Badge 
                        variant="outline" 
                        className="mt-1 text-xs border-yellow-300 text-yellow-700"
                      >
                        {warning.type}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {errors.length === 0 && warnings.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium text-green-800">
                All validations passed successfully
              </p>
              <p className="text-sm text-green-600 mt-1">
                The assessment meets all requirements and compliance standards
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
})

// Error Item Component
interface ErrorItemProps {
  error: ValidationError
  onNavigate?: (sectionId: string, fieldId: string) => void
  showQuickFix?: boolean
  onQuickFix?: (errorId: string) => void
  variant: 'critical' | 'standard'
}

const ErrorItem = memo(function ErrorItem({
  error,
  onNavigate,
  showQuickFix,
  onQuickFix,
  variant
}: ErrorItemProps) {
  return (
    <div className={cn(
      "p-3 rounded-md border",
      variant === 'critical' 
        ? "bg-red-100 border-red-300" 
        : "bg-red-50 border-red-200"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className={cn(
            "text-sm",
            variant === 'critical' ? "text-red-900 font-medium" : "text-red-800"
          )}>
            {error.message}
          </p>
          {error.code && (
            <p className="text-xs text-red-600 mt-1">
              Code: {error.code}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {showQuickFix && onQuickFix && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onQuickFix(error.fieldId)}
              className="h-7 px-2 text-xs"
            >
              Quick Fix
            </Button>
          )}
          
          {onNavigate && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate(error.sectionId, error.fieldId)}
              className="h-7 px-2 text-xs text-red-600 hover:text-red-800"
            >
              Go to field →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

export default ValidationSummary