# E2E Testing Documentation

This directory contains the End-to-End (E2E) testing infrastructure for the IFA Professional Portal using Playwright.

## Directory Structure

```
tests/e2e/
├── fixtures/           # Test data and mock fixtures
│   └── test-data.ts   # Reusable test data for clients, assessments, etc.
├── helpers/           # Test utilities and helper functions
│   └── test-utils.ts  # Authentication, navigation, form helpers, etc.
├── *.spec.ts         # Test specification files
└── README.md         # This file
```

## Getting Started

### Prerequisites

1. Node.js 20 or higher
2. npm installed
3. Application environment variables configured in `.env.local`

### Installation

Install Playwright browsers:

```bash
npm run e2e:install
```

This will install all necessary browsers (Chromium, Firefox, WebKit) with system dependencies.

## Running Tests

### Basic Commands

```bash
# Run all E2E tests
npm run e2e

# Run tests with UI mode (interactive)
npm run e2e:ui

# Run tests in headed mode (see browser)
npm run e2e:headed

# Run tests in debug mode
npm run e2e:debug

# Show test report
npm run e2e:report
```

### Browser-Specific Commands

```bash
# Run tests on Chromium only
npm run e2e:chromium

# Run tests on Firefox only
npm run e2e:firefox

# Run tests on WebKit only
npm run e2e:webkit

# Run tests on all desktop browsers
npm run e2e:all

# Run tests on mobile Chrome
npm run e2e:mobile
```

### Development Workflow

1. **Write Tests**: Create new `.spec.ts` files in `tests/e2e/`
2. **Use Helpers**: Import utilities from `helpers/test-utils.ts`
3. **Use Fixtures**: Import test data from `fixtures/test-data.ts`
4. **Run Tests**: Use `npm run e2e:ui` for interactive development
5. **Debug**: Use `npm run e2e:debug` to step through tests

## Configuration

### Environment Variables

Configure these in your `.env.local` file or CI/CD environment:

```bash
# Test user credentials
E2E_EMAIL=demo@plannetic.com
E2E_PASSWORD=demo123

# Test server configuration
E2E_BASE_URL=http://localhost:3000
E2E_PORT=3000

# Auto-start dev server (set to 1 to enable)
E2E_WEB_SERVER=1
```

### Playwright Configuration

The main configuration is in `playwright.config.ts` at the project root. Key settings:

- **Test directory**: `tests/e2e`
- **Timeout**: 60 seconds per test
- **Retries**: 0 locally, 2 in CI
- **Parallel execution**: Enabled
- **Test artifacts**: Screenshots, videos, traces on failure

## Writing Tests

### Example Test

```typescript
import { test, expect } from '@playwright/test';
import { createTestHelpers } from './helpers/test-utils';
import { testClients } from './fixtures/test-data';

test.describe('Client Management', () => {
  test('should create a new client', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Login
    await helpers.auth.loginIfNeeded();

    // Navigate to new client page
    await helpers.navigation.goToNewClient();

    // Fill form using test data
    const client = testClients.individual;
    await helpers.form.fillByPlaceholder('First name', client.firstName);
    await helpers.form.fillByPlaceholder('Last name', client.lastName);
    await helpers.form.fillDate('input[type="date"]', client.dateOfBirth);

    // Submit form
    await helpers.form.submitForm(/continue|save/i);

    // Assert success
    await helpers.assert.assertToastMessage('Client created successfully');
  });
});
```

### Using Test Helpers

The `createTestHelpers()` function provides organized utilities:

```typescript
const helpers = createTestHelpers(page);

// Authentication
await helpers.auth.login();
await helpers.auth.loginIfNeeded();
await helpers.auth.logout();

// Navigation
await helpers.navigation.goToDashboard();
await helpers.navigation.goToClients();
await helpers.navigation.goToNewClient();

// Forms
await helpers.form.fillByLabel('Email', 'test@example.com');
await helpers.form.fillByPlaceholder('First name', 'John');
await helpers.form.submitForm();

// Waiting
await helpers.wait.waitForVisible('.modal');
await helpers.wait.waitForToast();
await helpers.wait.waitForNetworkIdle();

// Assertions
await helpers.assert.assertVisible('.success-message');
await helpers.assert.assertToastMessage('Success');
await helpers.assert.assertURLContains('/clients');

// Data generation
const email = helpers.data.generateUniqueEmail('test');
const id = helpers.data.generateUniqueString('client');

// Debugging
await helpers.debug.screenshot('error-state');
await helpers.debug.logConsoleMessages();
```

### Using Test Fixtures

Import pre-configured test data:

