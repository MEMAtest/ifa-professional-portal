// ================================================================
// API Authentication Helper
// Provides consistent auth checking across all API routes
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

// ================================================================
// TYPES
// ================================================================

export interface AuthContext {
  user: User
  userId: string
  email: string | undefined
  role: string | null
  firmId: string | null
  advisorId: string | null
}

export interface AuthResult {
  success: boolean
  context?: AuthContext
  error?: string
  response?: NextResponse
}

export interface AuthOptions {
  requireAuth?: boolean
  requireRole?: string[]
  allowPublic?: boolean
}

// ================================================================
// AUTH HELPER FUNCTIONS
// ================================================================

function getDefaultFirmId(): string | null {
  const envDefaultFirmId = process.env.DEFAULT_FIRM_ID ?? process.env.NEXT_PUBLIC_DEFAULT_FIRM_ID
  return typeof envDefaultFirmId === 'string' && envDefaultFirmId.trim() ? envDefaultFirmId.trim() : null
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeFirmId(value: unknown): string | null {
  const trimmed = normalizeOptionalString(value)
  if (!trimmed) return null
  // Avoid legacy placeholder values leaking into firm-scoped queries.
  if (trimmed === 'default-firm') return null
  return trimmed
}

function decodeBase64Url(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)

    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf8')
    }

    if (typeof (globalThis as any).atob === 'function') {
      return (globalThis as any).atob(padded)
    }
  } catch {
    // ignore
  }
  return null
}

function extractAccessTokenFromSessionPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as any

  const direct = normalizeOptionalString(obj.access_token)
  if (direct) return direct

  const current = normalizeOptionalString(obj.currentSession?.access_token)
  if (current) return current

  const nested = normalizeOptionalString(obj.data?.session?.access_token)
  if (nested) return nested

  return null
}

function getSupabaseProjectRefFromEnv(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    const hostname = new URL(url).hostname
    const ref = hostname.split('.')[0]
    return ref ? ref : null
  } catch {
    return null
  }
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {}
  const result: Record<string, string> = {}
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split('=')
    const name = rawName?.trim()
    if (!name) continue
    const value = rest.join('=')
    result[name] = value
  }
  return result
}

function readChunkedCookie(cookies: Record<string, string>, key: string): string | null {
  if (cookies[key]) return cookies[key]

  const chunks: Array<{ idx: number; value: string }> = []
  for (const [name, value] of Object.entries(cookies)) {
    if (!name.startsWith(`${key}.`)) continue
    const suffix = name.slice(key.length + 1)
    const idx = Number.parseInt(suffix, 10)
    if (Number.isNaN(idx)) continue
    chunks.push({ idx, value })
  }

  if (chunks.length === 0) return null
  chunks.sort((a, b) => a.idx - b.idx)
  return chunks.map((c) => c.value).join('')
}

function extractAccessTokenFromSupabaseCookie(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = parseCookieHeader(cookieHeader)
  const ref = getSupabaseProjectRefFromEnv()
  const primaryKey = ref ? `sb-${ref}-auth-token` : null

  const candidateKeys: string[] = []
  if (primaryKey) candidateKeys.push(primaryKey)
  for (const name of Object.keys(cookies)) {
    if (!name.startsWith('sb-')) continue
    if (!name.includes('auth-token')) continue
    // Use the base key (without .0/.1...) so we can reassemble chunks.
    const base = name.split('.')[0]
    if (!candidateKeys.includes(base)) candidateKeys.push(base)
  }

  for (const key of candidateKeys) {
    const raw = readChunkedCookie(cookies, key)
    if (!raw) continue

    // supabase/ssr prefixes base64url-encoded cookie values with "base64-".
    const decodedValue = raw.startsWith('base64-') ? decodeBase64Url(raw.slice('base64-'.length)) : raw
    if (!decodedValue) continue

    const parsed = (() => {
      try {
        return JSON.parse(decodedValue) as unknown
      } catch {
        return null
      }
    })()
    const token = extractAccessTokenFromSessionPayload(parsed)
    if (token) return token
  }

  return null
}

/**
 * Get authenticated user context for API routes
 * Returns user info and related context (firm, advisor, etc.)
 */
