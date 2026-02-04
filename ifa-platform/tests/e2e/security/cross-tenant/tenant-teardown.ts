/**
 * Cross-Tenant Isolation E2E Test - Teardown
 *
 * Removes every row created during setup, in reverse dependency order,
 * using the service-role client. Each deletion is wrapped in try/catch
 * so that a failure in one step does not prevent cleanup of the rest.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { FirmContext, TestTenants } from './tenant-context'

// ---------------------------------------------------------------------------
// Service client (bypasses RLS)
// ---------------------------------------------------------------------------

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// Single-firm teardown helper
// ---------------------------------------------------------------------------

async function teardownSingleFirm(
  serviceClient: SupabaseClient,
  ctx: FirmContext
): Promise<void> {
  const { firmId, userId, clientId } = ctx

  // 1. Delete communications
  try {
    await serviceClient
      .from('client_communications' as any)
      .delete()
      .eq('client_id', clientId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete communications for firm ${firmId}:`, e)
  }

  // 2. Delete reviews
  try {
    await serviceClient
      .from('client_reviews' as any)
      .delete()
      .eq('client_id', clientId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete reviews for firm ${firmId}:`, e)
  }

  // 3. Delete task comments (if any were created during tests)
  try {
    await serviceClient
      .from('task_comments' as any)
      .delete()
      .eq('task_id', ctx.taskId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete task comments for firm ${firmId}:`, e)
  }

  // 4. Delete tasks
  try {
    await serviceClient
      .from('tasks' as any)
      .delete()
      .eq('firm_id', firmId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete tasks for firm ${firmId}:`, e)
  }

  // 5. Delete activity log entries (activity_log has client_id, not firm_id)
  try {
    await serviceClient
      .from('activity_log' as any)
      .delete()
      .eq('client_id', clientId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete activity_log for firm ${firmId}:`, e)
  }

  // 6. Delete assessments
  try {
    await serviceClient
      .from('assessments' as any)
      .delete()
      .eq('client_id', clientId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete assessments for firm ${firmId}:`, e)
  }

  // 7. Delete documents
  try {
    await serviceClient
      .from('documents' as any)
      .delete()
      .eq('firm_id', firmId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete documents for firm ${firmId}:`, e)
  }

  // 8. Delete notifications (may have been created by task seeding)
  try {
    await serviceClient
      .from('notifications' as any)
      .delete()
      .eq('firm_id', firmId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete notifications for firm ${firmId}:`, e)
  }

  // 9. Delete clients
  try {
    await serviceClient
      .from('clients' as any)
      .delete()
      .eq('firm_id', firmId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete clients for firm ${firmId}:`, e)
  }

  // 10. Delete profile
  try {
    await serviceClient
      .from('profiles')
      .delete()
      .eq('id', userId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete profile for user ${userId}:`, e)
  }

  // 11. Delete auth user
  try {
    await serviceClient.auth.admin.deleteUser(userId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete auth user ${userId}:`, e)
  }

  // 12. Delete firm
  try {
    await serviceClient
      .from('firms')
      .delete()
      .eq('id', firmId)
  } catch (e) {
    console.warn(`[teardown] Failed to delete firm ${firmId}:`, e)
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function teardownTestTenants(tenants: TestTenants): Promise<void> {
  if (!tenants) {
    console.warn('[teardown] No tenants object provided; skipping teardown.')
    return
  }

  const serviceClient = getServiceClient()

  // Run teardowns in parallel; each is independently wrapped
  await Promise.allSettled([
    teardownSingleFirm(serviceClient, tenants.firmA),
    teardownSingleFirm(serviceClient, tenants.firmB),
    teardownSingleFirm(serviceClient, tenants.firmC),
  ])
}
