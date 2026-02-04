import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'

const DUMMY_ID = '00000000-0000-0000-0000-000000000000'

const routes: Array<{
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  path: string
  body?: Record<string, unknown>
}> = [
  // ── activity-log ──
  { method: 'get', path: '/api/activity-log' },
  { method: 'post', path: '/api/activity-log', body: {} },

  // ── admin/billing-config ──
  { method: 'get', path: '/api/admin/billing-config' },
  { method: 'put', path: '/api/admin/billing-config', body: {} },

  // ── admin/firms ──
  { method: 'get', path: '/api/admin/firms' },

  // ── admin/firms/[firmId] ──
  { method: 'get', path: `/api/admin/firms/${DUMMY_ID}` },

  // ── admin/stripe/firm/[firmId]/provision ──
  { method: 'post', path: `/api/admin/stripe/firm/${DUMMY_ID}/provision`, body: {} },

  // ── admin/stripe/firm/[firmId]/sync-seats ──
  { method: 'post', path: `/api/admin/stripe/firm/${DUMMY_ID}/sync-seats`, body: {} },

  // ── advisors ──
  { method: 'get', path: '/api/advisors' },

  // ── ai/complete ──
  { method: 'post', path: '/api/ai/complete', body: {} },

  // ── assessment-drafts ──
  { method: 'get', path: '/api/assessment-drafts' },
  { method: 'post', path: '/api/assessment-drafts', body: {} },
  { method: 'delete', path: '/api/assessment-drafts' },

  // ── assessments ──
  { method: 'get', path: '/api/assessments' },
  { method: 'post', path: '/api/assessments', body: {} },

  // ── assessments/atr ──
  { method: 'get', path: '/api/assessments/atr' },
  { method: 'post', path: '/api/assessments/atr', body: {} },
  { method: 'put', path: '/api/assessments/atr', body: {} },
  { method: 'delete', path: '/api/assessments/atr' },

  // ── assessments/atr/history ──
  { method: 'get', path: `/api/assessments/atr/history?clientId=${DUMMY_ID}` },

  // ── assessments/cfl ──
  { method: 'get', path: '/api/assessments/cfl' },
  { method: 'post', path: '/api/assessments/cfl', body: {} },
  { method: 'put', path: '/api/assessments/cfl', body: {} },
  { method: 'delete', path: '/api/assessments/cfl' },

  // ── assessments/cfl/history ──
  { method: 'get', path: `/api/assessments/cfl/history?clientId=${DUMMY_ID}` },

  // ── assessments/compliance/[clientId] ──
  { method: 'get', path: `/api/assessments/compliance/${DUMMY_ID}` },
  { method: 'post', path: `/api/assessments/compliance/${DUMMY_ID}`, body: {} },
  { method: 'patch', path: `/api/assessments/compliance/${DUMMY_ID}`, body: {} },
  { method: 'delete', path: `/api/assessments/compliance/${DUMMY_ID}` },

  // ── assessments/history/[clientId] ──
  { method: 'get', path: `/api/assessments/history/${DUMMY_ID}` },
  { method: 'post', path: `/api/assessments/history/${DUMMY_ID}`, body: {} },
  { method: 'delete', path: `/api/assessments/history/${DUMMY_ID}` },

  // ── assessments/incomplete ──
  { method: 'get', path: '/api/assessments/incomplete' },

  // ── assessments/metrics ──
  { method: 'get', path: '/api/assessments/metrics' },

  // ── assessments/persona ──
  { method: 'get', path: '/api/assessments/persona' },
  { method: 'post', path: '/api/assessments/persona', body: {} },

  // ── assessments/persona/history ──
  { method: 'get', path: '/api/assessments/persona/history' },

  // ── assessments/personas (alias) ──
  { method: 'get', path: '/api/assessments/personas' },
  { method: 'post', path: '/api/assessments/personas', body: {} },

  // ── assessments/progress/[clientId] ──
  { method: 'get', path: `/api/assessments/progress/${DUMMY_ID}` },
  { method: 'post', path: `/api/assessments/progress/${DUMMY_ID}`, body: {} },
  { method: 'patch', path: `/api/assessments/progress/${DUMMY_ID}`, body: {} },

  // ── assessments/report/[clientId] ──
  { method: 'post', path: `/api/assessments/report/${DUMMY_ID}`, body: {} },

  // ── assessments/results/[clientId] ──
  { method: 'get', path: `/api/assessments/results/${DUMMY_ID}` },

  // ── assessments/share ──
  { method: 'get', path: '/api/assessments/share' },
  { method: 'post', path: '/api/assessments/share', body: {} },

  // ── assessments/suitability ──
  { method: 'get', path: '/api/assessments/suitability' },

  // ── assessments/suitability/draft ──
  { method: 'get', path: '/api/assessments/suitability/draft' },
  { method: 'post', path: '/api/assessments/suitability/draft', body: {} },

  // ── assessments/suitability/finalize ──
  { method: 'post', path: '/api/assessments/suitability/finalize', body: {} },

  // ── assessments/suitability/history ──
  { method: 'get', path: '/api/assessments/suitability/history' },

  // ── assessments/suitability/save ──
  { method: 'get', path: '/api/assessments/suitability/save' },
  { method: 'post', path: '/api/assessments/suitability/save', body: {} },

  // ── assessments/suitability/submit ──
  { method: 'post', path: '/api/assessments/suitability/submit', body: {} },

  // ── assessments/suitability/[assessmentId]/generate-field ──
  { method: 'post', path: `/api/assessments/suitability/${DUMMY_ID}/generate-field`, body: {} },

  // ── assessments/vulnerability ──
  { method: 'get', path: `/api/assessments/vulnerability?clientId=${DUMMY_ID}` },
  { method: 'post', path: '/api/assessments/vulnerability', body: {} },

  // ── calendar ──
  { method: 'get', path: '/api/calendar' },
  { method: 'post', path: '/api/calendar', body: {} },
  { method: 'patch', path: '/api/calendar', body: {} },
  { method: 'delete', path: '/api/calendar' },

  // ── cashflow ──
  { method: 'get', path: '/api/cashflow' },
  { method: 'post', path: '/api/cashflow', body: {} },

  // ── cashflow/create ──
  { method: 'post', path: '/api/cashflow/create', body: {} },

  // ── cashflow/scenarios ──
  { method: 'get', path: '/api/cashflow/scenarios' },
  { method: 'post', path: '/api/cashflow/scenarios', body: {} },

  // ── cashflow/[scenarioId] ──
  { method: 'get', path: `/api/cashflow/${DUMMY_ID}` },
  { method: 'put', path: `/api/cashflow/${DUMMY_ID}`, body: {} },
  { method: 'delete', path: `/api/cashflow/${DUMMY_ID}` },

  // ── clients ──
  { method: 'get', path: '/api/clients' },
  { method: 'post', path: '/api/clients', body: {} },

  // ── clients/reassign ──
  { method: 'post', path: '/api/clients/reassign', body: {} },

  // ── clients/statistics ──
  { method: 'get', path: '/api/clients/statistics' },

  // ── clients/[id] ──
  { method: 'get', path: `/api/clients/${DUMMY_ID}` },
  { method: 'patch', path: `/api/clients/${DUMMY_ID}`, body: {} },
  { method: 'delete', path: `/api/clients/${DUMMY_ID}` },

  // ── clients/[id]/assessments ──
  { method: 'get', path: `/api/clients/${DUMMY_ID}/assessments` },
  { method: 'patch', path: `/api/clients/${DUMMY_ID}/assessments`, body: {} },

  // ── clients/[id]/file-review ──
  { method: 'post', path: `/api/clients/${DUMMY_ID}/file-review`, body: {} },

  // ── clients/[id]/holdings ──
  { method: 'get', path: `/api/clients/${DUMMY_ID}/holdings` },
  { method: 'post', path: `/api/clients/${DUMMY_ID}/holdings`, body: {} },
  { method: 'patch', path: `/api/clients/${DUMMY_ID}/holdings`, body: {} },
  { method: 'delete', path: `/api/clients/${DUMMY_ID}/holdings` },

  // ── clients/[id]/populate-profile ──
  { method: 'post', path: `/api/clients/${DUMMY_ID}/populate-profile`, body: {} },

  // ── clients/[id]/services ──
  { method: 'get', path: `/api/clients/${DUMMY_ID}/services` },
  { method: 'post', path: `/api/clients/${DUMMY_ID}/services`, body: {} },

  // ── communications ──
  { method: 'get', path: '/api/communications' },
  { method: 'post', path: '/api/communications', body: {} },
  { method: 'patch', path: '/api/communications', body: {} },
  { method: 'delete', path: '/api/communications' },

  // ── compliance/comments ──
  { method: 'get', path: '/api/compliance/comments' },
  { method: 'post', path: '/api/compliance/comments', body: {} },

  // ── compliance/consumer-duty/assess ──
  { method: 'get', path: `/api/compliance/consumer-duty/assess?clientId=${DUMMY_ID}` },
  { method: 'post', path: '/api/compliance/consumer-duty/assess', body: {} },

  // ── compliance/metrics ──
  { method: 'get', path: '/api/compliance/metrics' },

  // ── compliance/prod-services/clients ──
  { method: 'get', path: '/api/compliance/prod-services/clients' },

  // ── compliance/workflow ──
  { method: 'get', path: '/api/compliance/workflow' },

  // ── dashboard/stats ──
  { method: 'get', path: '/api/dashboard/stats' },

  // ── dashboard/weekly-activity ──
  { method: 'get', path: '/api/dashboard/weekly-activity' },

  // ── documents ──
  { method: 'get', path: '/api/documents' },
  { method: 'post', path: '/api/documents', body: {} },

  // ── documents/[id] ──
  { method: 'get', path: `/api/documents/${DUMMY_ID}` },
  { method: 'put', path: `/api/documents/${DUMMY_ID}`, body: {} },
  { method: 'delete', path: `/api/documents/${DUMMY_ID}` },

  // ── documents/[id]/workflow ──
  { method: 'patch', path: `/api/documents/${DUMMY_ID}/workflow`, body: {} },

  // ── documents/activity/feed ──
  { method: 'get', path: '/api/documents/activity/feed' },

  // ── documents/analytics ──
  { method: 'get', path: '/api/documents/analytics' },
  { method: 'post', path: '/api/documents/analytics', body: {} },

  // ── documents/backfill-types ──
  { method: 'post', path: '/api/documents/backfill-types', body: {} },

  // ── documents/bulk/actions ──
  { method: 'get', path: '/api/documents/bulk/actions' },
  { method: 'post', path: '/api/documents/bulk/actions', body: {} },

  // ── documents/categories ──
  { method: 'get', path: '/api/documents/categories' },
  { method: 'post', path: '/api/documents/categories', body: {} },
  { method: 'put', path: '/api/documents/categories', body: {} },
  { method: 'delete', path: '/api/documents/categories' },
  { method: 'patch', path: '/api/documents/categories', body: {} },

  // ── documents/client/[clientId] ──
  { method: 'get', path: `/api/documents/client/${DUMMY_ID}` },

  // ── documents/dashboard/stats ──
  { method: 'get', path: '/api/documents/dashboard/stats' },

  // ── documents/download/[id] ──
  { method: 'get', path: `/api/documents/download/${DUMMY_ID}` },

  // ── documents/extract ──
  { method: 'post', path: '/api/documents/extract', body: {} },

  // ── documents/generate ──
  { method: 'get', path: '/api/documents/generate' },
  { method: 'post', path: '/api/documents/generate', body: {} },

  // ── documents/generate-batch ──
  { method: 'post', path: '/api/documents/generate-batch', body: {} },

  // ── documents/generate-client-dossier ──
  { method: 'post', path: '/api/documents/generate-client-dossier', body: {} },

  // ── documents/generate-client-profile ──
  { method: 'post', path: '/api/documents/generate-client-profile', body: {} },

  // ── documents/generate-combined ──
  { method: 'post', path: '/api/documents/generate-combined', body: {} },

  // ── documents/generate-from-assessment ──
  { method: 'post', path: '/api/documents/generate-from-assessment', body: {} },

  // ── documents/generate-monte-carlo-report ──
  { method: 'post', path: '/api/documents/generate-monte-carlo-report', body: {} },

  // ── documents/generate-pdf ──
  { method: 'get', path: '/api/documents/generate-pdf' },
  { method: 'post', path: '/api/documents/generate-pdf', body: {} },
  { method: 'put', path: '/api/documents/generate-pdf', body: {} },
  { method: 'delete', path: '/api/documents/generate-pdf' },
  { method: 'patch', path: '/api/documents/generate-pdf', body: {} },

  // ── documents/generate-stress-test-report ──
  { method: 'post', path: '/api/documents/generate-stress-test-report', body: {} },

  // ── documents/metrics ──
  { method: 'get', path: '/api/documents/metrics' },
  { method: 'post', path: '/api/documents/metrics', body: {} },

  // ── documents/preview ──
  { method: 'post', path: '/api/documents/preview', body: {} },

  // ── documents/preview/[id] ──
  { method: 'get', path: `/api/documents/preview/${DUMMY_ID}` },

  // ── documents/preview-assessment ──
  { method: 'post', path: '/api/documents/preview-assessment', body: {} },

  // ── documents/save-report ──
  { method: 'post', path: '/api/documents/save-report', body: {} },

  // ── documents/status/[documentId] ──
  { method: 'put', path: `/api/documents/status/${DUMMY_ID}`, body: {} },

  // ── documents/templates/all ──
  { method: 'get', path: '/api/documents/templates/all' },

  // ── documents/templates/[assessmentType] ──
  { method: 'get', path: `/api/documents/templates/${DUMMY_ID}` },

  // ── documents/upload ──
  { method: 'post', path: '/api/documents/upload', body: {} },

  // ── export/excel ──
  { method: 'post', path: '/api/export/excel', body: {} },

  // ── export/powerpoint ──
  { method: 'post', path: '/api/export/powerpoint', body: {} },

  // ── firm ──
  { method: 'get', path: '/api/firm' },
  { method: 'put', path: '/api/firm', body: {} },

  // ── firm/fca-lookup/[frn] ──
  { method: 'get', path: `/api/firm/fca-lookup/${DUMMY_ID}` },

  // ── firm/fca-search ──
  { method: 'get', path: '/api/firm/fca-search' },

  // ── firm/invite ──
  { method: 'get', path: '/api/firm/invite' },
  { method: 'post', path: '/api/firm/invite', body: {} },

  // ── firm/logo ──
  { method: 'post', path: '/api/firm/logo', body: {} },

  // ── firm/seats ──
  { method: 'get', path: '/api/firm/seats' },

  // ── firm/users ──
  { method: 'get', path: '/api/firm/users' },

  // ── firm/users/[userId] ──
  { method: 'get', path: `/api/firm/users/${DUMMY_ID}` },
  { method: 'put', path: `/api/firm/users/${DUMMY_ID}`, body: {} },
  { method: 'delete', path: `/api/firm/users/${DUMMY_ID}` },

  // ── gdpr/export ──
  { method: 'get', path: '/api/gdpr/export' },

  // ── market-data ──
  { method: 'get', path: '/api/market-data' },

  // ── monte-carlo/assumptions/[scenarioId] ──
  { method: 'get', path: `/api/monte-carlo/assumptions/${DUMMY_ID}` },

  // ── monte-carlo/bulk/simulate ──
  { method: 'get', path: '/api/monte-carlo/bulk/simulate' },
  { method: 'post', path: '/api/monte-carlo/bulk/simulate', body: {} },

  // ── monte-carlo/cleanup ──
  { method: 'get', path: '/api/monte-carlo/cleanup' },
  { method: 'delete', path: '/api/monte-carlo/cleanup' },

  // ── monte-carlo/list ──
  { method: 'get', path: '/api/monte-carlo/list' },

  // ── monte-carlo/results/[scenarioId] ──
  { method: 'get', path: `/api/monte-carlo/results/${DUMMY_ID}` },
  { method: 'post', path: `/api/monte-carlo/results/${DUMMY_ID}`, body: {} },
  { method: 'patch', path: `/api/monte-carlo/results/${DUMMY_ID}`, body: {} },
  { method: 'delete', path: `/api/monte-carlo/results/${DUMMY_ID}` },

  // ── monte-carlo/simulate ──
  { method: 'post', path: '/api/monte-carlo/simulate', body: {} },

  // ── monte-carlo/status ──
  { method: 'get', path: '/api/monte-carlo/status' },

  // ── notifications ──
  { method: 'get', path: '/api/notifications' },

  // ── notifications/[id] ──
  { method: 'patch', path: `/api/notifications/${DUMMY_ID}`, body: {} },
  { method: 'delete', path: `/api/notifications/${DUMMY_ID}` },

  // ── notifications/backfill-profile-updates ──
  { method: 'post', path: '/api/notifications/backfill-profile-updates', body: {} },

  // ── notifications/dev/seed ──
  { method: 'post', path: '/api/notifications/dev/seed', body: {} },

  // ── notifications/mark-all-read ──
  { method: 'post', path: '/api/notifications/mark-all-read', body: {} },

  // ── notifications/send-email ──
  { method: 'get', path: '/api/notifications/send-email' },
  { method: 'post', path: '/api/notifications/send-email', body: {} },

  // ── notifications/unread-count ──
  { method: 'get', path: '/api/notifications/unread-count' },

  // ── reviews ──
  { method: 'get', path: '/api/reviews' },
  { method: 'post', path: '/api/reviews', body: {} },
  { method: 'patch', path: '/api/reviews', body: {} },
  { method: 'delete', path: '/api/reviews' },

  // ── reviews/upcoming ──
  { method: 'get', path: '/api/reviews/upcoming' },

  // ── search ──
  { method: 'get', path: '/api/search' },

  // ── search-address ──
  { method: 'get', path: '/api/search-address' },
  { method: 'post', path: '/api/search-address', body: {} },
  { method: 'put', path: '/api/search-address', body: {} },
  { method: 'delete', path: '/api/search-address' },

  // ── setup/add-signature-columns ──
  { method: 'get', path: '/api/setup/add-signature-columns' },
  { method: 'post', path: '/api/setup/add-signature-columns', body: {} },

  // ── setup/bulk-clients ──
  { method: 'post', path: '/api/setup/bulk-clients', body: {} },

  // ── setup/signature-table ──
  { method: 'get', path: '/api/setup/signature-table' },
  { method: 'post', path: '/api/setup/signature-table', body: {} },

  // ── signatures ──
  { method: 'get', path: '/api/signatures' },

  // ── signatures/create ──
  { method: 'post', path: '/api/signatures/create', body: {} },

  // ── signatures/download/[id] ──
  { method: 'get', path: `/api/signatures/download/${DUMMY_ID}` },

  // ── signatures/send ──
  { method: 'post', path: '/api/signatures/send', body: {} },

  // ── signatures/status/[id] ──
  { method: 'get', path: `/api/signatures/status/${DUMMY_ID}` },

  // ── stress-testing ──
  { method: 'get', path: '/api/stress-testing' },
  { method: 'post', path: '/api/stress-testing', body: {} },

  // ── stress-testing/[id] ──
  { method: 'get', path: `/api/stress-testing/${DUMMY_ID}` },

  // ── tasks ──
  { method: 'get', path: '/api/tasks' },
  { method: 'post', path: '/api/tasks', body: {} },

  // ── tasks/[taskId] ──
  { method: 'get', path: `/api/tasks/${DUMMY_ID}` },
  { method: 'patch', path: `/api/tasks/${DUMMY_ID}`, body: {} },
  { method: 'delete', path: `/api/tasks/${DUMMY_ID}` },

  // ── tasks/[taskId]/comments ──
  { method: 'get', path: `/api/tasks/${DUMMY_ID}/comments` },
  { method: 'post', path: `/api/tasks/${DUMMY_ID}/comments`, body: {} },

  // ── tasks/[taskId]/complete ──
  { method: 'post', path: `/api/tasks/${DUMMY_ID}/complete`, body: {} },
]

test.describe('Unauthenticated API access', () => {
  let api: APIRequestContext

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      storageState: { cookies: [], origins: [] }
    })
  })

  test.afterAll(async () => {
    await api?.dispose()
  })

  for (const route of routes) {
    test(`${route.method.toUpperCase()} ${route.path} returns 401`, async () => {
      const response = await api[route.method](route.path, {
        data: route.body,
      })
      expect(response.status()).toBe(401)
    })
  }
})
