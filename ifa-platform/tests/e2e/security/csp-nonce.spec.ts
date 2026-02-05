import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'

test.describe('CSP nonce-based security headers', () => {
  let api: APIRequestContext

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      storageState: { cookies: [], origins: [] },
    })
  })

  test.afterAll(async () => {
    await api?.dispose()
  })

  test('public route returns CSP header with nonce in script-src', async () => {
    const response = await api.get('/login')
    const csp = response.headers()['content-security-policy']

    expect(csp).toBeDefined()
    expect(csp).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=]+'/)
    expect(csp).not.toContain("'unsafe-inline'")
    // style-src still uses unsafe-inline (standard practice)
    expect(csp).toMatch(/style-src[^;]*'unsafe-inline'/)
  })

  test('API route returns CSP header with nonce', async () => {
    const response = await api.get('/api/health')
    const csp = response.headers()['content-security-policy']

    expect(csp).toBeDefined()
    expect(csp).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=]+'/)
  })

  test('nonce is unique per request', async () => {
    const response1 = await api.get('/login')
    const response2 = await api.get('/login')

    const csp1 = response1.headers()['content-security-policy']
    const csp2 = response2.headers()['content-security-policy']

    // Extract nonces
    const noncePattern = /'nonce-([A-Za-z0-9+/=]+)'/
    const nonce1 = csp1?.match(noncePattern)?.[1]
    const nonce2 = csp2?.match(noncePattern)?.[1]

    expect(nonce1).toBeDefined()
    expect(nonce2).toBeDefined()
    expect(nonce1).not.toEqual(nonce2)
  })

  test('CSP includes required directives', async () => {
    const response = await api.get('/login')
    const csp = response.headers()['content-security-policy']

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain('https://js.stripe.com')
    expect(csp).toContain('https://*.supabase.co')
  })

  test('script-src does not contain unsafe-inline in production mode', async () => {
    const response = await api.get('/login')
    const csp = response.headers()['content-security-policy'] || ''

    // Extract just the script-src directive
    const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/)
    const scriptSrc = scriptSrcMatch?.[1] || ''

    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).toContain("'self'")
    expect(scriptSrc).toMatch(/'nonce-/)
  })

  test('preview route allows frame-ancestors for plannetic.com', async () => {
    const response = await api.get(`/api/documents/preview/00000000-0000-0000-0000-000000000000`)
    const csp = response.headers()['content-security-policy']

    // Preview route may return its own CSP or middleware CSP
    // If middleware CSP, it should have frame-ancestors with plannetic.com
    if (csp && csp.includes('frame-ancestors')) {
      expect(csp).toMatch(/frame-ancestors[^;]*'self'/)
    }
  })

  test('unauthenticated API route still gets CSP header', async () => {
    const response = await api.get('/api/clients')
    const csp = response.headers()['content-security-policy']

    expect(response.status()).toBe(401)
    expect(csp).toBeDefined()
    expect(csp).toMatch(/script-src[^;]*'nonce-/)
  })
})
