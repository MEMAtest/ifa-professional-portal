'use client'

import React from 'react'
import type { WorkflowStage } from './types'

interface StatusPipelineProps {
  stages: WorkflowStage[]
  currentStage: string
}

export default function StatusPipeline({ stages, currentStage }: StatusPipelineProps) {
  const currentIndex = stages.findIndex((stage) => stage.id === currentStage)

  return (
    <div className="flex flex-wrap items-center gap-3">
      {stages.map((stage, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        return (
          <div key={stage.id} className="flex items-center gap-2">
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                isCompleted
                  ? 'border-green-500 bg-green-500'
                  : isCurrent
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {isCurrent && <span className="h-2 w-2 rounded-full bg-white" />}
            </div>
            <span
              className={`text-xs ${
                isCompleted ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-500'
              }`}
            >
              {stage.label}
            </span>
            {index < stages.length - 1 && (
              <span className="mx-1 h-px w-6 bg-gray-200" />
            )}
          </div>
        )
      })}
    </div>
  )
}
