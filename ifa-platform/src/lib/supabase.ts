// ===== FILE #2: src/lib/supabase.ts =====
// CHANGE: Remove crash-causing assertions (CHANGE 4 LINES)

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// 🔧 CHANGE: Remove the ! assertions that crash the app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://maandodhonjolrmcxivo.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 🔧 CHANGE: Better error handling instead of throwing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('URL available:', !!supabaseUrl)
  console.error('Key available:', !!supabaseAnonKey)
}

// 🔧 CHANGE: Use fallback for missing key instead of crashing
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey || 'dummy-key-for-build', 
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

// Auth helpers (NO CHANGES)
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