```typescript
import { testUsers, testClients, testAssessments } from './fixtures/test-data';

// Use test credentials
const { email, password } = testUsers.admin;

// Use sample client data
const client = testClients.individual;

// Use assessment data
const assessment = testAssessments.moderateRisk;

// Generate unique data
import { generateUniqueClient } from './fixtures/test-data';
const uniqueClient = generateUniqueClient();
```

## Test Organization

### Test Files

Organize tests by feature or page:

```
tests/e2e/
├── auth.spec.ts              # Authentication tests
├── client-management.spec.ts  # Client CRUD operations
├── assessments.spec.ts        # Risk assessments
├── cashflow.spec.ts           # Cash flow planning
├── stress-testing.spec.ts     # Stress testing scenarios
├── compliance.spec.ts         # Compliance and PROD
├── reports.spec.ts            # Report generation
└── mobile.spec.ts             # Mobile-specific tests
```

### Test Structure

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login, navigate, etc.
  });

  test('should do something', async ({ page }) => {
    // Arrange: Setup test data
    // Act: Perform actions
    // Assert: Verify results
  });

  test.afterEach(async ({ page }) => {
    // Cleanup if needed
  });
});
```

## CI/CD Integration

### GitHub Actions

The workflow file `.github/workflows/e2e-tests.yml` runs tests on:

- **Push to main/develop**: Runs all tests
- **Pull requests**: Runs all tests
- **Manual trigger**: Can select specific browser
- **Scheduled (optional)**: Nightly full test suite

### Artifacts

Test results are uploaded as artifacts:

- **HTML Report**: Interactive test report
- **Screenshots**: On test failure
- **Videos**: On test failure
- **Traces**: On test failure (for debugging)

### Viewing Reports

After tests run in CI:

1. Go to the GitHub Actions tab
2. Select the workflow run
3. Download the `playwright-report-*` artifacts
4. Extract and open `index.html` in a browser

## Best Practices

### 1. Test Independence

Each test should be independent and able to run in isolation:

```typescript
test('should create client', async ({ page }) => {
  // Generate unique data for this test
  const client = generateUniqueClient();
  // ... test logic
});
```

### 2. Use Test Helpers

Avoid duplicating common actions:

```typescript
// ❌ Bad: Duplicating login logic
await page.goto('/login');
await page.fill('#email', 'user@example.com');
await page.fill('#password', 'password');
await page.click('button[type="submit"]');

// ✅ Good: Use helper
const helpers = createTestHelpers(page);
await helpers.auth.login();
```

### 3. Meaningful Assertions

Use specific assertions that clearly express intent:

```typescript
// ❌ Bad: Generic assertion
await expect(page.locator('.message')).toBeVisible();

// ✅ Good: Specific assertion
await helpers.assert.assertToastMessage('Client created successfully');
```

### 4. Wait for Conditions

Don't use arbitrary timeouts:

```typescript
// ❌ Bad: Arbitrary timeout
await page.waitForTimeout(3000);

// ✅ Good: Wait for specific condition
await helpers.wait.waitForNetworkIdle();
await helpers.wait.waitForVisible('.results');
```

### 5. Clean Test Data

Use unique identifiers to avoid test conflicts:

```typescript
const timestamp = Date.now();
const email = `test.user.${timestamp}@example.com`;
```

## Debugging Tests

### UI Mode

Best for interactive debugging:

```bash
npm run e2e:ui
```

Features:
- Watch mode
- Time travel debugging
- Pick locators
- See actionability logs

### Debug Mode

Step through tests with browser DevTools:

```bash
npm run e2e:debug
```

### Visual Debugging

Run tests in headed mode to see the browser:

```bash
npm run e2e:headed
```

### Trace Viewer

View recorded traces of failed tests:

```bash
npx playwright show-trace test-results/artifacts/trace.zip
```

## Common Issues

### Port Already in Use

If port 3000 is already in use:

```bash
E2E_PORT=3001 npm run e2e
```

### Browser Installation Failed

Reinstall browsers:

```bash
npm run e2e:install
```

### Tests Timing Out

Increase timeout in `playwright.config.ts` or for specific tests:

```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(120_000); // 2 minutes
  // ... test logic
});
```

### Flaky Tests

Use retries for unstable tests:

```typescript
test.describe('Flaky feature', () => {
  test.describe.configure({ retries: 2 });

  test('might fail sometimes', async ({ page }) => {
    // ... test logic
  });
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Playwright Tests](https://playwright.dev/docs/debug)

## Support

For issues or questions:

1. Check this documentation
2. Review Playwright docs
3. Check existing test examples in this directory
4. Ask the team in #engineering channel
