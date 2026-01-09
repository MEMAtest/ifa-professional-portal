import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

/**
 * Creates a Supabase client with service role privileges.
 * This client bypasses RLS and should only be used for admin operations.
 *
 * SECURITY: Never fallback to anon key - service operations require full privileges.
 * If service role key is missing, it indicates a configuration error.
 */
export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  // SECURITY: Never fallback to anon key for service operations
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'Service operations require admin privileges and cannot use the anonymous key.'
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

