'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import clientLogger from '@/lib/logging/clientLogger'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function TasksError({ error, reset }: ErrorProps) {
  useEffect(() => {
    clientLogger.error('[Task Hub] Rendering error:', error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <AlertTriangle className="h-10 w-10 text-red-500" />
      <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
      <p className="max-w-md text-center text-sm text-gray-600">
        The Task Hub encountered an unexpected error. Please try refreshing.
      </p>
      <Button onClick={reset}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>
  )
}
