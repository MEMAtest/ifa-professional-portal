import { Page, Locator, expect } from '@playwright/test'

/**
 * OSO QA Agent - Suitability Page Object Model
 * Provides methods for interacting with the suitability assessment form
 */
export class SuitabilityPage {
  readonly page: Page
  readonly baseUrl: string

  // Main navigation
  readonly sectionTabs: Locator
  readonly saveButton: Locator
  readonly saveDraftButton: Locator
  readonly nextButton: Locator
  readonly prevButton: Locator

  // Form elements
  readonly formContainer: Locator
  readonly errorMessages: Locator
  readonly loadingSpinner: Locator

  constructor(page: Page) {
    this.page = page
    // Use isProspect=true to bypass client selection for testing
    this.baseUrl = '/assessments/suitability?isProspect=true'

    // Navigation elements
    this.sectionTabs = page.locator('[data-testid="section-tabs"], [role="tablist"]')
    this.saveButton = page.locator('button:has-text("Save"), [data-testid="save-button"]')
    this.saveDraftButton = page.locator('button:has-text("Save Draft"), [data-testid="save-draft"]')
    this.nextButton = page.locator('button:has-text("Next"), [data-testid="next-button"]')
    this.prevButton = page.locator('button:has-text("Previous"), button:has-text("Back")')

    // Form elements
    this.formContainer = page.locator('form, [data-testid="suitability-form"]')
    this.errorMessages = page.locator('[role="alert"], .error-message, [data-testid="error"]')
    this.loadingSpinner = page.locator('[data-testid="loading"], .animate-spin, [role="progressbar"]')
  }

  // ============================================
  // NAVIGATION
  // ============================================

  async goto(clientId?: string) {
    const url = clientId
      ? `/assessments/suitability?clientId=${clientId}`
      : this.baseUrl  // Uses isProspect=true
    await this.page.goto(url, { timeout: 60000 })
    await this.waitForFormLoad()
  }

  async gotoWithNewClient() {
    // Use prospect mode for testing without a real client
    await this.page.goto('/assessments/suitability?isProspect=true')
    await this.waitForFormLoad()
  }

  async gotoWithClientId(clientId: string) {
    await this.page.goto(`/assessments/suitability?clientId=${clientId}`)
    await this.waitForFormLoad()
  }

