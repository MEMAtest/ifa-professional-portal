# E2E Testing Quick Reference

A quick reference guide for writing and running E2E tests.

## Commands Cheat Sheet

```bash
# Installation
npm run e2e:install              # Install browsers

# Running Tests
npm run e2e                      # Run all tests
npm run e2e:ui                   # Interactive UI mode
npm run e2e:headed               # See browser window
npm run e2e:debug                # Debug mode

# Browser-Specific
npm run e2e:chromium             # Chromium only
npm run e2e:firefox              # Firefox only
npm run e2e:webkit               # WebKit/Safari only
npm run e2e:mobile               # Mobile Chrome

# Reports
npm run e2e:report               # Open HTML report
```

## Test File Template

```typescript
import { test, expect } from '@playwright/test';
import { createTestHelpers } from './helpers/test-utils';
import { testUsers, testClients } from './fixtures/test-data';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Login
    await helpers.auth.loginIfNeeded();

    // Navigate
    await helpers.navigation.goToClients();

    // Interact
    await helpers.form.fillByPlaceholder('Email', 'test@example.com');
    await helpers.form.submitForm();

    // Assert
    await helpers.assert.assertToastMessage('Success');
  });
});
```

## Helper Functions Quick Reference

### Authentication
```typescript
const helpers = createTestHelpers(page);

await helpers.auth.login();                    // Login
await helpers.auth.loginIfNeeded();            // Login if not authenticated
await helpers.auth.logout();                   // Logout
const isAuth = await helpers.auth.isAuthenticated(); // Check auth
```

### Navigation
```typescript
await helpers.navigation.goToDashboard();
await helpers.navigation.goToClients();
await helpers.navigation.goToNewClient();
await helpers.navigation.goToClientDetail(clientId);
await helpers.navigation.goToCashFlow();
await helpers.navigation.goToStressTesting();
await helpers.navigation.goToCompliance();
await helpers.navigation.goToReports();
```

### Forms
```typescript
await helpers.form.fillByLabel('Email', 'test@example.com');
await helpers.form.fillByPlaceholder('First name', 'John');
await helpers.form.selectOption('#country', 'UK');
await helpers.form.checkCheckbox('#terms');
await helpers.form.fillDate('input[type="date"]', '2000-01-15');
await helpers.form.submitForm(/continue|save/i);
```

### Waiting
```typescript
await helpers.wait.waitForVisible('.modal');
await helpers.wait.waitForHidden('.loading');
await helpers.wait.waitForNetworkIdle();
await helpers.wait.waitForAPIResponse('/api/clients');
await helpers.wait.waitForToast();
```

### Assertions
```typescript
await helpers.assert.assertTitleContains('Dashboard');
await helpers.assert.assertURLContains('/clients');
await helpers.assert.assertVisible('.success-message');
await helpers.assert.assertNotVisible('.error');
await helpers.assert.assertTextContains('.heading', 'Welcome');
await helpers.assert.assertToastMessage('Saved successfully');
await helpers.assert.assertErrorMessage('Required field');
```

### Data Generation
```typescript
const email = helpers.data.generateUniqueEmail('test');
// Returns: test.1234567890@example.com

const id = helpers.data.generateUniqueString('client');
// Returns: client_1234567890

const date = helpers.data.formatDate(new Date('2000-01-15'));
// Returns: 2000-01-15

const num = helpers.data.randomNumber(1, 100);
const bool = helpers.data.randomBoolean();
```

### Debugging
```typescript
await helpers.debug.screenshot('error-state');
await helpers.debug.logConsoleMessages();
await helpers.debug.logNetworkRequests();
const html = await helpers.debug.getPageHTML();
const count = await helpers.debug.countElements('.item');
```

## Test Data Quick Reference

### Users
```typescript
import { testUsers } from './fixtures/test-data';

testUsers.admin.email        // demo@plannetic.com
testUsers.admin.password     // demo123
testUsers.advisor
testUsers.readOnly
```

### Clients
```typescript
import { testClients, generateUniqueClient } from './fixtures/test-data';

const client = testClients.individual;
client.firstName             // John
client.lastName              // Doe
client.email                 // john.doe@example.com
client.dateOfBirth          // 1980-05-15

// Other client types
testClients.couple
testClients.retiree
testClients.youngProfessional

// Generate unique client
const uniqueClient = generateUniqueClient();
```

### Assessments
```typescript
import { testAssessments } from './fixtures/test-data';

testAssessments.lowRisk
testAssessments.moderateRisk
testAssessments.highRisk
testAssessments.veryHighRisk
```

### Cash Flows
```typescript
import { testCashFlows } from './fixtures/test-data';

testCashFlows.simple
testCashFlows.complex
testCashFlows.retirement
```

### Portfolios
```typescript
import { testPortfolios } from './fixtures/test-data';

testPortfolios.conservative
testPortfolios.balanced
testPortfolios.growth
```

## Common Patterns

### Login Before Each Test
```typescript
test.describe('Protected Routes', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = createTestHelpers(page);
    await helpers.auth.loginIfNeeded();
  });

  test('should access dashboard', async ({ page }) => {
    // Already logged in
    await page.goto('/dashboard');
  });
});
```

