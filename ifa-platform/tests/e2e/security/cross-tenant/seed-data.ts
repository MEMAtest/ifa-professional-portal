/**
 * Cross-Tenant Isolation E2E Test - Data Seeding Functions
 *
 * Each function inserts a single row into the corresponding table using
 * the Supabase service-role client (bypasses RLS). Rows are clearly
 * labelled with the "E2E-ISOLATION-" prefix so they can be identified
 * and cleaned up reliably.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export async function createTestClient(
  serviceClient: SupabaseClient,
  firmId: string,
  advisorId: string
): Promise<string> {
  const { data, error } = await serviceClient
    .from('clients')
    .insert({
      firm_id: firmId,
      advisor_id: advisorId,
      client_ref: `E2E-ISOLATION-${firmId.slice(0, 8)}`,
      personal_details: {
        title: 'Mr',
        firstName: 'E2E-ISOLATION',
        lastName: `Client-${firmId.slice(0, 8)}`,
        first_name: 'E2E-ISOLATION',
        last_name: `Client-${firmId.slice(0, 8)}`,
        dateOfBirth: '1985-06-15',
      },
      contact_info: {
        email: `e2e-client-${firmId.slice(0, 8)}@test.plannetic.com`,
        phone: '07700900000',
        address: {
          line1: '1 Test Street',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'UK',
        },
      },
      financial_profile: {
        annualIncome: 75000,
        netWorth: 250000,
        investmentExperience: 'intermediate',
      },
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create test client for firm ${firmId}: ${error.message}`)
  }
  return data!.id
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function createTestDocument(
  serviceClient: SupabaseClient,
  firmId: string,
  clientId: string
): Promise<string> {
  const { data, error } = await serviceClient
    .from('documents')
    .insert({
      firm_id: firmId,
      client_id: clientId,
      name: `E2E-ISOLATION-Doc-${firmId.slice(0, 8)}`,
      description: 'Cross-tenant isolation test document',
      category: 'general',
      type: 'pdf',
      file_name: 'e2e-isolation-test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      file_path: `/e2e-test/${firmId}/isolation-test.pdf`,
      storage_path: `e2e-test/${firmId}/isolation-test.pdf`,
      compliance_status: 'pending',
      is_archived: false,
      tags: ['e2e', 'isolation-test'],
      metadata: { test: true, purpose: 'cross-tenant-isolation' },
      requires_signature: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create test document for firm ${firmId}: ${error.message}`)
  }
  return data!.id
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

export async function createTestAssessment(
  serviceClient: SupabaseClient,
  firmId: string,
  clientId: string,
  advisorId: string
): Promise<string> {
  const { data, error } = await serviceClient
    .from('assessments')
    .insert({
      client_id: clientId,
      advisor_id: advisorId,
      assessment_data: {
        label: `E2E-ISOLATION-Assessment-${firmId.slice(0, 8)}`,
        riskTolerance: 'moderate',
        investmentHorizon: '5-10 years',
      },
      status: 'draft',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create test assessment for firm ${firmId}: ${error.message}`)
  }
  return data!.id
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function createTestTask(
  serviceClient: SupabaseClient,
  firmId: string,
  userId: string,
  clientId: string
): Promise<string> {
  const now = new Date().toISOString()
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await serviceClient
    .from('tasks')
    .insert({
      firm_id: firmId,
      title: `E2E-ISOLATION-Task-${firmId.slice(0, 8)}`,
      description: 'Cross-tenant isolation test task',
      type: 'general',
      status: 'pending',
      priority: 'medium',
      assigned_to: userId,
      assigned_by: userId,
      client_id: clientId,
      due_date: dueDate,
      requires_sign_off: false,
      is_recurring: false,
      metadata: { test: true, purpose: 'cross-tenant-isolation' },
      created_at: now,
      updated_at: now,
    } as any)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create test task for firm ${firmId}: ${error.message}`)
  }
  return data!.id
}

// ---------------------------------------------------------------------------
// Reviews (client_reviews table used by /api/reviews/upcoming)
// ---------------------------------------------------------------------------

export async function createTestReview(
  serviceClient: SupabaseClient,
  firmId: string,
  clientId: string,
  advisorId: string
): Promise<string> {
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await serviceClient
    .from('client_reviews')
    .insert({
      client_id: clientId,
      review_type: 'annual',
      due_date: dueDate,
      status: 'scheduled',
      created_by: advisorId,
      created_at: new Date().toISOString(),
    } as any)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create test review for firm ${firmId}: ${error.message}`)
  }
  return data!.id
}

// ---------------------------------------------------------------------------
// Communications (client_communications table)
// ---------------------------------------------------------------------------

export async function createTestCommunication(
  serviceClient: SupabaseClient,
  firmId: string,
  clientId: string,
  advisorId: string
): Promise<string> {
  const { data, error } = await serviceClient
    .from('client_communications')
    .insert({
      client_id: clientId,
      communication_type: 'email',
      subject: `E2E-ISOLATION-Comm-${firmId.slice(0, 8)}`,
      summary: 'Cross-tenant isolation test communication',
      content: 'Cross-tenant isolation test communication',
      communication_date: new Date().toISOString(),
      created_by: advisorId,
      created_at: new Date().toISOString(),
    } as any)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create test communication for firm ${firmId}: ${error.message}`)
  }
  return data!.id
}
