// src/components/forms/ProgressBar.tsx
'use client'
import { cn } from '@/utils/styles'

interface ProgressBarProps {
  current: number
  total: number
  className?: string
}

export const ProgressBar = ({ current, total, className }: ProgressBarProps) => {
  const percentage = Math.round((current / total) * 100)
  
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
        <span>Step {current} of {total}</span>
        <span>{percentage}% Complete</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}