export async function getAuthContext(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null
    const cookieAccessToken = extractAccessTokenFromSupabaseCookie(request)

    // Prefer cookie-based auth (best for SSR), but allow a Bearer token fallback
    // to support clients that store sessions outside cookies.
    let supabase: any = await createClient()
    let user: User | null = null
    let authError: any = null

    const cookieResult = await supabase.auth.getUser()
    user = cookieResult.data.user
    authError = cookieResult.error

    const tokenCandidates = [bearerToken, cookieAccessToken].filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    )

    if ((!user || authError) && tokenCandidates.length > 0) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !anonKey) {
        return {
          success: false,
          error: 'Authentication failed',
          response: NextResponse.json(
            { error: 'Authentication error', message: 'Supabase credentials are not configured' },
            { status: 500 }
          )
        }
      }

      for (const token of tokenCandidates) {
        const tokenClient = createSupabaseJsClient(url, anonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        })

        const tokenResult = await tokenClient.auth.getUser(token)
        user = tokenResult.data.user
        authError = tokenResult.error

        // Repoint supabase client to one that will include the token for DB reads.
        if (user) {
          supabase = tokenClient
          break
        }
      }
    }

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized - Please log in',
        response: NextResponse.json(
          { error: 'Unauthorized', message: 'Please log in to access this resource' },
          { status: 401 }
        )
      }
    }

    // Get user profile with role and firm info
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role, firm_id, advisor_id')
      .eq('id', user.id)
      .single()

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const metadataRole = (metadata.role as string | undefined) ?? null
    const metadataFirmId =
      (metadata.firm_id as string | undefined) ??
      (metadata.firmId as string | undefined) ??
      null
    const metadataAdvisorId =
      (metadata.advisor_id as string | undefined) ??
      (metadata.advisorId as string | undefined) ??
      null

    const defaultFirmId = getDefaultFirmId()
    const firmId =
      normalizeFirmId(profile?.firm_id) ??
      normalizeFirmId(metadataFirmId) ??
      normalizeFirmId(defaultFirmId)

    const context: AuthContext = {
      user,
      userId: user.id,
      email: user.email,
      role: normalizeOptionalString(profile?.role) || normalizeOptionalString(metadataRole),
      firmId,
      advisorId: normalizeOptionalString(profile?.advisor_id) || normalizeOptionalString(metadataAdvisorId) || user.id
    }

    return {
      success: true,
      context
    }
  } catch (error) {
    console.error('[Auth] Error getting auth context:', error)
    return {
      success: false,
      error: 'Authentication failed',
      response: NextResponse.json(
        { error: 'Authentication error', message: 'Failed to verify authentication' },
        { status: 500 }
      )
    }
  }
}

/**
 * Validate auth with specific requirements
 */
export async function validateAuth(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<AuthResult> {
  const { requireAuth = true, requireRole, allowPublic = false } = options

  // Allow public access if specified
  if (allowPublic) {
    const authResult = await getAuthContext(request)
    return authResult.success ? authResult : { success: true }
  }

  // Check authentication
  if (!requireAuth) {
    return { success: true }
  }

  const authResult = await getAuthContext(request)

  if (!authResult.success) {
    return authResult
  }

  // Check role requirements
  if (requireRole && requireRole.length > 0 && authResult.context) {
    const userRole = authResult.context.role
    if (!userRole || !requireRole.includes(userRole)) {
      return {
        success: false,
        error: 'Insufficient permissions',
        response: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not have permission to access this resource',
            requiredRoles: requireRole
          },
          { status: 403 }
        )
      }
    }
  }

  return authResult
}

/**
 * Higher-order function to wrap API handlers with auth
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await validateAuth(request, options)

    if (!authResult.success || authResult.response) {
      return authResult.response || NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // If auth is optional and no context, provide empty context
    const context = authResult.context || {
      user: null as any,
      userId: '',
      email: undefined,
      role: null,
      firmId: null,
      advisorId: null
    }

    return handler(request, context, ...args)
  }
}

/**
 * Get the current advisor's profile
 */
export async function getAdvisorProfile(userId: string) {
  try {
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        firm_id,
        advisor_id,
        phone,
        avatar_url,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Auth] Error fetching advisor profile:', error)
      return null
    }

    return profile
  } catch (error) {
    console.error('[Auth] Error in getAdvisorProfile:', error)
    return null
  }
}

/**
 * Get firm details for the current user
 */
export async function getFirmDetails(firmId: string) {
  try {
    const supabase = await createClient()

    const { data: firm, error } = await supabase
      .from('firms')
      .select('*')
      .eq('id', firmId)
      .single()

    if (error) {
      console.error('[Auth] Error fetching firm details:', error)
      return null
    }

    return firm
  } catch (error) {
    console.error('[Auth] Error in getFirmDetails:', error)
    return null
  }
}

// ================================================================
// ROLE CONSTANTS
// ================================================================

