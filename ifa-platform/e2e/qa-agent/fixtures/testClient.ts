import { test as base } from '@playwright/test'
import { SuitabilityPage } from './suitabilityPage'

/**
 * OSO QA Agent - Test Client Fixture
 * Custom test fixture with pre-configured page objects
 */

// Extend base test with our fixtures
export const test = base.extend<{
  suitabilityPage: SuitabilityPage
}>({
  suitabilityPage: async ({ page }, use) => {
    const suitabilityPage = new SuitabilityPage(page)
    await use(suitabilityPage)
  },
})

export { expect } from '@playwright/test'

// Test user credentials (for authenticated tests)
export const TestCredentials = {
  email: process.env.E2E_EMAIL || 'demo@plannetic.com',
  password: process.env.E2E_PASSWORD || 'demo123',
}

// Test client IDs (for tests that need existing clients)
export const TestClientIds = {
  newClient: null, // Will create new
  existingClient: process.env.E2E_CLIENT_ID || null,
}

// Helper to login before tests
export async function loginAsTestUser(page: import('@playwright/test').Page): Promise<void> {
  // Navigate to login
  await page.goto('/login')

  // Fill credentials
  await page.fill('input[name="email"], input[type="email"]', TestCredentials.email)
  await page.fill('input[name="password"], input[type="password"]', TestCredentials.password)

  // Submit
  await page.click('button[type="submit"]')

  // Wait for redirect
  await page.waitForURL(/.*dashboard.*|.*assessments.*/, { timeout: 10000 }).catch(() => {
    // May already be logged in or different flow
  })
}
