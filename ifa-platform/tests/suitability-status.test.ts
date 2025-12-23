import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveSuitabilityCompletionState, normalizeCompletionPercentage } from '@/lib/assessments/suitabilityStatus'

test('normalizeCompletionPercentage: parses numeric strings', () => {
  assert.equal(normalizeCompletionPercentage('83'), 83)
  assert.equal(normalizeCompletionPercentage(' 83 '), 83)
  assert.equal(normalizeCompletionPercentage('83.2'), 83.2)
  assert.equal(normalizeCompletionPercentage(''), null)
  assert.equal(normalizeCompletionPercentage(null), null)
})

test('deriveSuitabilityCompletionState: completed only when final-like AND >=80', () => {
  const complete = deriveSuitabilityCompletionState({
    status: 'completed',
    isFinal: true,
    isDraft: false,
    completionPercentage: 100
  })
  assert.equal(complete.lifecycleStatus, 'completed')
  assert.equal(complete.canGenerateFinalReports, true)
  assert.equal(complete.completionPercentage, 100)
})

test('deriveSuitabilityCompletionState: status completed but <80 remains in progress', () => {
  const inProgress = deriveSuitabilityCompletionState({
    status: 'completed',
    isFinal: false,
    isDraft: false,
    completionPercentage: 19
  })
  assert.equal(inProgress.lifecycleStatus, 'in_progress')
  assert.equal(inProgress.canGenerateFinalReports, false)
  assert.equal(inProgress.resultLabel, '19% Complete')
})

test('deriveSuitabilityCompletionState: clamps completion to [0, 100]', () => {
  const low = deriveSuitabilityCompletionState({
    status: 'in_progress',
    isFinal: false,
    isDraft: true,
    completionPercentage: -10
  })
  assert.equal(low.completionPercentage, 0)
  assert.equal(low.lifecycleStatus, 'in_progress')

  const high = deriveSuitabilityCompletionState({
    status: 'in_progress',
    isFinal: false,
    isDraft: true,
    completionPercentage: 1000
  })
  assert.equal(high.completionPercentage, 100)
})