### Create and Cleanup
```typescript
test('should create and delete client', async ({ page }) => {
  const helpers = createTestHelpers(page);
  const client = generateUniqueClient();

  // Create
  await helpers.navigation.goToNewClient();
  await helpers.form.fillByPlaceholder('First name', client.firstName);
  // ... fill other fields
  await helpers.form.submitForm();

  // Cleanup (if needed)
  // await deleteClient(clientId);
});
```

### Wait for Network Request
```typescript
test('should save data', async ({ page }) => {
  const helpers = createTestHelpers(page);

  // Start waiting before triggering the request
  const responsePromise = helpers.wait.waitForAPIResponse('/api/clients');

  // Trigger the request
  await helpers.form.submitForm();

  // Wait for the response
  await responsePromise;

  // Assert success
  await helpers.assert.assertToastMessage('Saved');
});
```

### Handle Multiple Assertions
```typescript
test('should display client details', async ({ page }) => {
  const helpers = createTestHelpers(page);

  await helpers.navigation.goToClientDetail('client_123');

  // Multiple assertions
  await helpers.assert.assertVisible('.client-name');
  await helpers.assert.assertVisible('.client-email');
  await helpers.assert.assertTextContains('.client-name', 'John Doe');
  await helpers.assert.assertURLContains('/clients/client_123');
});
```

### Mobile Testing
```typescript
test.describe('Mobile Tests', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
  });

  test('should work on mobile', async ({ page }) => {
    const helpers = createTestHelpers(page);
    await helpers.navigation.goToDashboard();
    // Test mobile-specific behavior
  });
});
```

### Skip or Only Run Tests
```typescript
test.skip('not implemented yet', async ({ page }) => {
  // This test will be skipped
});

test.only('debug this test', async ({ page }) => {
  // Only this test will run (useful for debugging)
});

test('conditional skip', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Not supported in Safari yet');
  // Test logic
});
```

### Retry Flaky Tests
```typescript
test.describe('Flaky Feature', () => {
  test.describe.configure({ retries: 2 });

  test('might be flaky', async ({ page }) => {
    // This test will retry up to 2 times if it fails
  });
});
```

## Environment Variables

```bash
# .env.local or CI environment
E2E_EMAIL=demo@plannetic.com
E2E_PASSWORD=demo123
E2E_BASE_URL=http://localhost:3000
E2E_PORT=3000
E2E_WEB_SERVER=1              # Auto-start dev server

# CI-specific
CI=true                        # Enable CI mode
```

## Debugging Tips

### 1. Use UI Mode
```bash
npm run e2e:ui
```
- Best for development
- Time travel debugging
- Pick locators visually
- See test steps in real-time

### 2. Use Debug Mode
```bash
npm run e2e:debug
```
- Pauses before each action
- Opens browser DevTools
- Step through test execution

### 3. Use Headed Mode
```bash
npm run e2e:headed
```
- See browser window during test
- Good for quick visual debugging

### 4. Add Screenshots
```typescript
await helpers.debug.screenshot('before-action');
// Perform action
await helpers.debug.screenshot('after-action');
```

### 5. Log Console Messages
```typescript
await helpers.debug.logConsoleMessages();
// Browser console will be logged to terminal
```

### 6. Inspect Element Counts
```typescript
const count = await helpers.debug.countElements('.list-item');
console.log(`Found ${count} items`);
```

## Best Practices

1. **Use Unique Data**: Always use `generateUniqueEmail()` or timestamps
2. **Wait for Conditions**: Use specific waits, not arbitrary timeouts
3. **Meaningful Assertions**: Assert what the user sees/experiences
4. **Independent Tests**: Each test should run standalone
5. **Use Helpers**: Don't duplicate common actions
6. **Clean Test Data**: Generate unique data to avoid conflicts
7. **Descriptive Names**: Test names should describe behavior
8. **Page Object Pattern**: Consider for complex pages (can extend helpers)

## Useful Playwright Methods

```typescript
// Locators
page.locator('.selector')
page.getByRole('button', { name: /submit/i })
page.getByText('text')
page.getByLabel('label')
page.getByPlaceholder('placeholder')
page.getByTestId('test-id')

// Actions
await page.click('.button')
await page.fill('input', 'value')
await page.check('checkbox')
await page.selectOption('select', 'option')
await page.hover('.element')
await page.press('input', 'Enter')

// Navigation
await page.goto('/path')
await page.goBack()
await page.reload()

// Waiting
await page.waitForSelector('.selector')
await page.waitForURL(/pattern/)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1000) // Avoid if possible

// Assertions
await expect(page).toHaveURL(/pattern/)
await expect(page).toHaveTitle(/title/)
await expect(page.locator('.el')).toBeVisible()
await expect(page.locator('.el')).toHaveText('text')
await expect(page.locator('.el')).toContainText('text')
```

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Browsers not found | Run `npm run e2e:install` |
| Tests timeout | Increase timeout in config or use `E2E_WEB_SERVER=1` |
| Port conflict | Use `E2E_PORT=3001 npm run e2e` |
| Element not found | Use `page.pause()` to inspect, or run with `--headed` |
| Flaky tests | Add retries or better waits |
| Slow tests | Check for unnecessary waits, use network idle |

---

**More Info**: See `tests/e2e/README.md` for comprehensive documentation
