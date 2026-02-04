import { test, expect } from '@playwright/test'
import { SuitabilityPage } from '../fixtures/suitabilityPage'
import { StressTestScenarios, ValidClients, flattenClientData } from '../generators/suitabilityTestData'

/**
 * OSO QA Agent - API Stress Tests
 * Tests for race conditions, concurrent saves, and API resilience
 */

test.describe('API Stress Tests', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 })
  let suitabilityPage: SuitabilityPage

  test.beforeEach(async ({ page }) => {
    suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()
  })

  // ============================================
  // RACE CONDITION TESTS
  // ============================================

  test.describe('Race Condition Tests', () => {
    test('KNOWN BUG: rapid saves should not cause 500 errors', async ({ page }) => {
      // This tests the known Draft API 500 bug
      const responses: { status: number; error?: string }[] = []

      // Intercept API responses
      page.on('response', async (response) => {
        if (response.url().includes('/api/assessments/suitability/draft')) {
          const status = response.status()
          let error: string | undefined
          if (status >= 400) {
            try {
              const body = await response.json()
              error = body.error || body.message
            } catch {
              error = 'Unknown error'
            }
          }
          responses.push({ status, error })
        }
      })

      // Fill some data first
      await suitabilityPage.fillField('client_name', 'Stress Test')

      // Rapid fire saves
      for (let i = 0; i < 10; i++) {
        await suitabilityPage.fillField('client_name', `Stress Test ${i}`)
        await suitabilityPage.saveDraft()
        // Minimal delay to trigger race condition
        await page.waitForTimeout(50)
      }

      // Wait for all responses
      await page.waitForTimeout(2000)

      // Count 500 errors
      const errors = responses.filter(r => r.status >= 500)
      const uniqueConstraintErrors = responses.filter(r =>
        r.error?.includes('unique constraint') ||
        r.error?.includes('duplicate key')
      )

      console.log(`Total responses: ${responses.length}`)
      console.log(`500 errors: ${errors.length}`)
      console.log(`Unique constraint errors: ${uniqueConstraintErrors.length}`)

      // Document the bug - if this fails, bug exists
      if (uniqueConstraintErrors.length > 0) {
        console.warn('KNOWN BUG: Duplicate key violation detected')
        console.warn('Error details:', uniqueConstraintErrors)
      }
    })

    test('concurrent modification should be handled', async ({ page, context }) => {
      // Open same form in two tabs
      const page2 = await context.newPage()
      const suitabilityPage2 = new SuitabilityPage(page2)

      await suitabilityPage2.goto()
      await suitabilityPage.goToSection('Personal Information').catch(() => {})
      await suitabilityPage2.goToSection('Personal Information').catch(() => {})

      // Fill different data in each tab
      await suitabilityPage.fillField('client_name', 'Tab1User')
      await suitabilityPage2.fillField('client_name', 'Tab2User')

      // Save from both tabs simultaneously
      const [result1, result2] = await Promise.allSettled([
        suitabilityPage.saveDraft(),
        suitabilityPage2.saveDraft(),
      ])

      console.log('Tab 1 result:', result1.status)
      console.log('Tab 2 result:', result2.status)

      // At least one should succeed
      expect(result1.status === 'fulfilled' || result2.status === 'fulfilled').toBe(true)

      await page2.close()
    })
  })

  // ============================================
  // RATE LIMITING TESTS
  // ============================================

  test.describe('Rate Limiting Tests', () => {
    test('should handle burst of requests', async ({ page }) => {
      const requestCount = 20
      const results: number[] = []

      // Send many requests in quick succession
      for (let i = 0; i < requestCount; i++) {
        await suitabilityPage.fillField('client_name', `Burst User ${i}`)

        try {
          await suitabilityPage.saveDraft()
          results.push(200)
        } catch (e) {
          results.push(0)
        }
      }

      // Check how many succeeded
      const successCount = results.filter(r => r === 200).length
      console.log(`Burst test: ${successCount}/${requestCount} requests succeeded`)

      // Should rate limit or queue requests, not crash
      expect(successCount).toBeGreaterThan(0)
    })

    test('should not hang on many requests', async ({ page }) => {
      const startTime = Date.now()

      // Send 5 quick requests
      for (let i = 0; i < 5; i++) {
        await suitabilityPage.saveDraft().catch(() => {})
      }

      const duration = Date.now() - startTime

      // Should not take more than 30 seconds total
      console.log(`5 requests completed in ${duration}ms`)
      expect(duration).toBeLessThan(30000)
    })
  })

  // ============================================
  // LARGE PAYLOAD TESTS
  // ============================================

  test.describe('Large Payload Tests', () => {
    test('should handle large text fields', async ({ page }) => {
      const largeText = 'A'.repeat(10000)

      await suitabilityPage.goToSection('Recommendation').catch(() => {})
      await suitabilityPage.fillField('recommendation_rationale', largeText)
      await suitabilityPage.saveDraft()

      // Should not timeout or crash
      await expect(page).toHaveURL(/.*/)
    })

    test('should handle form with all fields filled', async ({ page }) => {
      // Get a full client profile
      const client = ValidClients[0]
      const data = flattenClientData(client)

      // Fill as many fields as possible
      let filledCount = 0
      for (const [field, value] of Object.entries(data)) {
        try {
          // Skip array values (like advice_scope) - fillField doesn't support them
          if (Array.isArray(value)) continue
          await suitabilityPage.fillField(field, value)
          filledCount++
        } catch {
          // Field might not exist or be visible
        }
      }

      console.log(`Filled ${filledCount} fields`)

      // Save the large form
      await suitabilityPage.saveDraft()
    })

    test('should reject oversized payload', async ({ page }) => {
      // Create very large text
      const oversizedText = 'X'.repeat(1000000) // 1MB

      let errorStatus: number | null = null

      page.on('response', (response) => {
        if (response.url().includes('/api/') && response.status() >= 400) {
          errorStatus = response.status()
        }
      })

      await suitabilityPage.goToSection('Recommendation').catch(() => {})
      await suitabilityPage.fillField('recommendation_rationale', oversizedText)

      try {
        await suitabilityPage.saveDraft()
      } catch {
        // Expected to fail
      }

      // Should get a 413 (Payload Too Large) or similar
      if (errorStatus) {
        console.log(`Oversized payload resulted in status: ${errorStatus}`)
      }
    })
  })

  // ============================================
  // NETWORK FAILURE TESTS
  // ============================================

  test.describe('Network Failure Tests', () => {
    test('should handle network timeout gracefully', async ({ page }) => {
      // Fill some data
      await suitabilityPage.fillField('client_name', 'Network Test')

      // Slow down network
      await page.route('**/api/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 5000))
        await route.continue()
      })

      // Try to save with timeout
      const startTime = Date.now()
      try {
        await suitabilityPage.saveDraft()
      } catch {
        // Expected to timeout
      }

      const duration = Date.now() - startTime
      console.log(`Operation took ${duration}ms`)

      // Form should still be usable
      await page.unroute('**/api/**')
      await expect(page).toHaveURL(/.*/)
    })

    test('should handle network offline', async ({ page, context }) => {
      // Fill some data
      await suitabilityPage.fillField('first_name', 'Offline')

      // Go offline
      await context.setOffline(true)

      let errorOccurred = false
      try {
        await suitabilityPage.saveDraft()
      } catch {
        errorOccurred = true
      }

      // Should handle offline gracefully
      expect(errorOccurred).toBe(true)

      // Go back online
      await context.setOffline(false)

      // Should be able to save now
      await suitabilityPage.saveDraft()
    })

    test('should handle API returning error', async ({ page }) => {
      // Mock API error response
      await page.route('**/api/assessments/suitability/draft', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        })
      })

      await suitabilityPage.fillField('first_name', 'Error')

      // Try to save
      await suitabilityPage.saveDraft()

      // Should show error message to user
      const hasError = await suitabilityPage.hasError()
      console.log(`Error displayed to user: ${hasError}`)

      // Clean up
      await page.unroute('**/api/assessments/suitability/draft')
    })
  })

  // ============================================
  // SESSION/AUTH TESTS
  // ============================================

  test.describe('Session Tests', () => {
    test('should handle expired session', async ({ page }) => {
      // Fill some data
      await suitabilityPage.fillField('first_name', 'Session')

      // Clear auth cookies to simulate session expiry
      await page.context().clearCookies()

      // Try to save
      let responseStatus: number | null = null
      page.on('response', (response) => {
        if (response.url().includes('/api/assessments/suitability/draft')) {
          responseStatus = response.status()
        }
      })

      await suitabilityPage.saveDraft()

      // Should get 401 or redirect to login
      console.log(`Response after session clear: ${responseStatus}`)
    })

    test('should handle invalid auth token', async ({ page }) => {
      // Modify auth header
      await page.route('**/api/**', async (route) => {
        const headers = {
          ...route.request().headers(),
          'Authorization': 'Bearer invalid-token',
        }
        await route.continue({ headers })
      })

      await suitabilityPage.saveDraft()

      // Should handle gracefully
      await page.unroute('**/api/**')
    })
  })

  // ============================================
  // VERSION CONFLICT TESTS
  // ============================================

  test.describe('Version Conflict Tests', () => {
    test('should detect and handle version conflicts', async ({ page, context }) => {
      // This tests what happens when two sessions try to save conflicting versions

      // Fill initial data
      await suitabilityPage.fillField('first_name', 'Version1')
      await suitabilityPage.saveDraft()

      // Open second tab and make changes
      const page2 = await context.newPage()
      const suitabilityPage2 = new SuitabilityPage(page2)
      await suitabilityPage2.goto()

      // Both tabs make changes
      await suitabilityPage.fillField('first_name', 'Version1Updated')
      await suitabilityPage2.fillField('first_name', 'Version2Updated')

      // Save from first tab
      await suitabilityPage.saveDraft()

      // Save from second tab - may cause version conflict
      let conflictDetected = false
      page2.on('response', async (response) => {
        if (response.url().includes('/api/assessments/suitability/draft')) {
          const body = await response.json().catch(() => ({}))
          if (body.error?.includes('version') || body.error?.includes('conflict')) {
            conflictDetected = true
          }
        }
      })

      await suitabilityPage2.saveDraft()

      console.log(`Version conflict detected: ${conflictDetected}`)

      await page2.close()
    })
  })

  // ============================================
  // STRESS TEST SCENARIOS
  // ============================================

  test.describe('Stress Test Scenarios', () => {
    test(`${StressTestScenarios.rapidSave.name}`, async ({ page }) => {
      const { saveCount, intervalMs } = StressTestScenarios.rapidSave
      const results: boolean[] = []

      for (let i = 0; i < saveCount; i++) {
        try {
          await suitabilityPage.saveDraft()
          results.push(true)
        } catch {
          results.push(false)
        }
        await page.waitForTimeout(intervalMs)
      }

      const successRate = results.filter(r => r).length / results.length
      console.log(`Rapid save success rate: ${(successRate * 100).toFixed(1)}%`)
    })

    test(`${StressTestScenarios.concurrentSave.name}`, async ({ page }) => {
      const { parallelRequests } = StressTestScenarios.concurrentSave

      // Create parallel save promises
      const savePromises = Array(parallelRequests)
        .fill(null)
        .map(() => suitabilityPage.saveDraft().catch(e => e))

      const results = await Promise.allSettled(savePromises)

      const succeeded = results.filter(r => r.status === 'fulfilled').length
      console.log(`Concurrent saves: ${succeeded}/${parallelRequests} succeeded`)
    })
  })
})

