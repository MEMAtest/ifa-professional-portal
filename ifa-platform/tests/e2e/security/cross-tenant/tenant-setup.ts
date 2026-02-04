/**
 * Cross-Tenant Isolation E2E Test - Setup
 *
 * Creates three completely independent firms, each with:
 *   - A firm row
 *   - An auth user + profile row
 *   - One of each entity (client, document, assessment, task, review, communication)
 *   - A valid JWT access token obtained by signing in
 *
 * All mutations use the Supabase service-role client so they bypass RLS and
 * can set firm_id explicitly.
 */

import { loadEnvConfig } from '@next/env'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Load .env.local so Playwright tests can access Supabase env vars
loadEnvConfig(process.cwd())
import type { FirmContext, TestTenants } from './tenant-context'
import {
  createTestClient,
  createTestDocument,
  createTestAssessment,
  createTestTask,
  createTestReview,
  createTestCommunication,
} from './seed-data'

// ---------------------------------------------------------------------------
// Service client (bypasses RLS)
// ---------------------------------------------------------------------------

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return key
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

function getServiceClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Create a disposable anon client for signInWithPassword.
 * This MUST NOT be the service client — signInWithPassword changes the
 * client's auth session from service-role to user-level JWT.
 */
function createAnonClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Retry a function with exponential backoff. */
async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 5, baseDelayMs = 2000 }: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      const isRateLimit =
        err?.message?.includes('rate limit') ||
        err?.message?.includes('Rate limit') ||
        err?.status === 429
      if (!isRateLimit || attempt === maxAttempts) throw err
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error('withRetry: unreachable')
}

// ---------------------------------------------------------------------------
// Firm identities
// ---------------------------------------------------------------------------

interface FirmIdentity {
  firmName: string
  email: string
  password: string
  firstName: string
  lastName: string
}

const FIRMS: Record<'A' | 'B' | 'C', FirmIdentity> = {
  A: {
    firmName: 'E2E Alpha Advisers',
    email: 'e2e-firm-a@test.plannetic.com',
    password: 'E2eTest!FirmA2024',
    firstName: 'Alpha',
    lastName: 'Adviser',
  },
  B: {
    firmName: 'E2E Beta Advisers',
    email: 'e2e-firm-b@test.plannetic.com',
    password: 'E2eTest!FirmB2024',
    firstName: 'Beta',
    lastName: 'Adviser',
  },
  C: {
    firmName: 'E2E Gamma Advisers',
    email: 'e2e-firm-c@test.plannetic.com',
    password: 'E2eTest!FirmC2024',
    firstName: 'Gamma',
    lastName: 'Adviser',
  },
}

// ---------------------------------------------------------------------------
// Single-firm setup helper
// ---------------------------------------------------------------------------

