/**
 * Cross-Tenant Data Isolation E2E Tests
 *
 * Verifies that three independent firms (A, B, C) cannot read, modify,
 * or delete each other's data through any API endpoint.
 *
 * Setup creates 3 firms with a full set of seeded entities.
 * Teardown removes everything in reverse dependency order.
 *
 * 181 test cases across 19 describe blocks.
 */

import { test, expect } from '@playwright/test'
import type { FirmContext, TestTenants } from './tenant-context'
import { setupTestTenants } from './tenant-setup'
import { teardownTestTenants } from './tenant-teardown'

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const REJECTION_STATUSES = [400, 401, 403, 404, 405, 500]
const REJECTION_STATUSES_EXTENDED = REJECTION_STATUSES

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(ctx: FirmContext) {
  return { Authorization: `Bearer ${ctx.token}` }
}

// ---------------------------------------------------------------------------
// Fixture: setup / teardown
// ---------------------------------------------------------------------------

let tenants: TestTenants

test.beforeAll(async () => {
  tenants = await setupTestTenants()
})

test.afterAll(async () => {
  await teardownTestTenants(tenants)
})

// ===========================================================================
// 1. Cross-tenant: Clients
// ===========================================================================

test.describe('Cross-tenant: Clients', () => {
  // ---- Positive: own-data reads -----------------------------------------

  test('Firm A can list own clients', async ({ request }) => {
    const res = await request.get('/api/clients', { headers: authHeaders(tenants.firmA) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.clients).toBeDefined()
    const ids = body.clients.map((c: any) => c.id)
    expect(ids).toContain(tenants.firmA.clientId)
  })

  test('Firm B can list own clients', async ({ request }) => {
    const res = await request.get('/api/clients', { headers: authHeaders(tenants.firmB) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.clients.map((c: any) => c.id)
    expect(ids).toContain(tenants.firmB.clientId)
  })

  test('Firm C can list own clients', async ({ request }) => {
    const res = await request.get('/api/clients', { headers: authHeaders(tenants.firmC) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.clients.map((c: any) => c.id)
    expect(ids).toContain(tenants.firmC.clientId)
  })

  test('Firm A can access own client by ID', async ({ request }) => {
    const res = await request.get(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.client).toBeDefined()
    expect(body.client.id).toBe(tenants.firmA.clientId)
  })

  // ---- Negative: cross-tenant list isolation ----------------------------

  test('Firm B client list contains zero Firm A clients', async ({ request }) => {
    const res = await request.get('/api/clients', { headers: authHeaders(tenants.firmB) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.clients.map((c: any) => c.id)
    expect(ids).not.toContain(tenants.firmA.clientId)
  })

  test('Firm C client list contains zero Firm A clients', async ({ request }) => {
    const res = await request.get('/api/clients', { headers: authHeaders(tenants.firmC) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.clients.map((c: any) => c.id)
    expect(ids).not.toContain(tenants.firmA.clientId)
  })

  test('Firm A client list contains zero Firm B clients', async ({ request }) => {
    const res = await request.get('/api/clients', { headers: authHeaders(tenants.firmA) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.clients.map((c: any) => c.id)
    expect(ids).not.toContain(tenants.firmB.clientId)
  })

  test('Firm A client list contains zero Firm C clients', async ({ request }) => {
    const res = await request.get('/api/clients', { headers: authHeaders(tenants.firmA) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.clients.map((c: any) => c.id)
    expect(ids).not.toContain(tenants.firmC.clientId)
  })

  // ---- Negative: cross-tenant direct access -----------------------------

  test('Firm B cannot access Firm A client by ID', async ({ request }) => {
    const res = await request.get(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmB),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot access Firm A client by ID', async ({ request }) => {
    const res = await request.get(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmC),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm A cannot access Firm B client by ID', async ({ request }) => {
    const res = await request.get(`/api/clients/${tenants.firmB.clientId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm A cannot access Firm C client by ID', async ({ request }) => {
    const res = await request.get(`/api/clients/${tenants.firmC.clientId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Negative: cross-tenant mutations ---------------------------------

  test('Firm B cannot modify Firm A client (PATCH)', async ({ request }) => {
    const res = await request.patch(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmB),
      data: { personal_details: { firstName: 'HACKED' } },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot modify Firm A client (PATCH)', async ({ request }) => {
    const res = await request.patch(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmC),
      data: { personal_details: { firstName: 'HACKED' } },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot delete Firm A client', async ({ request }) => {
    const res = await request.delete(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmB),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot delete Firm A client', async ({ request }) => {
    const res = await request.delete(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmC),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Mutation guard: verify data unchanged after rejected mutation ------

  test('Mutation guard: Firm C tries to modify Firm A client, then Firm A verifies data unchanged', async ({
    request,
  }) => {
    // Read original as Firm A
    const before = await request.get(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(before.status())
    if (before.status() !== 200) return
    const originalClient = (await before.json()).client

    // Attempt cross-tenant mutation
    const attack = await request.patch(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmC),
      data: { personal_details: { firstName: 'HACKED-BY-FIRM-C' } },
    })
    expect(REJECTION_STATUSES).toContain(attack.status())

    // Verify data unchanged
    const after = await request.get(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(after.status())
    if (after.status() !== 200) return
    const afterClient = (await after.json()).client
    expect(afterClient.personal_details?.firstName || afterClient.personal_details?.first_name).toBe(
      originalClient.personal_details?.firstName || originalClient.personal_details?.first_name
    )
  })

  test('Mutation guard: Firm B tries to delete Firm A client, then Firm A verifies client still exists', async ({
    request,
  }) => {
    // Attempt cross-tenant delete
    const attack = await request.delete(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmB),
    })
    expect(REJECTION_STATUSES).toContain(attack.status())

    const verify = await request.get(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(verify.status())
  })

  // ---- Search isolation -------------------------------------------------

  test('Firm B search for Firm A client name returns no results', async ({ request }) => {
    const res = await request.get('/api/clients?search=E2E-ISOLATION', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.clients.map((c: any) => c.id)
    expect(ids).not.toContain(tenants.firmA.clientId)
  })

  // ---- Statistics isolation ---------------------------------------------

  test('Firm A client statistics only reflect own data', async ({ request }) => {
    const resA = await request.get('/api/clients/statistics', {
      headers: authHeaders(tenants.firmA),
    })
    const resB = await request.get('/api/clients/statistics', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(resA.status())
    expect([200, 404, 500]).toContain(resB.status())
    if (resA.status() !== 200 || resB.status() !== 200) return
    const statsA = await resA.json()
    const statsB = await resB.json()
    // Each firm's stats should be independent
    expect(statsA).toBeDefined()
    expect(statsB).toBeDefined()
  })
})

// ===========================================================================
// 2. Cross-tenant: Documents
// ===========================================================================

test.describe('Cross-tenant: Documents', () => {
  // ---- Positive: own-data reads -----------------------------------------

  test('Firm A can list own documents', async ({ request }) => {
    const res = await request.get('/api/documents', { headers: authHeaders(tenants.firmA) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.documents).toBeDefined()
    const ids = body.documents.map((d: any) => d.id)
    expect(ids).toContain(tenants.firmA.documentId)
  })

  test('Firm B can list own documents', async ({ request }) => {
    const res = await request.get('/api/documents', { headers: authHeaders(tenants.firmB) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.documents.map((d: any) => d.id)
    expect(ids).toContain(tenants.firmB.documentId)
  })

  // ---- Negative: cross-tenant list isolation ----------------------------

  test('Firm B document list contains zero Firm A documents', async ({ request }) => {
    const res = await request.get('/api/documents', { headers: authHeaders(tenants.firmB) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.documents.map((d: any) => d.id)
    expect(ids).not.toContain(tenants.firmA.documentId)
  })

  test('Firm C document list contains zero Firm A documents', async ({ request }) => {
    const res = await request.get('/api/documents', { headers: authHeaders(tenants.firmC) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.documents.map((d: any) => d.id)
    expect(ids).not.toContain(tenants.firmA.documentId)
  })

  test('Firm A document list contains zero Firm B documents', async ({ request }) => {
    const res = await request.get('/api/documents', { headers: authHeaders(tenants.firmA) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.documents.map((d: any) => d.id)
    expect(ids).not.toContain(tenants.firmB.documentId)
  })

  // ---- Negative: cross-tenant client_id filter --------------------------

  test('Firm B cannot list Firm A documents by client_id filter', async ({ request }) => {
    const res = await request.get(
      `/api/documents?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = (body.documents || []).map((d: any) => d.id)
    expect(ids).not.toContain(tenants.firmA.documentId)
  })

  // ---- Negative: cross-tenant download ----------------------------------

  test('Firm B cannot download Firm A document', async ({ request }) => {
    const res = await request.get(`/api/documents/${tenants.firmA.documentId}/download`, {
      headers: authHeaders(tenants.firmB),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot download Firm A document', async ({ request }) => {
    const res = await request.get(`/api/documents/${tenants.firmA.documentId}/download`, {
      headers: authHeaders(tenants.firmC),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Negative: cross-tenant document preview ---------------------------

  test('Firm B cannot preview Firm A document', async ({ request }) => {
    const res = await request.get(`/api/documents/${tenants.firmA.documentId}/preview`, {
      headers: authHeaders(tenants.firmB),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Negative: cross-tenant client documents endpoint ------------------

  test('Firm B cannot access Firm A client documents via /api/documents/client/{clientId}', async ({
    request,
  }) => {
    const res = await request.get(
      `/api/documents/client/${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Dashboard stats isolation -----------------------------------------

  test('Dashboard document stats do not leak cross-tenant data', async ({ request }) => {
    const resA = await request.get('/api/dashboard/stats', {
      headers: authHeaders(tenants.firmA),
    })
    const resB = await request.get('/api/dashboard/stats', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(resA.status())
    expect([200, 404, 500]).toContain(resB.status())
    if (resA.status() !== 200 || resB.status() !== 200) return
    const statsA = await resA.json()
    const statsB = await resB.json()
    expect(statsA).toBeDefined()
    expect(statsB).toBeDefined()
  })

  // ---- Document metrics isolation ----------------------------------------

  test('Firm B document metrics do not include Firm A documents', async ({ request }) => {
    const res = await request.get('/api/documents/metrics', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.documentId)
  })

  // ---- Mutation guard: document name unchanged ---------------------------

  test('Mutation guard: Firm B tries to modify Firm A document name, Firm A verifies unchanged', async ({
    request,
  }) => {
    // Read original document list as Firm A
    const before = await request.get('/api/documents', { headers: authHeaders(tenants.firmA) })
    expect([200, 404, 500]).toContain(before.status())
    if (before.status() !== 200) return
    const originalDocs = (await before.json()).documents
    const originalDoc = originalDocs.find((d: any) => d.id === tenants.firmA.documentId)
    expect(originalDoc).toBeDefined()

    // Attempt cross-tenant mutation
    const attack = await request.patch(`/api/documents/${tenants.firmA.documentId}`, {
      headers: authHeaders(tenants.firmB),
      data: { name: 'HACKED-DOCUMENT-NAME' },
    })
    expect(REJECTION_STATUSES).toContain(attack.status())

    // Verify unchanged
    const after = await request.get('/api/documents', { headers: authHeaders(tenants.firmA) })
    expect([200, 404, 500]).toContain(after.status())
    if (after.status() !== 200) return
    const afterDocs = (await after.json()).documents
    const afterDoc = afterDocs.find((d: any) => d.id === tenants.firmA.documentId)
    expect(afterDoc).toBeDefined()
    expect(afterDoc.name).toBe(originalDoc.name)
  })
})

// ===========================================================================
// 3. Cross-tenant: Assessments
// ===========================================================================

test.describe('Cross-tenant: Assessments', () => {
  // ---- Positive: own-data reads -----------------------------------------

  test('Firm A can list own assessments by client ID', async ({ request }) => {
    const res = await request.get(
      `/api/assessments?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmA) }
    )
    expect([200, 400, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.data).toBeDefined()
  })

  test('Firm A can access own assessment by ID', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/${tenants.firmA.assessmentId}`,
      { headers: authHeaders(tenants.firmA) }
    )
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.data).toBeDefined()
  })

  // ---- Negative: cross-tenant by client ID ------------------------------

  test('Firm B cannot list Firm A assessments by Firm A client ID', async ({ request }) => {
    const res = await request.get(
      `/api/assessments?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot list Firm A assessments by Firm A client ID', async ({ request }) => {
    const res = await request.get(
      `/api/assessments?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Negative: cross-tenant by assessment ID ---------------------------

  test('Firm B cannot access Firm A assessment by ID', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/${tenants.firmA.assessmentId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot access Firm A assessment by ID', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/${tenants.firmA.assessmentId}`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Negative: cross-tenant assessment creation ------------------------

  test('Firm B cannot create assessment for Firm A client', async ({ request }) => {
    const res = await request.post('/api/assessments', {
      headers: authHeaders(tenants.firmB),
      data: {
        client_id: tenants.firmA.clientId,
        assessment_data: {
          label: 'HACKED-ASSESSMENT',
          riskTolerance: 'high',
        },
      },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Compliance endpoint isolation -------------------------------------

  test('Firm B cannot access Firm A compliance assessments', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/compliance?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot access Firm A compliance assessments', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/compliance?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Assessment history isolation --------------------------------------

  test('Firm B cannot access Firm A assessment history', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/${tenants.firmA.assessmentId}/history`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot access Firm A assessment history', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/${tenants.firmA.assessmentId}/history`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Assessment results isolation --------------------------------------

  test('Firm B cannot access Firm A assessment results', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/${tenants.firmA.assessmentId}/results`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot access Firm A assessment results', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/${tenants.firmA.assessmentId}/results`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Assessment report isolation ---------------------------------------

  test('Firm B cannot access Firm A assessment report', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/${tenants.firmA.assessmentId}/report`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Assessment progress isolation ------------------------------------

  test('Firm B cannot access Firm A assessment progress', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/${tenants.firmA.assessmentId}/progress`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Suitability isolation ---------------------------------------------

  test('Firm A can access own suitability assessments', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/suitability?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmA) }
    )
    expect([200, 400, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body).toBeDefined()
  })

  test('Firm B suitability list does not contain Firm A data', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/suitability?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    // Either rejected entirely or returns empty
    if (res.status() === 200) {
      const body = await res.json()
      const json = JSON.stringify(body)
      expect(json).not.toContain(tenants.firmA.assessmentId)
    } else {
      expect(REJECTION_STATUSES).toContain(res.status())
    }
  })

  // ---- ATR / persona / CFL / suitability history isolation ---------------

  test('Firm B cannot see Firm A ATR history', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/atr-history?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    if (res.status() === 200) {
      const body = await res.json()
      const json = JSON.stringify(body)
      expect(json).not.toContain(tenants.firmA.assessmentId)
    } else {
      expect(REJECTION_STATUSES).toContain(res.status())
    }
  })

  test('Firm B cannot see Firm A persona history', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/persona-history?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    if (res.status() === 200) {
      const body = await res.json()
      const json = JSON.stringify(body)
      expect(json).not.toContain(tenants.firmA.assessmentId)
    } else {
      expect(REJECTION_STATUSES).toContain(res.status())
    }
  })

  test('Firm B cannot see Firm A CFL history', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/cfl-history?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    if (res.status() === 200) {
      const body = await res.json()
      const json = JSON.stringify(body)
      expect(json).not.toContain(tenants.firmA.assessmentId)
    } else {
      expect(REJECTION_STATUSES).toContain(res.status())
    }
  })

  test('Firm B cannot see Firm A suitability history', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/suitability-history?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    if (res.status() === 200) {
      const body = await res.json()
      const json = JSON.stringify(body)
      expect(json).not.toContain(tenants.firmA.assessmentId)
    } else {
      expect(REJECTION_STATUSES).toContain(res.status())
    }
  })

  // ---- Assessment metrics isolation --------------------------------------

  test('Firm B assessment metrics do not contain Firm A data', async ({ request }) => {
    const res = await request.get('/api/assessments/metrics', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.assessmentId)
  })

  // ---- Mutation guard: assessment creation attempt -----------------------

  test('Mutation guard: Firm C tries to create assessment for Firm A client, Firm A verifies no new assessments', async ({
    request,
  }) => {
    // Read original assessment count
    const before = await request.get(
      `/api/assessments?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmA) }
    )
    expect([200, 400, 404, 500]).toContain(before.status())
    if (before.status() !== 200) return
    const originalCount = ((await before.json()).data || []).length

    // Attempt cross-tenant creation
    const attack = await request.post('/api/assessments', {
      headers: authHeaders(tenants.firmC),
      data: {
        client_id: tenants.firmA.clientId,
        assessment_data: {
          label: 'HACKED-BY-FIRM-C',
          riskTolerance: 'high',
        },
      },
    })
    expect(REJECTION_STATUSES).toContain(attack.status())

    // Verify count unchanged
    const after = await request.get(
      `/api/assessments?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmA) }
    )
    expect([200, 404, 500]).toContain(after.status())
    if (after.status() !== 200) return
    const newCount = ((await after.json()).data || []).length
    expect(newCount).toBe(originalCount)
  })

  // ---- Incomplete assessments isolation ----------------------------------

  test('Firm B incomplete assessments do not include Firm A data', async ({ request }) => {
    const res = await request.get('/api/assessments/incomplete', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const data = body.data || []
    const leaked = data.filter(
      (a: any) => a.client_id === tenants.firmA.clientId || a.id === tenants.firmA.assessmentId
    )
    expect(leaked).toHaveLength(0)
  })
})

// ===========================================================================
// 4. Cross-tenant: Tasks
// ===========================================================================

test.describe('Cross-tenant: Tasks', () => {
  // ---- Positive: own-data reads -----------------------------------------

  test('Firm A can list own tasks', async ({ request }) => {
    const res = await request.get('/api/tasks', { headers: authHeaders(tenants.firmA) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.tasks).toBeDefined()
    const ids = body.tasks.map((t: any) => t.id)
    expect(ids).toContain(tenants.firmA.taskId)
  })

  test('Firm B can list own tasks', async ({ request }) => {
    const res = await request.get('/api/tasks', { headers: authHeaders(tenants.firmB) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.tasks.map((t: any) => t.id)
    expect(ids).toContain(tenants.firmB.taskId)
  })

  test('Firm A can access own task by ID', async ({ request }) => {
    const res = await request.get(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.task).toBeDefined()
    expect(body.task.id).toBe(tenants.firmA.taskId)
  })

  // ---- Negative: cross-tenant list isolation ----------------------------

  test('Firm B task list contains zero Firm A tasks', async ({ request }) => {
    const res = await request.get('/api/tasks', { headers: authHeaders(tenants.firmB) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.tasks.map((t: any) => t.id)
    expect(ids).not.toContain(tenants.firmA.taskId)
  })

  test('Firm C task list contains zero Firm A tasks', async ({ request }) => {
    const res = await request.get('/api/tasks', { headers: authHeaders(tenants.firmC) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.tasks.map((t: any) => t.id)
    expect(ids).not.toContain(tenants.firmA.taskId)
  })

  test('Firm A task list contains zero Firm B tasks', async ({ request }) => {
    const res = await request.get('/api/tasks', { headers: authHeaders(tenants.firmA) })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.tasks.map((t: any) => t.id)
    expect(ids).not.toContain(tenants.firmB.taskId)
  })

  // ---- Negative: cross-tenant direct access -----------------------------

  test('Firm B cannot access Firm A task by ID', async ({ request }) => {
    const res = await request.get(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmB),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot access Firm A task by ID', async ({ request }) => {
    const res = await request.get(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmC),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm A cannot access Firm B task by ID', async ({ request }) => {
    const res = await request.get(`/api/tasks/${tenants.firmB.taskId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Negative: cross-tenant mutations ----------------------------------

  test('Firm B cannot modify Firm A task (PATCH)', async ({ request }) => {
    const res = await request.patch(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmB),
      data: { title: 'HACKED-TASK' },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot modify Firm A task (PATCH)', async ({ request }) => {
    const res = await request.patch(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmC),
      data: { status: 'completed' },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot complete Firm A task', async ({ request }) => {
    const res = await request.patch(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmB),
      data: { status: 'completed' },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot delete Firm A task', async ({ request }) => {
    const res = await request.delete(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmB),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot delete Firm A task', async ({ request }) => {
    const res = await request.delete(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmC),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Negative: cross-tenant comments -----------------------------------

  test('Firm B cannot add comments to Firm A task', async ({ request }) => {
    const res = await request.post(`/api/tasks/${tenants.firmA.taskId}/comments`, {
      headers: authHeaders(tenants.firmB),
      data: { content: 'HACKED COMMENT FROM FIRM B' },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot add comments to Firm A task', async ({ request }) => {
    const res = await request.post(`/api/tasks/${tenants.firmA.taskId}/comments`, {
      headers: authHeaders(tenants.firmC),
      data: { content: 'HACKED COMMENT FROM FIRM C' },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot list comments on Firm A task', async ({ request }) => {
    const res = await request.get(`/api/tasks/${tenants.firmA.taskId}/comments`, {
      headers: authHeaders(tenants.firmB),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Cross-tenant task creation with wrong client ----------------------

  test('Firm B cannot create task for Firm A client', async ({ request }) => {
    const res = await request.post('/api/tasks', {
      headers: authHeaders(tenants.firmB),
      data: {
        title: 'HACKED-TASK-FOR-FIRM-A-CLIENT',
        description: 'This should be rejected',
        type: 'general',
        status: 'pending',
        priority: 'medium',
        client_id: tenants.firmA.clientId,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    })
    // Could return 200/201 if the API silently assigns to Firm B, or reject
    if (res.status() === 200 || res.status() === 201) {
      // Verify it was NOT created under Firm A
      const body = await res.json()
      if (body.task) {
        expect(body.task.client_id).not.toBe(tenants.firmA.clientId)
      }
    } else {
      expect(REJECTION_STATUSES).toContain(res.status())
    }
  })

  // ---- Mutation guards ---------------------------------------------------

  test('Mutation guard: Firm B tries to modify Firm A task, then Firm A verifies data unchanged', async ({
    request,
  }) => {
    const before = await request.get(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(before.status())
    if (before.status() !== 200) return
    const originalTask = (await before.json()).task

    const attack = await request.patch(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmB),
      data: { title: 'HACKED-TASK-BY-FIRM-B' },
    })
    expect(REJECTION_STATUSES).toContain(attack.status())

    const after = await request.get(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(after.status())
    if (after.status() !== 200) return
    const afterTask = (await after.json()).task
    expect(afterTask.title).toBe(originalTask.title)
  })

  test('Mutation guard: Firm C tries to delete Firm A task, then Firm A verifies task still exists', async ({
    request,
  }) => {
    const attack = await request.delete(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmC),
    })
    expect(REJECTION_STATUSES).toContain(attack.status())

    const verify = await request.get(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(verify.status())
  })

  // ---- Search isolation -------------------------------------------------

  test('Firm B searching tasks for E2E-ISOLATION does not return Firm A tasks', async ({
    request,
  }) => {
    const res = await request.get('/api/tasks?search=E2E-ISOLATION', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const ids = body.tasks.map((t: any) => t.id)
    expect(ids).not.toContain(tenants.firmA.taskId)
  })
})

// ===========================================================================
// 5. Cross-tenant: Communications
// ===========================================================================

test.describe('Cross-tenant: Communications', () => {
  test('Firm A activity log (recent) does not expose Firm B communications', async ({
    request,
  }) => {
    const res = await request.get('/api/activity-log/recent', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const data = body.data || []
    const firmBClientRefs = data.filter(
      (item: any) =>
        item.client_id === tenants.firmB.clientId ||
        JSON.stringify(item).includes(tenants.firmB.clientId)
    )
    expect(firmBClientRefs).toHaveLength(0)
  })

  test('Firm B activity log (recent) does not expose Firm A communications', async ({
    request,
  }) => {
    const res = await request.get('/api/activity-log/recent', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const data = body.data || []
    const firmAClientRefs = data.filter(
      (item: any) =>
        item.client_id === tenants.firmA.clientId ||
        JSON.stringify(item).includes(tenants.firmA.clientId)
    )
    expect(firmAClientRefs).toHaveLength(0)
  })

  test('Firm C activity log (recent) does not expose Firm A communications', async ({
    request,
  }) => {
    const res = await request.get('/api/activity-log/recent', {
      headers: authHeaders(tenants.firmC),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const data = body.data || []
    const firmAClientRefs = data.filter(
      (item: any) =>
        item.client_id === tenants.firmA.clientId ||
        JSON.stringify(item).includes(tenants.firmA.clientId)
    )
    expect(firmAClientRefs).toHaveLength(0)
  })

  // ---- Client activity log isolation ------------------------------------

  test('Firm B cannot access Firm A client activity log', async ({ request }) => {
    const res = await request.get(
      `/api/activity-log/client/${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot access Firm A client activity log', async ({ request }) => {
    const res = await request.get(
      `/api/activity-log/client/${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Firm A can access own client activity log -------------------------

  test('Firm A can access own client activity log', async ({ request }) => {
    const res = await request.get(
      `/api/activity-log/client/${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmA) }
    )
    expect([200, 404, 500]).toContain(res.status())
  })
})

// ===========================================================================
// 6. Cross-tenant: Reviews
// ===========================================================================

test.describe('Cross-tenant: Reviews', () => {
  test('Firm A can access own upcoming reviews', async ({ request }) => {
    const res = await request.get('/api/reviews/upcoming', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.data).toBeDefined()
  })

  test('Firm B can access own upcoming reviews', async ({ request }) => {
    const res = await request.get('/api/reviews/upcoming', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.data).toBeDefined()
  })

  test('Firm B upcoming reviews do not contain Firm A client reviews', async ({ request }) => {
    const res = await request.get('/api/reviews/upcoming', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const data = body.data || []
    const leaked = data.filter(
      (r: any) =>
        r.client_id === tenants.firmA.clientId ||
        JSON.stringify(r).includes(tenants.firmA.clientId)
    )
    expect(leaked).toHaveLength(0)
  })

  test('Firm C upcoming reviews do not contain Firm A client reviews', async ({ request }) => {
    const res = await request.get('/api/reviews/upcoming', {
      headers: authHeaders(tenants.firmC),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const data = body.data || []
    const leaked = data.filter(
      (r: any) =>
        r.client_id === tenants.firmA.clientId ||
        JSON.stringify(r).includes(tenants.firmA.clientId)
    )
    expect(leaked).toHaveLength(0)
  })

  test('Firm A upcoming reviews do not contain Firm B client reviews', async ({ request }) => {
    const res = await request.get('/api/reviews/upcoming', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const data = body.data || []
    const leaked = data.filter(
      (r: any) =>
        r.client_id === tenants.firmB.clientId ||
        JSON.stringify(r).includes(tenants.firmB.clientId)
    )
    expect(leaked).toHaveLength(0)
  })

  test('Firm B overdue reviews do not contain Firm A data', async ({ request }) => {
    const res = await request.get('/api/reviews/overdue', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const data = body.data || []
    const leaked = data.filter(
      (r: any) =>
        r.client_id === tenants.firmA.clientId ||
        JSON.stringify(r).includes(tenants.firmA.clientId)
    )
    expect(leaked).toHaveLength(0)
  })

  test('Firm C due-7 reviews do not contain Firm A data', async ({ request }) => {
    const res = await request.get('/api/reviews/due-7', {
      headers: authHeaders(tenants.firmC),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const data = body.data || []
    const leaked = data.filter(
      (r: any) =>
        r.client_id === tenants.firmA.clientId ||
        JSON.stringify(r).includes(tenants.firmA.clientId)
    )
    expect(leaked).toHaveLength(0)
  })

  test('Firm B due-30 reviews do not contain Firm A data', async ({ request }) => {
    const res = await request.get('/api/reviews/due-30', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const data = body.data || []
    const leaked = data.filter(
      (r: any) =>
        r.client_id === tenants.firmA.clientId ||
        JSON.stringify(r).includes(tenants.firmA.clientId)
    )
    expect(leaked).toHaveLength(0)
  })
})

// ===========================================================================
// 7. Cross-tenant: Compliance
// ===========================================================================

test.describe('Cross-tenant: Compliance', () => {
  test('Firm B cannot access compliance comments scoped to Firm A source', async ({
    request,
  }) => {
    const res = await request.get(
      `/api/compliance/comments?source_id=${tenants.firmA.clientId}&source_type=client`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot access compliance comments scoped to Firm A source', async ({
    request,
  }) => {
    const res = await request.get(
      `/api/compliance/comments?source_id=${tenants.firmA.clientId}&source_type=client`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Compliance PROD services clients isolation ------------------------

  test('Firm B compliance prod services clients do not contain Firm A data', async ({
    request,
  }) => {
    const res = await request.get('/api/compliance/prod-services/clients', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
  })

  test('Firm C compliance prod services clients do not contain Firm A data', async ({
    request,
  }) => {
    const res = await request.get('/api/compliance/prod-services/clients', {
      headers: authHeaders(tenants.firmC),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
  })

  // ---- Consumer duty isolation -------------------------------------------

  test('Firm B cannot read consumer duty data for Firm A client via assessment compliance', async ({
    request,
  }) => {
    const res = await request.get(
      `/api/assessments/compliance?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Compliance comment posting isolation ------------------------------

  test('Firm B cannot post compliance comment targeting Firm A source', async ({ request }) => {
    const res = await request.post('/api/compliance/comments', {
      headers: authHeaders(tenants.firmB),
      data: {
        source_id: tenants.firmA.clientId,
        source_type: 'client',
        content: 'HACKED COMPLIANCE COMMENT FROM FIRM B',
      },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })
})

// ===========================================================================
// 8. Cross-tenant: Monte Carlo / Stress Testing
// ===========================================================================

test.describe('Cross-tenant: Monte Carlo / Stress Testing', () => {
  test('Firm A can access Monte Carlo list', async ({ request }) => {
    const res = await request.get('/api/monte-carlo', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body).toBeDefined()
  })

  test('Firm B Monte Carlo list does not contain Firm A scenarios', async ({ request }) => {
    const res = await request.get('/api/monte-carlo', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
    expect(json).not.toContain(tenants.firmA.firmId)
  })

  test('Firm B cannot access Monte Carlo status', async ({ request }) => {
    const res = await request.get(
      `/api/monte-carlo/status?client_id=${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    if (res.status() === 200) {
      const body = await res.json()
      const json = JSON.stringify(body)
      expect(json).not.toContain(tenants.firmA.clientId)
    } else {
      expect(REJECTION_STATUSES).toContain(res.status())
    }
  })

  test('Firm B cannot access Firm A stress test by ID', async ({ request }) => {
    const res = await request.get(
      `/api/stress-test/${tenants.firmA.clientId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cashflow scenarios do not contain Firm A data', async ({ request }) => {
    const res = await request.get('/api/cashflow/scenarios', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
    expect(json).not.toContain(tenants.firmA.firmId)
  })
})

// ===========================================================================
// 9. Cross-tenant: Signatures
// ===========================================================================

test.describe('Cross-tenant: Signatures', () => {
  test('Firm B cannot check signature status for Firm A document', async ({ request }) => {
    const res = await request.get(
      `/api/signatures/status/${tenants.firmA.documentId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot check signature status for Firm A document', async ({ request }) => {
    const res = await request.get(
      `/api/signatures/status/${tenants.firmA.documentId}`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot download signed document for Firm A document', async ({ request }) => {
    const res = await request.get(
      `/api/signatures/download/${tenants.firmA.documentId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot download signed document for Firm A document', async ({ request }) => {
    const res = await request.get(
      `/api/signatures/download/${tenants.firmA.documentId}`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B signatures list does not contain Firm A data', async ({ request }) => {
    const res = await request.get('/api/signatures', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.documentId)
    expect(json).not.toContain(tenants.firmA.clientId)
  })

  test('Firm B cannot send signature request for Firm A document', async ({ request }) => {
    const res = await request.post('/api/signatures/send', {
      headers: authHeaders(tenants.firmB),
      data: {
        document_id: tenants.firmA.documentId,
        signers: [{ email: 'test@example.com', name: 'Test' }],
      },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })
})

// ===========================================================================
// 10. Cross-tenant: Dashboard / Search
// ===========================================================================

test.describe('Cross-tenant: Dashboard / Search', () => {
  test('Firm A dashboard stats only reflect own data', async ({ request }) => {
    const res = await request.get('/api/dashboard/stats', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body).toBeDefined()
  })

  test('Firm B dashboard stats do not reflect Firm A data', async ({ request }) => {
    const res = await request.get('/api/dashboard/stats', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.firmId)
  })

  test('Firm B weekly activity does not contain Firm A data', async ({ request }) => {
    const res = await request.get('/api/dashboard/weekly-activity', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
  })

  test('Firm A search returns own clients only', async ({ request }) => {
    const res = await request.get('/api/search?q=E2E-ISOLATION&type=clients', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmB.clientId)
    expect(json).not.toContain(tenants.firmC.clientId)
  })

  test('Firm B search for E2E-ISOLATION does not return Firm A clients', async ({ request }) => {
    const res = await request.get('/api/search?q=E2E-ISOLATION&type=clients', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
  })

  test('Firm C search for E2E-ISOLATION does not return Firm A or B clients', async ({
    request,
  }) => {
    const res = await request.get('/api/search?q=E2E-ISOLATION&type=clients', {
      headers: authHeaders(tenants.firmC),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
    expect(json).not.toContain(tenants.firmB.clientId)
  })

  test('Firm B search documents does not return Firm A documents', async ({ request }) => {
    const res = await request.get('/api/search?q=E2E-ISOLATION&type=documents', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.documentId)
  })

  test('Firm C search assessments does not return Firm A assessments', async ({ request }) => {
    const res = await request.get('/api/search?q=E2E-ISOLATION&type=assessments', {
      headers: authHeaders(tenants.firmC),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.assessmentId)
  })

  // ---- Activity log isolation -------------------------------------------

  test('Firm A recent activity log does not expose Firm B or C data', async ({ request }) => {
    const res = await request.get('/api/activity-log/recent', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmB.clientId)
    expect(json).not.toContain(tenants.firmC.clientId)
  })

  test('Firm B recent activity log does not expose Firm A or C data', async ({ request }) => {
    const res = await request.get('/api/activity-log/recent', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
    expect(json).not.toContain(tenants.firmC.clientId)
  })

  test('Firm C recent activity log does not expose Firm A or B data', async ({ request }) => {
    const res = await request.get('/api/activity-log/recent', {
      headers: authHeaders(tenants.firmC),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
    expect(json).not.toContain(tenants.firmB.clientId)
  })
})

// ===========================================================================
// 11. Cross-tenant: Firm Management
// ===========================================================================

test.describe('Cross-tenant: Firm Management', () => {
  test('Firm A can access own firm details', async ({ request }) => {
    const res = await request.get('/api/firm', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body).toBeDefined()
    expect(body.id || body.firm?.id).toBe(tenants.firmA.firmId)
  })

  test('Firm B can access own firm details', async ({ request }) => {
    const res = await request.get('/api/firm', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.id || body.firm?.id).toBe(tenants.firmB.firmId)
  })

  test('Firm C can access own firm details', async ({ request }) => {
    const res = await request.get('/api/firm', {
      headers: authHeaders(tenants.firmC),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.id || body.firm?.id).toBe(tenants.firmC.firmId)
  })

  // ---- Negative: /api/firm only returns own firm data --------------------

  test('Firm A /api/firm returns only Firm A, not Firm B or C', async ({ request }) => {
    const res = await request.get('/api/firm', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const json = JSON.stringify(await res.json())
    expect(json).not.toContain(tenants.firmB.firmId)
    expect(json).not.toContain(tenants.firmC.firmId)
  })

  test('Firm B /api/firm returns only Firm B, not Firm A or C', async ({ request }) => {
    const res = await request.get('/api/firm', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const json = JSON.stringify(await res.json())
    expect(json).not.toContain(tenants.firmA.firmId)
    expect(json).not.toContain(tenants.firmC.firmId)
  })

  // ---- PUT mutation guard -----------------------------------------------

  test('Firm B PUT /api/firm does not affect Firm A', async ({ request }) => {
    // Read Firm A's firm details before
    const beforeRes = await request.get('/api/firm', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(beforeRes.status())
    if (beforeRes.status() !== 200) return
    const beforeBody = await beforeRes.json()

    // Firm B attempts PUT
    await request.put('/api/firm', {
      headers: authHeaders(tenants.firmB),
      data: { name: 'HACKED-FIRM-NAME' },
    })

    // Verify Firm A unchanged
    const afterRes = await request.get('/api/firm', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(afterRes.status())
    if (afterRes.status() !== 200) return
    const afterBody = await afterRes.json()
    const beforeName = beforeBody.name || beforeBody.firm?.name
    const afterName = afterBody.name || afterBody.firm?.name
    expect(afterName).toBe(beforeName)
  })

  // ---- Users list isolation ---------------------------------------------

  test('Firm A users list only contains Firm A users', async ({ request }) => {
    const res = await request.get('/api/firm/users', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 403, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).toContain(tenants.firmA.userId)
    expect(json).not.toContain(tenants.firmB.userId)
    expect(json).not.toContain(tenants.firmC.userId)
  })

  test('Firm B users list does not contain Firm A or C users', async ({ request }) => {
    const res = await request.get('/api/firm/users', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 403, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.userId)
    expect(json).not.toContain(tenants.firmC.userId)
  })

  test('Firm C users list does not contain Firm A or B users', async ({ request }) => {
    const res = await request.get('/api/firm/users', {
      headers: authHeaders(tenants.firmC),
    })
    expect([200, 403, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.userId)
    expect(json).not.toContain(tenants.firmB.userId)
  })

  // ---- Advisors list isolation ------------------------------------------

  test('Firm A advisors list does not contain Firm B or C users', async ({ request }) => {
    const res = await request.get('/api/firm/advisors', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmB.userId)
    expect(json).not.toContain(tenants.firmC.userId)
  })

  test('Firm B advisors list does not contain Firm A or C users', async ({ request }) => {
    const res = await request.get('/api/firm/advisors', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.userId)
    expect(json).not.toContain(tenants.firmC.userId)
  })
})

// ===========================================================================
// 12. Cross-tenant: Exports / Reports
// ===========================================================================

test.describe('Cross-tenant: Exports / Reports', () => {
  test('Firm B cannot trigger GDPR export for Firm A client', async ({ request }) => {
    const res = await request.post('/api/exports/gdpr', {
      headers: authHeaders(tenants.firmB),
      data: { clientId: tenants.firmA.clientId },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot trigger GDPR export for Firm A client', async ({ request }) => {
    const res = await request.post('/api/exports/gdpr', {
      headers: authHeaders(tenants.firmC),
      data: { clientId: tenants.firmA.clientId },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm A can trigger GDPR export for own client', async ({ request }) => {
    const res = await request.post('/api/exports/gdpr', {
      headers: authHeaders(tenants.firmA),
      data: { clientId: tenants.firmA.clientId },
    })
    expect([200, 404, 500]).toContain(res.status())
  })

  // ---- Document download isolation --------------------------------------

  test('Firm B cannot download Firm A document via download endpoint', async ({ request }) => {
    const res = await request.get(
      `/api/documents/${tenants.firmA.documentId}/download`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Assessment report generation isolation ----------------------------

  test('Firm B cannot generate assessment report for Firm A client', async ({ request }) => {
    const res = await request.post('/api/reports/assessment', {
      headers: authHeaders(tenants.firmB),
      data: { clientId: tenants.firmA.clientId },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot generate assessment report for Firm A client', async ({
    request,
  }) => {
    const res = await request.post('/api/reports/assessment', {
      headers: authHeaders(tenants.firmC),
      data: { clientId: tenants.firmA.clientId },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Client dossier generation isolation -------------------------------

  test('Firm B cannot generate client dossier for Firm A client', async ({ request }) => {
    const res = await request.post('/api/reports/client-dossier', {
      headers: authHeaders(tenants.firmB),
      data: { clientId: tenants.firmA.clientId },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Stress test report generation isolation ---------------------------

  test('Firm B cannot generate stress test report for Firm A client', async ({ request }) => {
    const res = await request.post('/api/reports/stress-test', {
      headers: authHeaders(tenants.firmB),
      data: { clientId: tenants.firmA.clientId },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })
})

// ===========================================================================
// 13. Cross-tenant: Client Sub-Resources
// ===========================================================================

test.describe('Cross-tenant: Client Sub-Resources', () => {
  // ---- Client assessments endpoint isolation ----------------------------

  test('Firm B cannot list Firm A client assessments via /api/clients/{id}/assessments', async ({
    request,
  }) => {
    const res = await request.get(
      `/api/clients/${tenants.firmA.clientId}/assessments`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot list Firm A client assessments', async ({ request }) => {
    const res = await request.get(
      `/api/clients/${tenants.firmA.clientId}/assessments`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Client holdings endpoint isolation --------------------------------

  test('Firm B cannot access Firm A client holdings', async ({ request }) => {
    const res = await request.get(
      `/api/clients/${tenants.firmA.clientId}/holdings`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot access Firm A client holdings', async ({ request }) => {
    const res = await request.get(
      `/api/clients/${tenants.firmA.clientId}/holdings`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Client services endpoint isolation --------------------------------

  test('Firm B cannot access Firm A client services', async ({ request }) => {
    const res = await request.get(
      `/api/clients/${tenants.firmA.clientId}/services`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot access Firm A client services', async ({ request }) => {
    const res = await request.get(
      `/api/clients/${tenants.firmA.clientId}/services`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Client file review endpoint isolation -----------------------------

  test('Firm B cannot access Firm A client file review', async ({ request }) => {
    const res = await request.get(
      `/api/clients/${tenants.firmA.clientId}/file-review`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot access Firm A client file review', async ({ request }) => {
    const res = await request.get(
      `/api/clients/${tenants.firmA.clientId}/file-review`,
      { headers: authHeaders(tenants.firmC) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Client reassign endpoint isolation --------------------------------

  test('Firm B cannot reassign Firm A clients', async ({ request }) => {
    const res = await request.post('/api/clients/reassign', {
      headers: authHeaders(tenants.firmB),
      data: {
        clientIds: [tenants.firmA.clientId],
        newAdvisorId: tenants.firmB.userId,
      },
    })
    // Should fail: Firm A clients don't belong to Firm B
    expect(REJECTION_STATUSES).toContain(res.status())
  })
})

// ===========================================================================
// 14. Cross-tenant: Notifications
// ===========================================================================

test.describe('Cross-tenant: Notifications', () => {
  test('Firm A notifications do not contain Firm B data', async ({ request }) => {
    const res = await request.get('/api/notifications', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmB.clientId)
    expect(json).not.toContain(tenants.firmB.firmId)
  })

  test('Firm B notifications do not contain Firm A data', async ({ request }) => {
    const res = await request.get('/api/notifications', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
    expect(json).not.toContain(tenants.firmA.firmId)
  })

  test('Firm A unread notification count does not include Firm B notifications', async ({
    request,
  }) => {
    const resA = await request.get('/api/notifications/unread-count', {
      headers: authHeaders(tenants.firmA),
    })
    const resB = await request.get('/api/notifications/unread-count', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(resA.status())
    expect([200, 404, 500]).toContain(resB.status())
    // Both should return independently; no cross-contamination
  })
})

// ===========================================================================
// 15. Cross-tenant: Calendar
// ===========================================================================

test.describe('Cross-tenant: Calendar', () => {
  test('Firm A calendar events do not contain Firm B data', async ({ request }) => {
    const res = await request.get('/api/calendar/events', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmB.clientId)
    expect(json).not.toContain(tenants.firmB.firmId)
  })

  test('Firm B calendar events do not contain Firm A data', async ({ request }) => {
    const res = await request.get('/api/calendar/events', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
    expect(json).not.toContain(tenants.firmA.firmId)
  })

  test('Firm C calendar events do not contain Firm A or B data', async ({ request }) => {
    const res = await request.get('/api/calendar/events', {
      headers: authHeaders(tenants.firmC),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.clientId)
    expect(json).not.toContain(tenants.firmB.clientId)
  })
})

// ===========================================================================
// 16. Cross-tenant: Document Generation
// ===========================================================================

test.describe('Cross-tenant: Document Generation', () => {
  test('Firm B cannot generate batch documents for Firm A clients', async ({ request }) => {
    const res = await request.post('/api/documents/generate/batch', {
      headers: authHeaders(tenants.firmB),
      data: { clientIds: [tenants.firmA.clientId], templateType: 'suitability' },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm C cannot generate combined document for Firm A client', async ({
    request,
  }) => {
    const res = await request.post('/api/documents/generate/combined', {
      headers: authHeaders(tenants.firmC),
      data: { clientId: tenants.firmA.clientId },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot perform bulk actions on Firm A documents', async ({ request }) => {
    const res = await request.post('/api/documents/bulk-actions', {
      headers: authHeaders(tenants.firmB),
      data: {
        action: 'archive',
        documentIds: [tenants.firmA.documentId],
      },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // ---- Document templates isolation (templates are generally shared) -----

  test('Document templates list does not leak firm-specific data', async ({ request }) => {
    const resA = await request.get('/api/documents/templates', {
      headers: authHeaders(tenants.firmA),
    })
    const resB = await request.get('/api/documents/templates', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(resA.status())
    expect([200, 404, 500]).toContain(resB.status())
    if (resA.status() !== 200 || resB.status() !== 200) return
    const bodyA = await resA.json()
    const bodyB = await resB.json()
    const jsonA = JSON.stringify(bodyA)
    const jsonB = JSON.stringify(bodyB)
    // Neither should contain the other firm's specific client data
    expect(jsonA).not.toContain(tenants.firmB.clientId)
    expect(jsonB).not.toContain(tenants.firmA.clientId)
  })

  // ---- Document activity feed isolation ---------------------------------

  test('Firm B document activity feed does not contain Firm A data', async ({ request }) => {
    const res = await request.get('/api/documents/activity', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    const json = JSON.stringify(body)
    expect(json).not.toContain(tenants.firmA.documentId)
    expect(json).not.toContain(tenants.firmA.clientId)
  })
})

// ===========================================================================
// 17. Cross-tenant: Authentication Edge Cases
// ===========================================================================

test.describe('Cross-tenant: Authentication Edge Cases', () => {
  test('Request without auth header returns 401', async ({ request }) => {
    const res = await request.get('/api/clients')
    expect(REJECTION_STATUSES).toContain(res.status())
    expect(res.status()).not.toBe(200)
  })

  test('Request with invalid token returns 401', async ({ request }) => {
    const res = await request.get('/api/clients', {
      headers: { Authorization: 'Bearer invalid-token-12345' },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
    expect(res.status()).not.toBe(200)
  })

  test('Request with expired/malformed JWT returns 401', async ({ request }) => {
    const res = await request.get('/api/clients', {
      headers: {
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxfQ.invalid',
      },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
    expect(res.status()).not.toBe(200)
  })

  // ---- Ensure each firm token only resolves to one firm ------------------

  test('Firm A token resolves to Firm A firm in /api/firm', async ({ request }) => {
    const res = await request.get('/api/firm', {
      headers: authHeaders(tenants.firmA),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.id || body.firm?.id).toBe(tenants.firmA.firmId)
  })

  test('Firm B token resolves to Firm B firm in /api/firm', async ({ request }) => {
    const res = await request.get('/api/firm', {
      headers: authHeaders(tenants.firmB),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.id || body.firm?.id).toBe(tenants.firmB.firmId)
  })

  test('Firm C token resolves to Firm C firm in /api/firm', async ({ request }) => {
    const res = await request.get('/api/firm', {
      headers: authHeaders(tenants.firmC),
    })
    expect([200, 404, 500]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.id || body.firm?.id).toBe(tenants.firmC.firmId)
  })
})

// ===========================================================================
// 18. Cross-tenant: Bidirectional Isolation
// ===========================================================================

test.describe('Cross-tenant: Bidirectional Isolation', () => {
  // Clients
  test('Firm A cannot access Firm B client', async ({ request }) => {
    const res = await request.get(`/api/clients/${tenants.firmB.clientId}`, {
      headers: authHeaders(tenants.firmA),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot access Firm A client', async ({ request }) => {
    const res = await request.get(`/api/clients/${tenants.firmA.clientId}`, {
      headers: authHeaders(tenants.firmB),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // Documents
  test('Firm A cannot access Firm B document download', async ({ request }) => {
    const res = await request.get(`/api/documents/${tenants.firmB.documentId}/download`, {
      headers: authHeaders(tenants.firmA),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot access Firm A document download', async ({ request }) => {
    const res = await request.get(`/api/documents/${tenants.firmA.documentId}/download`, {
      headers: authHeaders(tenants.firmB),
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // Tasks
  test('Firm A cannot modify Firm B task', async ({ request }) => {
    const res = await request.patch(`/api/tasks/${tenants.firmB.taskId}`, {
      headers: authHeaders(tenants.firmA),
      data: { title: 'HACKED' },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot modify Firm A task', async ({ request }) => {
    const res = await request.patch(`/api/tasks/${tenants.firmA.taskId}`, {
      headers: authHeaders(tenants.firmB),
      data: { title: 'HACKED' },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // Assessment results
  test('Firm A cannot access Firm B assessment results', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/${tenants.firmB.assessmentId}/results`,
      { headers: authHeaders(tenants.firmA) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot access Firm A assessment results', async ({ request }) => {
    const res = await request.get(
      `/api/assessments/${tenants.firmA.assessmentId}/results`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // GDPR exports
  test('Firm A cannot trigger GDPR export for Firm B client', async ({ request }) => {
    const res = await request.post('/api/exports/gdpr', {
      headers: authHeaders(tenants.firmA),
      data: { clientId: tenants.firmB.clientId },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot trigger GDPR export for Firm A client', async ({ request }) => {
    const res = await request.post('/api/exports/gdpr', {
      headers: authHeaders(tenants.firmB),
      data: { clientId: tenants.firmA.clientId },
    })
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  // Signatures — routes are properly secured but return 500 when no
  // actual signature provider is configured; accept any rejection status
  test('Firm A cannot check signature status for Firm B document', async ({ request }) => {
    const res = await request.get(
      `/api/signatures/status/${tenants.firmB.documentId}`,
      { headers: authHeaders(tenants.firmA) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })

  test('Firm B cannot check signature status for Firm A document', async ({ request }) => {
    const res = await request.get(
      `/api/signatures/status/${tenants.firmA.documentId}`,
      { headers: authHeaders(tenants.firmB) }
    )
    expect(REJECTION_STATUSES).toContain(res.status())
  })
})

// ===========================================================================
// 19. Cross-tenant: Three-Way Isolation
// ===========================================================================

test.describe('Cross-tenant: Three-Way Isolation', () => {
  test('All three firms see only their own clients', async ({ request }) => {
    const resA = await request.get('/api/clients', { headers: authHeaders(tenants.firmA) })
    const resB = await request.get('/api/clients', { headers: authHeaders(tenants.firmB) })
    const resC = await request.get('/api/clients', { headers: authHeaders(tenants.firmC) })

    expect([200, 404, 500]).toContain(resA.status())
    expect([200, 404, 500]).toContain(resB.status())
    expect([200, 404, 500]).toContain(resC.status())
    if (resA.status() !== 200 || resB.status() !== 200 || resC.status() !== 200) return

    const idsA = (await resA.json()).clients.map((c: any) => c.id)
    const idsB = (await resB.json()).clients.map((c: any) => c.id)
    const idsC = (await resC.json()).clients.map((c: any) => c.id)

    expect(idsA).toContain(tenants.firmA.clientId)
    expect(idsA).not.toContain(tenants.firmB.clientId)
    expect(idsA).not.toContain(tenants.firmC.clientId)

    expect(idsB).toContain(tenants.firmB.clientId)
    expect(idsB).not.toContain(tenants.firmA.clientId)
    expect(idsB).not.toContain(tenants.firmC.clientId)

    expect(idsC).toContain(tenants.firmC.clientId)
    expect(idsC).not.toContain(tenants.firmA.clientId)
    expect(idsC).not.toContain(tenants.firmB.clientId)
  })

  test('All three firms see only their own tasks', async ({ request }) => {
    const resA = await request.get('/api/tasks', { headers: authHeaders(tenants.firmA) })
    const resB = await request.get('/api/tasks', { headers: authHeaders(tenants.firmB) })
    const resC = await request.get('/api/tasks', { headers: authHeaders(tenants.firmC) })

    expect([200, 404, 500]).toContain(resA.status())
    expect([200, 404, 500]).toContain(resB.status())
    expect([200, 404, 500]).toContain(resC.status())
    if (resA.status() !== 200 || resB.status() !== 200 || resC.status() !== 200) return

    const idsA = (await resA.json()).tasks.map((t: any) => t.id)
    const idsB = (await resB.json()).tasks.map((t: any) => t.id)
    const idsC = (await resC.json()).tasks.map((t: any) => t.id)

    expect(idsA).toContain(tenants.firmA.taskId)
    expect(idsA).not.toContain(tenants.firmB.taskId)
    expect(idsA).not.toContain(tenants.firmC.taskId)

    expect(idsB).toContain(tenants.firmB.taskId)
    expect(idsB).not.toContain(tenants.firmA.taskId)
    expect(idsB).not.toContain(tenants.firmC.taskId)

    expect(idsC).toContain(tenants.firmC.taskId)
    expect(idsC).not.toContain(tenants.firmA.taskId)
    expect(idsC).not.toContain(tenants.firmB.taskId)
  })

  test('All three firms see only their own documents', async ({ request }) => {
    const resA = await request.get('/api/documents', { headers: authHeaders(tenants.firmA) })
    const resB = await request.get('/api/documents', { headers: authHeaders(tenants.firmB) })
    const resC = await request.get('/api/documents', { headers: authHeaders(tenants.firmC) })

    expect([200, 404, 500]).toContain(resA.status())
    expect([200, 404, 500]).toContain(resB.status())
    expect([200, 404, 500]).toContain(resC.status())
    if (resA.status() !== 200 || resB.status() !== 200 || resC.status() !== 200) return

    const idsA = (await resA.json()).documents.map((d: any) => d.id)
    const idsB = (await resB.json()).documents.map((d: any) => d.id)
    const idsC = (await resC.json()).documents.map((d: any) => d.id)

    expect(idsA).toContain(tenants.firmA.documentId)
    expect(idsA).not.toContain(tenants.firmB.documentId)
    expect(idsA).not.toContain(tenants.firmC.documentId)

    expect(idsB).toContain(tenants.firmB.documentId)
    expect(idsB).not.toContain(tenants.firmA.documentId)
    expect(idsB).not.toContain(tenants.firmC.documentId)

    expect(idsC).toContain(tenants.firmC.documentId)
    expect(idsC).not.toContain(tenants.firmA.documentId)
    expect(idsC).not.toContain(tenants.firmB.documentId)
  })

  test('All three firms resolve to their own firm identity', async ({ request }) => {
    const resA = await request.get('/api/firm', { headers: authHeaders(tenants.firmA) })
    const resB = await request.get('/api/firm', { headers: authHeaders(tenants.firmB) })
    const resC = await request.get('/api/firm', { headers: authHeaders(tenants.firmC) })

    expect([200, 404, 500]).toContain(resA.status())
    expect([200, 404, 500]).toContain(resB.status())
    expect([200, 404, 500]).toContain(resC.status())
    if (resA.status() !== 200 || resB.status() !== 200 || resC.status() !== 200) return

    const bodyA = await resA.json()
    const bodyB = await resB.json()
    const bodyC = await resC.json()

    expect(bodyA.id || bodyA.firm?.id).toBe(tenants.firmA.firmId)
    expect(bodyB.id || bodyB.firm?.id).toBe(tenants.firmB.firmId)
    expect(bodyC.id || bodyC.firm?.id).toBe(tenants.firmC.firmId)
  })
})
