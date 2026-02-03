// src/lib/supabase.ts
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/db'

const GLOBAL_CLIENT_KEY = '__ifaPlatformSupabaseClient'

// Environment variables - MUST be set, no fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('❌ NEXT_PUBLIC_SUPABASE_URL environment variable is required')
}
if (!supabaseAnonKey) {
  throw new Error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required')
}

// ================================================================
// Unified Client Creation
// ================================================================

function getOrCreateBrowserClient(options?: Parameters<typeof createBrowserClient<Database>>[2]) {
  // In SSR/Node contexts, avoid sharing a singleton across requests.
  if (typeof window === 'undefined') {
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, options)
  }

  const existing = (globalThis as Record<string, any>)[GLOBAL_CLIENT_KEY]
  if (existing) return existing

  const client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, options)
  ;(globalThis as Record<string, any>)[GLOBAL_CLIENT_KEY] = client
  return client
}

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
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
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
  return getOrCreateBrowserClient()
}

// ================================================================
// Legacy Global Client (for non-App Router files or quick fixes)
// Use sparingly and phase out where possible.
// ================================================================
export const supabase = getOrCreateBrowserClient({
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
})

// Create admin client for server-side operations (requires service role key)
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
  : null

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
