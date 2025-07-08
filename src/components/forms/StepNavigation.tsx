// src/components/forms/StepNavigation.tsx
'use client'
import { cn } from '@/utils/styles'
import { CheckCircle, Circle, AlertCircle } from 'lucide-react'
import { AssessmentStep } from '@/types'

interface StepNavigationProps {
  steps: AssessmentStep[]
  currentStep: number
  onStepClick: (stepIndex: number) => void
  className?: string
}

export const StepNavigation = ({ 
  steps, 
  currentStep, 
  onStepClick, 
  className 
}: StepNavigationProps) => {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg p-4', className)}>
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => {
          const isCurrent = index === currentStep
          const isCompleted = step.completed
          const hasErrors = step.validationErrors.length > 0
          
          return (
            <button
              key={step.id}
              onClick={() => onStepClick(index)}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isCurrent && 'bg-blue-100 text-blue-800 border border-blue-200',
                !isCurrent && isCompleted && 'bg-green-50 text-green-800 hover:bg-green-100',
                !isCurrent && !isCompleted && 'bg-gray-50 text-gray-600 hover:bg-gray-100',
                hasErrors && 'bg-red-50 text-red-800 border border-red-200'
              )}
            >
              <div className="flex-shrink-0">
                {hasErrors ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span className="hidden sm:inline">{step.title}</span>
              <span className="sm:hidden">{index + 1}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}