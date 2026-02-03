import { test, expect } from '@playwright/test'

const DUMMY_ID = '00000000-0000-0000-0000-000000000000'

const routes: Array<{
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  path: string
  body?: Record<string, unknown>
}> = [
  { method: 'get', path: `/api/documents/${DUMMY_ID}` },
  { method: 'put', path: `/api/documents/${DUMMY_ID}`, body: {} },
  { method: 'delete', path: `/api/documents/${DUMMY_ID}` },
  { method: 'get', path: `/api/documents/client/${DUMMY_ID}` },
  { method: 'post', path: '/api/documents/generate-from-assessment', body: {} },
  { method: 'post', path: '/api/documents/preview-assessment', body: {} },
  { method: 'post', path: '/api/documents/save-report', body: {} },
  { method: 'get', path: `/api/documents/preview/${DUMMY_ID}` },
  { method: 'post', path: '/api/export/excel', body: {} },
  { method: 'post', path: '/api/export/powerpoint', body: {} },
  { method: 'get', path: `/api/documents/download/${DUMMY_ID}` },
  { method: 'get', path: `/api/assessments/atr/history?clientId=${DUMMY_ID}` },
  { method: 'get', path: `/api/assessments/cfl/history?clientId=${DUMMY_ID}` },
  { method: 'get', path: `/api/assessments/progress/${DUMMY_ID}` },
  { method: 'post', path: `/api/assessments/progress/${DUMMY_ID}`, body: {} },
  { method: 'patch', path: `/api/assessments/progress/${DUMMY_ID}`, body: {} },
  { method: 'get', path: `/api/assessments/vulnerability?clientId=${DUMMY_ID}` },
  { method: 'post', path: '/api/assessments/vulnerability', body: {} },
  { method: 'get', path: `/api/compliance/consumer-duty/assess?clientId=${DUMMY_ID}` },
  { method: 'post', path: '/api/compliance/consumer-duty/assess', body: {} },
  { method: 'get', path: '/api/compliance/metrics' },
  { method: 'get', path: `/api/monte-carlo/results/${DUMMY_ID}` },
  { method: 'post', path: `/api/monte-carlo/results/${DUMMY_ID}`, body: {} },
  { method: 'patch', path: `/api/monte-carlo/results/${DUMMY_ID}`, body: {} },
  { method: 'delete', path: `/api/monte-carlo/results/${DUMMY_ID}` },
  { method: 'post', path: `/api/monte-carlo/simulate`, body: {} },
  { method: 'post', path: `/api/documents/extract`, body: {} },
  { method: 'get', path: '/api/stress-testing' },
  { method: 'post', path: '/api/stress-testing', body: {} },
  { method: 'get', path: `/api/stress-testing/${DUMMY_ID}` },
  { method: 'get', path: '/api/setup/add-signature-columns' },
  { method: 'post', path: '/api/setup/add-signature-columns', body: {} },
  { method: 'get', path: '/api/setup/signature-table' },
  { method: 'post', path: '/api/setup/signature-table', body: {} },
  { method: 'post', path: '/api/signatures/create', body: {} },
  { method: 'get', path: `/api/signatures/status/${DUMMY_ID}` },
  { method: 'get', path: `/api/signatures/download/${DUMMY_ID}` },
  { method: 'post', path: '/api/signatures/send', body: {} },
]

test.describe('Unauthenticated API access', () => {
  for (const route of routes) {
    test(`${route.method.toUpperCase()} ${route.path} returns 401`, async ({ request }) => {
      const response = await request[route.method](route.path, {
        data: route.body,
      })
      expect(response.status()).toBe(401)
    })
  }
})
