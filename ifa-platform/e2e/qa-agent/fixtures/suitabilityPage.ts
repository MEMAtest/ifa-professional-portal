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
    await this.gotoWithRetry(url)
    await this.ensureAuthenticated(url)
    await this.waitForFormLoad()
  }

  async gotoWithNewClient() {
    // Use prospect mode for testing without a real client
    const url = '/assessments/suitability?isProspect=true'
    await this.gotoWithRetry(url)
    await this.ensureAuthenticated(url)
    await this.waitForFormLoad()
  }

  async gotoWithClientId(clientId: string) {
    const url = `/assessments/suitability?clientId=${clientId}`
    await this.gotoWithRetry(url)
    await this.ensureAuthenticated(url)
    await this.waitForFormLoad()
  }

  private async ensureAuthenticated(targetUrl: string) {
    const currentUrl = this.page.url()
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth/signin')

    if (!isLoginPage) {
      return
    }

    const email = process.env.E2E_EMAIL || 'demo@plannetic.com'
    const password = process.env.E2E_PASSWORD || 'demo123'

    await this.page.fill('#email, input[name="email"], input[type="email"]', email)
    await this.page.fill('#password, input[name="password"], input[type="password"]', password)

    const submit = this.page.locator(
      'button:has-text("Sign in"), button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]'
    ).first()
    await submit.click()

    await this.page.waitForURL((url) => {
      return !url.pathname.includes('/login') && !url.pathname.includes('/auth/signin')
    }, { timeout: 30000 }).catch(() => {})

    if (!this.page.url().includes('/assessments/suitability')) {
      await this.gotoWithRetry(targetUrl)
    }
  }

  private async gotoWithRetry(url: string) {
    const maxAttempts = 3
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.page.goto(url, { timeout: 120000, waitUntil: 'domcontentloaded' })
        return
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error
        }
        await this.page.waitForTimeout(2000)
      }
    }
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
    const candidates = this.getFieldCandidates(fieldId)
    const selectors = candidates.flatMap((candidate) => ([
      `#${candidate}`,
      `[name="${candidate}"]`,
      `[data-testid="${candidate}"]`,
      `input[id*="${candidate}"]`,
      `select[id*="${candidate}"]`,
      `textarea[id*="${candidate}"]`
    ]))

    return this.page.locator(selectors.join(', ')).first()
  }

  private getFieldCandidates(fieldId: string): string[] {
    const candidates = new Set<string>()
    const aliases: Record<string, string[]> = {
      first_name: ['client_name'],
      last_name: ['client_name'],
      business_name: ['employer_name', 'occupation'],
      monthly_income: ['annual_income'],
      outstanding_mortgage: ['mortgage_outstanding'],
      mortgage_payment: ['mortgage_outstanding'],
      pension_income: ['income_defined_benefit', 'income_state_pension'],
      salary_income: ['income_employment', 'annual_income'],
      rental_income: ['income_rental'],
      rental_property_value: ['property_value'],
      dividend_income: ['income_dividends'],
      pension_provider: ['pension_type'],
      spouse_name: ['notes'],
      spouse_income: ['income_other'],
    }

    const addCandidate = (value: string) => {
      if (value && typeof value === 'string') candidates.add(value)
    }

    addCandidate(fieldId)
    const aliasList = aliases[fieldId]
    if (aliasList) {
      aliasList.forEach(addCandidate)
    }

    if (fieldId.includes('_')) {
      const camel = fieldId.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
      addCandidate(camel)
      addCandidate(fieldId.replace(/_/g, ''))
    }

    return Array.from(candidates)
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
