import { createClient } from '@supabase/supabase-js'

// Temporarily use 'any' to bypass type errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)