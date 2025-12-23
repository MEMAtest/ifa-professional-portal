export function isSupabaseRealtimeEnabled(): boolean {
  // Default to disabled for stability (especially in browsers/environments where
  // Supabase Realtime websockets are blocked).
  const explicitDisable = process.env.NEXT_PUBLIC_DISABLE_SUPABASE_REALTIME
  if (explicitDisable === 'true') return false

  const explicitEnable = process.env.NEXT_PUBLIC_SUPABASE_REALTIME_ENABLED
  if (explicitEnable !== 'true') return false

  // Extra safety: require an explicit browser toggle so realtime cannot be
  // accidentally enabled by an environment variable alone.
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem('supabaseRealtimeEnabled') === 'true'
  } catch {
    return false
  }
}