async function setupSingleFirm(
  serviceClient: SupabaseClient,
  identity: FirmIdentity
): Promise<FirmContext> {
  // 1. Create firm
  const { data: firm, error: firmError } = await serviceClient
    .from('firms')
    .insert({
      name: identity.firmName,
      subscription_tier: 'professional',
      settings: { test: true, purpose: 'cross-tenant-isolation' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .select('id')
    .single()

  if (firmError) {
    throw new Error(`Failed to create firm "${identity.firmName}": ${firmError.message}`)
  }
  const firmId = firm!.id

  // 2. Create auth user — delete stale user if exists (via profile lookup,
  //    never signInWithPassword which would pollute the service client session)
  const firstAttempt = await serviceClient.auth.admin.createUser({
    email: identity.email,
    password: identity.password,
    email_confirm: true,
    user_metadata: {
      first_name: identity.firstName,
      last_name: identity.lastName,
      firm_id: firmId,
    },
  })

  let authData = firstAttempt.data

  if (
    firstAttempt.error &&
    firstAttempt.error.message.includes('already been registered')
  ) {
    // Look up stale user via their profile row (by email)
    const { data: staleProfile } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('email', identity.email)
      .maybeSingle()

    if (staleProfile?.id) {
      await serviceClient.from('profiles').delete().eq('id', staleProfile.id)
      await serviceClient.auth.admin.deleteUser(staleProfile.id)
    } else {
      // Profile missing but auth user exists — paginate admin.listUsers
      for (let page = 1; page <= 50; page++) {
        const { data: listData } = await serviceClient.auth.admin.listUsers({
          page,
          perPage: 50,
        })
        const users = listData?.users || []
        if (users.length === 0) break
        const stale = users.find((u: any) => u.email === identity.email)
        if (stale) {
          await serviceClient.auth.admin.deleteUser(stale.id)
          break
        }
      }
    }

    // Retry user creation
    const retryResult = await serviceClient.auth.admin.createUser({
      email: identity.email,
      password: identity.password,
      email_confirm: true,
      user_metadata: {
        first_name: identity.firstName,
        last_name: identity.lastName,
        firm_id: firmId,
      },
    })

    if (retryResult.error) {
      throw new Error(
        `Failed to create auth user ${identity.email} after cleanup: ${retryResult.error.message}`
      )
    }
    authData = retryResult.data
  } else if (firstAttempt.error) {
    throw new Error(
      `Failed to create auth user ${identity.email}: ${firstAttempt.error.message}`
    )
  }

  if (!authData?.user) {
    throw new Error(
      `Failed to create auth user ${identity.email}: no user data returned`
    )
  }
  const userId = authData.user.id

  // 3. Create profile row linking user to firm
  const { error: profileError } = await serviceClient.from('profiles').insert({
    id: userId,
    firm_id: firmId,
    role: 'advisor',
    first_name: identity.firstName,
    last_name: identity.lastName,
    email: identity.email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any)

  if (profileError) {
    throw new Error(`Failed to create profile for ${identity.email}: ${profileError.message}`)
  }

  // 4. Seed test data
  const clientId = await createTestClient(serviceClient, firmId, userId)
  const documentId = await createTestDocument(serviceClient, firmId, clientId)
  const assessmentId = await createTestAssessment(serviceClient, firmId, clientId, userId)
  const taskId = await createTestTask(serviceClient, firmId, userId, clientId)
  const reviewId = await createTestReview(serviceClient, firmId, clientId, userId)
  const communicationId = await createTestCommunication(serviceClient, firmId, clientId, userId)

  // 5. Sign in to obtain JWT — use a SEPARATE anon client so we never
  //    pollute the service client's auth session. Retry on rate limits.
  const token = await withRetry(async () => {
    const anonClient = createAnonClient()
    const { data: signInData, error: signInError } =
      await anonClient.auth.signInWithPassword({
        email: identity.email,
        password: identity.password,
      })

    if (signInError || !signInData.session) {
      throw new Error(
        `Failed to sign in as ${identity.email}: ${signInError?.message ?? 'no session returned'}`
      )
    }
    return signInData.session.access_token
  })

  return {
    firmId,
    userId,
    token,
    email: identity.email,
    clientId,
    documentId,
    assessmentId,
    taskId,
    reviewId,
    communicationId,
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function setupTestTenants(): Promise<TestTenants> {
  const serviceClient = getServiceClient()

  // Clean up any leftover data from previous failed runs
  await cleanupStaleTestData(serviceClient)

  // Run firms SEQUENTIALLY to avoid race conditions:
  // signInWithPassword creates a new client per firm, but seeding shares
  // the service client. Sequential execution keeps it clean.
  const firmA = await setupSingleFirm(serviceClient, FIRMS.A)
  const firmB = await setupSingleFirm(serviceClient, FIRMS.B)
  const firmC = await setupSingleFirm(serviceClient, FIRMS.C)

  return { firmA, firmB, firmC }
}

// ---------------------------------------------------------------------------
// Stale data cleanup (best-effort)
// ---------------------------------------------------------------------------

async function cleanupStaleTestData(serviceClient: SupabaseClient): Promise<void> {
  try {
    // Find any pre-existing test firms by name prefix
    const { data: staleFirms } = await serviceClient
      .from('firms')
      .select('id')
      .like('name', 'E2E %% Advisers')

    if (!staleFirms || staleFirms.length === 0) return

    const firmIds = staleFirms.map((f: any) => f.id)

    // Find profiles linked to those firms
    const { data: staleProfiles } = await serviceClient
      .from('profiles')
      .select('id')
      .in('firm_id', firmIds)

    const profileIds = (staleProfiles || []).map((p: any) => p.id)

    // Delete seeded entities in dependency order
    const entityTables = [
      'client_communications',
      'client_reviews',
      'tasks',
      'assessments',
      'documents',
      'clients',
    ]

    for (const table of entityTables) {
      const col = table === 'tasks' ? 'firm_id' : 'firm_id'
      // Most tables have firm_id; some don't (reviews, communications go via client_id)
      try {
        if (['client_reviews', 'client_communications', 'assessments'].includes(table)) {
          // These reference clients via client_id (no firm_id column)
          const { data: clients } = await serviceClient
            .from('clients')
            .select('id')
            .in('firm_id', firmIds)
          const clientIds = (clients || []).map((c: any) => c.id)
          if (clientIds.length > 0) {
            await serviceClient.from(table as any).delete().in('client_id', clientIds)
          }
        } else {
          await serviceClient.from(table as any).delete().in('firm_id', firmIds)
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    // Delete profiles
    if (profileIds.length > 0) {
      await serviceClient.from('profiles').delete().in('id', profileIds)
      for (const pid of profileIds) {
        try {
          await serviceClient.auth.admin.deleteUser(pid)
        } catch {
          // Ignore
        }
      }
    }

    // Delete firms
    await serviceClient.from('firms').delete().in('id', firmIds)
  } catch {
    // Best-effort; don't fail setup if stale cleanup fails
  }
}
