// ===================================================================
// tests/e2e/file-review-workflow.spec.ts - File Review Task/Workflow E2E
// ===================================================================

import { test, expect, Page } from '@playwright/test'

async function login(page: Page) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000)

      const emailField = page.getByLabel('Email')
      const isLoginPage = page.url().includes('/login')
      const hasEmailField = await emailField.isVisible().catch(() => false)

      if (isLoginPage && hasEmailField) {
        await emailField.fill(process.env.E2E_EMAIL || 'demo@plannetic.com')
        await page.getByLabel('Password').fill(process.env.E2E_PASSWORD || 'demo123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await page.waitForTimeout(4000)
      }
      return
    } catch {
      if (attempt < 1) await page.waitForTimeout(2000)
    }
  }
}

async function openClientWithFileReview(page: Page) {
  const preferredClientId = process.env.E2E_FILE_REVIEW_CLIENT_ID
  if (preferredClientId) {
    await page.goto(`/clients/${preferredClientId}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    const docsTab = page.getByRole('tab', { name: /documents/i }).or(
      page.locator('button', { hasText: /documents/i })
    )
    if (await docsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await docsTab.click()
      await page.waitForTimeout(1500)
    }

    const uploadedTab = page.locator('button', { hasText: /^uploaded$/i })
    if (await uploadedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await uploadedTab.click()
      await page.waitForTimeout(1000)
    }
    await page.waitForTimeout(1500)
    let fileReviewBtn = page.locator('button', { hasText: /file review/i }).first()
    let isVisible = await fileReviewBtn.isVisible({ timeout: 8000 }).catch(() => false)
    if (isVisible) return true

    const generatedTab = page.locator('button', { hasText: /^generated$/i })
    if (await generatedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generatedTab.click()
      await page.waitForTimeout(1000)
    }
    fileReviewBtn = page.locator('button', { hasText: /file review/i }).first()
    isVisible = await fileReviewBtn.isVisible({ timeout: 8000 }).catch(() => false)
    if (isVisible) return true
  }

  await page.goto('/clients', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)

  const clientLinks = page.locator('a[href^="/clients/"]')
  const total = await clientLinks.count()
  const limit = Math.min(total, 6)

  for (let i = 0; i < limit; i++) {
    const href = await clientLinks.nth(i).getAttribute('href')
    if (!href) continue

    await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)

    const docsTab = page.getByRole('tab', { name: /documents/i }).or(
      page.locator('button', { hasText: /documents/i })
    )
    if (await docsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await docsTab.click()
      await page.waitForTimeout(1500)
    }

    const uploadedTab = page.locator('button', { hasText: /^uploaded$/i })
    if (await uploadedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await uploadedTab.click()
      await page.waitForTimeout(1000)
    }

    let fileReviewBtn = page.locator('button', { hasText: /file review/i }).first()
    let isVisible = await fileReviewBtn.isVisible({ timeout: 8000 }).catch(() => false)
    if (isVisible) return true

    const generatedTab = page.locator('button', { hasText: /^generated$/i })
    if (await generatedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generatedTab.click()
      await page.waitForTimeout(1000)
    }
    fileReviewBtn = page.locator('button', { hasText: /file review/i }).first()
    isVisible = await fileReviewBtn.isVisible({ timeout: 8000 }).catch(() => false)
    if (isVisible) return true
  }

  return false
}

test.describe('File Review Full Workflow', () => {
  test('generate review, create tasks, save with schedule, update workflow', async ({ page }) => {
    test.setTimeout(240_000)
    await login(page)
    const found = await openClientWithFileReview(page)
    test.skip(!found, 'No client with analysed documents found for File Review')

    const fileReviewBtn = page.locator('button', { hasText: /file review/i }).first()

    await fileReviewBtn.click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })

    const saveBtn = modal.locator('button[aria-label="Save file review to client file"]')
    await expect(saveBtn).toBeVisible({ timeout: 150_000 })

    // Recommended actions → attempt to create tasks
    const actionsHeader = modal.locator('text=/recommended actions/i')
    await expect(actionsHeader).toBeVisible({ timeout: 5000 })

    const noActions = modal.locator('text=/no recommended actions/i')
    const noActionsVisible = await noActions.isVisible().catch(() => false)
    if (noActionsVisible) {
      test.info().annotations.push({
        type: 'note',
        description: 'No recommended actions available; task creation skipped.',
      })
    } else {
      const selectAllBtn = modal.locator('button', { hasText: /select all/i })
      if (await selectAllBtn.isVisible().catch(() => false)) {
        await selectAllBtn.click()
      } else {
        const firstTask = modal.locator('aside label input[type="checkbox"]').first()
        await firstTask.check()
      }

      const createBtn = modal.locator('button', { hasText: /create .* tasks?/i })
      await expect(createBtn).toBeEnabled({ timeout: 5000 })
      await createBtn.click()
    }

    // Save flow with schedule
    await saveBtn.click()
    const scheduleToggle = modal.locator('text=/schedule next review/i')
    await expect(scheduleToggle).toBeVisible({ timeout: 5000 })

    const dateInput = modal.locator('input[type="date"]').first()
    const dateValue = await dateInput.inputValue()
    if (!dateValue) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await dateInput.fill(tomorrow.toISOString().split('T')[0])
    }

    await saveBtn.click()
    await expect(saveBtn).toContainText(/saved/i, { timeout: 20_000 })

    // Workflow checklist toggle
    const workflowHeader = modal.locator('text=/workflow checklist/i')
    await expect(workflowHeader).toBeVisible({ timeout: 10_000 })
    const sendToClient = modal.locator('label', { hasText: /send to client/i }).locator('input[type="checkbox"]')
    await expect(sendToClient).toBeVisible({ timeout: 5000 })
    await sendToClient.click()
    await expect(sendToClient).toBeChecked({ timeout: 10_000 })
  })
})