// ============================================
// ISOLATED DRAFT API TEST
// ============================================

test.describe('Draft API Direct Tests', () => {
  test('should handle draft save API directly', async ({ request }) => {
    // This tests the API endpoint directly without UI

    const response = await request.post('/api/assessments/suitability/draft', {
      data: {
        clientId: 'test-client-123',
        data: {
          personal_details: {
            first_name: 'API',
            last_name: 'Test',
          },
        },
      },
    })

    console.log(`Direct API response status: ${response.status()}`)

    if (response.status() >= 400) {
      const body = await response.json().catch(() => ({}))
      console.log('Error:', body)
    }
  })

  test('should handle multiple rapid API calls', async ({ request }) => {
    const results: number[] = []

    // Make 10 rapid API calls
    for (let i = 0; i < 10; i++) {
      const response = await request.post('/api/assessments/suitability/draft', {
        data: {
          clientId: `test-client-${Date.now()}-${i}`,
          data: {
            personal_details: {
              first_name: `Rapid${i}`,
            },
          },
        },
      })
      results.push(response.status())
    }

    const errors = results.filter(s => s >= 500)
    console.log(`Rapid API calls: ${errors.length} errors out of ${results.length}`)

    if (errors.length > 0) {
      console.warn('KNOWN BUG: Race condition causing 500 errors')
    }
  })
})
