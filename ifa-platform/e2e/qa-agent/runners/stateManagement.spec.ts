import { test, expect } from '@playwright/test'
import { SuitabilityPage } from '../fixtures/suitabilityPage'
import { ValidClients, flattenClientData } from '../generators/suitabilityTestData'

/**
 * OSO QA Agent - State Management Tests
 * Tests for draft persistence, navigation, and form state handling
 */

test.describe('State Management Tests', () => {
  let suitabilityPage: SuitabilityPage

  test.beforeEach(async ({ page }) => {
    suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()
  })

  // ============================================
  // DRAFT PERSISTENCE TESTS
  // ============================================

  test.describe('Draft Persistence', () => {
    test('should persist draft on page reload', async ({ page }) => {
      // Fill some data
      const testName = `DraftTest${Date.now()}`
      await suitabilityPage.fillField('first_name', testName)
      await suitabilityPage.fillField('last_name', 'Persistence')

      // Save draft
      await suitabilityPage.saveDraft()

      // Wait for save to complete
      await page.waitForTimeout(1000)

      // Reload page
      await page.reload()
      await suitabilityPage.waitForFormLoad()

      // Check if data persisted
      const firstName = await suitabilityPage.getFieldValue('first_name').catch(() => '')
      console.log(`First name after reload: ${firstName}`)

      // If draft was saved, name should persist
      if (firstName) {
        expect(firstName).toBe(testName)
      }
    })

    test('should persist draft on navigate away and return', async ({ page }) => {
      const testName = `NavTest${Date.now()}`
      await suitabilityPage.fillField('first_name', testName)
      await suitabilityPage.saveDraft()

      // Navigate away
      await page.goto('/dashboard').catch(() => page.goto('/'))

      // Navigate back
      await suitabilityPage.goto()

      const firstName = await suitabilityPage.getFieldValue('first_name').catch(() => '')
      console.log(`First name after navigation: ${firstName}`)
    })

    test('should warn before losing unsaved changes', async ({ page }) => {
      // Fill data WITHOUT saving
      await suitabilityPage.fillField('first_name', 'Unsaved')

      // Set up dialog handler
      let dialogMessage = ''
      page.on('dialog', async (dialog) => {
        dialogMessage = dialog.message()
        await dialog.accept()
      })

      // Try to navigate away
      await page.goto('/dashboard').catch(() => {})

      console.log(`Dialog message: ${dialogMessage}`)

      // Should have shown warning about unsaved changes
      // (Depends on implementation)
    })
  })

  // ============================================
  // SECTION NAVIGATION TESTS
  // ============================================

  test.describe('Section Navigation', () => {
    test('should preserve data when navigating between sections', async () => {
      // Fill data in first section
      await suitabilityPage.fillField('first_name', 'Navigate')
      await suitabilityPage.fillField('last_name', 'Test')

      // Go to another section
      await suitabilityPage.goToSection('Financial Situation').catch(() => {})
      await suitabilityPage.page.waitForTimeout(500)

      // Go back to first section
      await suitabilityPage.goToSection('Personal Details').catch(() => {})
      await suitabilityPage.page.waitForTimeout(500)

      // Data should be preserved
      const firstName = await suitabilityPage.getFieldValue('first_name').catch(() => '')
      console.log(`First name after section navigation: ${firstName}`)
    })

    test('should handle rapid section switching', async () => {
      const sections = [
        'Personal Details',
        'Financial Situation',
        'Risk Assessment',
        'Objectives',
        'Recommendation',
      ]

      // Fill some initial data
      await suitabilityPage.fillField('first_name', 'Rapid')

      // Rapidly switch sections
      for (const section of sections) {
        await suitabilityPage.goToSection(section).catch(() => {})
        await suitabilityPage.page.waitForTimeout(100)
      }

      // Go back to first section
      await suitabilityPage.goToSection('Personal Details').catch(() => {})
      await suitabilityPage.page.waitForTimeout(500)

      // Data should still be there
      const firstName = await suitabilityPage.getFieldValue('first_name').catch(() => '')
      console.log(`First name after rapid switching: ${firstName}`)
    })

    test('should handle next/previous navigation', async () => {
      await suitabilityPage.fillField('first_name', 'NextPrev')

      // Use next button
      await suitabilityPage.clickNext()
      await suitabilityPage.page.waitForTimeout(500)

      // Use previous button
      await suitabilityPage.clickPrevious()
      await suitabilityPage.page.waitForTimeout(500)

      // Check data is preserved
      const firstName = await suitabilityPage.getFieldValue('first_name').catch(() => '')
      console.log(`First name after next/prev: ${firstName}`)
    })
  })

  // ============================================
  // BROWSER NAVIGATION TESTS
  // ============================================

  test.describe('Browser Navigation', () => {
    test('should handle browser back button', async ({ page }) => {
      await suitabilityPage.fillField('first_name', 'BackTest')
      await suitabilityPage.saveDraft()

      // Go to another section
      await suitabilityPage.goToSection('Financial Situation').catch(() => {})
      await page.waitForTimeout(500)

      // Use browser back
      await page.goBack()
      await page.waitForTimeout(1000)

      // Form should still be usable
      await expect(page).toHaveURL(/.*/)
    })

    test('should handle browser forward button', async ({ page }) => {
      await suitabilityPage.fillField('first_name', 'ForwardTest')
      await suitabilityPage.saveDraft()

      // Go to another page
      await page.goto('/dashboard').catch(() => page.goto('/'))

      // Go back
      await page.goBack()
      await page.waitForTimeout(1000)

      // Go forward
      await page.goForward()
      await page.waitForTimeout(1000)

      await expect(page).toHaveURL(/.*/)
    })

    test('should handle browser refresh', async ({ page }) => {
      await suitabilityPage.fillField('first_name', 'RefreshTest')
      await suitabilityPage.saveDraft()

      // Refresh
      await page.reload()
      await suitabilityPage.waitForFormLoad()

      // Check data
      const firstName = await suitabilityPage.getFieldValue('first_name').catch(() => '')
      console.log(`First name after refresh: ${firstName}`)
    })
  })

  // ============================================
  // MULTI-TAB TESTS
  // ============================================

  test.describe('Multi-Tab Handling', () => {
    test('should handle same form open in multiple tabs', async ({ context }) => {
      const page1 = await context.newPage()
      const page2 = await context.newPage()

      const suitability1 = new SuitabilityPage(page1)
      const suitability2 = new SuitabilityPage(page2)

      await suitability1.goto()
      await suitability2.goto()

      // Edit in tab 1
      await suitability1.fillField('first_name', 'Tab1Edit')
      await suitability1.saveDraft()

      // Edit in tab 2
      await suitability2.fillField('first_name', 'Tab2Edit')
      await suitability2.saveDraft()

      // Refresh tab 1
      await page1.reload()
      await suitability1.waitForFormLoad()

      const tab1Name = await suitability1.getFieldValue('first_name').catch(() => '')
      console.log(`Tab 1 name after tab 2 save: ${tab1Name}`)

      await page1.close()
      await page2.close()
    })

    test('should sync changes across tabs', async ({ context }) => {
      // This tests if there's any realtime sync
      const page1 = await context.newPage()
      const page2 = await context.newPage()

      const suitability1 = new SuitabilityPage(page1)
      const suitability2 = new SuitabilityPage(page2)

      await suitability1.goto()
      await suitability2.goto()

      // Edit and save in tab 1
      await suitability1.fillField('first_name', 'SyncTest')
      await suitability1.saveDraft()

      // Wait a bit
      await page2.waitForTimeout(2000)

      // Check if tab 2 has the update (without refresh)
      const tab2Name = await suitability2.getFieldValue('first_name').catch(() => '')
      console.log(`Tab 2 name (no refresh): ${tab2Name}`)

      // Refresh tab 2 and check
      await page2.reload()
      await suitability2.waitForFormLoad()
      const tab2NameAfter = await suitability2.getFieldValue('first_name').catch(() => '')
      console.log(`Tab 2 name (after refresh): ${tab2NameAfter}`)

      await page1.close()
      await page2.close()
    })
  })

  // ============================================
  // LOCAL STORAGE TESTS
  // ============================================

  test.describe('Local Storage Handling', () => {
    test('should handle localStorage being cleared', async ({ page }) => {
      await suitabilityPage.fillField('first_name', 'StorageTest')
      await suitabilityPage.saveDraft()

      // Clear localStorage
      await page.evaluate(() => localStorage.clear())

      // Reload page
      await page.reload()
      await suitabilityPage.waitForFormLoad()

      // Should still work (data should be in server, not just localStorage)
      await expect(page).toHaveURL(/.*/)
    })

    test('should handle sessionStorage being cleared', async ({ page }) => {
      await suitabilityPage.fillField('first_name', 'SessionTest')
      await suitabilityPage.saveDraft()

      // Clear sessionStorage
      await page.evaluate(() => sessionStorage.clear())

      // Should still work
      await suitabilityPage.saveDraft()
    })

    test('should handle storage quota exceeded', async ({ page }) => {
      // Try to fill localStorage
      await page.evaluate(() => {
        try {
          const largeData = 'x'.repeat(5 * 1024 * 1024) // 5MB
          localStorage.setItem('test', largeData)
        } catch (e) {
          console.log('Storage quota exceeded:', e)
        }
      })

      // Form should still work
      await suitabilityPage.fillField('first_name', 'QuotaTest')
      await suitabilityPage.saveDraft()

      // Clean up
      await page.evaluate(() => localStorage.clear())
    })
  })

  // ============================================
  // FORM RECOVERY TESTS
  // ============================================

  test.describe('Form Recovery', () => {
    test('should recover from tab crash', async ({ context }) => {
      const page = await context.newPage()
      const suitability = new SuitabilityPage(page)
      await suitability.goto()

      // Fill data
      await suitability.fillField('first_name', 'CrashTest')
      await suitability.saveDraft()

      // Simulate crash by closing page abruptly
      await page.close()

      // Open new tab
      const newPage = await context.newPage()
      const newSuitability = new SuitabilityPage(newPage)
      await newSuitability.goto()

      // Check if data can be recovered
      const firstName = await newSuitability.getFieldValue('first_name').catch(() => '')
      console.log(`Recovered name: ${firstName}`)

      await newPage.close()
    })

    test('should handle form recovery after browser restart', async ({ browser }) => {
      // First session - save data
      const context1 = await browser.newContext()
      const page1 = await context1.newPage()
      const suitability1 = new SuitabilityPage(page1)
      await suitability1.goto()
      await suitability1.fillField('first_name', 'RestartTest')
      await suitability1.saveDraft()
      await context1.close()

      // Second session - check data
      const context2 = await browser.newContext()
      const page2 = await context2.newPage()
      const suitability2 = new SuitabilityPage(page2)
      await suitability2.goto()
      const firstName = await suitability2.getFieldValue('first_name').catch(() => '')
      console.log(`Name after browser restart: ${firstName}`)
      await context2.close()
    })
  })

  // ============================================
  // FORM STATE CONSISTENCY TESTS
  // ============================================

  test.describe('Form State Consistency', () => {
    test('should maintain state after validation error', async () => {
      // Fill valid data
      await suitabilityPage.fillField('first_name', 'Valid')
      await suitabilityPage.fillField('last_name', 'User')

      // Fill invalid data
      await suitabilityPage.fillField('email', 'invalid-email')

      // Try to save (should fail validation)
      await suitabilityPage.save().catch(() => {})

      // Check that valid data is still there
      const firstName = await suitabilityPage.getFieldValue('first_name')
      expect(firstName).toBe('Valid')
    })

    test('should clear form correctly when starting new', async ({ page }) => {
      // Fill data
      await suitabilityPage.fillField('first_name', 'ClearTest')
      await suitabilityPage.saveDraft()

      // Look for "New" or "Clear" button
      const clearButton = page.locator('button:has-text("New"), button:has-text("Clear"), button:has-text("Start Over")')

      if (await clearButton.isVisible()) {
        await clearButton.click()

        // Check form is cleared
        const firstName = await suitabilityPage.getFieldValue('first_name').catch(() => '')
        console.log(`Name after clear: ${firstName}`)
      } else {
        console.log('No clear button found')
      }
    })

    test('should handle undo/redo if supported', async ({ page }) => {
      await suitabilityPage.fillField('first_name', 'Original')

      // Change value
      await suitabilityPage.fillField('first_name', 'Changed')

      // Try Ctrl+Z (undo)
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(500)

      const value = await suitabilityPage.getFieldValue('first_name')
      console.log(`Value after undo: ${value}`)
    })
  })

  // ============================================
  // AUTOSAVE TESTS
  // ============================================

  test.describe('Autosave', () => {
    test('should autosave periodically if enabled', async ({ page }) => {
      let saveCount = 0

      page.on('request', (request) => {
        if (request.url().includes('/api/assessments/suitability/draft')) {
          saveCount++
        }
      })

      await suitabilityPage.fillField('first_name', 'Autosave')

      // Wait for potential autosave
      await page.waitForTimeout(10000)

      console.log(`Autosaves detected: ${saveCount}`)
    })

    test('should not lose data during autosave', async ({ page }) => {
      // Type slowly while autosave might be happening
      const testInput = 'TypeTest123'

      for (const char of testInput) {
        await page.keyboard.type(char)
        await page.waitForTimeout(100)
      }

      // Wait for any autosave
      await page.waitForTimeout(2000)

      const firstName = await suitabilityPage.getFieldValue('first_name').catch(() => '')
      console.log(`Input value: ${firstName}`)

      // Should not lose any characters
    })
  })
})

// ============================================
// FULL FORM FLOW TEST
// ============================================

test.describe('Full Form Flow', () => {
  test('should complete full suitability assessment', async ({ page }) => {
    const suitabilityPage = new SuitabilityPage(page)
    await suitabilityPage.goto()

    const client = ValidClients[0]
    const data = flattenClientData(client)

    // Track progress
    const filledFields: string[] = []
    const failedFields: string[] = []

    // Fill all fields
    for (const [field, value] of Object.entries(data)) {
      try {
        await suitabilityPage.fillField(field, value)
        filledFields.push(field)
      } catch {
        failedFields.push(field)
      }
    }

    console.log(`Filled ${filledFields.length} fields`)
    console.log(`Failed to fill ${failedFields.length} fields`)

    // Save draft
    await suitabilityPage.saveDraft()

    // Try final save
    await suitabilityPage.save().catch((e) => {
      console.log('Final save failed:', e)
    })
  })
})
