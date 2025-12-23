import type { SupabaseClient } from '@supabase/supabase-js'

type StorageSessionShape =
  | {
      access_token?: string
      currentSession?: { access_token?: string }
      data?: { session?: { access_token?: string } }
    }
  | null

function safeParseJson(value: string): StorageSessionShape {
  try {
    return JSON.parse(value) as StorageSessionShape
  } catch {
    return null
  }
}

function extractAccessToken(maybeSession: StorageSessionShape): string | undefined {
  if (!maybeSession) return undefined
  const direct = (maybeSession as any).access_token as string | undefined
  if (direct) return direct
  const nested = (maybeSession as any).currentSession?.access_token as string | undefined
  if (nested) return nested
  const deep = (maybeSession as any).data?.session?.access_token as string | undefined
  if (deep) return deep
  return undefined
}

function getSupabaseProjectRefFromEnv(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return undefined
  try {
    const hostname = new URL(url).hostname
    const ref = hostname.split('.')[0]
    return ref || undefined
  } catch {
    return undefined
  }
}

function getAccessTokenFromBrowserStorage(): string | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    const ref = getSupabaseProjectRefFromEnv()
    const primaryKey = ref ? `sb-${ref}-auth-token` : null

    if (primaryKey) {
      const stored = window.localStorage.getItem(primaryKey)
      const parsed = stored ? safeParseJson(stored) : null
      const token = extractAccessToken(parsed)
      if (token) return token
    }

    // Fallback: scan for any Supabase auth-token keys (handles multiple projects / legacy keys).
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (!key) continue
      if (!key.includes('auth-token')) continue
      if (!key.startsWith('sb-')) continue

      const stored = window.localStorage.getItem(key)
      if (!stored) continue
      const token = extractAccessToken(safeParseJson(stored))
      if (token) return token
    }
  } catch {
    // Storage access can throw in hardened browser contexts.
  }

  return undefined
}

export async function getSupabaseAccessToken(supabase: SupabaseClient): Promise<string | undefined> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (accessToken) return accessToken

    const { data: refreshed } = await supabase.auth.refreshSession()
    const refreshedToken = refreshed.session?.access_token
    if (refreshedToken) return refreshedToken
  } catch {
    // ignore
  }

  return getAccessTokenFromBrowserStorage()
}

export async function getSupabaseAuthHeaders(supabase: SupabaseClient): Promise<HeadersInit | undefined> {
  const token = await getSupabaseAccessToken(supabase)
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