export const ROLES = {
  ADMIN: 'admin',
  ADVISOR: 'advisor',
  COMPLIANCE: 'compliance',
  SUPPORT: 'support',
  CLIENT: 'client'
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// ================================================================
// PERMISSION HELPERS
// ================================================================

export function canAccessClient(authContext: AuthContext, clientAdvisorId: string): boolean {
  // Admins can access all clients
  if (authContext.role === ROLES.ADMIN) return true

  // Advisors can only access their own clients
  return authContext.advisorId === clientAdvisorId
}

export function canModifyDocument(authContext: AuthContext, documentAdvisorId: string): boolean {
  if (authContext.role === ROLES.ADMIN) return true
  if (authContext.role === ROLES.COMPLIANCE) return true
  return authContext.advisorId === documentAdvisorId
}

export function isAdmin(authContext: AuthContext): boolean {
  return authContext.role === ROLES.ADMIN
}

export function isAdvisor(authContext: AuthContext): boolean {
  return authContext.role === ROLES.ADVISOR || authContext.role === ROLES.ADMIN
}

export function isCompliance(authContext: AuthContext): boolean {
  return authContext.role === ROLES.COMPLIANCE || authContext.role === ROLES.ADMIN
}

// ================================================================
// RBAC PERMISSION MATRIX
// ================================================================

/**
 * Permission types for RBAC
 */
export type Permission =
  | 'clients:read'
  | 'clients:write'
  | 'clients:delete'
  | 'assessments:read'
  | 'assessments:write'
  | 'assessments:delete'
  | 'documents:read'
  | 'documents:write'
  | 'documents:delete'
  | 'documents:sign'
  | 'reports:read'
  | 'reports:generate'
  | 'admin:users'
  | 'admin:settings'
  | 'admin:audit'

/**
 * Role-based permission matrix
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'clients:read', 'clients:write', 'clients:delete',
    'assessments:read', 'assessments:write', 'assessments:delete',
    'documents:read', 'documents:write', 'documents:delete', 'documents:sign',
    'reports:read', 'reports:generate',
    'admin:users', 'admin:settings', 'admin:audit'
  ],
  advisor: [
    'clients:read', 'clients:write',
    'assessments:read', 'assessments:write',
    'documents:read', 'documents:write', 'documents:sign',
    'reports:read', 'reports:generate'
  ],
  compliance: [
    'clients:read',
    'assessments:read',
    'documents:read', 'documents:write',
    'reports:read', 'reports:generate',
    'admin:audit'
  ],
  support: [
    'clients:read',
    'assessments:read',
    'documents:read',
    'reports:read'
  ],
  client: [
    'assessments:read',
    'documents:read', 'documents:sign'
  ]
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role | string | null, permission: Permission): boolean {
  if (!role) return false
  const permissions = ROLE_PERMISSIONS[role as Role]
  return permissions?.includes(permission) ?? false
}

/**
 * Check if auth context has a specific permission
 */
export function checkPermission(authContext: AuthContext, permission: Permission): boolean {
  return hasPermission(authContext.role, permission)
}

/**
 * Require specific permission, returns error response if not authorized
 */
export function requirePermission(
  authContext: AuthContext,
  permission: Permission
): NextResponse | null {
  if (!checkPermission(authContext, permission)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`,
        timestamp: new Date().toISOString()
      },
      { status: 403 }
    )
  }
  return null
}

// ================================================================
// FIRM ID VALIDATION (NO HARDCODED FALLBACKS)
// ================================================================

/**
 * Get firm ID from auth context with validation
 * IMPORTANT: Does NOT use hardcoded fallbacks for security
 */
export function getValidatedFirmId(authContext: AuthContext): string | null {
  const firmId = authContext.firmId

  // Validate UUID format
  if (!firmId) return null

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(firmId)) {
    console.warn('[Auth] Invalid firm ID format:', firmId)
    return null
  }

  // Reject known test/placeholder UUIDs
  const invalidIds = [
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    '12345678-1234-1234-1234-123456789012'
  ]

  if (invalidIds.includes(firmId)) {
    console.warn('[Auth] Rejected placeholder firm ID:', firmId)
    return null
  }

  return firmId
}

/**
 * Require firm ID, returns error response if missing
 */
export function requireFirmId(authContext: AuthContext): { firmId: string } | NextResponse {
  const firmId = getValidatedFirmId(authContext)

  if (!firmId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Firm ID required',
        message: 'Your account is not associated with a firm. Please contact support.',
        timestamp: new Date().toISOString()
      },
      { status: 403 }
    )
  }

  return { firmId }
}
