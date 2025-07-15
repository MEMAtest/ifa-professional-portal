// ================================================================
// FIXED: src/hooks/useAuth.tsx 
// This version works with your existing src/types/auth.ts
// REPLACE YOUR EXISTING FILE WITH THIS
// ================================================================

'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '@/lib/supabase'
import { User, AuthState, LoginCredentials, SignUpData } from '@/types/auth'
import type { Session } from '@supabase/supabase-js'

// ================================================================
// CONTEXT SETUP
// ================================================================

const AuthContext = createContext<AuthState & {
  signIn: (credentials: LoginCredentials) => Promise<{ error?: string }>
  signUp: (data: SignUpData) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<{ error?: string }>
}>({
  user: null,
  loading: true,
  error: null,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  updateProfile: async () => ({})
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// ================================================================
// PROVIDER - FIXED TO REMOVE HANGING DATABASE QUERY
// ================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...')
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth session timeout')), 15000)
        })
        
        const sessionPromise = supabase.auth.getSession()
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any
        
        if (!isMounted) return
        
        if (error) {
          console.error('❌ Session error:', error)
          setError(`Failed to load session: ${error.message}`)
          setLoading(false)
          return
        }
        
        if (session?.user) {
          console.log('✅ Session found, creating user profile from metadata...')
          
          // ================================================================
          // 🔧 CRITICAL FIX: Create user WITHOUT database query
          // Use only Supabase Auth metadata - no profile table query
          // ================================================================
          
          const authUser = session.user
          const metadata = authUser.user_metadata || {}
          
          const simpleUser: User = {
            id: authUser.id,
            email: authUser.email || '',
            role: (metadata.role as User['role']) || 'advisor',
            firmId: metadata.firm_id || metadata.firmId || 'default-firm',
            firstName: metadata.first_name || metadata.firstName || '',
            lastName: metadata.last_name || metadata.lastName || '',
            avatarUrl: metadata.avatar_url || metadata.avatarUrl,
            phone: metadata.phone,
            lastLoginAt: authUser.last_sign_in_at,
            createdAt: authUser.created_at,
            updatedAt: authUser.updated_at || authUser.created_at
          }
          
          setUser(simpleUser)
          setError(null)
          console.log('✅ Auth initialized successfully (no database query)')
        } else {
          console.log('ℹ️ No session found')
          setUser(null)
          setError(null)
        }
        
      } catch (err) {
        console.error('❌ Auth initialization error:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize authentication')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // ================================================================
    // AUTH STATE LISTENER - ALSO FIXED
    // ================================================================

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        console.log('🔄 Auth state changed:', event)
        
        try {
          if (session?.user) {
            const authUser = session.user
            const metadata = authUser.user_metadata || {}
            
            const simpleUser: User = {
              id: authUser.id,
              email: authUser.email || '',
              role: (metadata.role as User['role']) || 'advisor',
              firmId: metadata.firm_id || metadata.firmId || 'default-firm',
              firstName: metadata.first_name || metadata.firstName || '',
              lastName: metadata.last_name || metadata.lastName || '',
              avatarUrl: metadata.avatar_url || metadata.avatarUrl,
              phone: metadata.phone,
              lastLoginAt: authUser.last_sign_in_at,
              createdAt: authUser.created_at,
              updatedAt: authUser.updated_at || authUser.created_at
            }
            
            setUser(simpleUser)
          } else {
            setUser(null)
          }
          setError(null)
        } catch (err) {
          console.error('❌ Auth state change error:', err)
          setError('Authentication error occurred')
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ================================================================
  // AUTH METHODS - SIMPLIFIED
  // ================================================================

  const signIn = async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔐 Signing in user...')

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        console.error('❌ Sign in error:', error)
        setError(error.message)
        return { error: error.message }
      }

      console.log('✅ Sign in successful')
      return {}
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in'
      console.error('❌ Sign in error:', err)
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (data: SignUpData) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📝 Signing up user...')

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            firm_id: 'default-firm',
            role: 'advisor',
            firm_name: data.firmName || '',
            fca_number: data.fcaNumber || ''
          }
        }
      })

      if (authError) {
        console.error('❌ Sign up error:', authError)
        setError(authError.message)
        return { error: authError.message }
      }

      console.log('✅ Sign up successful')
      return {}
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up'
      console.error('❌ Sign up error:', err)
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      console.log('🚪 Signing out...')
      
      await supabase.auth.signOut()
      setUser(null)
      setError(null)
      
      console.log('✅ Sign out successful')
    } catch (err) {
      console.error('❌ Sign out error:', err)
      setError('Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) return { error: 'No user logged in' }

      console.log('📝 Updating user profile...')

      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
          avatar_url: updates.avatarUrl,
        }
      })

      if (error) {
        console.error('❌ Profile update error:', error)
        return { error: error.message }
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null)
      console.log('✅ Profile updated successfully')
      
      return {}
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      console.error('❌ Profile update error:', err)
      return { error: errorMessage }
    }
  }

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}