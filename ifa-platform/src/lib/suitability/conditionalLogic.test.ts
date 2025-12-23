import { describe, expect, it } from 'vitest'

import type { PulledPlatformData, SuitabilityFormData } from '@/types/suitability'
import { conditionalLogicEngine, conditionalRules } from '@/lib/suitability/conditionalLogic'

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

describe('conditionalLogicEngine', () => {
  it('keeps the expected rule set', () => {
    expect(conditionalRules.length).toBeGreaterThanOrEqual(40)

    const ruleIds = new Set(conditionalRules.map((r) => r.id))

    ;[
      'marriage_cascade',
      'joint_assessment_cascade',
      'dependants_details',
      'employment_employed',
      'self_employed_cascade',
      'db_pension_transfer',
      'pension_details',
      'protection_details',
      'age_vulnerability',
      'health_vulnerability',
      'life_event_vulnerability',
      'politically_exposed_details',
      'pension_transfer_specialist'
    ].forEach((id) => {
      expect(ruleIds.has(id)).toBe(true)
    })
  })

  it('shows partner fields when married', () => {
    const formData = makeFormData({
      personal_information: {
        marital_status: 'Married'
      } as any
    })

    const actions = conditionalLogicEngine.evaluateRules(formData, makePulledData())

    const personalActions = actions.filter((a) => a.type === 'show_field' && a.sectionId === 'personal_information')
    const visibleFieldIds = new Set(personalActions.flatMap((a) => a.fields?.map((f) => f.id) ?? []))

    expect(visibleFieldIds.has('partner_name')).toBe(true)
    expect(visibleFieldIds.has('partner_date_of_birth')).toBe(true)
    expect(visibleFieldIds.has('joint_assessment')).toBe(true)
  })

  it('shows pension details only when has_pension is Yes', () => {
    const noPension = makeFormData({
      existing_arrangements: {
        has_pension: 'No'
      } as any
    })

    const yesPension = makeFormData({
      existing_arrangements: {
        has_pension: 'Yes'
      } as any
    })

    const actionsNo = conditionalLogicEngine.evaluateRules(noPension, makePulledData())
    const actionsYes = conditionalLogicEngine.evaluateRules(yesPension, makePulledData())

    const visibleNo = new Set(
      actionsNo
        .filter((a) => a.type === 'show_field' && a.sectionId === 'existing_arrangements')
        .flatMap((a) => a.fields?.map((f) => f.id) ?? [])
    )

    const visibleYes = new Set(
      actionsYes
        .filter((a) => a.type === 'show_field' && a.sectionId === 'existing_arrangements')
        .flatMap((a) => a.fields?.map((f) => f.id) ?? [])
    )

    expect(visibleNo.has('pension_providers')).toBe(false)
    expect(visibleYes.has('pension_providers')).toBe(true)
    expect(visibleYes.has('total_pension_value')).toBe(true)
  })

  it('computes calculated values safely', () => {
    const formData = makeFormData({
      personal_information: {
        employment_status: 'Retired'
      } as any,
      financial_situation: {
        pension_income: 20000,
        pre_retirement_income: 40000
      } as any
    })

    const calculated = conditionalLogicEngine.getCalculatedValues(formData, makePulledData())
    expect(calculated['financial_situation.income_replacement_ratio']).toBe(50)
  })
})

