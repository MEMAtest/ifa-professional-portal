// ================================================================
// IMPROVED: src/app/page.tsx
// Enhanced version of your current file with error handling
// REPLACE YOUR EXISTING FILE WITH THIS
// ================================================================

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function HomePage() {
  const router = useRouter()
  const { user, loading, error } = useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const [timeoutReached, setTimeoutReached] = useState(false)
  const [countdown, setCountdown] = useState(10)

  // ================================================================
  // TIMEOUT PROTECTION - Prevents infinite hanging
  // ================================================================

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !user) {
        console.warn('⚠️ Auth loading timeout reached after 10 seconds')
        setTimeoutReached(true)
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [loading, user])

  // Countdown timer for timeout state
  useEffect(() => {
    if (timeoutReached && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeoutReached && countdown === 0) {
      // Auto-redirect after countdown
      window.location.href = '/login'
    }
  }, [timeoutReached, countdown])

  // ================================================================
  // NAVIGATION LOGIC - Enhanced version of your original
  // ================================================================

  useEffect(() => {
    console.log('📍 HomePage - Auth state:', { 
      user: !!user, 
      loading, 
      error: !!error,
      redirecting 
    })

    // Only redirect when not loading and we have a clear auth state
    if (!loading && !redirecting && !timeoutReached) {
      setRedirecting(true)
      
      if (error) {
        console.error('❌ Auth error detected, redirecting to login:', error)
        router.push('/login')
      } else if (user) {
        console.log('✅ User authenticated, redirecting to dashboard')
        router.push('/dashboard')
      } else {
        console.log('ℹ️ No user found, redirecting to login')
        router.push('/login')
      }
    }
  }, [user, loading, error, router, redirecting, timeoutReached])

  // ================================================================
  // ERROR STATE - Show error instead of hanging
  // ================================================================

  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-red-500 text-xl mb-4">⚠️ Authentication Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={() => {
                setRedirecting(false)
                setTimeoutReached(false)
                window.location.href = '/login'
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // TIMEOUT STATE - Show timeout options instead of hanging forever
  // ================================================================

  if (timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-yellow-500 text-xl mb-4">⏱️ Loading Timeout</div>
          <p className="text-gray-600 mb-4">
            Authentication is taking longer than expected. This might be a temporary issue.
          </p>
          
          {countdown > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-sm text-yellow-700">
                Auto-redirecting to login in {countdown} seconds...
              </p>
              <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${(countdown / 10) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button 
              onClick={() => {
                setTimeoutReached(false)
                setCountdown(10)
                window.location.reload()
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => {
                setTimeoutReached(false)
                setCountdown(10)
                window.location.href = '/login'
              }}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Go to Login Now
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <details className="text-left">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                Debug Information
              </summary>
              <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div>Loading: {loading.toString()}</div>
                <div>User: {user ? 'Present' : 'None'}</div>
                <div>Error: {error || 'None'}</div>
                <div>Redirecting: {redirecting.toString()}</div>
                <div>Timestamp: {new Date().toLocaleTimeString()}</div>
              </div>
            </details>
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // LOADING STATE - Enhanced version of your original spinner
  // ================================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {/* Loading Spinner - keeping your original style */}
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
        
        {/* Enhanced Loading Text */}
        <div className="space-y-2">
          <p className="text-gray-600 font-medium">
            {loading ? 'Checking authentication...' : 'Redirecting...'}
          </p>
          <div className="text-sm text-gray-400">
            {loading 
              ? 'Please wait while we verify your session' 
              : 'Taking you to the right place'
            }
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 w-64 mx-auto">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Initializing</span>
            <span>Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className={`bg-blue-600 h-1 rounded-full transition-all duration-1000 ${
                loading ? 'w-1/3' : 'w-full'
              }`}
            />
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-xs text-gray-400">
          <p>If this takes longer than 10 seconds, you&apos;ll see timeout options</p>
        </div>
      </div>
    </div>
  )
}