  async waitForFormLoad() {
    // Wait for DOM to be ready (networkidle can timeout with long-polling connections)
    await this.page.waitForLoadState('domcontentloaded')
    // Give the page time to render
    await this.page.waitForTimeout(3000)
    // Wait for form container to be visible (with longer timeout for slow-loading forms)
    await this.formContainer.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {
      // Form might not have data-testid, continue anyway
    })
  }

  async goToSection(sectionName: string) {
    // Try multiple selectors for section navigation
    const selectors = [
      `[data-testid="section-${sectionName}"]`,
      `button:has-text("${sectionName}")`,
      `[role="tab"]:has-text("${sectionName}")`,
      `a:has-text("${sectionName}")`
    ]

    for (const selector of selectors) {
      const element = this.page.locator(selector).first()
      if (await element.isVisible().catch(() => false)) {
        await element.click()
        await this.page.waitForTimeout(500) // Allow section to load
        return
      }
    }

    throw new Error(`Could not find section: ${sectionName}`)
  }

  // ============================================
  // FIELD INTERACTIONS
  // ============================================

  async fillField(fieldId: string, value: string | number | boolean) {
    const field = this.getFieldLocator(fieldId)
    await field.waitFor({ state: 'visible', timeout: 5000 })

    const tagName = await field.evaluate(el => el.tagName.toLowerCase())

    if (tagName === 'select') {
      await field.selectOption({ label: String(value) }).catch(async () => {
        // Try by value if label doesn't work
        await field.selectOption(String(value))
      })
    } else if (tagName === 'textarea') {
      await field.clear()
      await field.fill(String(value))
    } else {
      const inputType = await field.getAttribute('type')
      if (inputType === 'checkbox' || inputType === 'radio') {
        if (value === true || value === 'true' || value === 'Yes') {
          await field.check()
        } else {
          await field.uncheck()
        }
      } else {
        await field.clear()
        await field.fill(String(value))
      }
    }
  }

  async getFieldValue(fieldId: string): Promise<string> {
    const field = this.getFieldLocator(fieldId)
    await field.waitFor({ state: 'visible', timeout: 5000 })

    const tagName = await field.evaluate(el => el.tagName.toLowerCase())

    if (tagName === 'select') {
      return await field.inputValue()
    } else {
      const inputType = await field.getAttribute('type')
      if (inputType === 'checkbox' || inputType === 'radio') {
        return (await field.isChecked()) ? 'true' : 'false'
      }
      return await field.inputValue()
    }
  }

  async isFieldVisible(fieldId: string): Promise<boolean> {
    const field = this.getFieldLocator(fieldId)
    return await field.isVisible().catch(() => false)
  }

  async isFieldDisabled(fieldId: string): Promise<boolean> {
    const field = this.getFieldLocator(fieldId)
    return await field.isDisabled().catch(() => false)
  }

  private getFieldLocator(fieldId: string): Locator {
    // Try multiple selectors
    return this.page.locator([
      `#${fieldId}`,
      `[name="${fieldId}"]`,
      `[data-testid="${fieldId}"]`,
      `input[id*="${fieldId}"]`,
      `select[id*="${fieldId}"]`,
      `textarea[id*="${fieldId}"]`
    ].join(', ')).first()
  }

  // ============================================
  // FORM ACTIONS
  // ============================================

  async saveDraft() {
    await this.saveDraftButton.click()
    await this.waitForSaveComplete()
  }

  async save() {
    await this.saveButton.click()
    await this.waitForSaveComplete()
  }

  async clickNext() {
    await this.nextButton.click()
    await this.page.waitForTimeout(300)
  }

  async clickPrevious() {
    await this.prevButton.click()
    await this.page.waitForTimeout(300)
  }

  private async waitForSaveComplete() {
    // Wait for any loading indicators to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    // Small delay to allow save to complete (networkidle can timeout with SSE/WebSocket connections)
    await this.page.waitForTimeout(1000)
  }

  // ============================================
  // VALIDATION
  // ============================================

  async getErrorMessages(): Promise<string[]> {
    const errors = await this.errorMessages.allTextContents()
    return errors.filter(e => e.trim().length > 0)
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessages.first().isVisible().catch(() => false)
  }

  async expectNoErrors() {
    const errors = await this.getErrorMessages()
    expect(errors.length, `Found errors: ${errors.join(', ')}`).toBe(0)
  }

  async expectError(errorText: string) {
    const errors = await this.getErrorMessages()
    const hasError = errors.some(e => e.toLowerCase().includes(errorText.toLowerCase()))
    expect(hasError, `Expected error containing "${errorText}", got: ${errors.join(', ')}`).toBeTruthy()
  }

  // ============================================
  // SECTION-SPECIFIC HELPERS
  // ============================================

  async fillPersonalDetails(data: Record<string, string | number>) {
    await this.goToSection('Personal Details')
    for (const [field, value] of Object.entries(data)) {
      await this.fillField(field, value)
    }
  }

  async fillFinancialSituation(data: Record<string, string | number>) {
    await this.goToSection('Financial Situation')
    for (const [field, value] of Object.entries(data)) {
      await this.fillField(field, value)
    }
  }

  async fillRiskAssessment(data: Record<string, string | number>) {
    await this.goToSection('Risk Assessment')
    for (const [field, value] of Object.entries(data)) {
      await this.fillField(field, value)
    }
  }

  async fillRecommendation(data: Record<string, string | number>) {
    await this.goToSection('Recommendation')
    for (const [field, value] of Object.entries(data)) {
      await this.fillField(field, value)
    }
  }

  // ============================================
  // API INTERCEPTION
  // ============================================

  async interceptDraftSave(): Promise<{ status: number; body: unknown }[]> {
    const responses: { status: number; body: unknown }[] = []

    this.page.on('response', async (response) => {
      if (response.url().includes('/api/assessments/suitability/draft')) {
        responses.push({
          status: response.status(),
          body: await response.json().catch(() => null)
        })
      }
    })

    return responses
  }

  async getNetworkRequests(urlPattern: string): Promise<number> {
    let count = 0
    this.page.on('request', (request) => {
      if (request.url().includes(urlPattern)) {
        count++
      }
    })
    return count
  }

  // ============================================
  // CONDITIONAL LOGIC TESTING
  // ============================================

  async testConditionalField(
    triggerField: string,
    triggerValue: string,
    targetField: string,
    shouldBeVisible: boolean
  ): Promise<boolean> {
    // Set the trigger value
    await this.fillField(triggerField, triggerValue)
    await this.page.waitForTimeout(300) // Wait for conditional logic to process

    // Check target field visibility
    const isVisible = await this.isFieldVisible(targetField)
    return isVisible === shouldBeVisible
  }

  // ============================================
  // STRESS TESTING
  // ============================================

  async rapidFireSaves(count: number, intervalMs: number = 100) {
    const results: { success: boolean; error?: string }[] = []

    for (let i = 0; i < count; i++) {
      try {
        await this.saveDraft()
        results.push({ success: true })
      } catch (error) {
        results.push({ success: false, error: String(error) })
      }
      await this.page.waitForTimeout(intervalMs)
    }

    return results
  }

  async fillFormRapidly(data: Record<string, string | number>) {
    const startTime = Date.now()
    for (const [field, value] of Object.entries(data)) {
      await this.fillField(field, value)
    }
    return Date.now() - startTime
  }
}
