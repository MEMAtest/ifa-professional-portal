import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/db'

const GLOBAL_CLIENT_KEY = '__ifaPlatformSupabaseClient'

let cachedClient: any = null

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
  }

  const clientOptions = {
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
  } as const

  // On the server, avoid sharing a singleton across requests.
  if (typeof window === 'undefined') {
    return createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      clientOptions
    )
  }

  // Use a window/global singleton to survive Fast Refresh and prevent
  // multiple GoTrueClient instances in the same browser context.
  const globalClient = (globalThis as any)[GLOBAL_CLIENT_KEY]
  if (globalClient) {
    cachedClient = globalClient
    return globalClient
  }

  if (cachedClient) return cachedClient

  cachedClient = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    clientOptions
  )
  ;(globalThis as any)[GLOBAL_CLIENT_KEY] = cachedClient
  return cachedClient
}
