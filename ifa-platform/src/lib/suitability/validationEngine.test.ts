import { describe, expect, it } from 'vitest'

import type { PulledPlatformData, SuitabilityFormData } from '@/types/suitability'
import { validationEngine } from '@/lib/suitability/validationEngine'

function makeFormData(partial: Partial<SuitabilityFormData>): SuitabilityFormData {
  const now = new Date().toISOString()

  return {
    _metadata: {
      version: 'test',
      createdAt: now,
      updatedAt: now,
      completionPercentage: 0,
      aiEnabled: false,
      pulledData: {}
    },
    _aiSuggestions: {},
    _chartData: {},
    ...partial
  } as SuitabilityFormData
}

function makePulledData(partial: Partial<PulledPlatformData> = {}): PulledPlatformData {
  return { ...partial } as PulledPlatformData
}

describe('validationEngine', () => {
  it('flags invalid age', () => {
    const formData = makeFormData({
      personal_information: {
        age: 17
      } as any
    })

    const result = validationEngine.validateField(
      'personal_information',
      'age',
      17,
      formData,
      makePulledData()
    )

    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.code === 'INVALID_AGE')).toBe(true)
  })

  it('flags invalid email', () => {
    const formData = makeFormData({
      contact_details: {
        email: 'not-an-email'
      } as any
    })

    const result = validationEngine.validateField(
      'contact_details',
      'email',
      'not-an-email',
      formData,
      makePulledData()
    )

    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.code === 'INVALID_EMAIL')).toBe(true)
  })
})

