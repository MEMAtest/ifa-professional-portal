// src/lib/supabase.ts
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

// Environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://maandodhonjolrmcxivo.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Log warnings if environment variables are missing
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL not set, using default')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing!')
}

// ================================================================
// Unified Client Creation
// ================================================================

/**
 * Creates a Supabase client for use in Server Components or Server Actions.
 * This is the PRIMARY client you should use for data fetching and mutations.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase client for use in Client Components.
 * Use this for things like real-time subscriptions or client-side mutations.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}

// ================================================================
// Legacy Global Client (for non-App Router files or quick fixes)
// Use sparingly and phase out where possible.
// ================================================================
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'ifa-platform'
      }
    }
  }
)

// Create admin client for server-side operations (if service role key is available)
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createBrowserClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    )
  : supabase

// ================================================================
// Type exports for use in other files
// ================================================================

export type { Database }

// Helper types for table rows
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update']

// ================================================================
// Auth helpers (using the legacy global client for now)
// ================================================================

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

// ================================================================
// Case transformation utilities (for snake_case <-> camelCase)
// ================================================================

/**
 * Convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Convert snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Transform object keys from camelCase to snake_case (for database)
 */
export function transformToSnakeCase<T = any>(obj: T): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (obj instanceof Date) return obj
  if (Array.isArray(obj)) {
    return obj.map(item => transformToSnakeCase(item))
  }
  
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key)
    result[snakeKey] = transformToSnakeCase(value)
  }
  return result
}

/**
 * Transform object keys from snake_case to camelCase (from database)
 */
export function transformToCamelCase<T = any>(obj: T): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (obj instanceof Date) return obj
  if (Array.isArray(obj)) {
    return obj.map(item => transformToCamelCase(item))
  }
  
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key)
    result[camelKey] = transformToCamelCase(value)
  }
  return result
}

// Default export for convenience
export default supabase