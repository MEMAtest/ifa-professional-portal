// ================================================================
// FIXED: src/hooks/useAuth.tsx 
// This version works with your existing src/types/auth.ts
// REPLACE YOUR EXISTING FILE WITH THIS
// ================================================================

'use client'
import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { User, AuthState, LoginCredentials, SignUpData } from '@/types/auth'
import type { Session } from '@supabase/supabase-js'
import { log } from '@/lib/logging/structured'

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

function decodeBase64Url(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return atob(padded)
  } catch {
    return null
  }
}

function decodeJwtPayload(token?: string | null): Record<string, any> | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  const decoded = decodeBase64Url(parts[1])
  if (!decoded) return null
  try {
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return null
}

function extractClaimValue(claims: Record<string, any> | null, paths: string[][]): string | null {
  if (!claims) return null
  for (const path of paths) {
    let current: any = claims
    for (const key of path) {
      if (!current || typeof current !== 'object') {
        current = null
        break
      }
      current = current[key]
    }
    const normalized = normalizeOptionalString(current)
    if (normalized) return normalized
  }
  return null
}

function buildUserFromSession(authUser: Session['user'], accessToken?: string | null): User {
  const metadata = authUser.user_metadata || {}
  const jwtClaims = decodeJwtPayload(accessToken)

  const firmId =
    normalizeOptionalString(metadata.firm_id) ??
    normalizeOptionalString(metadata.firmId) ??
    extractClaimValue(jwtClaims, [
      ['firm_id'],
      ['claims', 'firm_id'],
      ['app_metadata', 'firm_id'],
      ['user_metadata', 'firm_id']
    ])
  const normalizedFirmId = firmId === 'default-firm' ? null : firmId

  const role =
    normalizeOptionalString(metadata.role) ??
    extractClaimValue(jwtClaims, [
      ['app_role'],
      ['claims', 'app_role'],
      ['role'],
      ['claims', 'role'],
      ['app_metadata', 'role'],
      ['user_metadata', 'role']
    ]) ??
    'advisor'

  const isPlatformAdmin =
    normalizeOptionalBoolean((metadata as any).is_platform_admin) ??
    normalizeOptionalBoolean(
      extractClaimValue(jwtClaims, [
        ['is_platform_admin'],
        ['claims', 'is_platform_admin'],
        ['app_metadata', 'is_platform_admin'],
        ['user_metadata', 'is_platform_admin']
      ])
    ) ??
    false

  return {
    id: authUser.id,
    email: authUser.email || '',
    role: role as User['role'],
    firmId: normalizedFirmId,
    firstName: metadata.first_name || metadata.firstName || '',
    lastName: metadata.last_name || metadata.lastName || '',
    avatarUrl: metadata.avatar_url || metadata.avatarUrl,
    phone: metadata.phone,
    lastLoginAt: authUser.last_sign_in_at,
    createdAt: authUser.created_at,
    updatedAt: authUser.updated_at || authUser.created_at,
    isPlatformAdmin
  }
}

// ================================================================
// PROVIDER - FIXED TO REMOVE HANGING DATABASE QUERY
// ================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const previousUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const getInitialSession = async () => {
      try {
        log.debug('Getting initial session')
        
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
          log.error('Session error', error)
          setError(`Failed to load session: ${error.message}`)
          setLoading(false)
          return
        }
        
        if (session?.user) {
          log.debug('Session found, creating user profile from metadata')
          setUser(buildUserFromSession(session.user, session.access_token))
          setError(null)
          log.info('Auth initialized successfully (no database query)')
        } else {
          log.info('No session found')
          setUser(null)
          setError(null)
        }
        
      } catch (err) {
        log.error('Auth initialization error', err instanceof Error ? err : undefined)
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
      async (event: string, session: Session | null) => {
        if (!isMounted) return

        log.info('Auth state changed', { event })

        try {
          if (session?.user) {
            const authUser = session.user

            // Clear all cached data when the user changes (account switch)
            if (previousUserIdRef.current && previousUserIdRef.current !== authUser.id) {
              log.info('User changed, clearing query cache')
              queryClient.clear()
            }
            previousUserIdRef.current = authUser.id
            setUser(buildUserFromSession(authUser, session.access_token))
          } else {
            // User signed out — clear all cached data
            if (previousUserIdRef.current) {
              log.info('User signed out, clearing query cache')
              queryClient.clear()
              previousUserIdRef.current = null
            }
            setUser(null)
          }
          setError(null)
        } catch (err) {
          log.error('Auth state change error', err instanceof Error ? err : undefined)
          setError('Authentication error occurred')
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, queryClient])

  // ================================================================
  // AUTH METHODS - SIMPLIFIED
  // ================================================================

  const signIn = async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)
      
      log.debug('Signing in user')

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        log.error('Sign in error', error)
        setError(error.message)
        return { error: error.message }
      }

      log.info('Sign in successful')
      return {}
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in'
      log.error('Sign in error', err instanceof Error ? err : undefined)
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
      
      log.debug('Signing up user')

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: 'advisor',
            firm_name: data.firmName || '',
            fca_number: data.fcaNumber || ''
          }
        }
      })

      if (authError) {
        log.error('Sign up error', authError)
        setError(authError.message)
        return { error: authError.message }
      }

      log.info('Sign up successful')
      return {}
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up'
      log.error('Sign up error', err instanceof Error ? err : undefined)
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      log.debug('Signing out')

      await supabase.auth.signOut()
      queryClient.clear()
      previousUserIdRef.current = null
      setUser(null)
      setError(null)

      log.info('Sign out successful')
    } catch (err) {
      log.error('Sign out error', err instanceof Error ? err : undefined)
      setError('Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) return { error: 'No user logged in' }

      log.debug('Updating user profile')

      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
          avatar_url: updates.avatarUrl,
        }
      })

      if (error) {
        log.error('Profile update error', error)
        return { error: error.message }
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null)
      log.info('Profile updated successfully')
      
      return {}
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      log.error('Profile update error', err instanceof Error ? err : undefined)
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
