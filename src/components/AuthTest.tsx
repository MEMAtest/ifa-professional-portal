// components/AuthTest.tsx
// Add this component temporarily to test authentication

'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function AuthTest() {
  const [authInfo, setAuthInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current user
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          setAuthInfo({ error: error instanceof Error ? error.message : String(error) })
          return
        }

        if (!user) {
          setAuthInfo({ error: 'No user logged in' })
          return
        }

        // Get session
        const { data: { session } } = await supabase.auth.getSession()

        setAuthInfo({
          user: {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
            raw_user_meta_data: user.user_metadata, // They're the same in modern Supabase
          },
          session: session ? 'Active' : 'None',
          firm_id_sources: {
            user_metadata_firm_id: user.user_metadata?.firm_id,
            user_metadata_firmId: user.user_metadata?.firmId,
            raw_user_meta_data: user.user_metadata
          }
        })
      } catch (error) {
        setAuthInfo({ error: error instanceof Error ? error.message : String(error) })
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [supabase])

  const updateUserMetadata = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          firm_id: '12345678-1234-1234-1234-123456789012',
          firmId: '12345678-1234-1234-1234-123456789012' // Add both versions
        }
      })

      if (error) {
        alert(`Error updating metadata: ${error.message}`)
      } else {
        alert('User metadata updated! Refresh the page.')
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (loading) {
    return <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">
      Loading authentication info...
    </div>
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-300 rounded mb-4">
      <h3 className="font-bold text-lg mb-3">🔍 Authentication Debug Info</h3>
      
      {authInfo?.error ? (
        <div className="bg-red-100 border border-red-300 rounded p-3 mb-3">
          <strong>Error:</strong> {authInfo.error}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <strong>User ID:</strong> {authInfo?.user?.id}
          </div>
          <div>
            <strong>Email:</strong> {authInfo?.user?.email}
          </div>
          <div>
            <strong>Session:</strong> {authInfo?.session}
          </div>
          <div>
            <strong>Firm ID (user_metadata.firm_id):</strong> {authInfo?.firm_id_sources?.user_metadata_firm_id || 'NOT SET'}
          </div>
          <div>
            <strong>Firm ID (user_metadata.firmId):</strong> {authInfo?.firm_id_sources?.user_metadata_firmId || 'NOT SET'}
          </div>
          <div className="bg-gray-100 p-2 rounded">
            <strong>Full user_metadata:</strong>
            <pre className="text-xs mt-1 overflow-auto">
              {JSON.stringify(authInfo?.user?.user_metadata, null, 2)}
            </pre>
          </div>
          
          {!authInfo?.firm_id_sources?.user_metadata_firm_id && (
            <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
              <strong>⚠️ Missing firm_id!</strong>
              <p className="text-sm mt-1">
                The user doesn't have a firm_id in their metadata. This will cause authentication errors.
              </p>
              <button 
                onClick={updateUserMetadata}
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Add Test Firm ID
              </button>
            </div>
          )}
          
          {authInfo?.firm_id_sources?.user_metadata_firm_id && (
            <div className="bg-green-100 border border-green-300 rounded p-3">
              <strong>✅ Authentication looks good!</strong>
              <p className="text-sm mt-1">User has firm_id and should be able to access documents.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}