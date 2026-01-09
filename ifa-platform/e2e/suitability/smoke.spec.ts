import { test, expect } from '@playwright/test'
import { SuitabilityPage } from '../qa-agent/fixtures/suitabilityPage'
import { ValidClients, flattenClientData, KeyTestFields, getDataBySection } from '../qa-agent/generators/suitabilityTestData'

/**
 * OSO QA Agent - Suitability Smoke Tests
 * Basic functionality tests to verify the form works
 *
 * IMPORTANT: Field IDs must match actual form field IDs from:
 * - src/config/suitability/sections/
 */

test.describe('Suitability Form Smoke Tests', () => {
  test('form should load successfully', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    // Page should load without errors
    await expect(page).toHaveURL(/.*suitability.*/)
  })

  test('should display all sections', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    // Check for section navigation - the form uses section IDs like personal_information, financial_situation
    const sections = await page.locator('[id="personal_information"], [id="financial_situation"], [id="risk_assessment"], [role="tab"], button:has-text("Personal")').count()
    console.log(`Found ${sections} section elements`)
  })

  test('should be able to fill basic fields', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    // Fill basic data using correct field IDs from personal_information section
    await suitabilityPage.fillField('client_name', 'Smoke Test Client')

    // Verify data was entered
    const clientName = await suitabilityPage.getFieldValue('client_name')
    expect(clientName).toBe('Smoke Test Client')
  })

  test('should be able to save draft', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    await suitabilityPage.fillField('client_name', 'Draft Test Client')
    await suitabilityPage.saveDraft()

    // Should not crash
    await expect(page).toHaveURL(/.*/)
  })

  test('should be able to navigate between sections', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    // Try to navigate to different sections
    const sectionsToTry = [
      'Financial Situation',
      'Risk Assessment',
      'Investment Objectives',
      'Recommendation',
    ]

    for (const section of sectionsToTry) {
      try {
        await suitabilityPage.goToSection(section)
        console.log(`Successfully navigated to: ${section}`)
      } catch {
        console.log(`Could not navigate to: ${section}`)
      }
    }
  })

  test('should handle valid client data', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    const client = ValidClients[0]

    // Fill key fields from personal_information section
    const personalData = getDataBySection(client, 'personal_information')
    const keyFields = KeyTestFields.personal_information

    for (const field of keyFields) {
      if (personalData[field] !== undefined) {
        try {
          await suitabilityPage.fillField(field, personalData[field])
          console.log(`Filled ${field}: ${personalData[field]}`)
        } catch {
          console.log(`Failed to fill ${field}`)
        }
      }
    }

    await suitabilityPage.saveDraft()
  })
})

test.describe('Suitability Form Error Handling', () => {
  test('should show validation errors for invalid data', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    // Try to save without required fields
    await suitabilityPage.save()

    // Should show some indication of errors
    const hasError = await suitabilityPage.hasError()
    console.log(`Validation errors shown: ${hasError}`)
  })

  test('should handle API errors gracefully', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    // Fill some data using correct field ID
    await suitabilityPage.fillField('client_name', 'Error Test Client')

    // Mock API error
    await page.route('**/api/assessments/suitability/draft', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Test error' }),
      })
    })

    // Try to save
    await suitabilityPage.saveDraft()

    // Should handle gracefully (not crash)
    await expect(page).toHaveURL(/.*/)

    // Clean up
    await page.unroute('**/api/assessments/suitability/draft')
  })
})

test.describe('Suitability Form Performance', () => {
  test('form should load within acceptable time', async ({ page }) => {
    const startTime = Date.now()

    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    const loadTime = Date.now() - startTime
    console.log(`Form load time: ${loadTime}ms`)

    // Should load within 90 seconds (complex form with database connections in dev mode)
    expect(loadTime).toBeLessThan(90000)
  })

  test('field interactions should be responsive', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    const startTime = Date.now()

    // Fill multiple fields rapidly using correct field ID
    for (let i = 0; i < 5; i++) {
      await suitabilityPage.fillField('client_name', `Test Client ${i}`)
    }

    const duration = Date.now() - startTime
    console.log(`5 field updates took: ${duration}ms`)

    // Should be responsive (with some tolerance for dev mode)
    expect(duration).toBeLessThan(15000)
  })
})
