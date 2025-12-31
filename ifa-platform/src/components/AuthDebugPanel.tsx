// src/components/AuthDebugPanel.tsx
// Final fix - corrected auth types to match Supabase's actual types

'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

interface AuthDebugState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  logs: string[]
}

export function AuthDebugPanel() {
  const supabase = useMemo(() => createClient() as any, [])
  const [authState, setAuthState] = useState<AuthDebugState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    logs: []
  })

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setAuthState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-9), `${timestamp}: ${message}`]
    }))
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        addLog('Initializing authentication...')
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          addLog(`Session error: ${error.message}`)
          setAuthState(prev => ({ ...prev, error: error.message, loading: false }))
          return
        }

        if (session) {
          addLog('Active session found')
          setAuthState(prev => ({
            ...prev,
            user: session.user,
            session: session,
            loading: false
          }))
        } else {
          addLog('No active session')
          setAuthState(prev => ({ ...prev, loading: false }))
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        addLog(`Init error: ${errorMessage}`)
        setAuthState(prev => ({ 
          ...prev, 
          error: errorMessage, 
          loading: false 
        }))
      }
    }

    // Set up auth state listener with correct Supabase types
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        addLog(`Auth event: ${event}`)
        setAuthState(prev => ({
          ...prev,
          user: session?.user || null,
          session: session,
          loading: false
        }))
      }
    )

    initAuth()

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase])

  const testConnection = async () => {
    try {
      addLog('Testing Supabase connection...')
      const { data, error } = await supabase.from('clients').select('count', { count: 'exact', head: true })
      
      if (error) {
        addLog(`Connection test failed: ${error.message}`)
      } else {
        addLog(`Connection successful - ${data?.length || 0} clients found`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      addLog(`Connection test exception: ${errorMessage}`)
    }
  }

  const testSignOut = async () => {
    try {
      addLog('Testing sign out...')
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        addLog(`Sign out error: ${error.message}`)
      } else {
        addLog('Sign out successful')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      addLog(`Sign out exception: ${errorMessage}`)
    }
  }

  if (authState.loading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-700">Loading authentication state...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">🔍 Authentication Debug Panel</h3>
      
      {/* Auth Status */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Status:</h4>
        <div className={`p-3 rounded ${authState.user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {authState.user ? '✅ Authenticated' : '❌ Not Authenticated'}
        </div>
      </div>

      {/* User Info */}
      {authState.user && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">User Info:</h4>
          <div className="bg-white p-3 rounded border text-sm">
            <p><strong>ID:</strong> {authState.user.id}</p>
            <p><strong>Email:</strong> {authState.user.email || 'Not provided'}</p>
            <p><strong>Email Confirmed:</strong> {authState.user.email_confirmed_at ? 'Yes' : 'No'}</p>
            <p><strong>Firm ID:</strong> {authState.user.user_metadata?.firm_id || 'Not set'}</p>
            <p><strong>Name:</strong> {authState.user.user_metadata?.full_name || 'Not set'}</p>
            <p><strong>Firm:</strong> {authState.user.user_metadata?.firm_name || 'Not set'}</p>
            <p><strong>Created:</strong> {authState.user.created_at ? new Date(authState.user.created_at).toLocaleDateString() : 'Unknown'}</p>
            <p><strong>Last Sign In:</strong> {authState.user.last_sign_in_at ? new Date(authState.user.last_sign_in_at).toLocaleDateString() : 'Unknown'}</p>
          </div>
        </div>
      )}

      {/* Session Info */}
      {authState.session && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Session Info:</h4>
          <div className="bg-white p-3 rounded border text-sm">
            <p><strong>Access Token:</strong> {authState.session.access_token ? '✅ Present' : '❌ Missing'}</p>
            <p><strong>Refresh Token:</strong> {authState.session.refresh_token ? '✅ Present' : '❌ Missing'}</p>
            <p><strong>Expires At:</strong> {authState.session.expires_at ? new Date(authState.session.expires_at * 1000).toLocaleString() : 'Unknown'}</p>
            <p><strong>Token Type:</strong> {authState.session.token_type || 'Unknown'}</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {authState.error && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Error:</h4>
          <div className="bg-red-100 text-red-800 p-3 rounded">
            {authState.error}
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Test Controls:</h4>
        <div className="space-x-2">
          <button
            onClick={testConnection}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Connection
          </button>
          {authState.user && (
            <button
              onClick={testSignOut}
              className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Test Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Activity Logs */}
      <div>
        <h4 className="font-medium mb-2">Activity Log:</h4>
        <div className="bg-black text-green-400 p-3 rounded text-xs font-mono h-32 overflow-y-auto">
          {authState.logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
