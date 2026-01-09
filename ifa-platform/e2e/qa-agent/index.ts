/**
 * OSO QA Agent - Main Orchestrator
 * Brutal E2E testing framework for suitability forms
 *
 * Usage:
 *   npm run qa:suitability        - Run all suitability tests
 *   npm run qa:brutal             - Run brutal destruction tests
 *   npm run qa:conditional        - Run conditional logic tests
 *   npm run qa:stress             - Run API stress tests
 *   npm run qa:state              - Run state management tests
 *
 * Environment Variables:
 *   E2E_BASE_URL    - Override base URL (default: http://localhost:3000)
 *   E2E_EMAIL       - Test user email
 *   E2E_PASSWORD    - Test user password
 *   E2E_CLIENT_ID   - Existing client ID for tests
 */

export { SuitabilityPage } from './fixtures/suitabilityPage'
export { test, expect, TestCredentials, TestClientIds, loginAsTestUser } from './fixtures/testClient'

export { EdgeCases, FieldEdgeCases, generateBoundaryValues, StressTestData } from './generators/edgeCases'
export { MaliciousPayloads, generateFuzzyTests, chaosMonkeyValue, randomString } from './generators/fuzzyInputs'
export {
  ValidClients,
  ConditionalLogicTests,
  ValidationTests,
  StressTestScenarios,
  KeyTestFields,
  getClientByType,
  flattenClientData,
  getDataBySection,
  generateRandomValidClient,
  type TestClientProfile,
  type ConditionalTestCase,
  type ValidationTestCase,
} from './generators/suitabilityTestData'

// QA Agent configuration
export interface QAAgentConfig {
  form: 'suitability' | 'custom'
  sections?: string[] | 'all'
  severity?: 'gentle' | 'moderate' | 'brutal'
  parallel?: boolean
  reportFormat?: 'html' | 'json' | 'console'
  baseUrl?: string
}

// Default configuration
export const defaultConfig: QAAgentConfig = {
  form: 'suitability',
  sections: 'all',
  severity: 'brutal',
  parallel: true,
  reportFormat: 'html',
}

// Test suite paths
export const TestSuites = {
  formDestruction: './runners/formDestruction.spec.ts',
  conditionalLogic: './runners/conditionalLogic.spec.ts',
  apiStress: './runners/apiStress.spec.ts',
  stateManagement: './runners/stateManagement.spec.ts',
}

// Quick reference for running tests
export const RunCommands = {
  all: 'npx playwright test --project=qa-suitability',
  brutal: 'npx playwright test --project=qa-brutal',
  formDestruction: 'npx playwright test e2e/qa-agent/runners/formDestruction.spec.ts',
  conditionalLogic: 'npx playwright test e2e/qa-agent/runners/conditionalLogic.spec.ts',
  apiStress: 'npx playwright test e2e/qa-agent/runners/apiStress.spec.ts',
  stateManagement: 'npx playwright test e2e/qa-agent/runners/stateManagement.spec.ts',
}

console.log(`
╔══════════════════════════════════════════════════════════╗
║              OSO QA AGENT - READY                        ║
╠══════════════════════════════════════════════════════════╣
║  Run Commands:                                           ║
║  • npm run qa:suitability    - All suitability tests     ║
║  • npm run qa:brutal         - Brutal destruction tests  ║
║  • npm run qa:conditional    - Conditional logic tests   ║
║  • npm run qa:stress         - API stress tests          ║
║  • npm run qa:state          - State management tests    ║
╚══════════════════════════════════════════════════════════╝
`)
