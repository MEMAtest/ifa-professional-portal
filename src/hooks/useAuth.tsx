// File: src/hooks/useAuth.ts
'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '@/lib/supabase'
import { User, AuthState, LoginCredentials, SignUpData } from '@/types/auth'
import type { Session } from '@supabase/supabase-js'

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        }
      } catch (err) {
        console.error('Error getting initial session:', err)
        setError('Failed to load session')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            await fetchUserProfile(session.user.id)
          } else {
            setUser(null)
          }
        } catch (err) {
          console.error('Auth state change error:', err)
          setError('Authentication error')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string): Promise<void> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          firms (*)
        `)
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Profile fetch error:', error)
        // If no profile exists, user needs to complete setup
        setUser(null)
        return
      }

      if (profile) {
        setUser({
          id: profile.id,
          email: profile.email || '',
          role: profile.role,
          firmId: profile.firm_id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          avatarUrl: profile.avatar_url,
          phone: profile.phone,
          lastLoginAt: profile.last_login_at,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        })

        // Update last login
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', userId)
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError('Failed to load profile')
    }
  }

  const signIn = async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        setError(error.message)
        return { error: error.message }
      }

      return {}
    } catch (err) {
      const errorMessage = 'Failed to sign in'
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

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError(authError.message)
        return { error: authError.message }
      }

      if (authData.user) {
        // Create or find firm
        let firmId = '00000000-0000-0000-0000-000000000001' // Default firm
        
        if (data.firmName) {
          const { data: firm, error: firmError } = await supabase
            .from('firms')
            .insert({
              name: data.firmName,
              fca_number: data.fcaNumber,
            })
            .select()
            .single()

          if (!firmError && firm) {
            firmId = firm.id
          }
        }

        // Create user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            first_name: data.firstName,
            last_name: data.lastName,
            role: 'advisor', // Default role
            firm_id: firmId,
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          return { error: 'Failed to create profile' }
        }
      }

      return {}
    } catch (err) {
      const errorMessage = 'Failed to sign up'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) return { error: 'No user logged in' }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
          avatar_url: updates.avatarUrl,
        })
        .eq('id', user.id)

      if (error) {
        return { error: error.message }
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null)
      return {}
    } catch (err) {
      return { error: 'Failed to update profile' }
    }
  }

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