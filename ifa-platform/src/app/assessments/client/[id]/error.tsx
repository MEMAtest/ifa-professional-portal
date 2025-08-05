// File: /app/assessments/client/[id]/error.tsx
// Error boundary for Assessment Client Hub

'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  ArrowLeft,
  FileQuestion,
  WifiOff,
  ShieldAlert,
  Bug
} from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string; statusCode?: number }
  reset: () => void
}

export default function AssessmentClientError({
  error,
  reset,
}: ErrorProps) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Assessment Client Hub Error:', error)
  }, [error])

  // Determine error type and provide appropriate messaging
  const getErrorInfo = () => {
    const errorMessage = error.message?.toLowerCase() || ''
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        icon: WifiOff,
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection and try again.',
        showRetry: true
      }
    }
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return {
        icon: FileQuestion,
        title: 'Client Not Found',
        description: 'The client you\'re looking for doesn\'t exist or you don\'t have permission to view it.',
        showRetry: false
      }
    }
    
    if (errorMessage.includes('unauthorized') || errorMessage.includes('401') || errorMessage.includes('403')) {
      return {
        icon: ShieldAlert,
        title: 'Access Denied',
        description: 'You don\'t have permission to access this client\'s assessments. Please contact your administrator.',
        showRetry: false
      }
    }
    
    if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
      return {
        icon: AlertTriangle,
        title: 'Invalid Data',
        description: 'There was a problem with the client data. Please try again or contact support.',
        showRetry: true
      }
    }
    
    // Default error
    return {
      icon: Bug,
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred while loading the assessment hub. Our team has been notified.',
      showRetry: true
    }
  }

  const errorInfo = getErrorInfo()
  const ErrorIcon = errorInfo.icon

  const handleBackToDashboard = () => {
    router.push('/assessments')
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Error Header */}
          <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
                <ErrorIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center">{errorInfo.title}</h1>
          </div>

          {/* Error Content */}
          <div className="p-6">
            <p className="text-gray-600 text-center mb-6">
              {errorInfo.description}
            </p>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-mono text-gray-500 mb-1">Error Details:</p>
                <p className="text-xs font-mono text-red-600 break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs font-mono text-gray-400 mt-2">
                    Digest: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {errorInfo.showRetry && (
                <button
                  onClick={reset}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <RefreshCw className="h-5 w-5" />
                  <span>Try Again</span>
                </button>
              )}

              <button
                onClick={handleBackToDashboard}
                className="w-full px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Assessments</span>
              </button>

              <button
                onClick={handleGoHome}
                className="w-full px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
              >
                <Home className="h-5 w-5" />
                <span>Go to Home</span>
              </button>
            </div>

            {/* Support Information */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                If this problem persists, please contact support at{' '}
                <a 
                  href="mailto:support@example.com" 
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  support@example.com
                </a>
              </p>
              {error.digest && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  Reference ID: {error.digest}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Common solutions:
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Check your internet connection</li>
            <li>• Clear your browser cache</li>
            <li>• Try using a different browser</li>
            <li>• Ensure you have the correct permissions</li>
          </ul>
        </div>
      </div>
    </div>
  )
}