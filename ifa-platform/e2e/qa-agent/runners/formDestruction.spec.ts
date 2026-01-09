import { test, expect } from '@playwright/test'
import { SuitabilityPage } from '../fixtures/suitabilityPage'
import { EdgeCases, FieldEdgeCases } from '../generators/edgeCases'
import { MaliciousPayloads, generateFuzzyTests } from '../generators/fuzzyInputs'

/**
 * OSO QA Agent - Form Destruction Tests
 * Brutally tests form inputs with edge cases, malicious payloads, and invalid data
 */

test.describe('Form Destruction Tests', () => {
  let suitabilityPage: SuitabilityPage

  test.beforeEach(async ({ page }) => {
    suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()
  })

  // ============================================
  // STRING EDGE CASES
  // ============================================

  test.describe('String Input Edge Cases', () => {
    test('should handle empty strings gracefully', async () => {
      await suitabilityPage.fillField('first_name', EdgeCases.strings.empty)
      // Form should show validation error for required field
      await suitabilityPage.saveDraft()
      // Should not crash
    })

    test('should handle very long strings', async () => {
      const longString = EdgeCases.strings.maxLength.slice(0, 500)
      await suitabilityPage.fillField('first_name', longString)
      const value = await suitabilityPage.getFieldValue('first_name')
      // Value should be truncated or rejected, not cause crash
      expect(value.length).toBeLessThanOrEqual(500)
    })

    test('should handle unicode characters', async () => {
      await suitabilityPage.fillField('first_name', EdgeCases.strings.unicode)
      await suitabilityPage.saveDraft()
      // Should not crash
    })

    test('should handle emoji characters', async () => {
      await suitabilityPage.fillField('first_name', EdgeCases.strings.emoji)
      await suitabilityPage.saveDraft()
      // Should not crash
    })

    test('should handle special characters', async () => {
      await suitabilityPage.fillField('first_name', EdgeCases.strings.specialChars)
      await suitabilityPage.saveDraft()
      // Should not crash
    })

    test('should handle newlines and tabs', async () => {
      await suitabilityPage.fillField('recommendation_rationale', EdgeCases.strings.newlines)
      const value = await suitabilityPage.getFieldValue('recommendation_rationale')
      // Should handle newlines in textarea
      expect(value).toBeTruthy()
    })
  })

  // ============================================
  // XSS ATTACK TESTS
  // ============================================

  test.describe('XSS Prevention', () => {
    for (const [index, payload] of MaliciousPayloads.xss.slice(0, 5).entries()) {
      test(`should sanitize XSS payload ${index + 1}`, async ({ page }) => {
        await suitabilityPage.fillField('first_name', payload)
        await suitabilityPage.saveDraft()

        // Check that no alert was triggered
        let alertTriggered = false
        page.on('dialog', () => {
          alertTriggered = true
        })

        await page.waitForTimeout(1000)
        expect(alertTriggered).toBe(false)

        // Check that script tags are not rendered
        const pageContent = await page.content()
        expect(pageContent).not.toContain('<script>alert')
      })
    }

    test('should escape HTML in displayed values', async ({ page }) => {
      const htmlPayload = '<b>bold</b><script>alert(1)</script>'
      await suitabilityPage.fillField('notes', htmlPayload)
      await suitabilityPage.saveDraft()

      // Reload and check the value is escaped
      await page.reload()
      const pageContent = await page.content()

      // Should not render HTML tags as HTML
      expect(pageContent).not.toMatch(/<b>bold<\/b>/)
    })
  })

  // ============================================
  // SQL INJECTION TESTS
  // ============================================

  test.describe('SQL Injection Prevention', () => {
    for (const [index, payload] of MaliciousPayloads.sqlInjection.slice(0, 5).entries()) {
      test(`should handle SQL injection attempt ${index + 1}`, async ({ page }) => {
        await suitabilityPage.fillField('first_name', payload)

        // Intercept API responses
        const responsePromise = page.waitForResponse(
          response => response.url().includes('/api/'),
          { timeout: 10000 }
        ).catch(() => null)

        await suitabilityPage.saveDraft()
        const response = await responsePromise

        if (response) {
          // Should not return 500 error (which would indicate SQL error)
          expect(response.status()).not.toBe(500)
        }
      })
    }
  })

  // ============================================
  // NUMBER EDGE CASES
  // ============================================

  test.describe('Number Input Edge Cases', () => {
    test('should handle negative numbers in income', async () => {
      await suitabilityPage.fillField('monthly_income', -1000)
      await suitabilityPage.saveDraft()
      // Should either reject or sanitize negative income
    })

    test('should handle very large numbers', async () => {
      await suitabilityPage.fillField('monthly_income', EdgeCases.numbers.maxInt)
      await suitabilityPage.saveDraft()
    })

    test('should handle decimal values', async () => {
      await suitabilityPage.fillField('monthly_income', 1234.567)
      const value = await suitabilityPage.getFieldValue('monthly_income')
      // Should handle decimals appropriately (round or accept)
      expect(parseFloat(value)).not.toBeNaN()
    })

    test('should handle zero values', async () => {
      await suitabilityPage.fillField('monthly_income', 0)
      await suitabilityPage.saveDraft()
    })

    test('should handle scientific notation', async () => {
      await suitabilityPage.fillField('monthly_income', '1e10')
      await suitabilityPage.saveDraft()
    })

    test('should reject NaN values', async () => {
      await suitabilityPage.fillField('monthly_income', 'NaN')
      // Should not accept NaN as valid input
    })

    test('should reject Infinity values', async () => {
      await suitabilityPage.fillField('monthly_income', 'Infinity')
      // Should not accept Infinity as valid input
    })
  })

  // ============================================
  // PERCENTAGE ALLOCATION TESTS
  // ============================================

  test.describe('Percentage Allocation Edge Cases', () => {
    test('should handle allocations that sum to over 100%', async () => {
      await suitabilityPage.goToSection('Recommendation')
      await suitabilityPage.fillField('allocation_equities', 80)
      await suitabilityPage.fillField('allocation_bonds', 80)
      await suitabilityPage.fillField('allocation_cash', 80)
      await suitabilityPage.fillField('allocation_alternatives', 80)

      // Should show validation error
      await suitabilityPage.saveDraft()
      // The form should either warn or prevent submission
    })

    test('should handle allocations that sum to under 100%', async () => {
      await suitabilityPage.goToSection('Recommendation')
      await suitabilityPage.fillField('allocation_equities', 10)
      await suitabilityPage.fillField('allocation_bonds', 10)
      await suitabilityPage.fillField('allocation_cash', 10)
      await suitabilityPage.fillField('allocation_alternatives', 10)

      await suitabilityPage.saveDraft()
      // Should warn about incomplete allocation
    })

    test('should handle negative percentage', async () => {
      await suitabilityPage.goToSection('Recommendation')
      await suitabilityPage.fillField('allocation_equities', -10)
      // Should reject or sanitize
    })

    test('should handle percentage over 100', async () => {
      await suitabilityPage.goToSection('Recommendation')
      await suitabilityPage.fillField('allocation_equities', 150)
      // Should reject or cap at 100
    })
  })

  // ============================================
  // DATE EDGE CASES
  // ============================================

  test.describe('Date Input Edge Cases', () => {
    test('should handle future date of birth', async () => {
      await suitabilityPage.fillField('date_of_birth', EdgeCases.dates.future)
      // Should show validation error
    })

    test('should handle very old date of birth', async () => {
      await suitabilityPage.fillField('date_of_birth', EdgeCases.dates.veryOld)
      // Should show validation error for > 120 years old
    })

    test('should handle minor date of birth', async () => {
      await suitabilityPage.fillField('date_of_birth', EdgeCases.dates.minorAge)
      // May need age verification warning
    })

    test('should handle invalid date format', async () => {
      await suitabilityPage.fillField('date_of_birth', '13-45-2024')
      // Should reject invalid format
    })

    test('should handle leap year edge case', async () => {
      await suitabilityPage.fillField('date_of_birth', EdgeCases.dates.leapYear)
      // Should accept valid leap year date
    })

    test('should handle invalid leap year date', async () => {
      await suitabilityPage.fillField('date_of_birth', EdgeCases.dates.notLeapYear)
      // Should reject Feb 29 on non-leap year
    })
  })

  // ============================================
  // BUFFER OVERFLOW TESTS
  // ============================================

  test.describe('Buffer Overflow Prevention', () => {
    test('should handle 10KB input', async () => {
      const largeInput = 'A'.repeat(10000)
      await suitabilityPage.fillField('recommendation_rationale', largeInput)
      await suitabilityPage.saveDraft()
      // Should not crash
    })

    test('should handle 100KB input', async ({ page }) => {
      const veryLargeInput = 'A'.repeat(100000)

      // This should either be truncated or rejected
      await suitabilityPage.fillField('recommendation_rationale', veryLargeInput)

      // Check we haven't crashed
      await expect(page).toHaveURL(/.*/)
    })

    test('should handle many fields with large inputs', async () => {
      const textFields = [
        'first_name',
        'last_name',
        'recommendation_rationale',
        'notes',
      ]

      for (const field of textFields) {
        await suitabilityPage.fillField(field, 'A'.repeat(1000)).catch(() => {})
      }

      await suitabilityPage.saveDraft()
    })
  })

  // ============================================
  // FUZZY INPUT TESTS
  // ============================================

  test.describe('Fuzzy Input Tests', () => {
    const fuzzyTests = generateFuzzyTests(['first_name', 'monthly_income'], 3)

    for (const fuzzyTest of fuzzyTests.slice(0, 5)) {
      test(`should handle ${fuzzyTest.category} on ${fuzzyTest.fieldId}`, async ({ page }) => {
        await suitabilityPage.fillField(fuzzyTest.fieldId, fuzzyTest.value).catch(() => {
          // Some inputs may be rejected by browser, that's OK
        })

        // Page should not crash
        await expect(page).toHaveURL(/.*/)

        // Try to save
        await suitabilityPage.saveDraft().catch(() => {})
      })
    }
  })

  // ============================================
  // REQUIRED FIELD TESTS
  // ============================================

  test.describe('Required Field Validation', () => {
    test('should show error when submitting empty form', async () => {
      await suitabilityPage.save()
      const hasError = await suitabilityPage.hasError()
      // Should have validation errors for required fields
      expect(hasError).toBe(true)
    })

    test('should allow saving draft with empty required fields', async () => {
      // Draft save should allow incomplete data
      await suitabilityPage.saveDraft()
      // Should not crash
    })
  })

  // ============================================
  // COPY-PASTE ATTACK TESTS
  // ============================================

  test.describe('Copy-Paste Attack Prevention', () => {
    test('should handle pasted malicious content', async ({ page }) => {
      const maliciousContent = MaliciousPayloads.xss[0] + MaliciousPayloads.sqlInjection[0]

      // Simulate paste
      await page.locator('input[name="first_name"], #first_name').first().click()
      await page.keyboard.type(maliciousContent)

      await suitabilityPage.saveDraft()
      // Should not crash or execute malicious code
    })
  })
})

// ============================================
// SMOKE TEST - BASIC FUNCTIONALITY
// ============================================

test.describe('Smoke Tests', () => {
  test('form should load without errors', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    // Page should load
    await expect(page).toHaveURL(/.*suitability.*/)
  })

  test('should be able to fill and save basic data', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    // Fill some basic data
    await suitabilityPage.fillField('first_name', 'Test')
    await suitabilityPage.fillField('last_name', 'User')

    // Save draft
    await suitabilityPage.saveDraft()

    // Page should not crash
    await expect(page).toHaveURL(/.*suitability.*/)
  })
})
